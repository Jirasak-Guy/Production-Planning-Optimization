"use client";

import { useState, useMemo, useEffect } from "react";
import { useSessionState } from "@/app/hooks/useSessionState";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ProductionOrder } from "@/app/types/Production";
import {
  fetchProductionOrders,
  fetchWorkCenterSchedule,
  fetchWorkCenters,
  fetchWorkCenterCalendarExceptions,
  scheduleWithRL,
  updateProductionOrder,
  fetchSchedulerSettings,
  clearProductionSchedule,
  SchedulerSettings,
  ScheduleResponse,
} from "@/app/lib/data";

type SortKey =
  | "id"
  | "po_number"
  | "priority"
  | "quantity_planned"
  | "scheduled_start_date"
  | "status"
  | "schedule_status";
type SortDir = "asc" | "desc";
type IssueType =
  | "overdue_incomplete"
  | "inactive_machine"
  | "calendar_exception";

interface TaskIssue {
  scheduleId: number;
  poId: number;
  poNumber: string;
  workCenterId: number;
  issueType: IssueType;
  detail: string;
}

const OVERDUE_GRACE_MS = 60 * 1000; // minute-level precision

function parseAsLocalTime(dateTimeStr: string): Date {
  return new Date(dateTimeStr.replace(/([+-]\d{2}:\d{2}|Z)$/, ""));
}

