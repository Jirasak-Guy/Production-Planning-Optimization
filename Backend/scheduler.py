from ortools.sat.python import cp_model
import collections
from datetime import datetime, timedelta, time
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional, Any

from data_manager import SchedulingDataManager


@dataclass
class ScheduleResult:
    """Result of scheduling optimization"""
    status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, etc.
    makespan: Optional[int] = None
    schedule_data: List[Dict] = None
    segments: List[Dict] = None  # For visualization
    tasks: List[Dict] = None     # For visualization
    solve_time_seconds: float = 0.0
    message: str = ""


class ProductionScheduler:
    """Job Shop Scheduling Solver using OR-Tools CP-SAT"""
    
    def __init__(self, data_manager: SchedulingDataManager):
        self.data = data_manager
        self.model = None
        self.solver = None
        self.product_tasks = None
        self.machine_intervals = None
        self.machine_span_intervals = None
        
        # Configuration
        self.max_shift_duration = 60  # minutes
        self.max_workers = 600
        self.time_limit_seconds = 60
    
    def configure(self, 
                  max_shift_duration: int = 60,
                  max_workers: int = 600,
                  time_limit_seconds: int = 60):
        """Configure solver parameters"""
        self.max_shift_duration = max_shift_duration
        self.max_workers = max_workers
        self.time_limit_seconds = time_limit_seconds
        return self
    
    def solve(self) -> ScheduleResult:
        """Run the complete scheduling optimization"""
        if not self.data.productions:
            return ScheduleResult(
                status="NO_DATA",
                message="No production orders to schedule"
            )
        
        # Build model
        self._build_model()
        
        # Solve
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = self.time_limit_seconds
        
        import time as time_module
        start_time = time_module.time()
        status = self.solver.solve(self.model)
        solve_time = time_module.time() - start_time
        
        status_name = self.solver.status_name(status)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            schedule_data, segments, tasks = self._extract_results()
            makespan_value = self.solver.value(self.makespan)
            
            return ScheduleResult(
                status=status_name,
                makespan=makespan_value,
                schedule_data=schedule_data,
                segments=segments,
                tasks=tasks,
                solve_time_seconds=solve_time,
                message=f"Found solution with makespan {makespan_value} minutes"
            )
        else:
            return ScheduleResult(
                status=status_name,
                solve_time_seconds=solve_time,
                message=f"Could not find solution: {status_name}"
            )
    
    def _time_to_minute(self, t: time) -> int:
        return t.hour * 60 + t.minute
    
    def _build_model(self):
        """Build the CP-SAT model"""
        self.model = cp_model.CpModel()
        
        task_struct = collections.namedtuple(
            'task_struct', 
            'start end interval alternatives routing_id chunks span_intervals'
        )
        self.product_tasks = collections.defaultdict(list)
        self.machine_intervals = collections.defaultdict(list)
        self.machine_span_intervals = collections.defaultdict(list)
        
        horizon = max(self.data.get_horizon(p.id) for p in self.data.productions)
        all_worker_intervals = []
        
        # Build task variables
        for key, job in self.data.jobs.items():
            qty = job.quantity
            
            for operation in job.routing:
                suffix = f'_{key[0]}_{key[1]}_{operation.operation_id}'
                routing_id = operation.id
                
                master_start = self.model.new_int_var(0, horizon, f'start{suffix}')
                master_end = self.model.new_int_var(0, horizon, f'end{suffix}')
                master_size = self.model.new_int_var(1, horizon, f'size{suffix}')
                master_interval = self.model.new_interval_var(
                    master_start, master_size, master_end, f'interval{suffix}'
                )
                
                possible_machines = self.data.operation_to_work_centers.get(operation.operation_id, [])
                
                active_literals = []
                alternatives_data = []
                task_chunks = []
                span_intervals_data = []
                
                for wc_id in possible_machines:
                    alt_suffix = f"{suffix}_opt{wc_id}"
                    wc_info = self.data.work_centers.get(wc_id)
                    
                    if not wc_info or not wc_info.is_active:
                        continue
                    
                    capacity_per_hour = wc_info.capacity_per_hour
                    workers_required = wc_info.number_of_workers_required
                    setup_time = operation.setup_time_minutes
                    
                    if capacity_per_hour > 0:
                        processing_time = int(qty * (60 / capacity_per_hour))
                    else:
                        processing_time = qty
                    
                    total_work_time = processing_time
                    
                    if total_work_time > self.max_shift_duration and self.max_shift_duration > 0:
                        # Split task into chunks
                        chunk_data = self._build_split_task(
                            alt_suffix, wc_id, setup_time, total_work_time,
                            horizon, master_start, master_end, workers_required
                        )
                        
                        active_literals.append(chunk_data['is_selected'])
                        alternatives_data.append((wc_id, chunk_data['is_selected']))
                        task_chunks.append((wc_id, chunk_data['is_selected'], chunk_data['chunk_vars']))
                        
                        if chunk_data['span_interval']:
                            self.machine_span_intervals[wc_id].append(chunk_data['span_interval'])
                            span_intervals_data.append((wc_id, chunk_data['is_selected'], chunk_data['span_interval']))
                        
                        all_worker_intervals.extend(chunk_data['worker_intervals'])
                    else:
                        # Normal single task
                        real_duration = setup_time + processing_time
                        
                        is_selected = self.model.new_bool_var(f"sel{alt_suffix}")
                        active_literals.append(is_selected)
                        alternatives_data.append((wc_id, is_selected))
                        
                        m_start = self.model.new_int_var(0, horizon, f"m_start{alt_suffix}")
                        m_end = self.model.new_int_var(0, horizon, f"m_end{alt_suffix}")
                        m_interval = self.model.new_optional_interval_var(
                            m_start, real_duration, m_end, is_selected, f"opt_interval{alt_suffix}"
                        )
                        
                        self.machine_intervals[wc_id].append(m_interval)
                        all_worker_intervals.append((m_interval, workers_required))
                        
                        self.model.add(master_start == m_start).only_enforce_if(is_selected)
                        self.model.add(master_end == m_end).only_enforce_if(is_selected)
                        self.model.add(master_size == real_duration).only_enforce_if(is_selected)
                        
                        self.machine_span_intervals[wc_id].append(m_interval)
                        span_intervals_data.append((wc_id, is_selected, m_interval))
                        
                        task_chunks.append((wc_id, is_selected, [(m_start, m_end)]))
                
                if active_literals:
                    self.model.add(sum(active_literals) == 1)
                
                t = task_struct(
                    start=master_start, end=master_end, interval=master_interval,
                    alternatives=alternatives_data, routing_id=routing_id,
                    chunks=task_chunks, span_intervals=span_intervals_data
                )
                self.product_tasks[key].append(t)
        
        # Build routing_to_task mapping
        routing_to_task = {}
        for key, tasks in self.product_tasks.items():
            for task in tasks:
                routing_to_task[(key, task.routing_id)] = task
        
        # Precedence constraints
        for key, tasks in self.product_tasks.items():
            production_id, product_id = key
            
            if tasks:
                self.model.add(tasks[0].start >= self.data.production_dates[production_id].release_minutes)
            
            for task in tasks:
                current_routing_id = task.routing_id
                
                for (succ_id, pred_id), lag_time in self.data.operation_dependencies.items():
                    if succ_id == current_routing_id:
                        predecessor_key = (key, pred_id)
                        if predecessor_key in routing_to_task:
                            predecessor_task = routing_to_task[predecessor_key]
                            self.model.add(task.start >= predecessor_task.end + lag_time)
        
        # Add constraints
        self._add_holiday_intervals(horizon)
        self._add_existing_schedule_blocks(horizon)
        self._add_break_intervals(horizon)
        self._add_no_overlap_constraints()
        self._add_bom_constraints()
        self._add_worker_constraint(all_worker_intervals)
        
        # Objective
        self._add_objective(horizon)
    
    def _build_split_task(self, alt_suffix, wc_id, setup_time, total_work_time, 
                          horizon, master_start, master_end, workers_required):
        """Build a task that is split into multiple chunks"""
        num_chunks = (total_work_time + self.max_shift_duration - 1) // self.max_shift_duration
        chunk_processing_times = []
        remaining = total_work_time
        for i in range(num_chunks):
            chunk_proc = min(remaining, self.max_shift_duration)
            chunk_processing_times.append(chunk_proc)
            remaining -= chunk_proc
        
        is_selected = self.model.new_bool_var(f"sel{alt_suffix}")
        
        chunk_starts = []
        chunk_ends = []
        chunk_vars = []
        worker_intervals = []
        
        for i, chunk_proc_time in enumerate(chunk_processing_times):
            chunk_suffix = f"{alt_suffix}_chunk{i}"
            
            m_start = self.model.new_int_var(0, horizon, f"m_start{chunk_suffix}")
            m_end = self.model.new_int_var(0, horizon, f"m_end{chunk_suffix}")
            
            if i == 0:
                # First chunk: always includes setup time
                chunk_dur = setup_time + chunk_proc_time
                m_interval = self.model.new_optional_interval_var(
                    m_start, chunk_dur, m_end, is_selected, f"opt_interval{chunk_suffix}"
                )
            else:
                # Subsequent chunks: setup if there's a gap, no setup if continuous
                needs_setup = self.model.new_bool_var(f"needs_setup{chunk_suffix}")
                
                chunk_dur_with_setup = setup_time + chunk_proc_time
                chunk_dur_no_setup = chunk_proc_time
                
                chunk_dur_var = self.model.new_int_var(
                    chunk_dur_no_setup, chunk_dur_with_setup, f"dur{chunk_suffix}"
                )
                
                # Duration depends on whether setup is needed
                self.model.add(chunk_dur_var == chunk_dur_with_setup).only_enforce_if(needs_setup)
                self.model.add(chunk_dur_var == chunk_dur_no_setup).only_enforce_if(needs_setup.Not())
                
                m_interval = self.model.new_optional_interval_var(
                    m_start, chunk_dur_var, m_end, is_selected, f"opt_interval{chunk_suffix}"
                )
                
                # Link needs_setup to gap between chunks
                # gap = current start - previous end
                gap = self.model.new_int_var(0, horizon, f"gap{chunk_suffix}")
                self.model.add(gap == m_start - chunk_ends[i-1]).only_enforce_if(is_selected)
                
                # If no gap (continuous), no setup needed
                self.model.add(gap == 0).only_enforce_if(is_selected, needs_setup.Not())
                # If there's a gap, setup is needed
                self.model.add(gap > 0).only_enforce_if(is_selected, needs_setup)
            
            chunk_starts.append(m_start)
            chunk_ends.append(m_end)
            chunk_vars.append((m_start, m_end))
            self.machine_intervals[wc_id].append(m_interval)
            worker_intervals.append((m_interval, workers_required))
            
            # Precedence: chunk i must start after chunk i-1 ends
            if i > 0:
                self.model.add(m_start >= chunk_ends[i-1]).only_enforce_if(is_selected)
        
        self.model.add(master_start == chunk_starts[0]).only_enforce_if(is_selected)
        self.model.add(master_end == chunk_ends[-1]).only_enforce_if(is_selected)
        
        # Span interval for no-interleaving constraint
        span_size = self.model.new_int_var(1, horizon, f"span_size{alt_suffix}")
        self.model.add(span_size == chunk_ends[-1] - chunk_starts[0]).only_enforce_if(is_selected)
        
        span_interval = self.model.new_optional_interval_var(
            chunk_starts[0], span_size, chunk_ends[-1], is_selected, f"span_interval{alt_suffix}"
        )
        
        return {
            'is_selected': is_selected,
            'chunk_vars': chunk_vars,
            'span_interval': span_interval,
            'worker_intervals': worker_intervals
        }
    
    def _add_holiday_intervals(self, horizon):
        for wc_id in self.machine_intervals.keys():
            for start_min, duration_min in self.data.holidays:
                if start_min >= 0 and start_min < horizon:
                    h_start = self.model.new_constant(start_min)
                    h_duration = self.model.new_constant(duration_min)
                    h_end = self.model.new_constant(start_min + duration_min)
                    holiday_interval = self.model.new_interval_var(
                        h_start, h_duration, h_end, f'Holiday_WC{wc_id}_{start_min}'
                    )
                    self.machine_intervals[wc_id].append(holiday_interval)
    
    def _add_existing_schedule_blocks(self, horizon):
        for wc_id in self.machine_intervals.keys():
            existing_blocks = self.data.get_existing_blocks_for_work_center(wc_id)
            for idx, block in enumerate(existing_blocks):
                if block.start_minutes < horizon:
                    b_start = self.model.new_constant(block.start_minutes)
                    b_duration = self.model.new_constant(block.end_minutes - block.start_minutes)
                    b_end = self.model.new_constant(block.end_minutes)
                    blocked_interval = self.model.new_interval_var(
                        b_start, b_duration, b_end,
                        f'Blocked_WC{wc_id}_PO{block.production_order_id}_{idx}'
                    )
                    self.machine_intervals[wc_id].append(blocked_interval)
    
    def _add_break_intervals(self, horizon):
        """Add break intervals based on shift schedules"""
        if isinstance(self.data.schedule_start_time, datetime):
            current_dt = self.data.schedule_start_time
        else:
            current_dt = datetime.combine(self.data.schedule_start_time, time(0, 0))
        
        # Prepare holiday dates
        holiday_dates = set()
        for start_min, _ in self.data.holidays:
            holiday_date = self.data.schedule_start_time + timedelta(minutes=start_min)
            if isinstance(holiday_date, datetime):
                holiday_dates.add(holiday_date.date())
            else:
                holiday_dates.add(holiday_date)
        
        end_dt = current_dt + timedelta(minutes=horizon)
        
        while current_dt < end_dt:
            if current_dt.date() in holiday_dates:
                current_dt += timedelta(days=1)
                continue
            
            day_of_week = current_dt.isoweekday()
            
            for wc_id, wc_info in self.data.work_centers.items():
                todays_shifts = wc_info.shifts.get(day_of_week, [])
                todays_shifts = sorted(todays_shifts, key=lambda x: x[0])
                
                if not todays_shifts:
                    self._create_break(wc_id, current_dt, 0, 1440, horizon)
                else:
                    last_end_min = 0
                    for start_t, end_t in todays_shifts:
                        shift_start_min = self._time_to_minute(start_t)
                        shift_end_min = self._time_to_minute(end_t)
                        
                        if shift_end_min == 0 and shift_start_min > 0:
                            shift_end_min = 1440
                        
                        if shift_start_min > last_end_min:
                            self._create_break(wc_id, current_dt, last_end_min, shift_start_min, horizon)
                        
                        last_end_min = max(last_end_min, shift_end_min)
                    
                    if last_end_min < 1440:
                        self._create_break(wc_id, current_dt, last_end_min, 1440, horizon)
            
            current_dt += timedelta(days=1)
    
    def _create_break(self, wc_id, current_date, start_min_in_day, end_min_in_day, horizon):
        if isinstance(self.data.schedule_start_time, datetime):
            anchor = self.data.schedule_start_time
        else:
            anchor = datetime.combine(self.data.schedule_start_time, time(0, 0))
        
        if isinstance(current_date, datetime):
            curr = current_date
        else:
            curr = datetime.combine(current_date, time(0, 0))
        
        day_start_offset = int((curr - anchor).total_seconds() / 60)
        
        abs_start = day_start_offset + start_min_in_day
        abs_end = day_start_offset + end_min_in_day
        duration = abs_end - abs_start
        
        if duration > 0 and abs_start < horizon:
            break_interval = self.model.new_interval_var(
                self.model.new_constant(abs_start),
                self.model.new_constant(duration),
                self.model.new_constant(abs_end),
                f'Break_{wc_id}_{abs_start}'
            )
            self.machine_intervals[wc_id].append(break_interval)
    
    def _add_no_overlap_constraints(self):
        for machine, intervals in self.machine_intervals.items():
            self.model.add_no_overlap(intervals)
        
        for machine, span_intervals in self.machine_span_intervals.items():
            if len(span_intervals) > 1:
                self.model.add_no_overlap(span_intervals)
    
    def _add_bom_constraints(self):
        for key, job in self.data.jobs.items():
            if key in self.product_tasks and job.bom_children:
                parent_first_task = self.product_tasks[key][0]
                
                for child in job.bom_children:
                    child_key = (key[0], child.component_product_id)
                    if child_key in self.product_tasks:
                        child_last_task = self.product_tasks[child_key][-1]
                        self.model.add(parent_first_task.start >= child_last_task.end)
    
    def _add_worker_constraint(self, all_worker_intervals):
        """Add cumulative constraint for workers including existing schedule"""
        if not all_worker_intervals and not self.data.existing_worker_usage:
            return
        
        worker_intervals = [item[0] for item in all_worker_intervals]
        worker_demands = [item[1] for item in all_worker_intervals]
        
        # Add existing worker usage as fixed intervals
        horizon = max(self.data.get_horizon(p.id) for p in self.data.productions)
        
        for idx, usage in enumerate(self.data.existing_worker_usage):
            if usage.start_minutes < horizon and usage.workers_required > 0:
                # Create fixed interval for existing worker usage
                start = self.model.new_constant(usage.start_minutes)
                duration = self.model.new_constant(usage.end_minutes - usage.start_minutes)
                end = self.model.new_constant(usage.end_minutes)
                
                existing_interval = self.model.new_interval_var(
                    start, duration, end,
                    f'ExistingWorker_PO{usage.production_order_id}_{idx}'
                )
                
                worker_intervals.append(existing_interval)
                worker_demands.append(usage.workers_required)
        
        if worker_intervals:
            self.model.add_cumulative(worker_intervals, worker_demands, self.max_workers)
            print(f"Added worker cumulative constraint: max {self.max_workers} workers")
            print(f"  - New task intervals: {len(all_worker_intervals)}")
            print(f"  - Existing schedule intervals: {len(self.data.existing_worker_usage)}")
    
    def _add_objective(self, horizon):
        self.makespan = self.model.new_int_var(0, horizon, 'makespan')
        
        all_end_times = []
        for key, tasks in self.product_tasks.items():
            if tasks:
                all_end_times.append(tasks[-1].end)
        
        if all_end_times:
            self.model.add_max_equality(self.makespan, all_end_times)
            self.model.minimize(self.makespan)
    
    def _get_selected_chunks(self, task):
        """Get the selected machine's chunk start/end times"""
        for wc_id, is_selected, chunk_vars in task.chunks:
            if self.solver.value(is_selected):
                segments = []
                for start_var, end_var in chunk_vars:
                    segments.append((self.solver.value(start_var), self.solver.value(end_var)))
                return wc_id, segments
        return None, []
    
    def _extract_results(self) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """Extract results from solved model"""
        schedule_data = []
        segments = []
        tasks = []
        
        for prod_key, task_list in self.product_tasks.items():
            production_order_id, product_id = prod_key
            po_name = self.data.get_name('production_order', production_order_id)
            product_name = self.data.get_name('product', product_id)
            job_name = f"{po_name} - {product_name}"
            
            for t in task_list:
                wc_id, segs = self._get_selected_chunks(t)
                
                if wc_id is not None:
                    machine_name = self.data.get_name('work_center', wc_id)
                    operation_id = self.data.get_operation_id_from_routing(t.routing_id)
                    
                    task_start = self.solver.value(t.start)
                    task_end = self.solver.value(t.end)
                    
                    tasks.append({
                        'Job': job_name,
                        'Machine': machine_name,
                        'Start': task_start,
                        'Finish': task_end
                    })
                    
                    for seg_idx, (seg_start, seg_end) in enumerate(segs):
                        segments.append({
                            'Job': job_name,
                            'Machine': machine_name,
                            'Start': seg_start,
                            'Finish': seg_end
                        })
                        
                        notes = None
                        if len(segs) > 1:
                            notes = f"Chunk {seg_idx + 1}/{len(segs)}"
                        
                        schedule_data.append({
                            'production_order_id': production_order_id,
                            'product_id': product_id,
                            'work_center_id': wc_id,
                            'operation_id': operation_id,
                            'start_minutes': seg_start,
                            'end_minutes': seg_end,
                            'shift_id': None,
                            'notes': notes
                        })
        
        return schedule_data, segments, tasks


