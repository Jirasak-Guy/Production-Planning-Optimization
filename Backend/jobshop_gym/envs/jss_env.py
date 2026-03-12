import bisect
import datetime
import math
import random
from decimal import Decimal, ROUND_CEILING

import gymnasium as gym
import numpy as np
import pandas as pd
import plotly.figure_factory as ff
from gymnasium import spaces

from jobshop_gym.data_manager import SchedulingDataManager

# Number of observation features per job
N_FEATURES = 8
DEFAULT_MAX_SHIFT_DURATION = 60
# Feature layout:
#  0 — is_legal_action              (bool as float)
#  1 — time_remaining_current_op    / max_time_op
#  2 — op_progress                  = todo_step / max_ops
#  3 — total_performed_time         / max_time_job
#  4 — time_until_best_wc_free      / max_time_op
#  5 — idle_time_last_op            / sum_op
#  6 — total_idle_time              / sum_op
#  7 — bom_prerequisites_done       (bool as float)


class JobShopEnv(gym.Env):
    """
    Flexible Job Shop Scheduling environment backed by a live database
    via SchedulingDataManager.

    Key differences vs classic JSS:
    - Each operation can be processed by *multiple* work centers (different capacities).
      The environment auto-selects the *fastest available* WC when the agent picks a job.
    - Jobs are (production_id, product_id) BOM nodes; BOM children must complete before
      the parent job can start (prerequisite constraint).
    - Processing time: ceil(quantity / wc.capacity_per_hour * 60) + setup_time_minutes
    """

    metadata = {"render_modes": ["human"]}

    def __init__(
        self,
        engine,
        max_jobs=100,
        max_ops=50,
        production_ids=None,
        no_op_wait_penalty=0.2,
        max_shift_duration=DEFAULT_MAX_SHIFT_DURATION,
    ):
        super().__init__()

        # --- 1. Load Data ---
        data = SchedulingDataManager(engine)
        data.load_all(production_ids=production_ids)
        self.holiday_windows = self._build_holiday_windows(data.holidays)

        schedule_start = data.schedule_start_time
        if isinstance(schedule_start, datetime.datetime):
            self.schedule_start_datetime = schedule_start
        elif schedule_start is not None:
            self.schedule_start_datetime = datetime.datetime.combine(
                schedule_start, datetime.time.min
            )
        else:
            self.schedule_start_datetime = datetime.datetime.combine(
                datetime.date.today(), datetime.time.min
            )
        self.schedule_start_week_minute = (
            self.schedule_start_datetime.weekday() * 1440
            + self.schedule_start_datetime.hour * 60
            + self.schedule_start_datetime.minute
        )
        now_dt = datetime.datetime.now()
        self.now_minute_offset = max(
            0,
            int((now_dt - self.schedule_start_datetime).total_seconds() // 60),
        )

        # --- 2. Parse into internal structures ---
        (
            self.instance_matrix,    # List[List[List[(wc_idx, total, setup, processing)]]]
            self.jobs_ops_count,     # ndarray (max_jobs,)
            jobs_length,             # ndarray (actual_jobs,)
            self.max_time_op,        # int — normalisation max
            self.sum_op,             # int — normalisation sum
            self.job_prerequisites,  # List[List[int]] (max_jobs,)
            self.jobs,               # int  actual jobs
            self.machines,           # int  unique work centres
            self.job_keys,           # List[(prod_id, product_id)]
            self.wc_ids,             # List[int]  wc_idx -> real wc_id
            self.wc_names,           # List[str]  wc_idx -> work center name
            self.op_dependencies,    # List[List[List[(pred_op_idx, lag_time)]]]
            self.job_release_times,  # ndarray (max_jobs,) minute offsets from schedule start
        ) = self._parse_data(data, max_jobs, max_ops)

        self.max_jobs      = max_jobs
        self.max_ops       = max_ops
        self.max_shift_duration = int(max_shift_duration)
        if self.jobs > 0:
            self.job_release_times[: self.jobs] = np.maximum(
                self.job_release_times[: self.jobs],
                self.now_minute_offset,
            )
        self.max_time_jobs = int(max(jobs_length)) if self.jobs > 0 else 1
        self.no_op_wait_penalty = float(no_op_wait_penalty)
        (
            self.wc_shift_windows,
            self.wc_shift_starts,
        ) = self._build_wc_shift_calendars(data)
        (
            self.wc_existing_blocks,
            self.wc_existing_block_starts,
        ) = self._build_wc_existing_block_calendars(data)

        # --- 3. Gym spaces ---
        self.action_space = spaces.Discrete(self.max_jobs + 1)  # +1 for NO-OP

        self.observation_space = spaces.Dict({
            "action_mask": spaces.Box(0, 1, shape=(self.max_jobs + 1,), dtype=bool),
            "real_obs":    spaces.Box(
                low=0.0, high=1.0, shape=(self.max_jobs, N_FEATURES), dtype=float
            ),
        })

        # --- 4. Runtime state (populated in reset()) ---
        self.solution                    = None
        self.selected_wc_for_solution    = None
        self.current_time_step: int      = 0
        self.current_makespan:  int      = 0
        self.next_time_step: list        = []
        self.next_jobs:      list        = []
        self.nb_legal_actions:  int      = 0
        self.nb_machine_legal:  int      = 0
        self.legal_actions               = None
        self.time_until_available_machine      = None
        # Per-operation status tracking (DAG model)
        self.op_status                         = None  # [job][op] -> 0=pending, 1=running, 2=done
        self.op_remaining_time                 = None  # [job][op] -> time left for running ops
        self.op_scheduled_duration             = None  # [job][op] -> elapsed duration once scheduled
        self.total_perform_op_time_jobs        = None
        self.total_idle_time_jobs              = None
        self.idle_time_jobs_last_op            = None
        self.job_completed                     = None
        self.job_bom_ready                     = None
        self.illegal_actions                   = None
        self.action_illegal_no_op              = None
        self.machine_legal                     = None
        self.state                             = None
        self.deadlock_detected: bool           = False

        # Rendering
        self.start_timestamp = datetime.datetime.combine(
            datetime.date.today(), datetime.time.min
        ).timestamp()  # 00:00:00 today
        # One stable colour per job (indexed by job idx)
        self.job_colors = [
            tuple([random.random() for _ in range(3)]) for _ in range(max_jobs)
        ]

    # ------------------------------------------------------------------
    # Data parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_data(data: SchedulingDataManager, max_jobs: int, max_ops: int):
        """
        Convert SchedulingDataManager output into flat arrays for the env.

        instance_matrix[job][op] = [(wc_idx, total_time, setup_time, processing_time), ...]
            sorted fastest-first (shortest total_time = highest capacity).
        job_prerequisites[job] = [child_job_indices that must complete first]
        """
        # Sort job keys by priority (1=highest), due date (earliest first),
        # then production_id and product_id as tie-breakers.
        # Build priority lookup from productions list (no dependency on data_manager).
        prod_priorities = {p.id: p.priority for p in data.productions}

        def _job_sort_key(k):
            prod_id, product_id = k
            priority = prod_priorities.get(prod_id, 5)
            due = data.production_dates.get(prod_id)
            due_minutes = due.due_minutes if due else 0
            return (priority, due_minutes, prod_id, product_id)

        job_keys       = sorted(data.jobs.keys(), key=_job_sort_key)
        actual_jobs    = min(len(job_keys), max_jobs)
        job_key_to_idx = {k: i for i, k in enumerate(job_keys[:actual_jobs])}

        wc_ids_ordered  = sorted(data.work_centers.keys())
        wc_id_to_idx    = {wc_id: idx for idx, wc_id in enumerate(wc_ids_ordered)}
        actual_machines = len(wc_ids_ordered)

        instance_matrix  = [[[] for _ in range(max_ops)] for _ in range(max_jobs)]
        op_dependencies  = [[[] for _ in range(max_ops)] for _ in range(max_jobs)]
        job_release_times = np.zeros(max_jobs, dtype=int)
        jobs_ops_count   = np.zeros(max_jobs, dtype=int)
        jobs_length      = np.zeros(actual_jobs, dtype=int)
        max_time_op      = 1
        sum_op           = 0

        for j, key in enumerate(job_keys[:actual_jobs]):
            job_data = data.jobs[key]
            prod_id, _ = key
            release_info = data.production_dates.get(prod_id)
            if release_info is not None:
                job_release_times[j] = max(0, int(release_info.release_minutes))

            qty      = max(1, int(job_data.quantity))
            routings = sorted(job_data.routing, key=lambda r: (r.sequence_number, r.id))

            # Build routing_id -> op_idx mapping for dependency lookup later
            routing_id_to_op_idx = {}
            op_idx = 0
            for routing in routings:
                if op_idx >= max_ops:
                    break
                op_id      = routing.operation_id
                setup_time = routing.setup_time_minutes
                wc_list    = data.operation_to_work_centers.get(op_id, [])

                options = []
                for wc_id in wc_list:
                    wc = data.work_centers.get(wc_id)
                    if wc is None or not wc.is_active:
                        continue
                    cap_raw = wc.capacity_per_hour
                    try:
                        cap_dec = Decimal(str(cap_raw))
                    except Exception:
                        cap_dec = Decimal(0)

                    if cap_dec > 0:
                        processing_dec = (Decimal(qty) * Decimal(60)) / cap_dec
                        processing_time = int(
                            processing_dec.to_integral_value(rounding=ROUND_CEILING)
                        )
                    else:
                        processing_time = int(qty)

                    processing_time = max(1, processing_time)

                    total_time = processing_time + setup_time
                    options.append(
                        (wc_id_to_idx[wc_id], total_time, int(setup_time), int(processing_time))
                    )

                if not options:
                    continue

                # Fastest first, deterministic tie-break by machine index.
                options.sort(key=lambda x: (x[1], x[0]))
                instance_matrix[j][op_idx] = options
                jobs_ops_count[j]          += 1
                routing_id_to_op_idx[routing.id] = op_idx

                fastest = options[0][1]
                slowest = options[-1][1]
                max_time_op     = max(max_time_op, slowest)
                jobs_length[j] += fastest
                sum_op          += fastest
                op_idx          += 1

            # Build operation dependencies with lag times for this job
            for routing in routings:
                if routing.id not in routing_id_to_op_idx:
                    continue
                cur_op_idx = routing_id_to_op_idx[routing.id]
                for (succ_id, pred_id), lag_time in data.operation_dependencies.items():
                    if succ_id == routing.id and pred_id in routing_id_to_op_idx:
                        pred_op_idx = routing_id_to_op_idx[pred_id]
                        op_dependencies[j][cur_op_idx].append((pred_op_idx, lag_time))

        # BOM: job j must wait until all its children finish
        job_prerequisites = [[] for _ in range(max_jobs)]
        for j, key in enumerate(job_keys[:actual_jobs]):
            prod_id, _ = key
            for bom in data.jobs[key].bom_children:
                child_key = (prod_id, bom.component_product_id)
                if child_key in job_key_to_idx:
                    job_prerequisites[j].append(job_key_to_idx[child_key])

        sum_op = max(sum_op, 1)

        # Build wc_names: wc_idx -> work center name (fallback to "WC {id}")
        wc_names = [
            data.work_centers[wc_id].name
            if wc_id in data.work_centers and data.work_centers[wc_id].name
            else f"WC {wc_id}"
            for wc_id in wc_ids_ordered
        ]

        return (
            instance_matrix,
            jobs_ops_count,
            jobs_length,
            max_time_op,
            sum_op,
            job_prerequisites,
            actual_jobs,
            actual_machines,
            job_keys[:actual_jobs],
            wc_ids_ordered,
            wc_names,
            op_dependencies,
            job_release_times,
        )

    @staticmethod
    def _build_holiday_windows(raw_holidays):
        """Normalize and merge holiday windows as [(start, end), ...] in minutes."""
        if not raw_holidays:
            return []

        windows = []
        for start, duration in raw_holidays:
            s = int(start)
            e = s + max(0, int(duration))
            if e > s:
                windows.append((s, e))

        if not windows:
            return []

        windows.sort(key=lambda x: x[0])
        merged = [windows[0]]
        for s, e in windows[1:]:
            last_s, last_e = merged[-1]
            if s <= last_e:
                merged[-1] = (last_s, max(last_e, e))
            else:
                merged.append((s, e))
        return merged

    @staticmethod
    def _normalize_shift_day(day_key: int) -> int:
        day = int(day_key)
        if 1 <= day <= 7:
            return day - 1
        return day % 7

    def _build_wc_shift_calendars(self, data: SchedulingDataManager):
        """Build weekly shift windows for each WC index.

        Windows are stored in minutes-of-week [0, 10080). Empty window means
        no shift config is available and the WC is treated as always-open.
        """
        week_minutes = 7 * 24 * 60
        wc_shift_windows = {wc_idx: [] for wc_idx in range(self.machines)}
        wc_shift_starts = {wc_idx: [] for wc_idx in range(self.machines)}

        for wc_idx, wc_id in enumerate(self.wc_ids):
            wc_info = data.work_centers.get(wc_id)
            if wc_info is None:
                continue

            raw_windows = []
            for day_key, shifts in wc_info.shifts.items():
                day = self._normalize_shift_day(day_key)
                for start_t, end_t in shifts:
                    start_min = start_t.hour * 60 + start_t.minute
                    end_min = end_t.hour * 60 + end_t.minute

                    day_start = day * 1440
                    if end_min > start_min:
                        raw_windows.append((day_start + start_min, day_start + end_min))
                    elif end_min < start_min:
                        raw_windows.append((day_start + start_min, day_start + 1440))
                        next_day = (day + 1) % 7
                        raw_windows.append((next_day * 1440, next_day * 1440 + end_min))
                    else:
                        # start == end means a full-day shift for that day
                        raw_windows.append((day_start, day_start + 1440))

            normalized = []
            for s, e in raw_windows:
                s = int(max(0, min(s, week_minutes)))
                e = int(max(0, min(e, week_minutes)))
                if s < e:
                    normalized.append((s, e))
                elif s > e:
                    # Wrap-around interval split across week boundary
                    normalized.append((s, week_minutes))
                    normalized.append((0, e))

            if not normalized:
                continue

            normalized.sort(key=lambda x: x[0])
            merged = [normalized[0]]
            for s, e in normalized[1:]:
                last_s, last_e = merged[-1]
                if s <= last_e:
                    merged[-1] = (last_s, max(last_e, e))
                else:
                    merged.append((s, e))

            wc_shift_windows[wc_idx] = merged
            wc_shift_starts[wc_idx] = [s for s, _ in merged]

        return wc_shift_windows, wc_shift_starts

    def _build_wc_existing_block_calendars(self, data: SchedulingDataManager):
        """Build per-WC unavailable windows as minute intervals.

        These windows combine time already reserved by other production orders
        with full-day work-center calendar exceptions.
        """
        wc_existing_blocks = {wc_idx: [] for wc_idx in range(self.machines)}
        wc_existing_block_starts = {wc_idx: [] for wc_idx in range(self.machines)}
        wc_id_to_idx = {wc_id: idx for idx, wc_id in enumerate(self.wc_ids)}

        for block in getattr(data, "existing_schedule_blocks", []):
            wc_idx = wc_id_to_idx.get(block.work_center_id)
            if wc_idx is None:
                continue
            s = int(block.start_minutes)
            e = int(block.end_minutes)
            if e <= s:
                continue
            wc_existing_blocks[wc_idx].append((s, e))

        for wc_id, exception_blocks in getattr(data, "work_center_exceptions", {}).items():
            wc_idx = wc_id_to_idx.get(wc_id)
            if wc_idx is None:
                continue
            for block in exception_blocks:
                s = int(block.start_minutes)
                e = int(block.end_minutes)
                if e <= s:
                    continue
                wc_existing_blocks[wc_idx].append((s, e))

        for wc_idx in range(self.machines):
            blocks = wc_existing_blocks[wc_idx]
            if not blocks:
                continue
            blocks.sort(key=lambda x: x[0])
            merged = [blocks[0]]
            for s, e in blocks[1:]:
                last_s, last_e = merged[-1]
                if s <= last_e:
                    merged[-1] = (last_s, max(last_e, e))
                else:
                    merged.append((s, e))
            wc_existing_blocks[wc_idx] = merged
            wc_existing_block_starts[wc_idx] = [s for s, _ in merged]

        return wc_existing_blocks, wc_existing_block_starts

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_best_available_wc_for_op(self, job: int, op: int) -> tuple:
        """Return (wc_idx, op_duration) for the best free WC for given op.
        Returns (-1, 0) when none is available."""
        if op >= self.jobs_ops_count[job]:
            return (-1, 0)

        best_wc = -1
        best_duration = 0

        for wc_idx, _, setup_time, processing_time in self.instance_matrix[job][op]:
            if self.time_until_available_machine[wc_idx] != 0:
                continue
            op_duration = self._compute_chunked_op_duration(
                wc_idx,
                setup_time,
                processing_time,
                self.current_time_step,
            )
            if op_duration <= 0:
                continue
            if best_wc == -1 or op_duration < best_duration:
                best_wc = wc_idx
                best_duration = op_duration

        return (best_wc, best_duration) if best_wc != -1 else (-1, 0)

    def _is_bom_ready(self, job: int) -> bool:
        return all(self.job_completed[p] for p in self.job_prerequisites[job])

    def _is_release_ready(self, job: int) -> bool:
        return self.current_time_step >= int(self.job_release_times[job])

    def _is_holiday_time(self, minute: int) -> bool:
        t = int(minute)
        for start, end in self.holiday_windows:
            if t < start:
                return False
            if start <= t < end:
                return True
        return False

    def _minutes_until_next_holiday_start(self, minute: int) -> int:
        t = int(minute)
        if self._is_holiday_time(t):
            return 0
        for start, _ in self.holiday_windows:
            if start > t:
                return start - t
        return 10**9

    def _is_wc_blocked_time(self, wc_idx: int, minute: int) -> bool:
        t = int(minute)
        for start, end in self.wc_existing_blocks.get(wc_idx, []):
            if t < start:
                return False
            if start <= t < end:
                return True
        return False

    def _current_wc_block_end(self, wc_idx: int, minute: int):
        t = int(minute)
        for start, end in self.wc_existing_blocks.get(wc_idx, []):
            if start <= t < end:
                return end
            if t < start:
                return None
        return None

    def _minutes_until_next_wc_block_start(self, wc_idx: int, minute: int) -> int:
        t = int(minute)
        if self._is_wc_blocked_time(wc_idx, t):
            return 0
        for start, _ in self.wc_existing_blocks.get(wc_idx, []):
            if start > t:
                return start - t
        return 10**9

    def _to_week_minute(self, minute: int) -> int:
        week_minutes = 7 * 24 * 60
        return int((self.schedule_start_week_minute + int(minute)) % week_minutes)

    def _minutes_until_wc_shift_end(self, wc_idx: int, minute: int) -> int:
        """Minutes until current shift ends for a WC. 0 if WC is off-shift now.

        If WC has no shift config, treat it as always-open for compatibility.
        """
        windows = self.wc_shift_windows.get(wc_idx, [])
        if not windows:
            return 10**9

        week_min = self._to_week_minute(minute)
        for start, end in windows:
            if start <= week_min < end:
                return end - week_min
        return 0

    def _next_wc_shift_start(self, wc_idx: int, minute: int):
        starts = self.wc_shift_starts.get(wc_idx, [])
        if not starts:
            return None

        week_minutes = 7 * 24 * 60
        week_min = self._to_week_minute(minute)
        best_delta = None
        for start in starts:
            delta = (start - week_min) % week_minutes
            if delta == 0:
                delta = week_minutes
            if best_delta is None or delta < best_delta:
                best_delta = delta

        if best_delta is None:
            return None
        return int(minute + best_delta)

    def _minutes_available_on_wc_from_now(self, wc_idx: int) -> int:
        if self.time_until_available_machine[wc_idx] > 0:
            return 0
        holiday_contiguous = self._minutes_until_next_holiday_start(self.current_time_step)
        shift_contiguous = self._minutes_until_wc_shift_end(wc_idx, self.current_time_step)
        existing_block_contiguous = self._minutes_until_next_wc_block_start(
            wc_idx, self.current_time_step
        )
        return int(min(holiday_contiguous, shift_contiguous, existing_block_contiguous))

    def _minutes_available_on_wc_from(self, wc_idx: int, minute: int) -> int:
        holiday_contiguous = self._minutes_until_next_holiday_start(minute)
        shift_contiguous = self._minutes_until_wc_shift_end(wc_idx, minute)
        existing_block_contiguous = self._minutes_until_next_wc_block_start(wc_idx, minute)
        return int(min(holiday_contiguous, shift_contiguous, existing_block_contiguous))

    def _current_holiday_end(self, minute: int):
        t = int(minute)
        for start, end in self.holiday_windows:
            if start <= t < end:
                return end
            if t < start:
                return None
        return None

    def _next_working_minute(self, wc_idx: int, minute: int):
        """Return earliest minute >= input where WC is on-shift and not in holiday."""
        t = int(minute)
        for _ in range(2000):
            holiday_end = self._current_holiday_end(t)
            if holiday_end is not None:
                t = holiday_end
                continue

            block_end = self._current_wc_block_end(wc_idx, t)
            if block_end is not None:
                t = block_end
                continue

            if self._minutes_until_wc_shift_end(wc_idx, t) > 0:
                return t

            next_shift_start = self._next_wc_shift_start(wc_idx, t)
            if next_shift_start is None:
                return None
            if next_shift_start <= t:
                next_shift_start = t + 1
            t = next_shift_start
        return None

    def _compute_chunked_op_duration(
        self,
        wc_idx: int,
        setup_time: int,
        processing_time: int,
        start_minute: int,
    ) -> int:
        """Compute elapsed duration with OR-Tools-like chunking and setup rules.

        Chunking rule:
        - Processing is split into chunks of max_shift_duration minutes.
        - First chunk always includes setup.
        - Later chunks include setup only if they cannot start immediately after
          the previous chunk (gap due to shift/holiday).
        """
        if processing_time <= 0:
            return 0

        cursor = int(start_minute)
        if self._next_working_minute(wc_idx, cursor) != cursor:
            return 0

        remaining_processing = int(processing_time)
        chunk_cap = int(self.max_shift_duration) if self.max_shift_duration > 0 else remaining_processing
        elapsed = 0
        needs_setup = True

        for _ in range(2000):
            if remaining_processing <= 0:
                return elapsed

            contiguous = self._minutes_available_on_wc_from(wc_idx, cursor)
            if contiguous <= 0:
                next_work = self._next_working_minute(wc_idx, cursor)
                if next_work is None or next_work <= cursor:
                    return 0
                elapsed += next_work - cursor
                cursor = next_work
                needs_setup = True
                continue

            chunk_processing = min(remaining_processing, chunk_cap)
            setup_needed = int(setup_time) if needs_setup else 0
            required = setup_needed + chunk_processing

            if required <= contiguous:
                cursor += required
                elapsed += required
                remaining_processing -= chunk_processing
                needs_setup = False
                continue

            # Match OR-Tools chunk semantics: if first chunk cannot fit now,
            # this operation cannot start at the current time.
            if remaining_processing == int(processing_time):
                return 0

            # This chunk does not fit in current contiguous window.
            cursor += contiguous
            elapsed += contiguous
            needs_setup = True

        return 0

    def _schedule_next_existing_block_boundary(self):
        """Schedule nearest upcoming start/end boundary from existing blocks."""
        current = int(self.current_time_step)
        next_boundary = None

        for wc_idx in range(self.machines):
            for start, end in self.wc_existing_blocks.get(wc_idx, []):
                if current < start:
                    candidate = start
                elif start <= current < end:
                    candidate = end
                else:
                    continue

                if next_boundary is None or candidate < next_boundary:
                    next_boundary = candidate
                break

        if next_boundary is None or next_boundary <= current:
            return
        if next_boundary in self.next_time_step:
            return

        idx = bisect.bisect_left(self.next_time_step, next_boundary)
        self.next_time_step.insert(idx, next_boundary)
        self.next_jobs.insert(idx, -1)

    def _schedule_next_holiday_boundary(self):
        t = int(self.current_time_step)
        boundary = None
        for start, end in self.holiday_windows:
            if t < start:
                boundary = start
                break
            if start <= t < end:
                boundary = end
                break

        if boundary is None or boundary <= t:
            return
        if boundary in self.next_time_step:
            return

        idx = bisect.bisect_left(self.next_time_step, boundary)
        self.next_time_step.insert(idx, boundary)
        self.next_jobs.insert(idx, -1)

    def _schedule_next_shift_boundary(self):
        """Schedule the next upcoming shift start across all work centers."""
        current = int(self.current_time_step)
        next_boundary = None
        for wc_idx in range(self.machines):
            start = self._next_wc_shift_start(wc_idx, current)
            if start is None:
                continue
            if next_boundary is None or start < next_boundary:
                next_boundary = start

        if next_boundary is None or next_boundary <= current:
            return
        if next_boundary in self.next_time_step:
            return

        idx = bisect.bisect_left(self.next_time_step, next_boundary)
        self.next_time_step.insert(idx, next_boundary)
        self.next_jobs.insert(idx, -1)

    def _schedule_release_event(self, job: int):
        release_time = int(self.job_release_times[job])
        if release_time <= self.current_time_step:
            return
        if release_time in self.next_time_step:
            return
        idx = bisect.bisect_left(self.next_time_step, release_time)
        self.next_time_step.insert(idx, release_time)
        self.next_jobs.insert(idx, job)

    def _proc_time_for_wc(self, job: int, op: int, wc_idx: int) -> int:
        for w, t, _, _ in self.instance_matrix[job][op]:
            if w == wc_idx:
                return t
        return 0

    def _op_times_for_wc(self, job: int, op: int, wc_idx: int) -> tuple:
        """Return (setup_time, processing_time) for job/op on selected WC."""
        for w, _, setup_time, processing_time in self.instance_matrix[job][op]:
            if w == wc_idx:
                return int(setup_time), int(processing_time)
        return (0, 0)

    def _build_operation_work_segments(
        self,
        wc_idx: int,
        setup_time: int,
        processing_time: int,
        start_minute: int,
    ) -> list:
        """Build active work segments for rendering, excluding wait gaps.

        Segments follow the same chunking/setup semantics used by
        _compute_chunked_op_duration so Gantt bars reflect actual on-shift work.
        """
        if processing_time <= 0:
            return []

        cursor = int(start_minute)
        if self._next_working_minute(wc_idx, cursor) != cursor:
            return []

        remaining_processing = int(processing_time)
        original_processing = int(processing_time)
        chunk_cap = int(self.max_shift_duration) if self.max_shift_duration > 0 else remaining_processing
        needs_setup = True
        segments = []

        for _ in range(2000):
            if remaining_processing <= 0:
                return segments

            contiguous = self._minutes_available_on_wc_from(wc_idx, cursor)
            if contiguous <= 0:
                next_work = self._next_working_minute(wc_idx, cursor)
                if next_work is None or next_work <= cursor:
                    return []
                cursor = next_work
                needs_setup = True
                continue

            chunk_processing = min(remaining_processing, chunk_cap)
            setup_needed = int(setup_time) if needs_setup else 0
            required = setup_needed + chunk_processing

            if required <= contiguous:
                seg_start = cursor
                seg_end = cursor + required
                segments.append((seg_start, seg_end))
                cursor = seg_end
                remaining_processing -= chunk_processing
                needs_setup = False
                continue

            if remaining_processing == original_processing:
                return []

            # Chunk is atomic (like CP-SAT interval): if it does not fit in the
            # current contiguous window, wait until the next working window.
            # Do not emit a partial work segment here.
            cursor = cursor + contiguous
            needs_setup = True

        return []

    def _get_op_finish_time(self, job: int, op: int) -> int:
        """Return the finish time of a completed or running op. -1 if not started."""
        if self.op_status[job][op] == 0:  # pending
            return -1
        start = self.solution[job][op]
        if start == -1:
            return -1
        wc = self.selected_wc_for_solution[job][op]
        scheduled_duration = int(self.op_scheduled_duration[job][op])
        if scheduled_duration > 0:
            return start + scheduled_duration
        proc_time = self._proc_time_for_wc(job, op, wc)
        return start + proc_time

    def _is_op_ready(self, job: int, op: int) -> bool:
        """Check if op can be scheduled: predecessors done + lag satisfied.
        
        If no explicit dependencies are defined, fall back to sequential order:
        all previous ops (by index) must be completed.
        """
        if self.op_status[job][op] != 0:  # already running or completed
            return False
        
        deps = self.op_dependencies[job][op]
        
        if deps:
            # Has explicit dependencies — check them
            for pred_op, lag_time in deps:
                if self.op_status[job][pred_op] != 2:  # predecessor not completed
                    return False
                pred_finish = self._get_op_finish_time(job, pred_op)
                if pred_finish == -1:
                    return False
                if self.current_time_step < pred_finish + lag_time:
                    return False  # lag not satisfied
        else:
            # No explicit dependencies — enforce sequential order by op index
            # All previous ops must be completed
            for prev_op in range(op):
                if self.op_status[job][prev_op] != 2:
                    return False
        
        return True

    def _get_ready_ops(self, job: int) -> list:
        """Return list of (op_idx, wc_idx, op_duration) for ops ready to schedule now."""
        ready = []
        for op in range(self.jobs_ops_count[job]):
            if not self._is_op_ready(job, op):
                continue
            wc_idx, proc_time = self._get_best_available_wc_for_op(job, op)
            if wc_idx != -1:
                ready.append((op, wc_idx, proc_time))
        return ready

    def _compute_lag_for_op(self, job: int, op_idx: int) -> int:
        """Compute the remaining lag time before op_idx can start.

        For each predecessor dependency of this op, check:
            earliest_start = predecessor_finish_time + lag_time
        Return max(0, max(earliest_start) - current_time_step).
        """
        deps = self.op_dependencies[job][op_idx]
        if not deps:
            return 0
        max_earliest = self.current_time_step
        for pred_op_idx, lag_time in deps:
            if self.op_status[job][pred_op_idx] != 2:  # predecessor not completed
                return 999999  # Large lag to indicate not ready
            pred_finish = self._get_op_finish_time(job, pred_op_idx)
            if pred_finish == -1:
                return 999999
            earliest = pred_finish + lag_time
            max_earliest = max(max_earliest, earliest)
        return max(0, max_earliest - self.current_time_step)

    # ------------------------------------------------------------------
    # Reset
    # ------------------------------------------------------------------

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)

        # Re-scheduling starts from "now" relative to schedule anchor.
        self.current_time_step = int(self.now_minute_offset)
        self.current_makespan  = int(self.now_minute_offset)
        self.next_time_step    = []
        self.next_jobs         = []
        self.nb_legal_actions  = 0
        self.nb_machine_legal  = 0

        self.legal_actions                = np.zeros(self.max_jobs + 1, dtype=bool)
        self.time_until_available_machine = np.zeros(self.machines, dtype=int)
        
        # Per-operation state (DAG model)
        self.op_status         = np.zeros((self.max_jobs, self.max_ops), dtype=int)  # 0=pending, 1=running, 2=done
        self.op_remaining_time = np.zeros((self.max_jobs, self.max_ops), dtype=int)
        self.op_scheduled_duration = np.zeros((self.max_jobs, self.max_ops), dtype=int)
        
        self.total_perform_op_time_jobs = np.zeros(self.max_jobs, dtype=int)
        self.total_idle_time_jobs       = np.zeros(self.max_jobs, dtype=int)
        self.idle_time_jobs_last_op     = np.zeros(self.max_jobs, dtype=int)
        self.job_completed              = np.zeros(self.max_jobs, dtype=bool)
        self.job_bom_ready              = np.zeros(self.max_jobs, dtype=bool)

        self.solution                 = np.full((self.max_jobs, self.max_ops), -1, dtype=int)
        self.selected_wc_for_solution = np.full((self.max_jobs, self.max_ops), -1, dtype=int)

        self.illegal_actions      = np.zeros((self.machines, self.max_jobs), dtype=bool)
        self.action_illegal_no_op = np.zeros(self.max_jobs, dtype=bool)
        self.machine_legal        = np.zeros(self.machines, dtype=bool)
        self.state                = np.zeros((self.max_jobs, N_FEATURES), dtype=float)
        self.deadlock_detected    = False

        # Auto-complete jobs with no operations so BOM dependents can unlock
        for job in range(self.jobs):
            if self.jobs_ops_count[job] == 0:
                self.job_completed[job] = True

        # Iteratively unlock BOM dependents of auto-completed jobs
        changed = True
        while changed:
            changed = False
            for job in range(self.jobs):
                if not self.job_completed[job] and self.jobs_ops_count[job] == 0:
                    if self._is_bom_ready(job):
                        self.job_completed[job] = True
                        changed = True

        # Initialize legal actions based on ready ops
        for job in range(self.jobs):
            if self.job_completed[job]:
                continue
            bom_ready = self._is_bom_ready(job)
            self.job_bom_ready[job] = bom_ready
            self.state[job][7]      = float(bom_ready)

            if not self._is_release_ready(job):
                self._schedule_release_event(job)
                continue

            if bom_ready:
                ready_ops = self._get_ready_ops(job)
                if ready_ops:
                    self.legal_actions[job] = True
                    self.nb_legal_actions  += 1
                    for _, wc_idx, _ in ready_ops:
                        if not self.machine_legal[wc_idx]:
                            self.machine_legal[wc_idx] = True
                            self.nb_machine_legal     += 1

        self._schedule_next_holiday_boundary()
        self._schedule_next_shift_boundary()
        self._schedule_next_existing_block_boundary()
        self._check_no_op()

        return self._get_current_state_representation(), {}

    # ------------------------------------------------------------------
    # Step
    # ------------------------------------------------------------------

    def step(self, action):
        action = int(action)
        reward = 0.0

        # Robust guard: any action outside mask is treated as invalid.
        # This also penalizes NO-OP when it is not explicitly legal.
        if (
            action < 0
            or action > self.max_jobs
            or not bool(self.legal_actions[action])
        ):
            return (
                self._get_current_state_representation(),
                self._reward_scaler(-float(self.max_time_op)),
                self._is_done(), False, {},
            )

        # ---- CASE 1: NO-OP -------------------------------------------
        if action == self.max_jobs:
            # NO-OP means waiting until the next scheduled event (op finish / lag expiry).
            # Since this action is legal only when no job action is legal, advancing once is enough.
            before_ts = self.current_time_step
            reward -= self.increase_time_step()
            waited = max(0, self.current_time_step - before_ts)
            reward -= waited * self.no_op_wait_penalty

            self._prioritization_non_final()
            reward -= self._advance_until_legal()
            self._check_no_op()
            
            done = self._is_done()
            info = (
                {
                    "makespan": self.current_makespan,
                    "deadlock": self.deadlock_detected,
                }
                if done
                else {}
            )
            
            return (
                self._get_current_state_representation(),
                self._reward_scaler(reward),
                done, False, info,
            )

        # ---- CASE 2: Schedule job ------------------------------------
        # Get ready ops for this job
        ready_ops = self._get_ready_ops(action)
        if not ready_ops:
            # This shouldn't happen if action mask is correct
            return (
                self._get_current_state_representation(),
                self._reward_scaler(-float(self.max_time_op)),
                self._is_done(), False, {},
            )

        # Pick first ready op (smallest op_idx)
        op_to_schedule, wc_idx, time_needed = ready_ops[0]

        # Reward: penalize for time consumed (we want to minimize makespan)
        # Small penalty encourages scheduling but not waiting
        reward -= time_needed * 0.1

        # Mark op as running
        self.op_status[action][op_to_schedule]         = 1  # running
        self.op_remaining_time[action][op_to_schedule] = time_needed
        self.op_scheduled_duration[action][op_to_schedule] = time_needed
        self.solution[action][op_to_schedule]          = self.current_time_step
        self.selected_wc_for_solution[action][op_to_schedule] = wc_idx

        # Mark WC as busy
        self.time_until_available_machine[wc_idx] = time_needed
        self.state[action][1] = time_needed / self.max_time_op

        # Update makespan
        to_add_time_step      = self.current_time_step + time_needed
        self.current_makespan = max(self.current_makespan, to_add_time_step)

        # Schedule time step for when this op finishes
        if to_add_time_step not in self.next_time_step:
            idx = bisect.bisect_left(self.next_time_step, to_add_time_step)
            self.next_time_step.insert(idx, to_add_time_step)
            self.next_jobs.insert(idx, action)

        # Mark WC as busy (will be handled by _update_legal_actions)
        # Just mark time_until_available so _get_ready_ops sees it as busy
        # The actual WC is already marked busy by time_until_available_machine

        # Clear illegal flags for jobs waiting on this WC (they can try other WCs now)
        for job in range(self.jobs):
            if self.illegal_actions[wc_idx][job]:
                self.action_illegal_no_op[job]    = False
                self.illegal_actions[wc_idx][job] = False

        # Re-evaluate all jobs for legal actions (full recalculation)
        self._update_legal_actions()

        self._prioritization_non_final()
        reward -= self._advance_until_legal()
        self._check_no_op()

        done = self._is_done()
        info = (
            {
                "makespan": self.current_makespan,
                "deadlock": self.deadlock_detected,
            }
            if done
            else {}
        )

        return (
            self._get_current_state_representation(),
            self._reward_scaler(reward),
            done, False, info,
        )

    def _update_legal_actions(self):
        """Re-evaluate legal actions for all jobs based on ready ops and WC availability.
        
        Also schedules lag expiry time steps for jobs waiting on lag.
        This does a FULL recalculation of legal_actions, machine_legal, and their counters.
        """
        # Full reset of legal state
        self.legal_actions[:-1] = False  # Keep NO-OP slot unchanged for now
        self.machine_legal = np.zeros(self.machines, dtype=bool)
        self.nb_legal_actions = 0
        self.nb_machine_legal = 0

        # During holiday windows, no work can be scheduled.
        if self._is_holiday_time(self.current_time_step):
            self._schedule_next_holiday_boundary()
            self._schedule_next_shift_boundary()
            self._schedule_next_existing_block_boundary()
            return
        
        for job in range(self.jobs):
            if self.job_completed[job] or not self.job_bom_ready[job]:
                continue
            if not self._is_release_ready(job):
                self._schedule_release_event(job)
                continue
            if self.action_illegal_no_op[job]:
                continue
            
            ready_ops = self._get_ready_ops(job)
            
            if ready_ops:
                self.legal_actions[job] = True
                self.nb_legal_actions  += 1
                for _, wc_idx, _ in ready_ops:
                    if not self.machine_legal[wc_idx]:
                        self.machine_legal[wc_idx] = True
                        self.nb_machine_legal     += 1
            else:
                # Check for pending ops waiting on lag — schedule expiry if needed
                self._schedule_lag_expiry(job)

        self._schedule_next_holiday_boundary()
        self._schedule_next_shift_boundary()
        self._schedule_next_existing_block_boundary()
    
    def _schedule_lag_expiry(self, job: int):
        """Schedule time steps for when lag times expire for pending ops."""
        for op in range(self.jobs_ops_count[job]):
            if self.op_status[job][op] != 0:
                continue  # not pending
            
            lag = self._compute_lag_for_op(job, op)
            if 0 < lag < 999999:
                # Has lag that will eventually expire
                expiry_time = self.current_time_step + lag
                if expiry_time not in self.next_time_step and expiry_time > self.current_time_step:
                    idx = bisect.bisect_left(self.next_time_step, expiry_time)
                    self.next_time_step.insert(idx, expiry_time)
                    self.next_jobs.insert(idx, job)

    # ------------------------------------------------------------------
    # Time advancement
    # ------------------------------------------------------------------

    def increase_time_step(self) -> int:
        hole_planning = 0
        if not self.next_time_step:
            return 0

        next_time  = self.next_time_step.pop(0)
        self.next_jobs.pop(0)
        difference = next_time - self.current_time_step
        self.current_time_step = next_time

        # Update all running operations
        for job in range(self.jobs):
            job_has_running_op = False
            ops_just_completed = []
            
            for op in range(self.jobs_ops_count[job]):
                if self.op_status[job][op] == 1:  # running
                    job_has_running_op = True
                    remaining = self.op_remaining_time[job][op]
                    performed = min(difference, remaining)
                    self.op_remaining_time[job][op] = max(0, remaining - difference)
                    self.total_perform_op_time_jobs[job] += performed
                    
                    if self.op_remaining_time[job][op] == 0:
                        # Op completed
                        self.op_status[job][op] = 2  # done
                        ops_just_completed.append(op)
            
            # Update state for job (use most recent running op for visualization)
            max_remaining = max(
                (self.op_remaining_time[job][op] for op in range(self.jobs_ops_count[job]) 
                 if self.op_status[job][op] == 1), 
                default=0
            )
            self.state[job][1] = max_remaining / self.max_time_op
            self.state[job][3] = self.total_perform_op_time_jobs[job] / self.max_time_jobs
            
            # Count completed ops for progress
            completed_count = sum(1 for op in range(self.jobs_ops_count[job]) 
                                  if self.op_status[job][op] == 2)
            self.state[job][2] = completed_count / self.max_ops
            
            # Handle completed operations
            if ops_just_completed:
                idle_added = difference - max(
                    (self.op_remaining_time[job][op] for op in range(self.jobs_ops_count[job]) 
                     if self.op_status[job][op] == 1 or op in ops_just_completed),
                    default=difference
                )
                if idle_added > 0:
                    self.total_idle_time_jobs[job]   += idle_added
                    self.idle_time_jobs_last_op[job]  = idle_added
                    self.state[job][5] = self.idle_time_jobs_last_op[job] / self.sum_op
                    self.state[job][6] = self.total_idle_time_jobs[job]   / self.sum_op
                
                # Check if all ops are completed
                if completed_count >= self.jobs_ops_count[job]:
                    self.job_completed[job] = True
                    self.state[job][4]      = 1.0
                    if self.legal_actions[job]:
                        self.legal_actions[job] = False
                        self.nb_legal_actions  -= 1
                    self._unlock_bom_dependents(job)
            
            # Update idle time for waiting jobs
            if not job_has_running_op and not self.job_completed[job]:
                self.total_idle_time_jobs[job]   += difference
                self.idle_time_jobs_last_op[job] += difference
                self.state[job][5] = self.idle_time_jobs_last_op[job] / self.sum_op
                self.state[job][6] = self.total_idle_time_jobs[job]   / self.sum_op

        # Update WC availability
        for wc_idx in range(self.machines):
            was_busy = self.time_until_available_machine[wc_idx] > 0

            if self.time_until_available_machine[wc_idx] < difference:
                hole_planning += difference - self.time_until_available_machine[wc_idx]

            self.time_until_available_machine[wc_idx] = max(
                0, self.time_until_available_machine[wc_idx] - difference
            )

            # WC just became free
            if was_busy and self.time_until_available_machine[wc_idx] == 0:
                if not self.machine_legal[wc_idx]:
                    self.machine_legal[wc_idx] = True
                    self.nb_machine_legal     += 1

        # Clear NO-OP illegal flags (fresh evaluation each time step)
        for job in range(self.jobs):
            self.action_illegal_no_op[job] = False
            for wc_idx in range(self.machines):
                self.illegal_actions[wc_idx][job] = False

        # Re-evaluate all legal actions based on new ready ops
        self._update_legal_actions()
        self._check_no_op()

        return hole_planning

    # ------------------------------------------------------------------
    # BOM unlock
    # ------------------------------------------------------------------

    def _unlock_bom_dependents(self, completed_job: int):
        """After completed_job finishes, unlock jobs whose prerequisites are now all met."""
        for job in range(self.jobs):
            if self.job_completed[job] or self.job_bom_ready[job]:
                continue
            if completed_job not in self.job_prerequisites[job]:
                continue
            if not self._is_bom_ready(job):
                continue
            self.job_bom_ready[job] = True
            self.state[job][7]      = 1.0

            if not self._is_release_ready(job):
                self._schedule_release_event(job)
                continue

            # Check for ready ops
            ready_ops = self._get_ready_ops(job)
            if ready_ops and not self.legal_actions[job]:
                self.legal_actions[job] = True
                self.nb_legal_actions  += 1
                for _, wc_idx, _ in ready_ops:
                    if not self.machine_legal[wc_idx]:
                        self.machine_legal[wc_idx] = True
                        self.nb_machine_legal     += 1

    # ------------------------------------------------------------------
    # Observation
    # ------------------------------------------------------------------

    def _get_current_state_representation(self):
        self.state[:, 0] = self.legal_actions[:-1]
        return {
            "real_obs":    self.state.copy(),
            "action_mask": self.legal_actions.copy(),
        }

    def _reward_scaler(self, reward: float) -> float:
        return reward / self.max_time_op

    def _is_done(self) -> bool:
        if self.deadlock_detected:
            return True
        """True only when every job that has operations has been fully completed."""
        return all(
            self.job_completed[j]
            for j in range(self.jobs)
            if self.jobs_ops_count[j] > 0
        )

    def _has_running_ops(self) -> bool:
        for job in range(self.jobs):
            for op in range(self.jobs_ops_count[job]):
                if self.op_status[job][op] == 1:
                    return True
        return False

    def _advance_until_legal(self) -> float:
        """
        Advance time steps until at least one job action is legal or the
        schedule is truly done.  Called after _prioritization_non_final() in
        case that heuristic wiped all legal actions while jobs are still
        running.  Returns total hole_planning cost accumulated.
        """
        total_hole = 0.0
        max_auto_advances = 10000
        auto_advances = 0
        while self.nb_legal_actions == 0 and self.next_time_step and not self._is_done():
            if auto_advances >= max_auto_advances:
                self.deadlock_detected = True
                break

            prev_time = self.current_time_step
            total_hole += self.increase_time_step()
            self._prioritization_non_final()
            auto_advances += 1

            # No progress + no running op indicates infeasible wait cycle.
            if (
                self.nb_legal_actions == 0
                and not self._has_running_ops()
                and self.current_time_step == prev_time
            ):
                self.deadlock_detected = True
                break
        return total_hole

    def action_masks(self):
        return self.legal_actions

    # ------------------------------------------------------------------
    # Heuristics
    # ------------------------------------------------------------------

    def _prioritization_non_final(self):
        """De-prioritise long final-op jobs when shorter non-final jobs are competing.
        
        Simplified for DAG model: disabled for now as parallel ops make this more complex.
        """
        # TODO: Implement prioritization heuristic for DAG model
        pass

    def _check_no_op(self):
        """Decide whether the NO-OP action should be legal.

        Keep NO-OP strict: legal only when there is nothing schedulable now,
        but future events exist that can change legality.
        """
        self.legal_actions[self.max_jobs] = False
        if self.nb_legal_actions == 0 and bool(self.next_time_step):
            self.legal_actions[self.max_jobs] = True

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------

    def render(self, mode="human"):
        df = []
        for job in range(self.jobs):
            for op in range(self.jobs_ops_count[job]):
                if self.solution[job][op] == -1:
                    continue
                wc_idx    = self.selected_wc_for_solution[job][op]
                wc_label  = (self.wc_names[wc_idx]
                             if 0 <= wc_idx < len(self.wc_names) else f"WC {wc_idx}")
                scheduled_duration = int(self.op_scheduled_duration[job][op])
                if scheduled_duration <= 0:
                    scheduled_duration = self._proc_time_for_wc(job, op, wc_idx)
                setup_time, processing_time = self._op_times_for_wc(job, op, wc_idx)

                prod_id, product_id = (
                    self.job_keys[job] if job < len(self.job_keys) else (job, 0)
                )
                start_minute = int(self.solution[job][op])
                segments = self._build_operation_work_segments(
                    wc_idx,
                    setup_time,
                    processing_time,
                    start_minute,
                )

                if not segments:
                    # Fallback for legacy/malformed data: draw one continuous bar.
                    segments = [(start_minute, start_minute + scheduled_duration)]

                for seg_start_min, seg_end_min in segments:
                    start_sec = self.start_timestamp + seg_start_min * 60
                    finish_sec = self.start_timestamp + seg_end_min * 60

                    df.append({
                        # Y-axis = Work Center name
                        "Task":     wc_label,
                        "Start":    datetime.datetime.fromtimestamp(start_sec),
                        "Finish":   datetime.datetime.fromtimestamp(finish_sec),
                        # Colour key = Job (PO + Product)
                        "Resource": f"PO{prod_id}-P{product_id}",
                        # Keep job index for stable colour lookup
                        "_job_idx": job,
                    })

        if not df:
            return None
        df = pd.DataFrame(df)

        # Build a stable colour map: job label -> rgb string
        color_map = {}
        for _, row in df[["Resource", "_job_idx"]].drop_duplicates().iterrows():
            r, g, b = self.job_colors[int(row["_job_idx"]) % len(self.job_colors)]
            color_map[row["Resource"]] = f"rgb({int(r*255)},{int(g*255)},{int(b*255)})"

        fig = ff.create_gantt(
            df.drop(columns=["_job_idx"]),
            index_col="Resource",
            colors=color_map,
            show_colorbar=True,
            group_tasks=True,
            title="Flexible Job Shop Schedule",
        )
        fig.update_yaxes(autorange="reversed")
        return fig
