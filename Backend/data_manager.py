from sqlmodel import Session, select
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta, time
import collections
import psycopg2

from model import (
    Product, Order, OrderItem, BOM, Shift, CompanyCalendar,
    WorkCenter, WorkCenterShift, WorkCenterCalendarException,
    Operation, Routing, OperationDependency, ProductionOrder,
    WorkCenterSchedule,
)


@dataclass
class ProductionDateInfo:
    release_minutes: int
    due_minutes: int

@dataclass
class ExistingWorkerUsage:
    """Worker usage from existing schedule"""
    start_minutes: int
    end_minutes: int
    workers_required: int
    work_center_id: int
    production_order_id: int


@dataclass
class WorkCenterInfo:
    id: int
    name: str
    cost_per_hour: int
    capacity_per_hour: float
    shifts: Dict[int, List[Tuple]]  # day_of_week -> [(start_time, end_time), ...]
    number_of_workers_required: int
    is_active: bool = True


@dataclass
class JobData:
    production_id: int
    product_id: int
    quantity: int
    routing: List[Routing]
    bom_children: List[BOM]


@dataclass
class ExistingScheduleBlock:
    """Represents an already scheduled block that cannot be overlapped"""
    work_center_id: int
    start_minutes: int
    end_minutes: int
    production_order_id: int  # For reference


