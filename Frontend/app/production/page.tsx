"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import ProductionOrderCard from "@/app/components/ProductionOrderCard";
import ProductionHeader, {
  ProductionSortKey,
  SortDirection,
  ViewMode,
} from "@/app/components/ProductionHeader";
import AddProductionOrderModal from "@/app/components/modals/AddProductionOrderModal";
import { ProductionOrder } from "@/app/types/Production";
import { fetchProductionOrders, scheduleProductionOrder, updateProductionOrder, fetchSchedulerSettings, updateSchedulerSettings, SchedulerSettings, clearProductionSchedule } from "@/app/lib/data";

export default function ProductionPage() {
  const router = useRouter();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ProductionSortKey>("po_number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedPoIds, setSelectedPoIds] = useState<Set<number>>(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Scheduler Settings
  const [schedulerSettings, setSchedulerSettings] = useState<SchedulerSettings>({
    max_workers: 600,
    time_limit_seconds: 60,
    horizon_days: 365,
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState<SchedulerSettings>({
    max_workers: 600,
    time_limit_seconds: 60,
    horizon_days: 365,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [ordersData, settingsData] = await Promise.all([
          fetchProductionOrders(),
          fetchSchedulerSettings(),
        ]);
        setProductionOrders(ordersData);
        setSchedulerSettings(settingsData);
        setEditingSettings(settingsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const saveSchedulerSettings = async () => {
    try {
      setIsSavingSettings(true);
      const updated = await updateSchedulerSettings(editingSettings);
      setSchedulerSettings(updated);
      setShowSettingsModal(false);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const filtered = productionOrders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getScheduledStartTime = (po: ProductionOrder) =>
      po.scheduled_start_date
        ? new Date(po.scheduled_start_date).getTime()
        : Number.MAX_SAFE_INTEGER;

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
        case "quantity_completed":
          return a.quantity_completed - b.quantity_completed;
        case "scheduled_start_date":
          return getScheduledStartTime(a) - getScheduledStartTime(b);
        case "status":
          return a.status.localeCompare(b.status);
        case "schedule_status":
          return (a.schedule_status ?? "").localeCompare(b.schedule_status ?? "");
        default:
          return 0;
      }
    };

    return filtered.sort((a, b) => {
      const result = compare(a, b);
      return sortDirection === "asc" ? result : -result;
    });
  }, [searchTerm, productionOrders, sortKey, sortDirection]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSort = (key: ProductionSortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProductionOrders();
      setProductionOrders(data);
    } catch (error) {
      console.error("Failed to refresh production orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleAddSuccess = () => {
    handleRefresh();
  };

  const handleRowClick = (poId: number) => {
    router.push(`/production/${poId}`);
  };

  // Selection handlers for multi-select checkboxes
  const handleSelectPo = (poId: number, checked: boolean) => {
    setSelectedPoIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(poId);
      } else {
        newSet.delete(poId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredOrders.map((po) => po.id);
      setSelectedPoIds(new Set(allIds));
    } else {
      setSelectedPoIds(new Set());
    }
  };

  const isAllSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((po) => selectedPoIds.has(po.id));

  const handleOptimizeSelected = async () => {
    if (selectedPoIds.size === 0) return;

    setIsOptimizing(true);
    const idsToOptimize = Array.from(selectedPoIds);

    try {
      // Update all selected POs to "Optimizing" status first
      await Promise.all(
        idsToOptimize.map((id) =>
          updateProductionOrder(id, { schedule_status: "Optimizing" })
        )
      );

      // Update local state to show "Optimizing" immediately
      setProductionOrders((prev) =>
        prev.map((po) =>
          selectedPoIds.has(po.id)
            ? { ...po, schedule_status: "Optimizing" }
            : po
        )
      );

      // Call the scheduler with all selected production IDs using scheduler settings
      await scheduleProductionOrder(idsToOptimize, {
        maxWorkers: schedulerSettings.max_workers,
        timeLimitSeconds: schedulerSettings.time_limit_seconds,
        saveToDb: true,
      });

      // Refresh to get updated statuses
      await handleRefresh();
      setSelectedPoIds(new Set()); // Clear selection after optimization
    } catch (error) {
      console.error("Failed to optimize selected POs:", error);
      // Refresh to get correct statuses after error
      await handleRefresh();
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClearSelected = async () => {
    if (selectedPoIds.size === 0) return;

    setIsClearing(true);
    const idsToClear = Array.from(selectedPoIds);

    try {
      // Clear schedule for all selected POs
      await Promise.all(
        idsToClear.map((id) => clearProductionSchedule(id))
      );

      // Update local state to show "Unschedule" immediately
      setProductionOrders((prev) =>
        prev.map((po) =>
          selectedPoIds.has(po.id)
            ? { ...po, schedule_status: "Unschedule" }
            : po
        )
      );

      // Refresh to get updated statuses
      await handleRefresh();
      setSelectedPoIds(new Set()); // Clear selection after clearing
    } catch (error) {
      console.error("Failed to clear selected POs:", error);
      // Refresh to get correct statuses after error
      await handleRefresh();
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      planned: "bg-gray-100 text-gray-800",
      released: "bg-blue-100 text-blue-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      "on-hold": "bg-orange-100 text-orange-800",
    };
    return statusStyles[status] || "bg-gray-100 text-gray-800";
  };

  const getSortIndicator = (key: ProductionSortKey) => {
    if (sortKey !== key) {
      return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const getHeaderButtonClass = (key: ProductionSortKey) =>
    [
      "flex items-center gap-1 uppercase tracking-wider",
      sortKey === key ? "text-blue-600" : "text-gray-500 hover:text-gray-700",
    ].join(" ");

  // const getScheduleStatusBadge = (status?: string) => {
  //   if (!status || status === "Unschedule") return "bg-gray-100 text-gray-600";
  //   const statusStyles: Record<string, string> = {
  //     Optimizing: "bg-yellow-100 text-yellow-700 animate-pulse",
  //     OPTIMAL: "bg-green-100 text-green-700",
  //     FEASIBLE: "bg-blue-100 text-blue-700",
  //     INFEASIBLE: "bg-red-100 text-red-700",
  //   };
  //   return statusStyles[status] || "bg-gray-100 text-gray-600";
  // };

  return (
    <div className="flex flex-col h-full">
      <ProductionHeader
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
        schedulerSettings={schedulerSettings}
        onOpenSettings={() => {
          setEditingSettings(schedulerSettings);
          setShowSettingsModal(true);
        }}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">
              Loading production orders...
            </p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((po) => (
                  <ProductionOrderCard key={po.id} productionOrder={po} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Action Buttons - Always visible */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className={`text-sm font-medium ${selectedPoIds.size > 0 ? "text-blue-700" : "text-gray-500"}`}>
                    {selectedPoIds.size > 0
                      ? `${selectedPoIds.size} PO${selectedPoIds.size > 1 ? "s" : ""} selected`
                      : "Select POs to optimize or clear"}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Clear Selected Button */}
                    <button
                      onClick={handleClearSelected}
                      disabled={selectedPoIds.size === 0 || isClearing || isOptimizing}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedPoIds.size === 0 || isClearing || isOptimizing
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                        }`}
                    >
                      {isClearing ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Clearing...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                          </svg>
                          Clear Selected
                        </>
                      )}
                    </button>

                    {/* Optimize Selected Button */}
                    <button
                      onClick={handleOptimizeSelected}
                      disabled={selectedPoIds.size === 0 || isOptimizing || isClearing}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedPoIds.size === 0 || isOptimizing || isClearing
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md"
                        }`}
                    >
                      {isOptimizing ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Optimize Selected
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-14">
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            title="Select all"
                          />
                        </label>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("po_number")}
                          onClick={() => handleSort("po_number")}
                        >
                          <span>PO Number</span>
                          {getSortIndicator("po_number")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("priority")}
                          onClick={() => handleSort("priority")}
                        >
                          <span>Priority</span>
                          {getSortIndicator("priority")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("quantity_planned")}
                          onClick={() => handleSort("quantity_planned")}
                        >
                          <span>Qty Planned</span>
                          {getSortIndicator("quantity_planned")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("quantity_completed")}
                          onClick={() => handleSort("quantity_completed")}
                        >
                          <span>Qty Completed</span>
                          {getSortIndicator("quantity_completed")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("scheduled_start_date")}
                          onClick={() => handleSort("scheduled_start_date")}
                        >
                          <span>Scheduled Start</span>
                          {getSortIndicator("scheduled_start_date")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("status")}
                          onClick={() => handleSort("status")}
                        >
                          <span>Status</span>
                          {getSortIndicator("status")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("schedule_status")}
                          onClick={() => handleSort("schedule_status")}
                        >
                          <span>Schedule Status</span>
                          {getSortIndicator("schedule_status")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((po) => (
                      <tr
                        key={po.id}
                        className={`transition-colors ${selectedPoIds.has(po.id)
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-50"
                          }`}
                      >
                        {/* Checkbox cell - NOT clickable for navigation */}
                        <td
                          className="px-4 py-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="flex items-center justify-center w-full h-full cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPoIds.has(po.id)}
                              onChange={(e) => handleSelectPo(po.id, e.target.checked)}
                              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            />
                          </label>
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer"
                          onClick={() => handleRowClick(po.id)}
                        >
                          {po.po_number}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 cursor-pointer"
                          onClick={() => handleRowClick(po.id)}
                        >
                          {po.priority}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                          onClick={() => handleRowClick(po.id)}
                        >
                          {po.quantity_planned}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                          onClick={() => handleRowClick(po.id)}
                        >
                          {po.quantity_completed}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                          onClick={() => handleRowClick(po.id)}
                        >
                          {po.scheduled_start_date
                            ? new Date(po.scheduled_start_date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => handleRowClick(po.id)}
                        >
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(po.status)}`}
                          >
                            {po.status.replace("-", " ")}
                          </span>
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-center cursor-pointer"
                          onClick={() => handleRowClick(po.id)}
                        >
                          {!po.schedule_status || po.schedule_status === "Unschedule" ? (
                            <span title="Unschedule" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          ) : po.schedule_status === "Optimizing" ? (
                            <span title="Optimizing..." className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-600 animate-spin">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </span>
                          ) : po.schedule_status === "OPTIMAL" ? (
                            <span title="OPTIMAL" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          ) : po.schedule_status === "FEASIBLE" ? (
                            <span title="FEASIBLE" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : po.schedule_status === "INFEASIBLE" ? (
                            <span title="INFEASIBLE" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          ) : (
                            <span title={po.schedule_status} className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredOrders.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No production orders found
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <AddProductionOrderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Scheduler Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Scheduler Settings</h2>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Max Workers */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Max Workers (Factory)
                </label>
                <input
                  type="number"
                  value={editingSettings.max_workers}
                  onChange={(e) => setEditingSettings({ ...editingSettings, max_workers: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min={1}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum workers available for scheduling</p>
              </div>

              {/* Time Limit */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Time Limit (Seconds)
                </label>
                <input
                  type="number"
                  value={editingSettings.time_limit_seconds}
                  onChange={(e) => setEditingSettings({ ...editingSettings, time_limit_seconds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min={1}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum time for scheduler optimization</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-5 py-3 flex justify-end gap-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                disabled={isSavingSettings}
              >
                Cancel
              </button>
              <button
                onClick={saveSchedulerSettings}
                disabled={isSavingSettings}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm"
              >
                {isSavingSettings ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
