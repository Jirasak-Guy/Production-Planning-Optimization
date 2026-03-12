"""
RL scheduling via jobshop_gym environment.

This module replaces the previous custom inference engine and uses the same
Gym environment used in training/testing (`jobshop_gym/JobShop-v1`).
"""

import os
import sys
import time as time_module
from typing import Dict, List, Optional, Tuple

import gymnasium as gym
from sb3_contrib import MaskablePPO

import model as backend_model

# jobshop_gym.data_manager imports `jobshop_gym.model`, which defines SQLModel
# tables with the same names as Backend/model.py. In the same process, that
# causes "Table '...' is already defined". Reuse Backend model module instead.
sys.modules.setdefault("jobshop_gym.model", backend_model)

import jobshop_gym  # noqa: E402,F401 - required for gym env registration

from data_manager import SchedulingDataManager
from scheduler import ScheduleResult


def _resolve_model_path(model_path: str) -> Optional[str]:
    """Return the first existing model path candidate."""
    candidates = []

    if model_path:
        candidates.append(model_path)
        if not model_path.endswith(".zip"):
            candidates.append(f"{model_path}.zip")

    candidates.extend(
        [
            "models/ppo_jss_best.zip",
            "models/ppo_jss_best",
            "models/ppo_jss_final.zip",
            "models/ppo_jss_final",
        ]
    )

    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


def _build_operation_id_map(dm: SchedulingDataManager, env_unwrapped) -> Dict[int, List[int]]:
    """Map env op index -> operation_id for each env job index.

    We mirror the filtering logic from JobShopEnv parsing: routing is sorted by
    sequence number and only operations with at least one active WC are kept.
    """
    op_map: Dict[int, List[int]] = {}

    for j, job_key in enumerate(env_unwrapped.job_keys):
        job = dm.jobs.get(job_key)
        if job is None:
            op_map[j] = []
            continue

        routings = sorted(job.routing, key=lambda r: r.sequence_number)
        op_ids: List[int] = []

        for routing in routings:
            op_id = routing.operation_id
            wc_list = dm.operation_to_work_centers.get(op_id, [])

            has_active_wc = False
            for wc_id in wc_list:
                wc = dm.work_centers.get(wc_id)
                if wc is not None and wc.is_active:
                    has_active_wc = True
                    break

            if has_active_wc:
                op_ids.append(op_id)

            if len(op_ids) >= int(env_unwrapped.max_ops):
                break

        op_map[j] = op_ids

    return op_map


def _extract_schedule_data(env_unwrapped, dm: SchedulingDataManager) -> List[Dict]:
    op_id_map = _build_operation_id_map(dm, env_unwrapped)
    schedule_data: List[Dict] = []

    for job in range(env_unwrapped.jobs):
        for op in range(int(env_unwrapped.jobs_ops_count[job])):
            start = int(env_unwrapped.solution[job][op])
            if start < 0:
                continue

            wc_idx = int(env_unwrapped.selected_wc_for_solution[job][op])
            if wc_idx < 0 or wc_idx >= len(env_unwrapped.wc_ids):
                continue

            wc_id = int(env_unwrapped.wc_ids[wc_idx])

            scheduled_duration = int(env_unwrapped.op_scheduled_duration[job][op])
            if scheduled_duration <= 0:
                scheduled_duration = int(env_unwrapped._proc_time_for_wc(job, op, wc_idx))
            if scheduled_duration <= 0:
                continue

            setup_time, processing_time = env_unwrapped._op_times_for_wc(job, op, wc_idx)
            segments = env_unwrapped._build_operation_work_segments(
                wc_idx,
                int(setup_time),
                int(processing_time),
                int(start),
            )
            if not segments:
                segments = [(start, start + scheduled_duration)]

            op_ids = op_id_map.get(job, [])
            operation_id = op_ids[op] if op < len(op_ids) else None
            if operation_id is None:
                # We cannot save a record without operation_id.
                continue

            production_order_id, product_id = env_unwrapped.job_keys[job]
            for seg_start, seg_end in segments:
                if int(seg_end) <= int(seg_start):
                    continue
                schedule_data.append(
                    {
                        "production_order_id": int(production_order_id),
                        "product_id": int(product_id),
                        "work_center_id": wc_id,
                        "operation_id": int(operation_id),
                        "start_minutes": int(seg_start),
                        "end_minutes": int(seg_end),
                        "shift_id": None,
                        "notes": "RL scheduled (jobshop_gym)",
                    }
                )

    schedule_data.sort(
        key=lambda r: (
            r["start_minutes"],
            r["work_center_id"],
            r["production_order_id"],
            r["product_id"],
            r["operation_id"],
        )
    )
    return schedule_data


def run_rl_scheduling(
    engine,
    production_ids: List[int],
    model_path: str = "best_model",
    max_shift_duration: int = 60,
    max_workers: int = 600,
    save_to_db: bool = True,
) -> ScheduleResult:
    """Run RL scheduling using the installed `jobshop_gym` environment."""
    del max_workers  # Unused by the env-based inference path.

    data = SchedulingDataManager(engine)
    data.load_all(production_ids=production_ids)

    if not data.productions:
        return ScheduleResult(status="NO_DATA", message="No production orders to schedule")

    remaining_ops = sum(len(job.routing) for job in data.jobs.values())
    if remaining_ops == 0:
        result = ScheduleResult(
            status="FEASIBLE",
            makespan=0,
            schedule_data=[],
            solve_time_seconds=0.0,
            message="No remaining tasks to schedule (all marked completed)",
        )
        if save_to_db:
            data.update_production_status(production_ids, result.status)
        return result

    resolved_model_path = _resolve_model_path(model_path)
    if resolved_model_path is None:
        return ScheduleResult(
            status="MODEL_NOT_FOUND",
            message=f"Model not found: {model_path}",
        )

    start_time = time_module.time()

    try:
        model = MaskablePPO.load(resolved_model_path)
    except Exception as exc:
        return ScheduleResult(
            status="MODEL_LOAD_ERROR",
            message=f"Failed to load model {resolved_model_path}: {exc}",
        )

    env = gym.make(
        "jobshop_gym/JobShop-v1",
        engine=engine,
        max_jobs=1000,
        max_ops=50,
        production_ids=production_ids,
        max_shift_duration=max_shift_duration,
    )

    obs, _ = env.reset(seed=42)
    done = False
    step_guard = 0
    max_steps = 200000

    while not done and step_guard < max_steps:
        action_masks = env.unwrapped.action_masks()
        action, _ = model.predict(obs, action_masks=action_masks, deterministic=True)
        obs, _, done, _, _ = env.step(int(action))
        step_guard += 1

    solve_time = time_module.time() - start_time

    if step_guard >= max_steps:
        return ScheduleResult(
            status="INFEASIBLE",
            solve_time_seconds=solve_time,
            message="RL inference exceeded max step guard",
        )

    env_unwrapped = env.unwrapped
    schedule_data = _extract_schedule_data(env_unwrapped, data)
    makespan = int(env_unwrapped.current_makespan)

    result = ScheduleResult(
        status="FEASIBLE" if schedule_data else "INFEASIBLE",
        makespan=makespan,
        schedule_data=schedule_data,
        solve_time_seconds=solve_time,
        message=f"Found solution with makespan {makespan} minutes",
    )

    if save_to_db:
        if schedule_data:
            saved = data.save_schedule_results(schedule_data)
            result.message += f" | Saved {saved} records to database"
        data.update_production_status(production_ids, result.status)

    return result
