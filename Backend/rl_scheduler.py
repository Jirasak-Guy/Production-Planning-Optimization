"""
RL Scheduler — ตัวจัดตาราง Reinforcement Learning
==================================================
โหลด PPO model ที่ train ไว้จาก Stable-Baselines3 มาใช้จัดตารางการผลิต
ใช้ SchedulingDataManager ร่วมกับ CP-SAT ในการโหลดข้อมูลและบันทึกผลลงฐานข้อมูล

การใช้งาน:
    result = run_rl_scheduling(engine, production_ids, model_path="rl_jssp_scheduler.zip")
"""

import os
import bisect
import time as time_module
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set
from datetime import datetime, timedelta, time
from collections import defaultdict

import numpy as np

from data_manager import SchedulingDataManager
from scheduler import ScheduleResult


# ---------------------------------------------------------------------------
# โครงสร้างข้อมูลสำหรับ inference (ไม่ต้องพึ่ง gymnasium ตอน runtime)
# ---------------------------------------------------------------------------

@dataclass
class ShiftWindow:
    start_min: int
    end_min: int

@dataclass
class InferenceTask:
    """งานที่สามารถจัดตารางได้ 1 ชิ้น — สร้างจากข้อมูลจริงใน DB"""
    global_idx: int                    # ลำดับของ task ทั่วทั้งระบบ
    job_key: Tuple[int, int]           # (production_id, product_id)
    routing_id: int                    # รหัส routing จาก DB
    operation_id: int                  # รหัส operation ที่ต้องทำ
    setup_time: int                    # เวลา setup (นาที)
    quantity: int                      # จำนวนที่ต้องผลิต
    processing_times: Dict[int, int]   # wc_id -> เวลาผลิตรวม setup (นาที)
    predecessors: List[Tuple[int, int]]  # [(global_idx, lag_minutes), ...] ของ task ที่ต้องทำก่อน

    bom_parents: List[int]             # global_idx ของ task แม่ (BOM)
    release_time: int = 0              # เวลาเริ่มต้นเร็วสุดที่อนุญาต (นาที)
    due_date: int = 0                  # กำหนดส่ง (นาที)

@dataclass
class ScheduledResult:
    global_idx: int
    job_key: Tuple[int, int]
    machine_id: int
    start: int
    end: int