def run_scheduling(
    engine,
    production_ids: List[int],
    max_shift_duration: int = 120,
    max_workers: int = 600,
    time_limit_seconds: int = 60,
    save_to_db: bool = True
) -> ScheduleResult:
    """
    Convenience function to run scheduling for given production orders.
    
    Args:
        engine: SQLAlchemy engine
        production_ids: List of production order IDs to optimize
        max_shift_duration: Maximum duration per shift chunk (minutes)
        max_workers: Maximum number of workers available
        time_limit_seconds: Solver time limit
        save_to_db: Whether to save results to database
    
    Returns:
        ScheduleResult with optimization results
    """
    # Load data
    data = SchedulingDataManager(engine)
    data.load_all(production_ids=production_ids)
    
    # Create scheduler
    scheduler = ProductionScheduler(data)
    scheduler.configure(
        max_shift_duration=max_shift_duration,
        max_workers=max_workers,
        time_limit_seconds=time_limit_seconds
    )
    
    # Solve
    result = scheduler.solve()
    
    # Save to database if requested
    if save_to_db:
        if result.schedule_data:
            records_saved = data.save_schedule_results(result.schedule_data)
            result.message += f" | Saved {records_saved} records to database"
        
        # Always update the schedule_status of the production orders
        data.update_production_status(production_ids, result.status)
    
    return result