function isOverdueByCurrentTime(endDateTime: string, nowDate: Date): boolean {
  const end = parseAsLocalTime(endDateTime);
  if (Number.isNaN(end.getTime())) {
    return false;
  }
  return nowDate.getTime() - end.getTime() >= OVERDUE_GRACE_MS;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDateKeysInRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cursor <= endDay) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export default function ReschedulePage() {
  const router = useRouter();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDirection, setSortDirection] = useState<SortDir>("asc");
  const [selectedPoIds, setSelectedPoIds] = useState<Set<number>>(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [schedulerSettings, setSchedulerSettings] = useState<SchedulerSettings>(
    {
      max_workers: 600,
      time_limit_seconds: 60,
      horizon_days: 365,
    },
  );
  const [issuesByPo, setIssuesByPo] = useState<Record<number, TaskIssue[]>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Result panel
  const [lastResult, setLastResult] = useSessionState<{
    status: string;
    message: string | null;
    makespan: number | null;
    solve_time: number | null;
    solver: string;
  } | null>("reschedule_last_result", null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        ordersData,
        settingsData,
        schedulesData,
        workCentersData,
        wcExceptionsData,
      ] = await Promise.all([
        fetchProductionOrders(),
        fetchSchedulerSettings(),
        fetchWorkCenterSchedule(),
        fetchWorkCenters(),
        fetchWorkCenterCalendarExceptions(),
      ]);
      setProductionOrders(ordersData);
      setSchedulerSettings(settingsData);

      const poNumberById = new Map<number, string>(
        ordersData.map((po) => [po.id, po.po_number]),
      );
      const inactiveWcIds = new Set(
        workCentersData.filter((wc) => !wc.is_active).map((wc) => wc.id),
      );

      const exceptionByWcDate = new Map<string, string>();
      for (const exception of wcExceptionsData) {
        const t = (exception.exception_type || "").toLowerCase();
        if (t !== "closed" && t !== "maintenance") continue;
        const dateKey = exception.exception_date.slice(0, 10);
        exceptionByWcDate.set(`${exception.work_center_id}|${dateKey}`, t);
      }

      const nextIssuesByPo: Record<number, TaskIssue[]> = {};
      const now = new Date();

      // Track seen issues to avoid duplicates from merged segments
      const seenOverdue = new Set<string>();
      const seenInactive = new Set<string>();
      const seenCalendar = new Set<string>();

      // Pre-process schedules to assign group IDs based on gaps >= 8 hours
      const sortedSchedules = [...schedulesData].sort(
        (a, b) =>
          parseAsLocalTime(a.scheduled_start).getTime() -
          parseAsLocalTime(b.scheduled_start).getTime(),
      );

      const lastEndByPoWc = new Map<string, number>();
      const groupIdByPoWc = new Map<string, number>();
      const scheduleGroupIds = new Map<number, number>();
      const maxEndByGroupKey = new Map<string, number>();

      for (const schedule of sortedSchedules) {
        const poId = schedule.production_order_id;
        const baseKey = `${poId}|${schedule.work_center_id}`;
        const start = parseAsLocalTime(schedule.scheduled_start).getTime();
        const end = parseAsLocalTime(schedule.scheduled_end).getTime();

        let groupId = groupIdByPoWc.get(baseKey) || 0;
        const lastEnd = lastEndByPoWc.get(baseKey);

        if (lastEnd !== undefined) {
          const gapHours = (start - lastEnd) / (1000 * 60 * 60);
          if (gapHours >= 8) {
            groupId += 1;
          }
        }
        groupIdByPoWc.set(baseKey, groupId);
        lastEndByPoWc.set(baseKey, Math.max(lastEnd || 0, end));
        scheduleGroupIds.set(schedule.id, groupId);

        const groupKey = `${baseKey}|${groupId}`;
        const currentGroupMax = maxEndByGroupKey.get(groupKey) || 0;
        maxEndByGroupKey.set(groupKey, Math.max(currentGroupMax, end));
      }

      for (const schedule of schedulesData) {
        const poId = schedule.production_order_id;
        const poNumber = poNumberById.get(poId) || `PO ${poId}`;
        if (!nextIssuesByPo[poId]) {
          nextIssuesByPo[poId] = [];
        }

        const status = (schedule.status || "").toLowerCase();
        const scheduleEnd = parseAsLocalTime(schedule.scheduled_end);

        // Deduplicate by PO + work center + group ID (differentiates >= 8h gaps)
        const groupId = scheduleGroupIds.get(schedule.id) || 0;
        const poWcKey = `${poId}|${schedule.work_center_id}|${groupId}`;

        // Check overdue against the maximum end time of the entire contiguous group
        const groupMaxEndTime = maxEndByGroupKey.get(poWcKey) || scheduleEnd.getTime();
        const groupIsOverdue = now.getTime() - groupMaxEndTime >= OVERDUE_GRACE_MS;

        if (
          status !== "completed" &&
          groupIsOverdue &&
          !seenOverdue.has(poWcKey)
        ) {
          seenOverdue.add(poWcKey);
          nextIssuesByPo[poId].push({
            scheduleId: schedule.id,
            poId,
            poNumber,
            workCenterId: schedule.work_center_id,
            issueType: "overdue_incomplete",
            detail: "Task is past current time but still not completed",
          });
        }

        if (
          status !== "completed" &&
          inactiveWcIds.has(schedule.work_center_id) &&
          !seenInactive.has(poWcKey)
        ) {
          seenInactive.add(poWcKey);
          nextIssuesByPo[poId].push({
            scheduleId: schedule.id,
            poId,
            poNumber,
            workCenterId: schedule.work_center_id,
            issueType: "inactive_machine",
            detail: "Task is assigned to an inactive machine",
          });
        }

        if (status !== "completed") {
          const start = parseAsLocalTime(schedule.scheduled_start);
          const dateKeys = getDateKeysInRange(start, scheduleEnd);
          for (const dateKey of dateKeys) {
            const exceptionType = exceptionByWcDate.get(
              `${schedule.work_center_id}|${dateKey}`,
            );
            if (!exceptionType) continue;
            const calKey = `${poWcKey}|${dateKey}`;
            if (seenCalendar.has(calKey)) break;
            seenCalendar.add(calKey);
            nextIssuesByPo[poId].push({
              scheduleId: schedule.id,
              poId,
              poNumber,
              workCenterId: schedule.work_center_id,
              issueType: "calendar_exception",
              detail: `Task overlaps calendar exception (${exceptionType}) on ${dateKey}`,
            });
            break;
          }
        }
      }

      setIssuesByPo(nextIssuesByPo);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show scheduled POs (those that have been optimized before)
  const scheduledOrders = useMemo(() => {
    return productionOrders.filter(
      (po) => po.schedule_status && po.schedule_status !== "Unschedule",
    );
  }, [productionOrders]);

  const filteredOrders = useMemo(() => {
    const filtered = scheduledOrders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.notes?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const compare = (a: ProductionOrder, b: ProductionOrder) => {
      switch (sortKey) {
        case "id":
          return a.id - b.id;
        case "po_number":
          return a.po_number.localeCompare(b.po_number);
        case "priority":
          return a.priority - b.priority;
        case "quantity_planned":
          return a.quantity_planned - b.quantity_planned;
        case "scheduled_start_date":
          return (
            (a.scheduled_start_date
              ? new Date(a.scheduled_start_date).getTime()
              : Infinity) -
            (b.scheduled_start_date
              ? new Date(b.scheduled_start_date).getTime()
              : Infinity)
          );
        case "status":
          return a.status.localeCompare(b.status);
        case "schedule_status":
          return (a.schedule_status ?? "").localeCompare(
            b.schedule_status ?? "",
          );
        default:
          return 0;
      }
    };

    return filtered.sort((a, b) =>
      sortDirection === "asc" ? compare(a, b) : -compare(a, b),
    );
  }, [searchTerm, scheduledOrders, sortKey, sortDirection]);

  const hasOptimizingOrders = useMemo(
    () => productionOrders.some((po) => po.schedule_status === "Optimizing"),
    [productionOrders],
  );

  const posWithIssues = useMemo(() => {
    const result: string[] = [];
    for (const id of Array.from(selectedPoIds)) {
      if ((issuesByPo[id]?.length || 0) > 0) {
        const po = productionOrders.find((p) => p.id === id);
        if (po) result.push(po.po_number);
      }
    }
    return result;
  }, [selectedPoIds, issuesByPo, productionOrders]);

  const isCurrentlyOptimizing = isOptimizing || hasOptimizingOrders;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleSelectPo = (poId: number, checked: boolean) => {
    setSelectedPoIds((prev) => {
      const s = new Set(prev);
      checked ? s.add(poId) : s.delete(poId);
      return s;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedPoIds(
      checked ? new Set(filteredOrders.map((po) => po.id)) : new Set(),
    );
  };

  const isAllSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((po) => selectedPoIds.has(po.id));

  const handleReschedule = async () => {
    if (selectedPoIds.size === 0) return;
    setShowConfirmModal(true);
  };

  const executeReschedule = async () => {
    setShowConfirmModal(false);
    setIsOptimizing(true);
    setLastResult(null);
    const ids = Array.from(selectedPoIds);

    try {
      // Set Optimizing status
      await Promise.all(
        ids.map((id) =>
          updateProductionOrder(id, { schedule_status: "Optimizing" }),
        ),
      );
      setProductionOrders((prev) =>
        prev.map((po) =>
          selectedPoIds.has(po.id)
            ? { ...po, schedule_status: "Optimizing" }
            : po,
        ),
      );

      const result: ScheduleResponse = await scheduleWithRL(ids, {
        maxWorkers: schedulerSettings.max_workers,
        saveToDb: true,
      });

      setLastResult({
        status: result.status,
        message: result.message,
        makespan: result.makespan,
        solve_time: result.solve_time_seconds,
        solver: "RL (PPO)",
      });

      // Reload data — backend already reverts status for non-success results
      await loadData();

      // Only clear selection on success
      const successStatuses = ["FEASIBLE", "OPTIMAL"];
      if (successStatuses.includes(result.status)) {
        setSelectedPoIds(new Set());
      }
    } catch (error) {
      console.error("Reschedule failed:", error);
      setLastResult({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        makespan: null,
        solve_time: null,
        solver: "RL (PPO)",
      });
      // Revert schedule_status back to "scheduled" so POs don't stay stuck at "Optimizing"
      await Promise.all(
        ids.map((id) =>
          updateProductionOrder(id, { schedule_status: "scheduled" }),
        ),
      ).catch((revertErr) =>
        console.error("Failed to revert status:", revertErr),
      );
      await loadData();
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClearSelected = async () => {
    if (selectedPoIds.size === 0) return;
    setIsClearing(true);
    try {
      await Promise.all(
        Array.from(selectedPoIds).map((id) => clearProductionSchedule(id)),
      );
      setProductionOrders((prev) =>
        prev.map((po) =>
          selectedPoIds.has(po.id)
            ? { ...po, schedule_status: "Unschedule" }
            : po,
        ),
      );
      await loadData();
      setSelectedPoIds(new Set());
    } catch (error) {
      console.error("Failed to clear:", error);
      await loadData();
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s: Record<string, string> = {
      planned: "bg-gray-100 text-gray-800",
      released: "bg-blue-100 text-blue-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      "on-hold": "bg-orange-100 text-orange-800",
    };
    return s[status] || "bg-gray-100 text-gray-800";
  };

  const getScheduleIcon = (status?: string) => {
    if (!status || status === "Unschedule")
      return (
        <span
          title="Unschedule"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
      );
    if (status === "Optimizing")
      return (
        <span
          title="Optimizing..."
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-600 animate-spin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </span>
      );
    if (status === "OPTIMAL")
      return (
        <span
          title="OPTIMAL"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
      );
    if (status === "FEASIBLE")
      return (
        <span
          title="FEASIBLE"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
      );
    if (status === "INFEASIBLE")
      return (
        <span
          title="INFEASIBLE"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </span>
      );
    return (
      <span
        title={status}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </span>
    );
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key)
      return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="w-4 h-4 text-purple-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-purple-600" />
    );
  };

  const hdrClass = (key: SortKey) =>
    `flex items-center gap-1 uppercase tracking-wider ${sortKey === key ? "text-purple-600" : "text-gray-500 hover:text-gray-700"}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reschedule</h1>
              <p className="text-sm text-gray-500">
                Reschedule production orders using RL model (completed tasks are
                preserved)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-56"
              />
            </div>
            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">
              Loading production orders...
            </p>
          </div>
        ) : (
          <>
            {/* Result Banner */}
            {lastResult && (
              <div
                className={`mb-4 rounded-lg border p-4 ${
                  lastResult.status === "OPTIMAL" ||
                  lastResult.status === "FEASIBLE"
                    ? "bg-green-50 border-green-200"
                    : lastResult.status === "error" ||
                        lastResult.status === "INFEASIBLE" ||
                        lastResult.status === "MODEL_NOT_FOUND" ||
                        lastResult.status === "NO_DATA"
                      ? "bg-red-50 border-red-200"
                      : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          lastResult.status === "OPTIMAL"
                            ? "bg-green-100 text-green-800"
                            : lastResult.status === "FEASIBLE"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {lastResult.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Solver: <strong>{lastResult.solver}</strong>
                      </span>
                    </div>
                    {lastResult.message && (
                      <p className="text-sm text-gray-700">
                        {lastResult.message}
                      </p>
                    )}
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      {lastResult.makespan != null && (
                        <span>
                          Makespan: <strong>{lastResult.makespan} min</strong>
                        </span>
                      )}
                      {lastResult.solve_time != null && (
                        <span>
                          Solve time:{" "}
                          <strong>{lastResult.solve_time.toFixed(2)}s</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setLastResult(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Issue Banner for selected POs */}
            {selectedPoIds.size > 0 && posWithIssues.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  ⚠ Warnings found in: {posWithIssues.join(", ")}
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Action Bar */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-medium ${selectedPoIds.size > 0 ? "text-purple-700" : "text-gray-500"}`}
                  >
                    {selectedPoIds.size > 0
                      ? `${selectedPoIds.size} PO${selectedPoIds.size > 1 ? "s" : ""} selected`
                      : "Select POs to reschedule"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Clear */}
                  <button
                    onClick={handleClearSelected}
                    disabled={
                      selectedPoIds.size === 0 ||
                      isClearing ||
                      isCurrentlyOptimizing
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      selectedPoIds.size === 0 ||
                      isClearing ||
                      isCurrentlyOptimizing
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                    }`}
                  >
                    {isClearing ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Clearing...
                      </>
                    ) : (
                      <>
                        <TrashIcon className="h-4 w-4" />
                        Clear Schedule
                      </>
                    )}
                  </button>

                  {/* Reschedule */}
                  <button
                    onClick={handleReschedule}
                    disabled={
                      selectedPoIds.size === 0 ||
                      isCurrentlyOptimizing ||
                      isClearing
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      selectedPoIds.size === 0 ||
                      isCurrentlyOptimizing ||
                      isClearing
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {isCurrentlyOptimizing ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Rescheduling...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Reschedule (RL)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table */}
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center w-14">
                      <label className="flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                        />
                      </label>
                    </th>
                    {(
                      [
                        ["po_number", "PO Number"],
                        ["priority", "Priority"],
                        ["quantity_planned", "Qty Planned"],
                        ["scheduled_start_date", "Scheduled Start"],
                        ["status", "Status"],
                        ["schedule_status", "Schedule Status"],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <button
                          type="button"
                          className={hdrClass(key)}
                          onClick={() => handleSort(key)}
                        >
                          <span>{label}</span>
                          {getSortIndicator(key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((po) => (
                    <tr
                      key={po.id}
                      className={`transition-colors ${selectedPoIds.has(po.id) ? "bg-purple-50 hover:bg-purple-100" : "hover:bg-gray-50"}`}
                    >
                      <td
                        className="px-4 py-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPoIds.has(po.id)}
                            onChange={(e) =>
                              handleSelectPo(po.id, e.target.checked)
                            }
                            className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                          />
                        </label>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600 cursor-pointer"
                        onClick={() => router.push(`/production/${po.id}`)}
                      >
                        {po.po_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {po.priority}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {po.quantity_planned}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {po.scheduled_start_date
                          ? new Date(
                              po.scheduled_start_date,
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(po.status)}`}
                        >
                          {po.status.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getScheduleIcon(po.schedule_status)}
                          {(issuesByPo[po.id]?.length || 0) > 0 && (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600"
                              title="Schedule warning detected"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-gray-500">
                    No scheduled production orders found.
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Schedule POs from the Production page first.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirm Reschedule Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Reschedule</h3>
                  <p className="text-sm text-gray-500">The following POs will be rescheduled ({selectedPoIds.size} items)</p>
                </div>
              </div>
            </div>

            {/* PO List */}
            <div className="px-6 pb-4 max-h-64 overflow-y-auto space-y-1.5">
              {productionOrders
                .filter((po) => selectedPoIds.has(po.id))
                .map((po) => {
                  const hasIssue = (issuesByPo[po.id]?.length || 0) > 0;
                  return (
                    <div
                      key={po.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                        hasIssue
                          ? "bg-amber-50 border border-amber-100"
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          hasIssue ? "text-amber-800" : "text-gray-800"
                        }`}
                      >
                        {po.po_number}
                      </span>
                      {hasIssue && (
                        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Warning
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeReschedule}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-sm transition-all"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