class RLSchedulerInference:
    """
    แปลงข้อมูลการผลิตจริงเป็น observation format เดียวกับตอน training
    ส่งเข้า RL model แล้วแปลง output กลับเป็น schedule_data สำหรับบันทึกลง DB

    ออกแบบให้จัดตารางทีละ 1 PO โดยเรียก build_tasks_for_po() แล้ว reset_for_po()
    """
    MAX_TASKS = 1000       # จำนวน task สูงสุดใน observation
    MAX_MACHINES = 100     # จำนวน machine สูงสุดใน observation
    TASK_FEAT = 7          # จำนวน feature ต่อ task
    MACHINE_FEAT = 4       # จำนวน feature ต่อ machine

    def __init__(self, data: SchedulingDataManager, max_workers: int = 600, max_shift_duration: int = 60):
        self.data = data
        self.max_workers = max_workers
        self.max_shift_duration = max_shift_duration

        # โครงสร้างพื้นฐาน (โหลดครั้งเดียว ใช้ร่วมกันทุก PO)
        self.machines: Dict[int, dict] = {}                                  # wc_id -> ข้อมูล machine
        self.machine_shifts: Dict[int, Dict[int, List[ShiftWindow]]] = {}    # wc_id -> วันในสัปดาห์ -> กะ
        self.holidays: Set[int] = set()                                      # ดัชนีวันหยุด
        self.horizon_minutes = 0
        self.valid_wc_ids: Set[int] = set()                                  # WC ที่ active และมีกะ

        # สถานะเฉพาะ PO (สร้างใหม่ทุกครั้ง)
        self.tasks: List[InferenceTask] = []

        # สถานะ runtime (reset ทุกรอบ)
        self.scheduled: List[Optional[ScheduledResult]] = []
        self.machine_timeline: Dict[int, List[Tuple[int, int]]] = {}  # wc_id -> [(start, end), ...]
        self.machine_available: Dict[int, int] = {}                   # wc_id -> นาทีที่ว่างล่าสุด
        self.n_scheduled = 0
        self.current_makespan = 0

        # สร้างโครงสร้างพื้นฐาน (machines, กะ, วันหยุด)
        self._build_infrastructure()

    # ---- สร้างข้อมูลจาก SchedulingDataManager ----

    def _get_dow_for_minute(self, minute: int) -> int:
        """หาวันในสัปดาห์ (1=จันทร์, 7=อาทิตย์) จาก offset นาที"""
        day_idx = minute // 1440
        return ((self.start_dow - 1 + day_idx) % 7) + 1

    def _wc_has_any_shift(self, wc_id: int) -> bool:
        """ตรวจว่า work center นี้มีกะทำงานอย่างน้อย 1 กะในสัปดาห์หรือไม่"""
        shifts = self.machine_shifts.get(wc_id, {})
        return any(len(windows) > 0 for windows in shifts.values())

    def _build_infrastructure(self):
        """สร้างโครงสร้างพื้นฐาน: machines, กะทำงาน, วันหยุด
        เรียกครั้งเดียว ใช้ร่วมกันทุกรอบการจัดตาราง"""
        dm = self.data

        # หาวันในสัปดาห์ของวันเริ่มต้น schedule
        if dm.schedule_start_time is not None:
            if isinstance(dm.schedule_start_time, datetime):
                self.start_dow = dm.schedule_start_time.isoweekday()
            else:
                self.start_dow = dm.schedule_start_time.isoweekday()
        else:
            self.start_dow = 1  # fallback: สมมติว่าเป็นวันจันทร์

        # คำนวณ horizon (ขอบเขตเวลาสูงสุด)
        self.horizon_minutes = max(
            dm.get_horizon(p.id) for p in dm.productions
        ) if dm.productions else 43200

        # โหลดวันหยุด (เก็บเป็นดัชนีวันจากวันเริ่มต้น)
        for start_min, dur in dm.holidays:
            self.holidays.add(start_min // 1440)

        # โหลด work center และกะทำงาน (เฉพาะที่ active)
        for wc_id, wc_info in dm.work_centers.items():
            if not wc_info.is_active:
                print(f"  [RL] ข้าม work center ที่ inactive: {wc_info.name} (id={wc_id})")
                continue

            self.machines[wc_id] = {
                'capacity_per_hour': wc_info.capacity_per_hour,
                'workers_required': wc_info.number_of_workers_required,
                'cost_per_hour': wc_info.cost_per_hour,
                'name': wc_info.name,
            }
            shifts_by_dow: Dict[int, List[ShiftWindow]] = {}
            for dow, windows in wc_info.shifts.items():
                shift_windows = []
                for t in windows:
                    start_min = t[0].hour * 60 + t[0].minute if hasattr(t[0], 'hour') else 0
                    end_min = t[1].hour * 60 + t[1].minute if hasattr(t[1], 'hour') else 1440
                    if end_min == 0 and start_min > 0:
                        end_min = 1440
                    shift_windows.append(ShiftWindow(start_min=start_min, end_min=end_min))
                # เรียงกะตามเวลาเริ่มต้นล่วงหน้า (ไม่ต้อง sort ซ้ำตอน runtime)
                shift_windows.sort(key=lambda s: s.start_min)
                shifts_by_dow[dow] = shift_windows
            self.machine_shifts[wc_id] = shifts_by_dow

        # สร้างเซตของ WC ที่ใช้งานได้ (active + มีกะอย่างน้อย 1 กะ)
        for wc_id in self.machines:
            if self._wc_has_any_shift(wc_id):
                self.valid_wc_ids.add(wc_id)
            else:
                print(f"  [RL] ข้าม work center ที่ไม่มีกะ: "
                      f"{self.machines[wc_id]['name']} (id={wc_id})")

        print(f"  [RL] โครงสร้าง: {len(self.machines)} WC ที่ active, "
              f"{len(self.valid_wc_ids)} มีกะ, "
              f"horizon={self.horizon_minutes} นาที")

    def _topological_sort_routings(self, routings: List, dm) -> List:
        """เรียงลำดับ routing ตาม dependency โดยใช้ topological sort (Kahn's algorithm)
        ถ้าไม่มี dependency จะเรียงตาม sequence_number แทน"""
        if not routings:
            return routings

        routing_ids = {r.id for r in routings}
        routing_by_id = {r.id: r for r in routings}

        # สร้าง adjacency list: pred -> succ (งานแม่ต้องยังทำก่อน)
        graph: Dict[int, List[int]] = {r.id: [] for r in routings}
        in_degree: Dict[int, int] = {r.id: 0 for r in routings}

        for (succ_rid, pred_rid), lag in dm.operation_dependencies.items():
            if succ_rid in routing_ids and pred_rid in routing_ids:
                graph[pred_rid].append(succ_rid)
                in_degree[succ_rid] += 1

        # Kahn's algorithm — ใช้ sequence_number ตัดสินเมื่อ in_degree เท่ากัน
        queue = sorted(
            [rid for rid, deg in in_degree.items() if deg == 0],
            key=lambda rid: routing_by_id[rid].sequence_number
        )
        sorted_routings = []

        while queue:
            rid = queue.pop(0)
            sorted_routings.append(routing_by_id[rid])
            for succ_rid in graph[rid]:
                in_degree[succ_rid] -= 1
                if in_degree[succ_rid] == 0:
                    # แทรกในตำแหน่งที่ถูกต้องตาม sequence_number
                    inserted = False
                    for i, q_rid in enumerate(queue):
                        if routing_by_id[succ_rid].sequence_number < routing_by_id[q_rid].sequence_number:
                            queue.insert(i, succ_rid)
                            inserted = True
                            break
                    if not inserted:
                        queue.append(succ_rid)

        # ถ้ามี routing ที่เข้าไม่ถึง (วงจร) ให้เติมต่อท้ายตาม sequence_number
        if len(sorted_routings) < len(routings):
            remaining = [r for r in routings if r.id not in {sr.id for sr in sorted_routings}]
            remaining.sort(key=lambda r: r.sequence_number)
            sorted_routings.extend(remaining)

        return sorted_routings

    def build_tasks_for_po(self, po_id: int, skip_operation_ids: set = None, min_release_time: int = 0):
        """สร้างรายการ task สำหรับ PO เดียว
        ล้าง task เก่าทิ้งและสร้างใหม่จากข้อมูลจริง
        เรียง routing ตาม dependency (topological sort)
        ถ้าเวลาผลิตเกิน max_shift_duration จะแบ่งเป็นหลาย chunk (เหมือน CP-SAT)
        
        Args:
            skip_operation_ids: set of operation IDs to skip (e.g. completed operations)
            min_release_time: minimum release time in minutes (e.g. latest completed task end)"""
        dm = self.data
        self.tasks = []
        if skip_operation_ids is None:
            skip_operation_ids = set()

        # แม็ป (job_key, routing_id) -> global_idx ของ chunk สุดท้าย
        task_key_to_idx: Dict[Tuple, int] = {}

        # วนเฉพาะ job ที่อยู่ใน PO นี้
        for key, job in dm.jobs.items():
            if key[0] != po_id:
                continue

            # เรียงลำดับ routing ตาม dependency graph
            sorted_routing = self._topological_sort_routings(job.routing, dm)

            for r_idx, routing in enumerate(sorted_routing):
                op_id = routing.operation_id
                
                # ข้าม operation ที่ completed แล้ว
                if op_id in skip_operation_ids:
                    print(f"  [RL] ข้าม operation {op_id} (completed) สำหรับ PO {po_id}")
                    continue
                
                setup = routing.setup_time_minutes
                qty = job.quantity

                # คำนวณเวลาผลิตล้วนแต่ละ WC (ไม่รวม setup)
                raw_pts: Dict[int, int] = {}
                for wc_id in dm.operation_to_work_centers.get(op_id, []):
                    if wc_id not in self.valid_wc_ids:
                        continue
                    wc = dm.work_centers.get(wc_id)
                    if wc and wc.capacity_per_hour > 0:
                        pt = int(qty * (60 / wc.capacity_per_hour))
                    else:
                        pt = qty
                    raw_pts[wc_id] = pt

                if not raw_pts:
                    print(f"  [RL] เตือน: ไม่มี WC ที่ใช้ได้สำหรับ task "
                          f"(job={key}, op={op_id}, routing={routing.id})")

                # ตรวจว่าต้องแบ่ง chunk หรือไม่
                max_pt = max(raw_pts.values()) if raw_pts else 0
                needs_chunking = (
                    self.max_shift_duration > 0
                    and max_pt > self.max_shift_duration
                )

                if needs_chunking:
                    # แบ่งงานเป็นหลาย chunk (เหมือน CP-SAT _build_split_task)
                    num_chunks = (max_pt + self.max_shift_duration - 1) // self.max_shift_duration
                    prev_chunk_idx = None
                    # ติดตาม remaining ต่อ WC สำหรับ front-loaded chunking (เหมือน CP-SAT)
                    remaining_per_wc = dict(raw_pts)

                    for chunk_i in range(num_chunks):
                        chunk_g_idx = len(self.tasks)

                        # คำนวณเวลาผลิตของแต่ละ chunk สำหรับแต่ละ WC
                        # ใช้ front-loaded: เติมเต็ม max_shift_duration จากหน้า → chunk สุดท้ายเหลือเศษ
                        # (เหมือน CP-SAT _build_split_task)
                        chunk_proc_times: Dict[int, int] = {}
                        for wc_id in raw_pts:
                            chunk_pt = min(remaining_per_wc[wc_id], self.max_shift_duration)
                            remaining_per_wc[wc_id] -= chunk_pt

                            if chunk_i == 0:
                                # chunk แรกรวมเวลา setup
                                chunk_proc_times[wc_id] = setup + chunk_pt
                            else:
                                chunk_proc_times[wc_id] = chunk_pt

                        # แต่ละ chunk ขึ้นกับ chunk ก่อนหน้า
                        # chunk ต่อเนื่อง lag=0 (ไม่ต้องรอ)
                        chunk_preds = [(prev_chunk_idx, 0)] if prev_chunk_idx is not None else []

                        chunk_task = InferenceTask(
                            global_idx=chunk_g_idx,
                            job_key=key,
                            routing_id=routing.id,
                            operation_id=op_id,
                            setup_time=setup if chunk_i == 0 else 0,
                            quantity=qty,
                            processing_times=chunk_proc_times,
                            predecessors=chunk_preds,
                            bom_parents=[],
                            release_time=0,
                            due_date=0,
                        )
                        if po_id in dm.production_dates:
                            chunk_task.release_time = max(dm.production_dates[po_id].release_minutes, min_release_time)
                            chunk_task.due_date = dm.production_dates[po_id].due_minutes
                        elif min_release_time > 0:
                            chunk_task.release_time = min_release_time

                        self.tasks.append(chunk_task)
                        prev_chunk_idx = chunk_g_idx

                    # แม็ป routing ไปที่ chunk สุดท้าย (งานถัดไปต้องรอทุก chunk เสร็จ)
                    task_key_to_idx[(key, routing.id)] = prev_chunk_idx
                else:
                    # งานปกติ ไม่ต้องแบ่ง chunk
                    g_idx = len(self.tasks)
                    proc_times = {wc_id: setup + pt for wc_id, pt in raw_pts.items()}

                    task = InferenceTask(
                        global_idx=g_idx,
                        job_key=key,
                        routing_id=routing.id,
                        operation_id=op_id,
                        setup_time=setup,
                        quantity=qty,
                        processing_times=proc_times,
                        predecessors=[],
                        bom_parents=[],
                        release_time=0,
                        due_date=0,
                    )
                    if po_id in dm.production_dates:
                        task.release_time = max(dm.production_dates[po_id].release_minutes, min_release_time)
                        task.due_date = dm.production_dates[po_id].due_minutes
                    elif min_release_time > 0:
                        task.release_time = min_release_time
                    task_key_to_idx[(key, routing.id)] = g_idx
                    self.tasks.append(task)

        # ตั้งค่า predecessor จาก operation_dependencies (รวม lag time เหมือน CP-SAT)
        for (succ_rid, pred_rid), lag in dm.operation_dependencies.items():
            for key in dm.jobs:
                if key[0] != po_id:
                    continue
                succ_key = (key, succ_rid)
                pred_key = (key, pred_rid)
                if succ_key in task_key_to_idx and pred_key in task_key_to_idx:
                    succ_idx = task_key_to_idx[succ_key]
                    pred_idx = task_key_to_idx[pred_key]
                    # หา chunk แรกของ successor เพื่อเพิ่ม dependency
                    first_succ = succ_idx
                    for t in self.tasks:
                        if (t.routing_id == succ_rid and t.job_key == key
                                and t.global_idx <= succ_idx):
                            first_succ = t.global_idx
                            break
                    # เก็บ (pred_idx, lag) — lag คือเวลารอเพิ่มหลัง predecessor เสร็จ
                    existing_preds = [p for p, _ in self.tasks[first_succ].predecessors]
                    if pred_idx not in existing_preds:
                        self.tasks[first_succ].predecessors.append((pred_idx, lag))

        # ตั้งค่าความสัมพันธ์ BOM (งานแม่ต้องรองานลูกทำเสร็จก่อน)
        for key, job in dm.jobs.items():
            if key[0] != po_id:
                continue
            if job.bom_children:
                parent_tasks = [t for t in self.tasks if t.job_key == key]
                for child_bom in job.bom_children:
                    child_key = (po_id, child_bom.component_product_id)
                    child_tasks = [t for t in self.tasks if t.job_key == child_key]
                    if parent_tasks and child_tasks:
                        parent_tasks[0].bom_parents.append(child_tasks[-1].global_idx)

        print(f"  [RL] PO {po_id}: สร้าง {len(self.tasks)} tasks")

    # ---- ล็อจิกการจัดตาราง (เหมือนตอน training) ----

    def reset_for_po(self, extra_blocks: List[Tuple[int, int, int]] = None):
        """รีเซ็ตสถานะ runtime สำหรับการจัดตาราง PO ใหม่

        Args:
            extra_blocks: รายการ (wc_id, start_min, end_min) จาก PO ที่จัดตารางไปแล้วใน batch นี้
                          จะถูกถือว่าเป็นช่วงเวลาที่ถูกจองบน machine
        """
        self.scheduled = [None] * len(self.tasks)
        self.machine_timeline = {m: [] for m in self.machines}
        self.machine_available = {m: 0 for m in self.machines}
        self.n_scheduled = 0
        self.current_makespan = 0
        self._cached_valid_actions = None
        # ติดตาม WC ที่ถูกจองโดย job: wc_id -> set of job_keys ที่มี task อยู่บน WC นี้
        self._wc_active_jobs: Dict[int, Set[Tuple]] = defaultdict(set)
        # เวลาเริ่มต้นขั้นต่ำต่อ WC (ป้องกันการแทรกงานในช่องว่างระหว่าง existing blocks)
        self._min_start_per_wc: Dict[int, int] = {m: 0 for m in self.machines}

        # 1) โหลด block จาก DB (PO อื่นที่ไม่ได้อยู่ใน batch นี้)
        for block in self.data.existing_schedule_blocks:
            if block.work_center_id in self.machine_timeline:
                self.machine_timeline[block.work_center_id].append(
                    (block.start_minutes, block.end_minutes)
                )
                self.machine_available[block.work_center_id] = max(
                    self.machine_available[block.work_center_id],
                    block.end_minutes
                )
                # บังคับให้งานใหม่เริ่มหลังจาก existing block (ไม่แทรก)
                self._min_start_per_wc[block.work_center_id] = max(
                    self._min_start_per_wc[block.work_center_id],
                    block.end_minutes
                )

        # 2) เพิ่ม block จาก PO ที่จัดตารางแล้วใน batch เดียวกัน
        if extra_blocks:
            for wc_id, s, e in extra_blocks:
                if wc_id in self.machine_timeline:
                    self.machine_timeline[wc_id].append((s, e))
                    self.machine_available[wc_id] = max(
                        self.machine_available[wc_id], e
                    )
                    # บังคับให้งานใหม่เริ่มหลังจาก extra block (ไม่แทรก)
                    self._min_start_per_wc[wc_id] = max(
                        self._min_start_per_wc[wc_id], e
                    )

        # เรียง timeline ทีเดียว (ไม่ต้อง sort ทุกครั้งที่เพิ่ม)
        for wc_id in self.machine_timeline:
            self.machine_timeline[wc_id].sort()

    def _compute_reserved_wcs(self) -> Dict[int, Tuple]:
        """คำนวณ WC ที่ถูกจอง: WC ถูกจองโดย job_key ถ้า
        1) job มี task ที่จัดแล้วบน WC นี้
        2) job ยังมี task ที่ยังไม่จัดที่ใช้ WC นี้ได้
        → ห้าม job อื่นใช้ WC นี้จนกว่า job นี้จะเสร็จ (ป้องกัน interleaving)"""
        reserved: Dict[int, Tuple] = {}  # wc_id -> job_key ที่จอง

        # หา job ที่มี task จัดแล้วบนแต่ละ WC
        for wc_id, job_keys in self._wc_active_jobs.items():
            for jk in job_keys:
                # เช็คว่า job นี้ยังมี task ที่ยังไม่จัดที่ใช้ WC นี้ได้หรือไม่
                has_pending = any(
                    t.job_key == jk
                    and self.scheduled[t.global_idx] is None
                    and wc_id in t.processing_times
                    for t in self.tasks
                )
                if has_pending:
                    reserved[wc_id] = jk
        return reserved

    def get_valid_actions(self) -> List[Tuple[int, int]]:
        """หา action ที่ทำได้: task ที่ยังไม่ได้จัดและ predecessor/BOM ทำเสร็จแล้ว
        ถ้าเป็น chunk ที่ 2+ ของ routing เดียวกัน จะบังคับให้ใช้ WC เดียวกับ chunk แรก
        (เหมือน CP-SAT ที่ทุก chunk ใช้ is_selected ร่วมกัน)
        ห้ามใช้ WC ที่ job อื่นยังทำไม่เสร็จ (ป้องกัน interleaving)"""
        reserved = self._compute_reserved_wcs()

        valid = []
        for task in self.tasks:
            if self.scheduled[task.global_idx] is not None:
                continue
            # เช็คว่างานก่อนหน้าทำเสร็จหรือยัง (predecessors เก็บเป็น tuple (idx, lag))
            preds_done = all(
                self.scheduled[p] is not None for p, _lag in task.predecessors
            )
            # เช็คว่างานลูก (BOM) ทำเสร็จหรือยัง
            bom_done = all(
                self.scheduled[p] is not None for p in task.bom_parents
            )
            if not preds_done or not bom_done:
                continue

            # ตรวจว่าเป็น chunk ที่ 2+ ของ routing เดียวกันหรือไม่
            # ถ้าใช่ → บังคับให้ใช้ WC เดียวกับ chunk ก่อนหน้า (เหมือน CP-SAT)
            forced_wc = None
            for pred_idx, _lag in task.predecessors:
                pred_task = self.tasks[pred_idx]
                if (pred_task.routing_id == task.routing_id
                        and pred_task.job_key == task.job_key
                        and self.scheduled[pred_idx] is not None):
                    forced_wc = self.scheduled[pred_idx].machine_id
                    break

            if forced_wc is not None and forced_wc in task.processing_times:
                valid.append((task.global_idx, forced_wc))
            else:
                for wc_id in task.processing_times:
                    # ห้ามใช้ WC ที่ job อื่นจองอยู่
                    if wc_id in reserved and reserved[wc_id] != task.job_key:
                        continue
                    valid.append((task.global_idx, wc_id))

        # Fallback: ถ้าไม่มี valid actions เลย (deadlock จาก reservation)
        # → ยกเลิก reservation แล้วหาใหม่
        if not valid:
            valid = self._get_valid_actions_no_reservation()
        return valid

    def _get_valid_actions_no_reservation(self) -> List[Tuple[int, int]]:
        """Fallback: หา valid actions โดยไม่สนใจ reservation (กัน deadlock)"""
        valid = []
        for task in self.tasks:
            if self.scheduled[task.global_idx] is not None:
                continue
            preds_done = all(
                self.scheduled[p] is not None for p, _lag in task.predecessors
            )
            bom_done = all(
                self.scheduled[p] is not None for p in task.bom_parents
            )
            if not preds_done or not bom_done:
                continue
            forced_wc = None
            for pred_idx, _lag in task.predecessors:
                pred_task = self.tasks[pred_idx]
                if (pred_task.routing_id == task.routing_id
                        and pred_task.job_key == task.job_key
                        and self.scheduled[pred_idx] is not None):
                    forced_wc = self.scheduled[pred_idx].machine_id
                    break
            if forced_wc is not None and forced_wc in task.processing_times:
                valid.append((task.global_idx, forced_wc))
            else:
                for wc_id in task.processing_times:
                    valid.append((task.global_idx, wc_id))
        return valid

    def _is_holiday(self, minute: int) -> bool:
        return (minute // 1440) in self.holidays

    def _get_shifts_for(self, wc_id: int, minute: int) -> List[ShiftWindow]:
        """ดึงรายการกะ (เรียงแล้ว) ของ WC ณ นาทีที่กำหนด"""
        dow = self._get_dow_for_minute(minute)
        return self.machine_shifts.get(wc_id, {}).get(dow, [])

    def _is_in_shift(self, wc_id: int, minute: int) -> bool:
        """ตรวจว่านาทีนี้อยู่ในกะทำงานหรือไม่"""
        time_in_day = minute % 1440
        for sw in self._get_shifts_for(wc_id, minute):
            if sw.start_min <= time_in_day < sw.end_min:
                return True
            if sw.start_min > time_in_day:
                break  # กะเรียงแล้ว ไม่ต้องเช็คต่อ
        return False

    def _get_shift_end_at(self, wc_id: int, minute: int) -> int:
        """หานาทีสิ้นสุดของกะปัจจุบัน คืนค่า -1 ถ้าไม่อยู่ในกะ"""
        time_in_day = minute % 1440
        day_base = (minute // 1440) * 1440
        for sw in self._get_shifts_for(wc_id, minute):
            if sw.start_min <= time_in_day < sw.end_min:
                return day_base + sw.end_min
            if sw.start_min > time_in_day:
                break
        return -1

    def _next_shift_start(self, wc_id: int, minute: int) -> int:
        """หานาทีเริ่มต้นของกะถัดไป (ที่หรือหลัง minute)
        คืน horizon_minutes ถ้าไม่มีกะในอนาคต"""
        t = minute
        max_t = self.horizon_minutes
        for _ in range(max_t // 1440 + 2):
            if t >= max_t:
                return max_t
            day_base = (t // 1440) * 1440
            time_in_day = t % 1440
            if self._is_holiday(t):
                t = day_base + 1440
                continue
            for sw in self._get_shifts_for(wc_id, t):
                if sw.start_min <= time_in_day < sw.end_min:
                    return t  # อยู่ในกะอยู่แล้ว
                if sw.start_min >= time_in_day:
                    return day_base + sw.start_min
            t = day_base + 1440  # ข้ามไปวันถัดไป
        return max_t

    def _has_contiguous_shift_capacity(self, wc_id: int, start: int, duration: int) -> bool:
        """ตรวจว่ามีเวลากะต่อเนื่อง (ไม่มีช่องว่างระหว่างกะ) เพียงพอสำหรับ duration หรือไม่
        กะที่ต่อเนื่อง = กะถัดไปเริ่มทันทีที่กะปัจจุบันจบ (ไม่มี gap)
        ถ้าเวลาเหลือไม่พอและกะไม่ติดกัน → คืน False (ให้ข้ามไปกะถัดไป)
        เลียนแบบพฤติกรรม OR-Tools ที่ใช้ break intervals กั้นช่วงนอกกะ"""
        remaining = duration
        t = start
        max_t = start + duration * 10  # safety limit

        while remaining > 0 and t < max_t:
            day_base = (t // 1440) * 1440
            day_idx = day_base // 1440

            if day_idx in self.holidays:
                return False  # วันหยุดตัดความต่อเนื่อง

            time_in_day = t % 1440
            shifts = self._get_shifts_for(wc_id, t)

            # หากะที่ t อยู่
            in_shift = False
            for sw in shifts:
                if sw.start_min <= time_in_day < sw.end_min:
                    available = (day_base + sw.end_min) - t
                    if remaining <= available:
                        return True  # เวลาพอในกะนี้
                    remaining -= available
                    t = day_base + sw.end_min
                    in_shift = True
                    break

            if not in_shift:
                return False  # ไม่อยู่ในกะ = ไม่ต่อเนื่อง

            # ตรวจว่ากะถัดไปเริ่มต่อเนื่องจากจุดนี้หรือไม่
            next_time_in_day = t % 1440
            if next_time_in_day == 0:
                # ข้ามวัน (กะจบที่ 24:00) → ตรวจวันถัดไปที่ loop ถัดไป
                continue

            # ตรวจว่ามีกะในวันเดียวกันที่เริ่มตรงจุดนี้
            next_shift_starts = False
            for sw in self._get_shifts_for(wc_id, t):
                if sw.start_min == next_time_in_day:
                    next_shift_starts = True
                    break
                if sw.start_min > next_time_in_day:
                    break
            if not next_shift_starts:
                return False  # มีช่องว่างระหว่างกะ → ไม่ต่อเนื่อง

        return remaining <= 0

    def _compute_actual_end(self, wc_id: int, start: int, duration: int) -> int:
        """คำนวณนาทีสิ้นสุดจริงบนปฏิทิน โดยนับเฉพาะเวลาในกะทำงาน
        เช่น งาน 120 นาที เริ่มใกล้หมดกะ → หยุดข้ามคืน → ทำต่อกะหน้า"""
        remaining = duration
        t = start
        max_t = self.horizon_minutes + duration * 3
        while remaining > 0 and t < max_t:
            day_base = (t // 1440) * 1440
            if (day_base // 1440) in self.holidays:
                t = day_base + 1440
                continue
            time_in_day = t % 1440
            shifts = self._get_shifts_for(wc_id, t)
            found_shift = False
            for sw in shifts:
                if sw.start_min <= time_in_day < sw.end_min:
                    # อยู่ในกะนี้ — ทำงานจนหมดกะหรือหมดงาน
                    available = (day_base + sw.end_min) - t
                    if remaining <= available:
                        t += remaining
                        remaining = 0
                    else:
                        remaining -= available
                        t = day_base + sw.end_min
                    found_shift = True
                    break
                elif sw.start_min > time_in_day:
                    # ข้ามไปเริ่มกะนี้เลย
                    t = day_base + sw.start_min
                    found_shift = True
                    break
            if not found_shift:
                t = day_base + 1440  # ไม่มีกะเหลือวันนี้ ข้ามไปวันถัดไป
        return t

    def find_feasible_slot(self, wc_id: int, earliest: int, duration: int) -> int:
        """หานาทีเริ่มต้นเร็วสุดที่ว่างบน WC นี้
        ต้องอยู่ในกะ + ไม่ซ้อนกับงานที่มีอยู่แล้ว + มีเวลากะต่อเนื่องเพียงพอ
        ถ้าเวลาเหลือในกะไม่พอและกะถัดไปไม่ติดกัน → ข้ามไปกะถัดไป (เหมือน OR-Tools)
        ใช้ binary search + เช็คซ้อนทับแบบถูก→แพง
        บังคับเริ่มหลัง existing blocks (ไม่แทรกงานในช่องว่าง)"""
        # บังคับให้เริ่มหลังจาก existing blocks บน WC นี้ (ป้องกันการแทรก)
        min_start = self._min_start_per_wc.get(wc_id, 0)
        t = max(earliest, min_start)
        max_t = self.horizon_minutes
        timeline = self.machine_timeline.get(wc_id, [])
        max_iterations = len(timeline) * 4 + 500
        iteration = 0
        while t < max_t and iteration < max_iterations:
            iteration += 1
            day_idx = t // 1440
            if day_idx in self.holidays:
                t = (day_idx + 1) * 1440
                continue
            if not self._is_in_shift(wc_id, t):
                t = self._next_shift_start(wc_id, t)
                continue

            # ตรวจว่ามีเวลากะต่อเนื่อง (ไม่มีช่องว่าง) เพียงพอสำหรับ duration หรือไม่
            # ถ้าเวลาเหลือไม่พอและกะไม่ติดกัน → ข้ามไปกะถัดไป (เหมือน OR-Tools break intervals)
            if not self._has_contiguous_shift_capacity(wc_id, t, duration):
                shift_end = self._get_shift_end_at(wc_id, t)
                if shift_end > t:
                    t = self._next_shift_start(wc_id, shift_end)
                else:
                    t = self._next_shift_start(wc_id, t + 1)
                continue

            # binary search: หา block แรกที่ end > t
            lo, hi = 0, len(timeline)
            while lo < hi:
                mid = (lo + hi) // 2
                if timeline[mid][1] <= t:
                    lo = mid + 1
                else:
                    hi = mid

            # เช็คเฉพาะ block ที่เกี่ยวข้อง
            overlap = False
            for idx in range(lo, len(timeline)):
                s, e = timeline[idx]
                if s >= t + duration * 3:
                    break
                # เช็คถูกก่อน: block ซ้อนจุดเริ่มต้นหรือไม่
                if t < e:
                    # ซ้อนที่จุดเริ่ม → คำนวณจุดสิ้นสุดจริง
                    actual_end = self._compute_actual_end(wc_id, t, duration)
                    if actual_end > s:
                        t = e  # ข้ามไปหลัง block นี้
                        overlap = True
                        break
            if not overlap:
                return t
        return max_t

    def get_earliest_start(self, task_idx: int, wc_id: int) -> int:
        """หานาทีเริ่มต้นเร็วสุดของ task บน WC โดยพิจารณา: predecessor, BOM, release date"""
        task = self.tasks[task_idx]
        duration = task.processing_times.get(wc_id, 60)

        earliest = 0
        # เวลาสิ้นสุดของงานก่อนหน้า + lag time (เหมือน CP-SAT: start >= pred.end + lag)
        for p, lag in task.predecessors:
            if self.scheduled[p] is not None:
                earliest = max(earliest, self.scheduled[p].end + lag)
        # เวลาสิ้นสุดของงานลูก (BOM)
        for p in task.bom_parents:
            if self.scheduled[p] is not None:
                earliest = max(earliest, self.scheduled[p].end)
        # วันที่อนุญาตเริ่มงาน (ดึงจาก release_time ที่ตั้งไว้ตอน build_tasks_for_po)
        earliest = max(earliest, task.release_time)
        # ไม่ใช้ machine_available เพราะ timeline แบ่งเป็น chunk อาจมีช่องว่างระหว่าง shift

        return self.find_feasible_slot(wc_id, earliest, duration)

    def schedule_task(self, task_idx: int, wc_id: int):
        """จัด task ลงบน WC: หาเวลาเริ่มต้น, คำนวณเวลาสิ้นสุด, แบ่ง chunk ลง timeline
        ถ้าเป็น chunk ที่ 2+ และมี gap จาก chunk ก่อนหน้า จะเพิ่ม setup time (เหมือน CP-SAT)"""
        task = self.tasks[task_idx]
        duration = task.processing_times.get(wc_id, 60)

        # ตรวจว่าเป็น chunk ที่ 2+ หรือไม่ (predecessor เป็น chunk ก่อนหน้าของ routing เดียวกัน)
        # ถ้ามี gap ระหว่าง chunk → ต้อง setup ใหม่ (เหมือน CP-SAT needs_setup logic)
        if task.setup_time == 0 and task.predecessors:
            for pred_idx, _lag in task.predecessors:
                pred_task = self.tasks[pred_idx]
                pred_result = self.scheduled[pred_idx]
                # เช็คว่าเป็น chunk ของ routing เดียวกัน
                if (pred_task.routing_id == task.routing_id
                        and pred_task.job_key == task.job_key
                        and pred_result is not None):
                    # ดูว่า chunk ก่อนหน้าจบบน WC เดียวกันหรือไม่
                    if pred_result.machine_id == wc_id:
                        pred_end = pred_result.end
                        earliest_start = self.get_earliest_start(task_idx, wc_id)
                        gap = earliest_start - pred_end
                        if gap > 0:
                            # มี gap → ต้อง setup ใหม่ เพิ่ม setup time เข้า duration
                            setup = self.tasks[pred_idx].setup_time
                            if setup == 0:
                                # หา setup จาก chunk แรกของ routing
                                for t in self.tasks:
                                    if (t.routing_id == task.routing_id
                                            and t.job_key == task.job_key
                                            and t.setup_time > 0):
                                        setup = t.setup_time
                                        break
                            duration += setup
                    break

        # หา slot ที่พอสำหรับ duration จริง (ซึ่งอาจรวม setup เพิ่มจาก gap แล้ว)
        earliest = 0
        for p, lag in task.predecessors:
            if self.scheduled[p] is not None:
                earliest = max(earliest, self.scheduled[p].end + lag)
        for p in task.bom_parents:
            if self.scheduled[p] is not None:
                earliest = max(earliest, self.scheduled[p].end)
        earliest = max(earliest, task.release_time)
        start = self.find_feasible_slot(wc_id, earliest, duration)
        end = self._compute_actual_end(wc_id, start, duration)

        self.scheduled[task_idx] = ScheduledResult(
            global_idx=task_idx,
            job_key=task.job_key,
            machine_id=wc_id,
            start=start,
            end=end,
        )

        # แบ่ง task เป็น segment ตามกะแล้วใส่ลง timeline
        # ไม่ block ช่วงนอกกะ เพื่อให้ task อื่นใช้ช่องว่างระหว่าง shift ได้
        work_segments = self._split_into_shift_segments(wc_id, start, end)
        for seg_start, seg_end in work_segments:
            bisect.insort(self.machine_timeline[wc_id], (seg_start, seg_end))

        # อัปเดต WC reservation: จำว่า job นี้มี task บน WC นี้
        self._wc_active_jobs[wc_id].add(task.job_key)

        # เก็บไว้สำหรับคำนวณ observation (ไม่ได้ใช้ใน get_earliest_start)
        self.machine_available[wc_id] = max(self.machine_available.get(wc_id, 0), end)
        self.n_scheduled += 1
        self.current_makespan = max(self.current_makespan, end)
        self._cached_valid_actions = None

    def get_obs(self) -> np.ndarray:
        """สร้าง observation vector ตาม format ที่ train ไว้
        คำนวณ queue pressure ล่วงหน้าเพื่อประสิทธิภาพ"""
        obs_size = (self.MAX_TASKS * self.TASK_FEAT +
                    self.MAX_MACHINES * self.MACHINE_FEAT + 3)
        obs = np.zeros(obs_size, dtype=np.float32)
        norm = max(self.horizon_minutes, 1)

        # คำนวณจำนวนงานที่รอต่อ machine ล่วงหน้า O(tasks) แทน O(tasks×machines)
        queue_per_machine: Dict[int, int] = defaultdict(int)
        for task in self.tasks:
            if self.scheduled[task.global_idx] is None:
                for m_id in task.processing_times:
                    queue_per_machine[m_id] += 1

        # ส่วน task features
        for i, task in enumerate(self.tasks[:self.MAX_TASKS]):
            base = i * self.TASK_FEAT
            obs[base] = 1.0                     # task มีอยู่จริง
            if self.scheduled[i] is not None:
                obs[base + 1] = 1.0              # จัดแล้ว
            n_alt = len(task.processing_times)
            obs[base + 2] = min(n_alt / 10.0, 1.0)  # ความยืดหยุ่น: จำนวน machine ที่ทำได้
            pts = list(task.processing_times.values())
            obs[base + 3] = min((np.mean(pts) if pts else 0) / norm, 1.0)  # เวลาเฉลี่ย
            obs[base + 4] = task.setup_time / norm   # เวลา setup
            obs[base + 5] = min(task.quantity / 50.0, 1.0)  # จำนวนผลิต
            n_preds = len(task.predecessors)
            if n_preds > 0:
                done = sum(1 for p, _lag in task.predecessors if self.scheduled[p] is not None)
                obs[base + 6] = done / n_preds   # สัดส่วน predecessor ที่เสร็จแล้ว
            else:
                obs[base + 6] = 1.0

        # ส่วน machine features
        m_base = self.MAX_TASKS * self.TASK_FEAT
        sorted_m_ids = sorted(self.machines.keys())  # เรียงตามลำดับเหมือนตอน train
        n_tasks = max(len(self.tasks), 1)
        for i, m_id in enumerate(sorted_m_ids[:self.MAX_MACHINES]):
            base = m_base + i * self.MACHINE_FEAT
            obs[base] = 1.0                        # machine มีอยู่จริง
            obs[base + 1] = min(self.machine_available.get(m_id, 0) / norm, 1.0)  # เวลาว่างล่าสุด
            total_busy = sum(e - s for s, e in self.machine_timeline.get(m_id, []))
            obs[base + 2] = min(total_busy / norm, 1.0)  # สัดส่วนเวลาที่ใช้งาน
            obs[base + 3] = min(queue_per_machine.get(m_id, 0) / n_tasks, 1.0)  # จำนวนงานที่รอ

        # ส่วน global features
        g_base = m_base + self.MAX_MACHINES * self.MACHINE_FEAT
        obs[g_base] = self.n_scheduled / n_tasks           # สัดส่วนที่จัดแล้ว
        obs[g_base + 1] = min(self.current_makespan / norm, 1.0)  # makespan ปัจจุบัน
        # ใช้ cache เพื่อไม่ต้องคำนวณซ้ำ
        valid = self._cached_valid_actions if self._cached_valid_actions is not None else self.get_valid_actions()
        valid_tasks = len(set(t for t, m in valid))
        obs[g_base + 2] = valid_tasks / n_tasks            # สัดส่วน task ที่ทำได้

        return obs

    def decode_action(self, action: int, valid_actions: List[Tuple[int, int]]) -> Tuple[int, int]:
        """แปลง action จาก model เป็น (task_idx, machine_id)

        2 ขั้นตอน:
          1) model เลือกว่าจะทำ task ไหน (action → task index)
          2) ระบบเลือก machine ที่เสร็จเร็วสุดโดยประมาณจาก machine_available + duration
        """
        task_a = action

        # หา task ที่ใกล้เคียง action ที่สุด
        valid_tasks = list(set(t for t, m in valid_actions))
        best_task = min(valid_tasks, key=lambda t: abs(t - task_a))

        # หา machine ที่ประมาณว่าเสร็จเร็วสุด
        candidates = [(t, m) for t, m in valid_actions if t == best_task]

        if len(candidates) == 1:
            return candidates[0]

        # เลือก machine ที่ทำให้ makespan รวมเพิ่มน้อยสุด (Projected Makespan)
        best = None
        best_makespan = float('inf')
        for (t_idx, m_id) in candidates:
            task = self.tasks[t_idx]
            duration = task.processing_times.get(m_id, 60)
            start = self.get_earliest_start(t_idx, m_id)
            end = self._compute_actual_end(m_id, start, duration)
            projected_makespan = max(end, self.current_makespan)

            if projected_makespan < best_makespan:
                best_makespan = projected_makespan
                best = (t_idx, m_id)
        return best or valid_actions[0]

    # ---- แปลงผลเป็น format สำหรับบันทึกลง DB ----

    def to_schedule_data(self) -> List[Dict]:
        """แปลงผลการจัดตารางเป็น format สำหรับ save_schedule_results
        แบ่งงานยาวเป็น segment ตามกะ เพื่อให้ทุก record อยู่ในกะเดียว"""
        schedule_data = []
        for result in self.scheduled:
            if result is None:
                continue
            # ข้าม chunk ที่ duration = 0 (เกิดจาก WC ที่ processing time น้อยกว่า max_shift_duration
            # แต่ถูกแบ่ง chunk ตาม WC อื่นที่ต้องการหลาย chunk)
            if result.start >= result.end:
                continue
            task = self.tasks[result.global_idx]
            op_id = self.data.get_operation_id_from_routing(task.routing_id)

            # แบ่งช่วงเวลา [start, end) เป็น segment ที่อยู่ในกะเดียว
            shift_segments = self._split_into_shift_segments(result.machine_id, result.start, result.end)

            # แบ่งย่อยตาม max_shift_duration
            final_segments = []
            for seg_start, seg_end in shift_segments:
                dur = seg_end - seg_start
                if self.max_shift_duration > 0 and dur > self.max_shift_duration:
                    curr_start = seg_start
                    while curr_start < seg_end:
                        curr_end = min(curr_start + self.max_shift_duration, seg_end)
                        final_segments.append((curr_start, curr_end))
                        curr_start = curr_end
                else:
                    final_segments.append((seg_start, seg_end))

            for seg_idx, (seg_start, seg_end) in enumerate(final_segments):
                shift_id = self._find_shift_id_for_segment(result.machine_id, seg_start)

                notes = 'RL scheduled'
                if len(final_segments) > 1:
                    notes = f"Chunk {seg_idx + 1}/{len(final_segments)} (RL)"

                schedule_data.append({
                    'production_order_id': task.job_key[0],
                    'product_id': task.job_key[1],
                    'work_center_id': result.machine_id,
                    'operation_id': op_id,
                    'start_minutes': seg_start,
                    'end_minutes': seg_end,
                    'shift_id': shift_id,
                    'notes': notes,
                })
        return schedule_data

    def _split_into_shift_segments(self, wc_id: int, start: int, end: int) -> List[Tuple[int, int]]:
        """แบ่งช่วงเวลาเป็น segment ที่แต่ละอันอยู่ภายในกะเดียว"""
        segments = []
        t = start
        while t < end:
            if self._is_holiday(t) or not self._is_in_shift(wc_id, t):
                t = self._next_shift_start(wc_id, t)
                if t >= end:
                    break
                continue
            shift_end = self._get_shift_end_at(wc_id, t)
            if shift_end == -1:
                t += 1
                continue
            seg_end = min(shift_end, end)
            if seg_end > t:
                segments.append((t, seg_end))
            t = seg_end
        if not segments and start < end:
            segments.append((start, end))  # fallback เฉพาะกรณีที่มี duration จริง
        return segments

    def _find_shift_id_for_segment(self, wc_id: int, minute: int) -> Optional[int]:
        """หา shift_id จาก DB ที่ครอบคลุมนาทีนี้บน WC นี้"""
        dm = self.data
        wc_info = dm.work_centers.get(wc_id)
        if not wc_info:
            return None
        time_in_day = minute % 1440
        dow = self._get_dow_for_minute(minute)
        shifts = wc_info.shifts.get(dow, [])
        for i, (start_t, end_t) in enumerate(shifts):
            s_min = start_t.hour * 60 + start_t.minute if hasattr(start_t, 'hour') else 0
            e_min = end_t.hour * 60 + end_t.minute if hasattr(end_t, 'hour') else 1440
            if e_min == 0 and s_min > 0:
                e_min = 1440
            if s_min <= time_in_day < e_min:
                return None  # ต้อง lookup จาก DB จึงคืน None ไปก่อน
        return None


# ---------------------------------------------------------------------------
# จุดเริ่มต้นหลัก (ใช้ interface เดียวกับ CP-SAT)
# ---------------------------------------------------------------------------

def run_rl_scheduling(
    engine,
    production_ids: List[int],
    model_path: str = "rl_jssp_scheduler",
    max_shift_duration: int = 60,
    max_workers: int = 600,
    save_to_db: bool = True,
) -> ScheduleResult:
    """จัดตารางด้วย RL model สำหรับ PO ที่ระบุ
    แต่ละ PO จัดแยกกัน — model เห็นแค่ task ของ PO นั้น
    ส่วน PO ที่จัดแล้วจะเป็น block ที่ถูกจองบน machine
    """
    from stable_baselines3 import PPO

    # 1. โหลดข้อมูล (เหมือน CP-SAT)
    data = SchedulingDataManager(engine)
    data.load_all(production_ids=production_ids)

    if not data.productions:
        return ScheduleResult(status="NO_DATA", message="ไม่มี PO ที่ต้องจัดตาราง")

    # 2. โหลด RL model
    if not os.path.exists(f"{model_path}.zip") and not os.path.exists(model_path):
        return ScheduleResult(
            status="MODEL_NOT_FOUND",
            message=f"ไม่พบ RL model ที่ {model_path}"
        )
    model = PPO.load(model_path)

    # 3. สร้างตัวจัดตาราง (โครงสร้างพื้นฐานใช้ร่วมกัน)
    scheduler = RLSchedulerInference(data, max_workers=max_workers, max_shift_duration=max_shift_duration)

    # 4. จัดตารางทีละ PO
    start_time = time_module.time()
    all_schedule_data: List[Dict] = []
    accumulated_blocks: List[Tuple[int, int, int]] = []  # block จาก PO ที่จัดแล้ว
    total_tasks = 0
    total_scheduled = 0
    overall_makespan = 0

    # เรียง PO ตามลำดับความสำคัญ (เลขน้อย = สำคัญมาก) แล้วตามวันเริ่มงาน
    sorted_productions = sorted(
        data.productions,
        key=lambda p: (
            p.priority,
            data.production_dates.get(p.id, None)
                and data.production_dates[p.id].release_minutes or 0
        )
    )

    for po in sorted_productions:
        po_id = po.id
        po_name = data.po_names.get(po_id, f"PO-{po_id}")
        print(f"\n  [RL] === จัดตาราง PO: {po_name} (id={po_id}, priority={po.priority}) ===")

        # ดึง operation ที่ completed แล้ว + เวลาจบล่าสุดของงาน completed
        completed_ops, completed_end_minutes = data.get_completed_operation_ids(po_id)
        if completed_ops:
            print(f"  [RL] ข้าม {len(completed_ops)} operations ที่ completed แล้ว: {completed_ops}")
            print(f"  [RL] งาน completed จบเวลา: {completed_end_minutes} นาที → งานใหม่จะเริ่มหลังจากนี้")

        # สร้าง task สำหรับ PO นี้ (ข้าม operations ที่ completed, เริ่มหลังงาน completed)
        scheduler.build_tasks_for_po(
            po_id, 
            skip_operation_ids=completed_ops,
            min_release_time=completed_end_minutes
        )

        if not scheduler.tasks:
            print(f"  [RL] ไม่มี task สำหรับ PO {po_name} ข้าม")
            continue

        total_tasks += len(scheduler.tasks)

        # รีเซ็ตพร้อม block จาก DB + block สะสมจาก PO ก่อนหน้า
        scheduler.reset_for_po(extra_blocks=accumulated_blocks)

        # รัน RL inference
        obs = scheduler.get_obs()
        steps = 0
        max_steps = len(scheduler.tasks) * 3

        while scheduler.n_scheduled < len(scheduler.tasks) and steps < max_steps:
            valid = scheduler.get_valid_actions()
            if not valid:
                break

            # cache valid actions เพื่อไม่ต้องคำนวณซ้ำใน get_obs()
            scheduler._cached_valid_actions = valid
            action, _ = model.predict(obs, deterministic=True)
            t_idx, m_id = scheduler.decode_action(int(action), valid)
            scheduler.schedule_task(t_idx, m_id)  # invalidate cache
            obs = scheduler.get_obs()
            steps += 1

        total_scheduled += scheduler.n_scheduled
        overall_makespan = max(overall_makespan, scheduler.current_makespan)

        print(f"  [RL] PO {po_name}: จัดแล้ว {scheduler.n_scheduled}/{len(scheduler.tasks)} tasks, "
              f"makespan={scheduler.current_makespan} นาที")

        # เก็บผลของ PO นี้
        po_schedule_data = scheduler.to_schedule_data()
        all_schedule_data.extend(po_schedule_data)

        # เพิ่ม span block ของแต่ละ WC ที่ PO นี้ใช้ (min_start → max_end)
        # ป้องกัน PO ถัดไปจากการแทรกงานในช่วง span ของ PO นี้
        # (เหมือน CP-SAT span_interval + no_overlap constraint)
        wc_spans: Dict[int, Tuple[int, int]] = {}
        for result in scheduler.scheduled:
            if result is not None:
                wc_id = result.machine_id
                if wc_id not in wc_spans:
                    wc_spans[wc_id] = (result.start, result.end)
                else:
                    s, e = wc_spans[wc_id]
                    wc_spans[wc_id] = (min(s, result.start), max(e, result.end))
        for wc_id, (s, e) in wc_spans.items():
            accumulated_blocks.append((wc_id, s, e))

    solve_time = time_module.time() - start_time

    # 5. สร้างผลลัพธ์รวม
    if total_scheduled == 0:
        return ScheduleResult(
            status="INFEASIBLE",
            solve_time_seconds=solve_time,
            message="Could not find solution: INFEASIBLE"
        )

    status = "FEASIBLE" if total_scheduled == total_tasks else "PARTIAL"

    result = ScheduleResult(
        status=status,
        makespan=overall_makespan,
        schedule_data=all_schedule_data,
        solve_time_seconds=solve_time,
        message=f"Found solution with makespan {overall_makespan} minutes"
    )

    # 6. บันทึกลง DB (เหมือน CP-SAT)
    if save_to_db:
        if all_schedule_data:
            records_saved = data.save_schedule_results(all_schedule_data)
            result.message += f" | Saved {records_saved} records to database"

        # Always update the schedule_status of the production orders
        data.update_production_status(production_ids, result.status)

    return result
