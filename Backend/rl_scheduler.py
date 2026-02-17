"""
RL Scheduler Integration
========================
Loads a trained Stable-Baselines3 PPO model and uses it to schedule
production orders, using the same SchedulingDataManager for data loading
and the same save_schedule_results for output.

Usage:
    result = run_rl_scheduling(engine, production_ids, model_path="rl_jssp_scheduler.zip")
"""

import os
import time as time_module
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set
from datetime import datetime, timedelta, time
from collections import defaultdict

import numpy as np

from data_manager import SchedulingDataManager
from scheduler import ScheduleResult


# ---------------------------------------------------------------------------
# Lightweight env for inference only (no gymnasium dependency at runtime)
# ---------------------------------------------------------------------------

@dataclass
class ShiftWindow:
    start_min: int
    end_min: int

@dataclass
class InferenceTask:
    """A single schedulable task built from real DB data"""
    global_idx: int
    job_key: Tuple[int, int]  # (production_id, product_id)
    routing_id: int
    operation_id: int
    setup_time: int
    quantity: int  # production quantity for this task
    processing_times: Dict[int, int]  # wc_id -> minutes (setup+proc)
    predecessors: List[int]  # global_idx of predecessor tasks


    bom_parents: List[int]   # global_idx of BOM parent tasks
    release_time: int = 0    # Earliest start time (minutes from schedule start)
    due_date: int = 0        # Due date (minutes from schedule start)

@dataclass
class ScheduledResult:
    global_idx: int
    job_key: Tuple[int, int]
    machine_id: int
    start: int
    end: int


