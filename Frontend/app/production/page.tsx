"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductionOrderCard from "@/app/components/ProductionOrderCard";
import ProductionHeader, { ViewMode } from "@/app/components/ProductionHeader";
import AddProductionOrderModal from "@/app/components/modals/AddProductionOrderModal";
import { ProductionOrder } from "@/app/types/Production";
import { fetchProductionOrders, scheduleProductionOrder, updateProductionOrder } from "@/app/lib/data";

export default function ProductionPage() {
  const router = useRouter();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<"id" | "po_number">("id");
  const [selectedPoIds, setSelectedPoIds] = useState<Set<number>>(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const loadProductionOrders = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProductionOrders();
        setProductionOrders(data);
      } catch (error) {
        console.error("Failed to fetch production orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductionOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return productionOrders
      .filter(
        (po) =>
          po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          po.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortKey === "id") {
          return a.id - b.id;
        }
        return a.po_number.localeCompare(b.po_number);
      });
  }, [searchTerm, productionOrders, sortKey]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
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

      // Call the scheduler with all selected production IDs
      await scheduleProductionOrder(idsToOptimize, { saveToDb: true });

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

  const getScheduleStatusBadge = (status?: string) => {
    if (!status || status === "Unschedule") return "bg-gray-100 text-gray-600";
    const statusStyles: Record<string, string> = {
      Optimizing: "bg-yellow-100 text-yellow-700 animate-pulse",
      OPTIMAL: "bg-green-100 text-green-700",
      FEASIBLE: "bg-blue-100 text-blue-700",
      INFEASIBLE: "bg-red-100 text-red-700",
    };
    return statusStyles[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="flex flex-col h-full">
      <ProductionHeader
        onSearch={handleSearch}
        onSortToggle={() => setSortKey(sortKey === "id" ? "po_number" : "id")}
        sortKey={sortKey}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
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
                {/* Optimize Selected Button - shows when POs are selected */}
                {selectedPoIds.size > 0 && (
                  <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <span className="text-sm text-blue-700 font-medium">
                      {selectedPoIds.size} PO{selectedPoIds.size > 1 ? "s" : ""} selected
                    </span>
                    <button
                      onClick={handleOptimizeSelected}
                      disabled={isOptimizing}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isOptimizing
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
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
                )}
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                          title="Select all"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PO Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty Planned
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scheduled Start
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Schedule Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((po) => (
                      <tr
                        key={po.id}
                        className={`cursor-pointer transition-colors ${selectedPoIds.has(po.id)
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-gray-50"
                          }`}
                        onClick={() => handleRowClick(po.id)}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedPoIds.has(po.id)}
                            onChange={(e) => handleSelectPo(po.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {po.po_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {po.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.quantity_planned}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.quantity_completed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.scheduled_start_date
                            ? new Date(po.scheduled_start_date).toLocaleDateString()
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
    </div>
  );
}
