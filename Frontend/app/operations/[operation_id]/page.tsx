"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Operation } from "@/app/types/Operation";
import { Routing } from "@/app/types/Routing";
import { ProductData } from "@/app/types/CoreData";
import { WorkCenter } from "@/app/types/WorkCenter";
import {
  fetchOperationById,
  fetchRouting,
  fetchProducts,
  fetchWorkCenters,
  fetchWorkCentersByOperation,
  updateOperation,
  deleteOperation,
} from "@/app/lib/data";
import {
  ArrowLeftIcon,
  ClockIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon,
  BuildingOffice2Icon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

interface OperationDetailPageProps {
  params: Promise<{
    operation_id: string;
  }>;
}

interface RoutingWithDetails extends Routing {
  product?: ProductData;
}

export default function OperationDetailPage({
  params,
}: OperationDetailPageProps) {
  const router = useRouter();
  const { operation_id } = use(params);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [routings, setRoutings] = useState<RoutingWithDetails[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // UI states
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"workcenters" | "routing">("workcenters");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const operationId = parseInt(operation_id);
        const [operationData, routingsData, productsData, opWorkCenters] =
          await Promise.all([
            fetchOperationById(operationId),
            fetchRouting(),
            fetchProducts(),
            fetchWorkCentersByOperation(operationId),
          ]);

        setOperation(operationData);
        setWorkCenters(opWorkCenters);

        const opRoutings = routingsData
          .filter((r) => r.operation_id === operationId && r.is_active)
          .map((r) => ({
            ...r,
            product: productsData.find((p) => p.id === r.product_id),
          }));

        setRoutings(opRoutings);
      } catch (error) {
        console.error("Failed to fetch operation details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [operation_id]);

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveField = async (field: string) => {
    if (!operation) return;
    setIsSaving(true);
    try {
      const updateData: Partial<Operation> = {};
      if (field === "operation_code") updateData.operation_code = editValue;
      else if (field === "operation_name") updateData.operation_name = editValue;
      else if (field === "description") updateData.description = editValue;
      else if (field === "operation_type") updateData.operation_type = editValue;
      else if (field === "is_active") updateData.is_active = editValue === "true";

      const updated = await updateOperation(operation.id, updateData);
      setOperation(updated);
      setEditingField(null);
    } catch (error) {
      console.error("Failed to update operation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOperation = async () => {
    if (!operation) return;
    setIsDeleting(true);
    try {
      await deleteOperation(operation.id);
      router.push("/operations");
    } catch (error) {
      console.error("Failed to delete operation:", error);
      alert("Failed to delete operation. It may be used in existing routings.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const refreshWorkCenters = async () => {
    try {
      const operationId = parseInt(operation_id);
      const opWorkCenters = await fetchWorkCentersByOperation(operationId);
      setWorkCenters(opWorkCenters);
    } catch (error) {
      console.error("Failed to refresh work centers:", error);
    }
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

  if (!operation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Operation not found</p>
      </div>
    );
  }

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
                {/* Editable Operation Code */}
                {editingField === "operation_code" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-3xl font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("operation_code")}
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
                      {operation.operation_code}
                    </h1>
                    <button
                      onClick={() => handleEditField("operation_code", operation.operation_code)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit code"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Editable Active Status */}
                {editingField === "is_active" ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-3 py-1.5 rounded-md text-sm font-semibold border-2 border-blue-500 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      autoFocus
                    >
                      <option value="true" className="text-gray-900">ACTIVE</option>
                      <option value="false" className="text-gray-900">INACTIVE</option>
                    </select>
                    <button
                      onClick={() => handleSaveField("is_active")}
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
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${operation.is_active
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                    >
                      {operation.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <button
                      onClick={() => handleEditField("is_active", String(operation.is_active))}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit status"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Editable Operation Name */}
              <div className="flex items-center gap-2">
                {editingField === "operation_name" ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-gray-900 text-lg border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("operation_name")}
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
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 text-lg">{operation.operation_name}</p>
                    <button
                      onClick={() => handleEditField("operation_name", operation.operation_name)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit name"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200"
            title="Delete this operation"
          >
            <TrashIcon className="w-5 h-5" />
            <span className="font-medium">Delete</span>
          </button>
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
          <div className="grid grid-cols-2 gap-8">
            {/* Operation Type */}
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                <WrenchScrewdriverIcon className="w-4 h-4" />
                Operation Type:
              </p>
              {editingField === "operation_type" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                    placeholder="e.g., Assembly, Testing, QC"
                  />
                  <button
                    onClick={() => handleSaveField("operation_type")}
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
                  <p className="text-base font-medium text-gray-900">
                    {operation.operation_type || "-"}
                  </p>
                  <button
                    onClick={() => handleEditField("operation_type", operation.operation_type || "")}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit type"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Created At */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Created:</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(operation.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        {!isDetailsCollapsed && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 mb-1">Description:</p>
              {editingField !== "description" && (
                <button
                  onClick={() => handleEditField("description", operation.description || "")}
                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit description"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            {editingField === "description" ? (
              <div className="flex items-start gap-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 text-gray-900 border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  rows={2}
                  autoFocus
                />
                <button
                  onClick={() => handleSaveField("description")}
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
              <p className="text-gray-700">
                {operation.description || "No description"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("workcenters")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "workcenters"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <div className="flex items-center gap-2">
              <BuildingOffice2Icon className="w-5 h-5" />
              <span>Work Centers ({workCenters.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("routing")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "routing"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              <span>Routing ({routings.length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        {activeTab === "workcenters" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Work Centers
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Work centers that can perform this operation
                </p>
              </div>
              <Link
                href="/workcenter"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                Add Work Center
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                      Capacity/Hour
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                      Workers Required
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                      Cost/Hour
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workCenters.map((wc) => (
                    <tr key={wc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/workcenter/${wc.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {wc.work_center_code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {wc.work_center_name}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {wc.capacity_per_hour}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {wc.number_of_workers_required}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {wc.cost_per_hour != null ? `฿${wc.cost_per_hour.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${wc.status === "active"
                            ? "bg-green-100 text-green-700"
                            : wc.status === "maintenance"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                            }`}
                        >
                          {wc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {workCenters.length === 0 && (
              <div className="text-center py-12">
                <BuildingOffice2Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No work centers assigned</p>
                <p className="text-sm text-gray-400 mt-1">
                  Add a work center and assign this operation to it
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "routing" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Routing Information
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Products using this operation in their routing
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                      Sequence
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      Setup Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {routings.map((routing) => (
                    <tr key={routing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {routing.product ? (
                          <Link
                            href={`/products/${routing.product_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {routing.product.product_code}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                          {routing.sequence_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-sm text-gray-900">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <span>{routing.setup_time_minutes} min</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {routing.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {routings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No routing information found</p>
                <p className="text-sm text-gray-400 mt-1">
                  This operation is not used in any product routing yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <TrashIcon className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Operation</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <strong>{operation.operation_code}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOperation}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