class RLSchedulerInference:
    """
    Converts real production data into the same observation format
    used during training, runs the RL model, and converts output
    back to schedule_data records for the DB.
    """
    MAX_TASKS = 250
    MAX_MACHINES = 50
    TASK_FEAT = 7
    MACHINE_FEAT = 4

    def __init__(self, data: SchedulingDataManager, max_workers: int = 600):
        self.data = data
        self.max_workers = max_workers

        # Build tasks and machine info from real data
        self.tasks: List[InferenceTask] = []
        self.machines: Dict[int, dict] = {}  # wc_id -> info
        self.machine_shifts: Dict[int, Dict[int, List[ShiftWindow]]] = {}  # wc_id -> dow -> windows
        self.holidays: Set[int] = set()  # day indices
        self.horizon_minutes = 0

        self._build_from_data()

        # Runtime state (reset per solve)
        self.scheduled: List[Optional[ScheduledResult]] = []
        self.machine_timeline: Dict[int, List[Tuple[int, int]]] = {}
        self.machine_available: Dict[int, int] = {}
        self.n_scheduled = 0
        self.current_makespan = 0

    # ---- Build from SchedulingDataManager ----

    def _get_dow_for_minute(self, minute: int) -> int:
        """Get ISO day-of-week (1=Mon, 7=Sun) for a given minute offset,
        based on the actual schedule_start_time."""
        day_idx = minute // 1440
        # self.start_dow is the isoweekday() of schedule_start_time (1=Mon..7=Sun)
        return ((self.start_dow - 1 + day_idx) % 7) + 1

    def _build_from_data(self):
        """Convert SchedulingDataManager data into internal structures"""
        dm = self.data

        # Determine the day-of-week of schedule_start_time
        if dm.schedule_start_time is not None:
            if isinstance(dm.schedule_start_time, datetime):
                self.start_dow = dm.schedule_start_time.isoweekday()  # 1=Mon..7=Sun
            else:
                self.start_dow = dm.schedule_start_time.isoweekday()
        else:
            self.start_dow = 1  # fallback: assume Monday

        # Horizon
        self.horizon_minutes = max(
            dm.get_horizon(p.id) for p in dm.productions
        ) if dm.productions else 43200

        # Holidays (day index from schedule_start)
        for start_min, dur in dm.holidays:
            self.holidays.add(start_min // 1440)

        # Work centers + shifts
        for wc_id, wc_info in dm.work_centers.items():
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
                    # FIX: midnight '00:00:00' → 1440 (end of day)
                    # Without this, Shift B (16:00-00:00) becomes ShiftWindow(960, 0)
                    # and the check "960 <= x < 0" is ALWAYS false!
                    if end_min == 0 and start_min > 0:
                        end_min = 1440
                    shift_windows.append(ShiftWindow(start_min=start_min, end_min=end_min))
                shifts_by_dow[dow] = shift_windows
            self.machine_shifts[wc_id] = shifts_by_dow

        # Build task list from jobs
        task_key_to_idx: Dict[Tuple, int] = {}  # (job_key, routing_id) -> global_idx

        for key, job in dm.jobs.items():
            for r_idx, routing in enumerate(job.routing):
                g_idx = len(self.tasks)
                op_id = routing.operation_id
                setup = routing.setup_time_minutes
                qty = job.quantity

                # Processing times per work center
                proc_times = {}
                for wc_id in dm.operation_to_work_centers.get(op_id, []):
                    wc = dm.work_centers.get(wc_id)
                    if wc and wc.capacity_per_hour > 0:
                        pt = int(qty * (60 / wc.capacity_per_hour))
                    else:
                        pt = qty
                    proc_times[wc_id] = setup + pt

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
                prod_id = key[0]
                if prod_id in dm.production_dates:
                    task.release_time = dm.production_dates[prod_id].release_minutes
                    task.due_date = dm.production_dates[prod_id].due_minutes
                task_key_to_idx[(key, routing.id)] = g_idx
                self.tasks.append(task)

        # Predecessors from operation_dependencies
        for (succ_rid, pred_rid), lag in dm.operation_dependencies.items():
            for key in dm.jobs:
                succ_key = (key, succ_rid)
                pred_key = (key, pred_rid)
                if succ_key in task_key_to_idx and pred_key in task_key_to_idx:
                    self.tasks[task_key_to_idx[succ_key]].predecessors.append(
                        task_key_to_idx[pred_key]
                    )

        # Sequence-based predecessors (within same job, task i depends on task i-1)
        current_job = None
        prev_idx = None
        for task in self.tasks:
            if task.job_key != current_job:
                current_job = task.job_key
                prev_idx = None
            if prev_idx is not None and prev_idx not in task.predecessors:
                task.predecessors.append(prev_idx)
            prev_idx = task.global_idx

        # BOM constraints
        for key, job in dm.jobs.items():
            if job.bom_children:
                parent_tasks = [t for t in self.tasks if t.job_key == key]
                for child_bom in job.bom_children:
                    child_key = (key[0], child_bom.component_product_id)
                    child_tasks = [t for t in self.tasks if t.job_key == child_key]
                    if parent_tasks and child_tasks:
                        parent_tasks[0].bom_parents.append(child_tasks[-1].global_idx)

    # ---- Scheduling logic (mirrors env) ----

    def reset(self):
        self.scheduled = [None] * len(self.tasks)
        self.machine_timeline = {m: [] for m in self.machines}
        self.machine_available = {m: 0 for m in self.machines}
        self.n_scheduled = 0
        self.current_makespan = 0

        # Add existing schedule blocks as occupied
        for block in self.data.existing_schedule_blocks:
            if block.work_center_id in self.machine_timeline:
                self.machine_timeline[block.work_center_id].append(
                    (block.start_minutes, block.end_minutes)
                )
                self.machine_available[block.work_center_id] = max(
                    self.machine_available[block.work_center_id],
                    block.end_minutes
                )

    def get_valid_actions(self) -> List[Tuple[int, int]]:
        valid = []
        for task in self.tasks:
            if self.scheduled[task.global_idx] is not None:
                continue
            # Check predecessors
            preds_done = all(
                self.scheduled[p] is not None for p in task.predecessors
            )
            # Check BOM parents
            bom_done = all(
                self.scheduled[p] is not None for p in task.bom_parents
            )
            if not preds_done or not bom_done:
                continue
            for wc_id in task.processing_times:
                valid.append((task.global_idx, wc_id))
        return valid

    def _is_holiday(self, minute: int) -> bool:
        return (minute // 1440) in self.holidays

    def _is_in_shift(self, wc_id: int, minute: int) -> bool:
        time_in_day = minute % 1440
        dow = self._get_dow_for_minute(minute)
        shifts = self.machine_shifts.get(wc_id, {}).get(dow, [])
        return any(sw.start_min <= time_in_day < sw.end_min for sw in shifts)

    def find_feasible_slot(self, wc_id: int, earliest: int, duration: int) -> int:
        t = earliest
        max_t = self.horizon_minutes
        while t < max_t:
            if self._is_holiday(t):
                t = ((t // 1440) + 1) * 1440
                continue
            if not self._is_in_shift(wc_id, t):
                # Jump to next shift
                day_idx = t // 1440
                time_in_day = t % 1440
                dow = self._get_dow_for_minute(t)
                shifts = sorted(
                    self.machine_shifts.get(wc_id, {}).get(dow, []),
                    key=lambda s: s.start_min
                )
                found = False
                for sw in shifts:
                    if sw.start_min > time_in_day:
                        t = day_idx * 1440 + sw.start_min
                        found = True
                        break
                if not found:
                    t = (day_idx + 1) * 1440
                continue

            end_t = t + duration
            fits = True
            for m in range(t, min(end_t, max_t)):
                if self._is_holiday(m) or not self._is_in_shift(wc_id, m):
                    t = m + 1
                    fits = False
                    break
            if not fits:
                continue

            overlap = False
            for (s, e) in self.machine_timeline[wc_id]:
                if t < e and end_t > s:
                    t = e
                    overlap = True
                    break
            if not overlap:
                return t
        return max_t

    def get_earliest_start(self, task_idx: int, wc_id: int) -> int:
        task = self.tasks[task_idx]
        duration = task.processing_times.get(wc_id, 60)

        earliest = 0
        # Predecessor end times
        for p in task.predecessors:
            if self.scheduled[p] is not None:
                earliest = max(earliest, self.scheduled[p].end)
        # BOM parent end times
        for p in task.bom_parents:
            if self.scheduled[p] is not None:
                earliest = max(earliest, self.scheduled[p].end)
        # Release date
        prod_id = task.job_key[0]
        if prod_id in self.data.production_dates:
            earliest = max(earliest, self.data.production_dates[prod_id].release_minutes)
        # Machine availability
        earliest = max(earliest, self.machine_available.get(wc_id, 0))

        return self.find_feasible_slot(wc_id, earliest, duration)

    def schedule_task(self, task_idx: int, wc_id: int):
        task = self.tasks[task_idx]
        duration = task.processing_times.get(wc_id, 60)
        start = self.get_earliest_start(task_idx, wc_id)
        end = start + duration

        self.scheduled[task_idx] = ScheduledResult(
            global_idx=task_idx,
            job_key=task.job_key,
            machine_id=wc_id,
            start=start,
            end=end,
        )
        self.machine_timeline[wc_id].append((start, end))
        self.machine_timeline[wc_id].sort()
        self.machine_available[wc_id] = end
        self.n_scheduled += 1
        self.current_makespan = max(self.current_makespan, end)

    def get_obs(self) -> np.ndarray:
        """Build observation matching the training env format"""
        obs_size = (self.MAX_TASKS * self.TASK_FEAT +
                    self.MAX_MACHINES * self.MACHINE_FEAT + 3)
        obs = np.zeros(obs_size, dtype=np.float32)
        norm = max(self.horizon_minutes, 1)

        for i, task in enumerate(self.tasks[:self.MAX_TASKS]):
            base = i * self.TASK_FEAT
            obs[base] = 1.0
            if self.scheduled[i] is not None:
                obs[base + 1] = 1.0
            # flexibility: number of alternative machines (matches General notebook)
            n_alt = len(task.processing_times)
            obs[base + 2] = min(n_alt / 10.0, 1.0)
            pts = list(task.processing_times.values())
            obs[base + 3] = min((np.mean(pts) if pts else 0) / norm, 1.0)
            obs[base + 4] = task.setup_time / norm
            # quantity (matches General notebook: qty / 50.0)
            obs[base + 5] = min(task.quantity / 50.0, 1.0)
            n_preds = len(task.predecessors)
            if n_preds > 0:
                done = sum(1 for p in task.predecessors if self.scheduled[p] is not None)
                obs[base + 6] = done / n_preds
            else:
                obs[base + 6] = 1.0
            
            # release_time and due_date features removed to match RL_Scheduling_Training_General_1000.ipynb
            # (Task features = 7)

        m_base = self.MAX_TASKS * self.TASK_FEAT
        sorted_m_ids = sorted(self.machines.keys())  # MUST match training env ordering
        for i, m_id in enumerate(sorted_m_ids[:self.MAX_MACHINES]):
            base = m_base + i * self.MACHINE_FEAT
            obs[base] = 1.0
            obs[base + 1] = min(self.machine_available.get(m_id, 0) / norm, 1.0)
            total_busy = sum(e - s for s, e in self.machine_timeline.get(m_id, []))
            obs[base + 2] = min(total_busy / norm, 1.0)
            # NEW: queue pressure - how many unscheduled tasks can use this machine
            n_queued = sum(1 for t in self.tasks
                         if self.scheduled[t.global_idx] is None and m_id in t.processing_times)
            obs[base + 3] = min(n_queued / max(len(self.tasks), 1), 1.0)

        g_base = m_base + self.MAX_MACHINES * self.MACHINE_FEAT
        obs[g_base] = self.n_scheduled / max(len(self.tasks), 1)
        obs[g_base + 1] = min(self.current_makespan / norm, 1.0)
        # NEW: available tasks ratio
        valid = self.get_valid_actions()
        valid_tasks = len(set(t for t, m in valid))
        obs[g_base + 2] = valid_tasks / max(len(self.tasks), 1)

        return obs

    def decode_action(self, action: int, valid_actions: List[Tuple[int, int]]) -> Tuple[int, int]:
        """Map raw model action to (task_idx, machine_id).

        2-step approach:
          1) Model selects WHICH TASK to schedule (action → task index)
          2) Environment auto-selects the FASTEST machine (earliest completion)

        This guarantees the fastest machine is always chosen.
        """
        # Step 1: Decode action as task selection
        # (Since model action space is Discrete(MAX_TASKS), action directly maps to task index)
        task_a = action

        # Find the closest valid task
        valid_tasks = list(set(t for t, m in valid_actions))
        best_task = min(valid_tasks, key=lambda t: abs(t - task_a))

        # Step 2: For the selected task, pick machine with EARLIEST completion
        candidates = [(t, m) for t, m in valid_actions if t == best_task]
        best = None
        best_end = float('inf')
        for (t_idx, m_id) in candidates:
            task = self.tasks[t_idx]
            duration = task.processing_times.get(m_id, 60)
            est_start = self.get_earliest_start(t_idx, m_id)
            est_end = est_start + duration
            if est_end < best_end:
                best_end = est_end
                best = (t_idx, m_id)
        return best or valid_actions[0]

    # ---- Convert results to DB format ----

    def to_schedule_data(self) -> List[Dict]:
        """Convert scheduled results to the same format expected by save_schedule_results"""
        schedule_data = []
        for result in self.scheduled:
            if result is None:
                continue
            task = self.tasks[result.global_idx]
            op_id = self.data.get_operation_id_from_routing(task.routing_id)

            schedule_data.append({
                'production_order_id': task.job_key[0],
                'product_id': task.job_key[1],
                'work_center_id': result.machine_id,
                'operation_id': op_id,
                'start_minutes': result.start,
                'end_minutes': result.end,
                'shift_id': None,
                'notes': 'RL scheduled',
            })
        return schedule_data


# ---------------------------------------------------------------------------
# Main entry point (same interface as run_scheduling)
# ---------------------------------------------------------------------------

def run_rl_scheduling(
    engine,
    production_ids: List[int],
    model_path: str = "rl_jssp_scheduler",
    max_workers: int = 600,
    save_to_db: bool = True,
) -> ScheduleResult:
    """
    Run RL-based scheduling for given production orders.

    Args:
        engine: SQLAlchemy engine
        production_ids: List of production order IDs
        model_path: Path to saved SB3 model (without .zip extension)
        max_workers: Max concurrent workers
        save_to_db: Whether to persist results

    Returns:
        ScheduleResult (same format as CP-SAT solver)
    """
    from stable_baselines3 import PPO

    # 1. Load data (same as CP-SAT)
    data = SchedulingDataManager(engine)
    data.load_all(production_ids=production_ids)

    if not data.productions:
        return ScheduleResult(status="NO_DATA", message="No production orders to schedule")

    # 2. Load RL model
    if not os.path.exists(f"{model_path}.zip") and not os.path.exists(model_path):
        return ScheduleResult(
            status="MODEL_NOT_FOUND",
            message=f"RL model not found at {model_path}"
        )
    model = PPO.load(model_path)

    # 3. Build inference environment
    scheduler = RLSchedulerInference(data, max_workers=max_workers)
    scheduler.reset()

    # 4. Run inference
    start_time = time_module.time()
    obs = scheduler.get_obs()
    steps = 0
    max_steps = len(scheduler.tasks) * 3  # safety limit

    while scheduler.n_scheduled < len(scheduler.tasks) and steps < max_steps:
        valid = scheduler.get_valid_actions()
        if not valid:
            break

        action, _ = model.predict(obs, deterministic=True)
        t_idx, m_id = scheduler.decode_action(int(action), valid)
        scheduler.schedule_task(t_idx, m_id)
        obs = scheduler.get_obs()
        steps += 1

    solve_time = time_module.time() - start_time

    # 5. Build result
    if scheduler.n_scheduled == 0:
        return ScheduleResult(
            status="INFEASIBLE",
            solve_time_seconds=solve_time,
            message="RL model could not schedule any tasks"
        )

    schedule_data = scheduler.to_schedule_data()

    status = "FEASIBLE" if scheduler.n_scheduled == len(scheduler.tasks) else "PARTIAL"

    result = ScheduleResult(
        status=status,
        makespan=scheduler.current_makespan,
        schedule_data=schedule_data,
        solve_time_seconds=solve_time,
        message=f"RL scheduled {scheduler.n_scheduled}/{len(scheduler.tasks)} tasks, "
                f"makespan {scheduler.current_makespan} min"
    )

    # 6. Save to DB (same pipeline as CP-SAT)
    if save_to_db and schedule_data:
        records_saved = data.save_schedule_results(schedule_data)
        result.message += f" | Saved {records_saved} records to database"
        data.update_production_status(production_ids, result.status)

    return result
