"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductionOrder, WorkCenterSchedule } from "@/app/types/Production";
import { ProductData } from "@/app/types/CoreData";
import { WorkCenter } from "@/app/types/WorkCenter";
import { Operation } from "@/app/types/Operation";
import { Shift } from "@/app/types/Shift";
import {
  fetchProductionOrderById,
  fetchProductById,
  fetchWorkCenterSchedule,
  fetchWorkCenters,
  fetchOperations,
  fetchProducts,
  fetchShifts,
  updateProductionOrder,
  deleteProductionOrder,
  scheduleProductionOrder,
  clearProductionSchedule,
  fetchSchedulerSettings,
} from "@/app/lib/data";
import {
  ArrowLeftIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
  CubeIcon,
  TrashIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

interface ProductionDetailPageProps {
  params: Promise<{
    production_id: string;
  }>;
}

interface ScheduleWithDetails extends WorkCenterSchedule {
  workCenter?: WorkCenter;
  operation?: Operation;
  productData?: ProductData;
  shiftData?: Shift;
}

export default function ProductionDetailPage({
  params,
}: ProductionDetailPageProps) {
  const router = useRouter();
  const { production_id } = use(params);
  const [productionOrder, setProductionOrder] = useState<ProductionOrder | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // UI states
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Optimize states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{ status: string; message: string | null } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const poId = parseInt(production_id);
        const po = await fetchProductionOrderById(poId);
        setProductionOrder(po);

        const [productData, schedulesData, workCentersData, operationsData, allProducts, allShifts] =
          await Promise.all([
            fetchProductById(po.product_id),
            fetchWorkCenterSchedule(),
            fetchWorkCenters(),
            fetchOperations(),
            fetchProducts(),
            fetchShifts(),
          ]);

        setProduct(productData);

        const poSchedules = schedulesData
          .filter((s) => s.production_order_id === poId)
          .map((s) => ({
            ...s,
            workCenter: workCentersData.find((w) => w.id === s.work_center_id),
            operation: operationsData.find((o) => o.id === s.operation_id),
            productData: allProducts.find((p) => p.id === s.product_id),
            shiftData: allShifts.find((sh) => sh.id === s.shift_id),
          }))
          .sort(
            (a, b) =>
              new Date(a.scheduled_start).getTime() -
              new Date(b.scheduled_start).getTime()
          );

        setSchedules(poSchedules);
      } catch (error) {
        console.error("Failed to fetch production order details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [production_id]);

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveField = async (field: string) => {
    if (!productionOrder) return;
    setIsSaving(true);
    try {
      const updateData: Partial<ProductionOrder> = {};
      if (field === "po_number") updateData.po_number = editValue;
      else if (field === "status") updateData.status = editValue;
      else if (field === "priority") {
        if (!editValue || isNaN(parseInt(editValue))) {
          alert("Priority is required (1-10)");
          return;
        }
        updateData.priority = parseInt(editValue);
      }
      else if (field === "quantity_planned") updateData.quantity_planned = parseInt(editValue) || 0;
      else if (field === "quantity_completed") updateData.quantity_completed = parseInt(editValue) || 0;
      else if (field === "quantity_scrapped") updateData.quantity_scrapped = parseInt(editValue) || 0;
      else if (field === "scheduled_start_date") updateData.scheduled_start_date = editValue || undefined;
      else if (field === "scheduled_end_date") updateData.scheduled_end_date = editValue || undefined;
      else if (field === "scheduled_end_date") updateData.scheduled_end_date = editValue || undefined;
      else if (field === "notes") updateData.notes = editValue || undefined;

      const updated = await updateProductionOrder(productionOrder.id, updateData);
      setProductionOrder(updated);
      setEditingField(null);
    } catch (error) {
      console.error("Failed to update production order:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProductionOrder = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!productionOrder) return;

    setIsDeleting(true);
    try {
      await deleteProductionOrder(productionOrder.id);
      router.push("/production");
    } catch (error) {
      console.error("Failed to delete production order:", error);
      alert("Failed to delete production order. Please try again.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOptimize = async () => {
    if (!productionOrder) return;

    setIsOptimizing(true);
    setOptimizeResult(null);
    try {
      // Optimistically update status
      setProductionOrder(prev => prev ? ({ ...prev, schedule_status: 'Optimizing' }) : null);

      // Get scheduler settings from API
      const settings = await fetchSchedulerSettings();

      const result = await scheduleProductionOrder([productionOrder.id], {
        saveToDb: true,
        timeLimitSeconds: settings.time_limit_seconds,
        maxWorkers: settings.max_workers,
      });
      setOptimizeResult({
        status: result.status,
        message: result.message,
      });
      // Reload schedule data after optimization
      const schedulesData = await fetchWorkCenterSchedule();
      const [workCentersData, operationsData, allProducts, allShifts] = await Promise.all([
        fetchWorkCenters(),
        fetchOperations(),
        fetchProducts(),
        fetchShifts(),
      ]);
      const poSchedules = schedulesData
        .filter((s) => s.production_order_id === productionOrder.id)
        .map((s) => ({
          ...s,
          workCenter: workCentersData.find((w) => w.id === s.work_center_id),
          operation: operationsData.find((o) => o.id === s.operation_id),
          productData: allProducts.find((p) => p.id === s.product_id),
          shiftData: allShifts.find((sh) => sh.id === s.shift_id),
        }))
        .sort(
          (a, b) =>
            new Date(a.scheduled_start).getTime() -
            new Date(b.scheduled_start).getTime()
        );
      setSchedules(poSchedules);

      // Reload Production Order to get updated schedule_status
      try {
        const updatedPO = await fetchProductionOrderById(productionOrder.id);
        setProductionOrder(updatedPO);
      } catch (poError) {
        console.error("Failed to reload production order:", poError);
      }
    } catch (error) {
      console.error("Failed to optimize production order:", error);
      setOptimizeResult({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClearSchedule = async () => {
    if (!productionOrder) return;
    if (!confirm("Are you sure you want to clear the schedule?")) return;

    try {
      await clearProductionSchedule(productionOrder.id);

      // Reload PO
      const updatedPO = await fetchProductionOrderById(productionOrder.id);
      setProductionOrder(updatedPO);

      // Reload Schedule Data
      const schedulesData = await fetchWorkCenterSchedule();
      const [workCentersData, operationsData, allProducts, allShifts] = await Promise.all([
        fetchWorkCenters(),
        fetchOperations(),
        fetchProducts(),
        fetchShifts(),
      ]);
      const poSchedules = schedulesData
        .filter((s) => s.production_order_id === productionOrder.id)
        .map((s) => ({
          ...s,
          workCenter: workCentersData.find((w) => w.id === s.work_center_id),
          operation: operationsData.find((o) => o.id === s.operation_id),
          productData: allProducts.find((p) => p.id === s.product_id),
          shiftData: allShifts.find((sh) => sh.id === s.shift_id),
        }))
        .sort(
          (a, b) =>
            new Date(a.scheduled_start).getTime() -
            new Date(b.scheduled_start).getTime()
        );
      setSchedules(poSchedules);
      setOptimizeResult(null);

    } catch (error) {
      console.error("Failed to clear schedule:", error);
      alert("Failed to clear schedule");
    }
  };



  const getScheduleStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
    switch (status) {
      case "Optimizing": return "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse";
      case "OPTIMAL": return "bg-green-100 text-green-700 border-green-200";
      case "FEASIBLE": return "bg-blue-100 text-blue-700 border-blue-200";
      case "INFEASIBLE": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: "bg-gray-100 text-gray-700 border-gray-200",
      released: "bg-blue-100 text-blue-700 border-blue-200",
      "in-progress": "bg-yellow-100 text-yellow-700 border-yellow-200",
      completed: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
      "on-hold": "bg-orange-100 text-orange-700 border-orange-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!productionOrder) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Production Order not found</p>
      </div>
    );
  }

  const progress =
    productionOrder.quantity_planned > 0
      ? (productionOrder.quantity_completed / productionOrder.quantity_planned) * 100
      : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                {/* Editable PO Number */}
                {editingField === "po_number" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-3xl font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("po_number")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {productionOrder.po_number}
                    </h1>
                    <button
                      onClick={() => handleEditField("po_number", productionOrder.po_number)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit PO number"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Editable Status */}
                {editingField === "status" ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-3 py-1.5 rounded-md text-sm font-semibold border-2 border-blue-500 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      autoFocus
                    >
                      <option value="planned">PLANNED</option>
                      <option value="released">RELEASED</option>
                      <option value="in-progress">IN-PROGRESS</option>
                      <option value="completed">COMPLETED</option>
                      <option value="cancelled">CANCELLED</option>
                      <option value="on-hold">ON-HOLD</option>
                    </select>
                    <button
                      onClick={() => handleSaveField("status")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getStatusColor(productionOrder.status)}`}
                    >
                      {productionOrder.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleEditField("status", productionOrder.status)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit status"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Schedule Status Badge */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getScheduleStatusColor(productionOrder.schedule_status)}`}>
                    {(productionOrder.schedule_status || 'Unschedule').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Product Link */}
              {product && (
                <div className="flex items-center gap-2">
                  <CubeIcon className="w-5 h-5 text-gray-400" />
                  <Link
                    href={`/products/${product.id}`}
                    className="text-gray-600 text-lg hover:text-blue-600 hover:underline"
                  >
                    {product.product_code} - {product.product_name}
                  </Link>
                </div>
              )}
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-3">


            {/* Optimize Button */}
            <button
              onClick={handleOptimize}
              disabled={isOptimizing || productionOrder.schedule_status === 'Optimizing'}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Optimize schedule for this production order"
            >
              {isOptimizing || productionOrder.schedule_status === 'Optimizing' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span className="font-medium">Optimizing...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  <span className="font-medium">Optimize</span>
                </>
              )}
            </button>

            {/* Delete Button */}
            <button
              onClick={handleDeleteProductionOrder}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200"
              title="Delete this production order"
            >
              <TrashIcon className="w-5 h-5" />
              <span className="font-medium">Delete</span>
            </button>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          {isDetailsCollapsed ? (
            <>
              <ChevronDownIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Show Details</span>
            </>
          ) : (
            <>
              <ChevronUpIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Hide Details</span>
            </>
          )}
        </button>

        {/* Collapsible Details */}
        {!isDetailsCollapsed && (
          <>
            {/* Quantity Grid */}
            <div className="grid grid-cols-4 gap-8 mb-6">
              {/* Quantity Planned */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Quantity Planned:</p>
                {editingField === "quantity_planned" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("quantity_planned")}
                      disabled={isSaving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-900">
                      {productionOrder.quantity_planned.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleEditField("quantity_planned", String(productionOrder.quantity_planned))}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Quantity Completed */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Quantity Completed:</p>
                {editingField === "quantity_completed" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("quantity_completed")}
                      disabled={isSaving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-900">
                      {productionOrder.quantity_completed.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleEditField("quantity_completed", String(productionOrder.quantity_completed))}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Quantity Scrapped */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Quantity Scrapped:</p>
                {editingField === "quantity_scrapped" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("quantity_scrapped")}
                      disabled={isSaving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-900">
                      {productionOrder.quantity_scrapped.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleEditField("quantity_scrapped", String(productionOrder.quantity_scrapped))}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Priority:</p>
                {editingField === "priority" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        // Allow empty string for clearing
                        if (e.target.value === "") {
                          setEditValue("");
                          return;
                        }
                        // Check integer strictly and range 1-10
                        if (!isNaN(val) && val >= 1 && val <= 10 && Number.isInteger(Number(e.target.value))) {
                          setEditValue(e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        // Prevent typing decimal point, 'e', signs, etc.
                        if (['.', 'e', 'E', '-', '+'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      min="1"
                      max="10"
                      step="1"
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-20"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("priority")}
                      disabled={isSaving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${productionOrder.priority <= 3 ? 'bg-red-100 text-red-700' :
                      productionOrder.priority <= 5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                      {productionOrder.priority}
                    </span>
                    <button
                      onClick={() => handleEditField("priority", String(productionOrder.priority))}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Progress:</span>
                <span className="font-medium text-gray-900">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${progress >= 100 ? 'bg-green-600' :
                    progress >= 50 ? 'bg-blue-600' :
                      'bg-yellow-500'
                    }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-4 gap-8 mb-6">
              {/* Scheduled Start */}
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Scheduled Start:
                </p>
                {editingField === "scheduled_start_date" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("scheduled_start_date")}
                      disabled={isSaving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-900">
                      {productionOrder.scheduled_start_date
                        ? new Date(productionOrder.scheduled_start_date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })
                        : "-"}
                    </p>
                    <button
                      onClick={() => handleEditField("scheduled_start_date", productionOrder.scheduled_start_date?.split("T")[0] || "")}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Scheduled End */}
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Scheduled End:
                </p>
                {editingField === "scheduled_end_date" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("scheduled_end_date")}
                      disabled={isSaving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      disabled={isSaving}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-900">
                      {productionOrder.scheduled_end_date
                        ? new Date(productionOrder.scheduled_end_date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })
                        : "-"}
                    </p>
                    <button
                      onClick={() => handleEditField("scheduled_end_date", productionOrder.scheduled_end_date?.split("T")[0] || "")}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>


            </div>

            {/* Notes */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 mb-1">Notes:</p>
                {editingField !== "notes" && (
                  <button
                    onClick={() => handleEditField("notes", productionOrder.notes || "")}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit notes"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
              {editingField === "notes" ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 text-gray-900 border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    rows={2}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("notes")}
                    disabled={isSaving}
                    className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Save"
                  >
                    <CheckCircleIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    disabled={isSaving}
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Cancel"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <p className="text-gray-700">{productionOrder.notes || "No notes"}</p>
              )}
            </div>

          </>
        )}
      </div>

      {/* Work Center Schedule Section */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Work Center Schedule
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Operations scheduled for this production order
              </p>
            </div>
            {(schedules.length > 0) && (
              <button
                onClick={handleClearSchedule}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200 shadow-sm"
                title="Clear schedule and reset status"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="font-medium text-sm">Clear Schedule</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Work Center
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Operation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Scheduled Start
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Scheduled End
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schedules.map((schedule) => {
                  return (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {schedule.workCenter ? (
                          <Link
                            href={`/workcenter/${schedule.work_center_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {schedule.workCenter.work_center_code}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.productData ? (
                          <Link
                            href={`/products/${schedule.product_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {schedule.productData.product_code}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.operation ? (
                          <Link
                            href={`/operations/${schedule.operation_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {schedule.operation.operation_code}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getScheduleStatusColor(schedule.status)}`}
                        >
                          {schedule.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(schedule.scheduled_start).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(schedule.scheduled_end).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "UTC",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {schedules.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No work center schedule found</p>
              <p className="text-sm text-gray-400 mt-1">
                Schedule operations to start production
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {
        showDeleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => !isDeleting && setShowDeleteConfirm(false)}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                {/* Warning Icon */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  Delete Production Order
                </h3>

                {/* Message */}
                <p className="text-gray-600 text-center mb-2">
                  Are you sure you want to delete production order
                </p>
                <p className="text-lg font-semibold text-gray-900 text-center mb-4">
                  &quot;{productionOrder.po_number}&quot;?
                </p>

                {/* Warning Text */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-red-700 text-center">
                    ⚠️ This action cannot be undone. All production order data will be permanently deleted.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