class SchedulingDataManager:
    """รวมข้อมูลทั้งหมดที่ใช้ใน scheduling ไว้ในที่เดียว"""
    
    def __init__(self, engine):
        self.engine = engine
        
        # Name mappings
        self.product_names: Dict[int, str] = {}
        self.work_center_names: Dict[int, str] = {}
        self.operation_names: Dict[int, str] = {}
        self.po_names: Dict[int, str] = {}
        
        # Core data
        self.productions: List[ProductionOrder] = []
        self.jobs: Dict[Tuple[int, int], JobData] = {}  # (production_id, product_id) -> JobData
        self.work_centers: Dict[int, WorkCenterInfo] = {}  # wc_id -> WorkCenterInfo
        self.operation_to_work_centers: Dict[int, List[int]] = {}  # operation_id -> [wc_ids]
        self.operation_dependencies: Dict[Tuple[int, int], int] = {}  # (routing_id, predecessor_id) -> lag_time
        self.production_dates: Dict[int, ProductionDateInfo] = {}  # production_id -> dates
        self.holidays: List[Tuple[int, int]] = []  # [(start_minute, duration), ...]
        
        # Existing schedule blocks (for no-overlap with other POs)
        self.existing_schedule_blocks: List[ExistingScheduleBlock] = []

        # Existing worker usage (for cumulative constraint)
        self.existing_worker_usage: List[ExistingWorkerUsage] = []
        
        # Schedule reference
        self.schedule_start_time: Optional[datetime] = None
        
    def load_all(self, production_ids: Optional[List[int]] = None):
        """
        โหลดข้อมูลทั้งหมด
        
        Args:
            production_ids: List of production order IDs to optimize. 
                           If None, loads all 'released' POs (legacy behavior)
        """
        self._load_name_mappings()
        self._load_productions(production_ids)
        self._load_jobs()
        self._load_work_centers()
        self._load_dependencies()
        self._load_holidays()
        
        # Load existing schedules for work centers (excluding the POs we're optimizing)
        if production_ids:
            self._load_existing_schedules(exclude_po_ids=production_ids)
    
    def _load_name_mappings(self):
        with Session(self.engine) as session:
            for p in session.exec(select(Product)).all():
                self.product_names[p.id] = p.product_name
            for wc in session.exec(select(WorkCenter)).all():
                self.work_center_names[wc.id] = wc.work_center_name
            for op in session.exec(select(Operation)).all():
                self.operation_names[op.id] = op.operation_name
            for po in session.exec(select(ProductionOrder)).all():
                self.po_names[po.id] = po.po_number
                
    def _load_productions(self, production_ids: Optional[List[int]] = None):
        with Session(self.engine) as session:
            if production_ids:
                # Load specific production orders by ID
                self.productions = session.exec(
                    select(ProductionOrder).where(ProductionOrder.id.in_(production_ids))
                ).all()
            else:
                # Legacy behavior: load all released POs
                self.productions = session.exec(
                    select(ProductionOrder).where(ProductionOrder.status == 'released')
                ).all()
            
        if self.productions:
            self.schedule_start_time = min(p.scheduled_start_date for p in self.productions)
            for p in self.productions:
                self.production_dates[p.id] = ProductionDateInfo(
                    release_minutes=self._get_minutes_from_start(p.scheduled_start_date),
                    due_minutes=self._get_minutes_from_start(p.scheduled_end_date)
                )
    
    def _load_existing_schedules(self, exclude_po_ids: List[int]):
        """
        Load existing WorkCenterSchedule records to block those time slots.
        Excludes the POs we're currently optimizing.
        """
        self.existing_schedule_blocks = []
        
        with Session(self.engine) as session:
            # Get all scheduled/completed/in-progress records except the ones we're optimizing
            existing = session.exec(
                select(WorkCenterSchedule).where(
                    WorkCenterSchedule.production_order_id.notin_(exclude_po_ids),
                    WorkCenterSchedule.status.in_(["scheduled", "in-progress", "completed"])
                )
            ).all()
            
            for record in existing:
                start_min = self._get_minutes_from_start(record.scheduled_start)
                end_min = self._get_minutes_from_start(record.scheduled_end)
                
                # Only include if within our horizon
                if start_min >= 0:
                    self.existing_schedule_blocks.append(ExistingScheduleBlock(
                        work_center_id=record.work_center_id,
                        start_minutes=start_min,
                        end_minutes=end_min,
                        production_order_id=record.production_order_id
                    ))
        
        print(f"Loaded {len(self.existing_schedule_blocks)} existing schedule blocks")
    
    def _load_existing_worker_usage(self):
        """
        Load worker usage from existing schedules (for cumulative constraint).
        This includes all scheduled work that uses workers, regardless of work center.
        """
        self.existing_worker_usage = []
        
        if not self.schedule_start_time:
            return
        
        # Get all production order IDs that are being optimized
        optimizing_po_ids = set(p.id for p in self.productions)
        
        with Session(self.engine) as session:
            # Get all schedule records that are NOT being re-optimized
            query = text("""
                SELECT 
                    wcs.start_minutes,
                    wcs.end_minutes,
                    wcs.work_center_id,
                    wcs.production_order_id,
                    wc.number_of_workers_required
                FROM work_center_schedule wcs
                JOIN work_center wc ON wcs.work_center_id = wc.id
                WHERE wcs.production_order_id NOT IN :optimizing_ids
                ORDER BY wcs.start_minutes
            """)
            
            if optimizing_po_ids:
                results = session.execute(
                    query, 
                    {"optimizing_ids": tuple(optimizing_po_ids)}
                ).fetchall()
            else:
                # If no production orders being optimized, load all
                query_all = text("""
                    SELECT 
                        wcs.start_minutes,
                        wcs.end_minutes,
                        wcs.work_center_id,
                        wcs.production_order_id,
                        wc.number_of_workers_required
                    FROM work_center_schedule wcs
                    JOIN work_center wc ON wcs.work_center_id = wc.id
                    ORDER BY wcs.start_minutes
                """)
                results = session.execute(query_all).fetchall()
            
            for row in results:
                self.existing_worker_usage.append(ExistingWorkerUsage(
                    start_minutes=row[0],
                    end_minutes=row[1],
                    work_center_id=row[2],
                    production_order_id=row[3],
                    workers_required=row[4] or 0
                ))
        
        print(f"Loaded {len(self.existing_worker_usage)} existing worker usage records")
    
    
    def get_existing_blocks_for_work_center(self, wc_id: int) -> List[ExistingScheduleBlock]:
        """Get all existing schedule blocks for a specific work center"""
        return [b for b in self.existing_schedule_blocks if b.work_center_id == wc_id]

    def _load_jobs(self):
        """โหลด jobs แบบ recursive ผ่าน BOM - Optimized with bulk loading"""
        # Bulk load all routing and BOM once
        with Session(self.engine) as session:
            all_routing = session.exec(select(Routing).order_by(Routing.sequence_number)).all()
            all_bom = session.exec(select(BOM)).all()
        
        # Build lookup maps (in memory)
        routing_by_product: Dict[int, List[Routing]] = collections.defaultdict(list)
        for r in all_routing:
            routing_by_product[r.product_id].append(r)
        
        bom_by_parent: Dict[int, List[BOM]] = collections.defaultdict(list)
        for b in all_bom:
            bom_by_parent[b.parent_product_id].append(b)
        
        # Build job tree from memory (no more queries)
        for prod in self.productions:
            self._build_job_tree(prod.id, prod.product_id, int(prod.quantity_planned),
                                 routing_by_product, bom_by_parent)
    
    def _build_job_tree(self, production_id: int, product_id: int, quantity: int,
                        routing_by_product: Dict[int, List[Routing]],
                        bom_by_parent: Dict[int, List[BOM]]):
        key = (production_id, product_id)
        
        # ถ้ามีอยู่แล้ว เพิ่ม quantity
        if key in self.jobs:
            self.jobs[key].quantity += quantity
            return
        
        # Get from pre-loaded maps (no query!)
        routing = routing_by_product.get(product_id, [])
        bom_list = bom_by_parent.get(product_id, [])
        
        self.jobs[key] = JobData(
            production_id=production_id,
            product_id=product_id,
            quantity=quantity,
            routing=routing,
            bom_children=bom_list
        )
        
        # Recursive load children (still no queries)
        for bom in bom_list:
            child_qty = int(quantity * bom.quantity_required)
            self._build_job_tree(production_id, bom.component_product_id, child_qty,
                                 routing_by_product, bom_by_parent)
    
    def _load_work_centers(self):
        """Optimized: Bulk load all data then join in memory"""
        all_operation_ids = set()
        for job in self.jobs.values():
            for r in job.routing:
                all_operation_ids.add(r.operation_id)
        
        with Session(self.engine) as session:
            # Bulk load all needed data (just 3 queries total!)
            all_work_centers = session.exec(select(WorkCenter)).all()
            all_wc_shifts = session.exec(select(WorkCenterShift)).all()
            all_shifts = session.exec(select(Shift)).all()
        
        # Build lookup maps in memory
        shifts_by_id: Dict[int, Shift] = {s.id: s for s in all_shifts}
        
        wc_shifts_by_wc_id: Dict[int, List[WorkCenterShift]] = collections.defaultdict(list)
        for wcs in all_wc_shifts:
            wc_shifts_by_wc_id[wcs.work_center_id].append(wcs)
        
        wc_by_operation: Dict[int, List[WorkCenter]] = collections.defaultdict(list)
        for wc in all_work_centers:
            wc_by_operation[wc.operation_id].append(wc)
        
        # Build operation_to_work_centers and work_centers (no more queries!)
        for op_id in all_operation_ids:
            wcs = wc_by_operation.get(op_id, [])
            self.operation_to_work_centers[op_id] = []
            
            for wc in wcs:
                self.operation_to_work_centers[op_id].append(wc.id)
                
                if wc.id not in self.work_centers:
                    # Build shifts from pre-loaded data
                    shifts_by_day: Dict[int, List[Tuple]] = {day: [] for day in range(7)}
                    
                    for wc_shift in wc_shifts_by_wc_id.get(wc.id, []):
                        shift = shifts_by_id.get(wc_shift.shift_id)
                        if shift and shift.is_active:
                            shifts_by_day[wc_shift.day_of_week].append(
                                (shift.start_time, shift.end_time)
                            )
                    
                    self.work_centers[wc.id] = WorkCenterInfo(
                        id=wc.id,
                        name=wc.work_center_name,
                        cost_per_hour=int(wc.cost_per_hour),
                        capacity_per_hour=wc.capacity_per_hour,
                        shifts=shifts_by_day,
                        number_of_workers_required=wc.number_of_workers_required,
                        is_active=wc.is_active
                    )
    
    def _load_dependencies(self):
        with Session(self.engine) as session:
            deps = session.exec(select(OperationDependency)).all()
            for d in deps:
                self.operation_dependencies[(d.routing_id, d.predecessor_routing_id)] = d.lag_time_minutes
    
    def _load_holidays(self):
        with Session(self.engine) as session:
            calendars = session.exec(select(CompanyCalendar)).all()
            for day in calendars:
                minute = self._get_minutes_from_start(day.calendar_date)
                if minute >= 0:
                    self.holidays.append((minute, 1440))
    
    def _get_minutes_from_start(self, target_date) -> int:
        """Convert target_date to minutes from schedule_start_time.
        Handles both date and datetime types, and timezone-aware/naive datetimes."""
        if self.schedule_start_time is None:
            return 0
        
        # Normalize schedule_start_time to datetime
        if isinstance(self.schedule_start_time, datetime):
            base_dt = self.schedule_start_time
        else:
            base_dt = datetime.combine(self.schedule_start_time, time(0, 0))
        
        # Normalize target_date to datetime
        if isinstance(target_date, datetime):
            target_dt = target_date
        else:
            target_dt = datetime.combine(target_date, time(0, 0))
        
        # Handle timezone mismatch - convert both to naive (remove timezone info)
        if hasattr(base_dt, 'tzinfo') and base_dt.tzinfo is not None:
            base_dt = base_dt.replace(tzinfo=None)
        if hasattr(target_dt, 'tzinfo') and target_dt.tzinfo is not None:
            target_dt = target_dt.replace(tzinfo=None)
        
        delta = target_dt - base_dt
        return int(delta.total_seconds() / 60)
    
    # Utility methods
    def get_name(self, name_type: str, id_value: int) -> str:
        mapping = {
            'product': self.product_names,
            'work_center': self.work_center_names,
            'operation': self.operation_names,
            'production_order': self.po_names
        }
        return mapping.get(name_type, {}).get(id_value, f"ID:{id_value}")
    
    def get_job_keys(self) -> List[Tuple[int, int]]:
        return list(self.jobs.keys())
    
    def get_horizon(self, production_id: int) -> int:
        return self.production_dates[production_id].due_minutes + 1000

    def _minutes_to_datetime(self, minutes: int) -> datetime:
        """Convert minutes offset from schedule_start_time to actual datetime"""
        if self.schedule_start_time is None:
            raise ValueError("schedule_start_time is not set")
        
        if isinstance(self.schedule_start_time, datetime):
            base_dt = self.schedule_start_time
        else:
            base_dt = datetime.combine(self.schedule_start_time, time(0, 0))
        
        return base_dt + timedelta(minutes=int(minutes))
    
    def save_schedule_results(
        self, 
        schedule_data: List[Dict],
        clear_existing: bool = True
    ) -> int:
        """
        Save solver results to WorkCenterSchedule table.
        
        Args:
            schedule_data: List of dicts with keys:
                - production_order_id: int
                - product_id: int
                - work_center_id: int
                - operation_id: int
                - start_minutes: int (offset from schedule_start_time)
                - end_minutes: int (offset from schedule_start_time)
                - shift_id: Optional[int]
                - notes: Optional[str]
            clear_existing: If True, delete existing scheduled records for these production orders
                           (completed records are always preserved)
            
        Returns:
            Number of records saved
        """
        if not schedule_data:
            return 0
        
        with Session(self.engine) as session:
            if clear_existing:
                # Get unique production order IDs from schedule_data
                po_ids = set(item['production_order_id'] for item in schedule_data)
                
                # Delete existing SCHEDULED records (not completed ones)
                # This allows partially completed ops to be rescheduled to different WC
                existing_records = session.exec(
                    select(WorkCenterSchedule).where(
                        WorkCenterSchedule.production_order_id.in_(po_ids),
                        WorkCenterSchedule.status == "scheduled"
                    )
                ).all()
                
                for record in existing_records:
                    session.delete(record)
                
                session.commit()
            
            # Insert new schedule records
            records_saved = 0
            for item in schedule_data:
                schedule_record = WorkCenterSchedule(
                    work_center_id=item['work_center_id'],
                    production_order_id=item['production_order_id'],
                    product_id=item['product_id'],
                    operation_id=item['operation_id'],
                    shift_id=item.get('shift_id'),
                    scheduled_start=self._minutes_to_datetime(item['start_minutes']),
                    scheduled_end=self._minutes_to_datetime(item['end_minutes']),
                    status="scheduled",
                    notes=item.get('notes')
                )
                session.add(schedule_record)
                records_saved += 1
            
            session.commit()
            
        return records_saved
    
    def get_operation_id_from_routing(self, routing_id: int) -> Optional[int]:
        """Get operation_id from routing_id"""
        for job in self.jobs.values():
            for routing in job.routing:
                if routing.id == routing_id:
                    return routing.operation_id
        return None

    def update_production_status(self, production_ids: List[int], status: str):
        """Update the schedule_status of specified production orders"""
        with Session(self.engine) as session:
            for po_id in production_ids:
                po = session.get(ProductionOrder, po_id)
                if po:
                    po.schedule_status = status
                    session.add(po)
            session.commit()

    def get_completed_operation_ids(self, po_id: int) -> tuple:
        """Get operation_ids that are FULLY completed for a specific PO,
        partially completed operations with their remaining times, completed blocks, and the latest end time.
        
        An operation is:
        - FULLY completed: has completed records AND no scheduled records
        - PARTIALLY completed: has both completed AND scheduled records
          → Returns remaining_minutes so scheduler can reschedule to different WC
        
        Returns:
            (fully_completed_ops: set, 
             partial_ops_remaining: dict {op_id: remaining_minutes},
             completed_blocks: list of (wc_id, start_min, end_min),
             latest_end_minutes: int)
        """
        ops_with_completed = set()  # Operations that have at least one completed record
        ops_with_scheduled = set()  # Operations that still have scheduled records
        latest_end = None
        
        # Track completed and scheduled minutes per operation
        op_completed_minutes: Dict[int, int] = {}  # op_id -> total completed minutes
        op_scheduled_minutes: Dict[int, int] = {}  # op_id -> total scheduled minutes
        
        # Track completed blocks to prevent overlapping
        completed_blocks: List[Tuple[int, int, int]] = []
        
        with Session(self.engine) as session:
            # Get all records for this PO
            all_records = session.exec(
                select(WorkCenterSchedule).where(
                    WorkCenterSchedule.production_order_id == po_id
                )
            ).all()
            
            for record in all_records:
                if not record.operation_id:
                    continue
                
                # Calculate duration
                start_min = self._get_minutes_from_start(record.scheduled_start)
                end_min = self._get_minutes_from_start(record.scheduled_end)
                duration = max(0, end_min - start_min)
                    
                if record.status == "completed":
                    ops_with_completed.add(record.operation_id)
                    op_completed_minutes[record.operation_id] = \
                        op_completed_minutes.get(record.operation_id, 0) + duration
                    if record.scheduled_end:
                        if latest_end is None or record.scheduled_end > latest_end:
                            latest_end = record.scheduled_end
                    # Add to completed blocks to prevent scheduler from overlapping
                    if start_min >= 0 and end_min > start_min:
                        completed_blocks.append((record.work_center_id, start_min, end_min))
                elif record.status == "scheduled":
                    ops_with_scheduled.add(record.operation_id)
                    op_scheduled_minutes[record.operation_id] = \
                        op_scheduled_minutes.get(record.operation_id, 0) + duration
        
        # Fully completed: has completed records AND no scheduled records
        fully_completed_ops = ops_with_completed - ops_with_scheduled
        
        # Partially completed: has BOTH completed AND scheduled records
        # Calculate remaining minutes for each (can be rescheduled to different WC)
        partially_completed_ops = ops_with_completed & ops_with_scheduled
        partial_ops_remaining: Dict[int, int] = {}
        for op_id in partially_completed_ops:
            remaining = op_scheduled_minutes.get(op_id, 0)
            if remaining > 0:
                partial_ops_remaining[op_id] = remaining
        
        # Convert latest_end to minutes offset from schedule_start_time
        latest_end_minutes = 0
        if latest_end and self.schedule_start_time:
            latest_end_minutes = self._get_minutes_from_start(latest_end)
        
        return fully_completed_ops, partial_ops_remaining, completed_blocks, latest_end_minutes
