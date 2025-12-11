"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  WorkCenter,
  WorkCenterShift,
  WorkCenterCalendarException,
} from "@/app/types/WorkCenter";
import { Shift } from "@/app/types/Shift";
import {
  fetchWorkCenters,
  fetchWorkCenterShifts,
  fetchShifts,
  fetchWorkCenterCalendarExceptions,
  updateWorkCenter,
  deleteWorkCenter,
  createWorkCenterShift,
  deleteWorkCenterShift,
  createWorkCenterCalendarException,
  deleteWorkCenterCalendarException,
} from "@/app/lib/data";
import {
  ArrowLeftIcon,
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  WrenchScrewdriverIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  PlusCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon as XCircleIconSolid } from "@heroicons/react/24/solid";

interface WorkCenterDetailPageProps {
  params: Promise<{
    workcenter_id: string;
  }>;
}

interface WorkCenterShiftWithDetails extends WorkCenterShift {
  shift?: Shift;
}

interface DaySchedule {
  dayNumber: number;
  dayName: string;
  shifts: WorkCenterShiftWithDetails[];
}

export default function WorkCenterDetailPage({
  params,
}: WorkCenterDetailPageProps) {
  const router = useRouter();
  const { workcenter_id } = use(params);
  const [workCenter, setWorkCenter] = useState<WorkCenter | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [exceptions, setExceptions] = useState<WorkCenterCalendarException[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [wcShifts, setWcShifts] = useState<WorkCenterShiftWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add Shift Modal
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [newShiftData, setNewShiftData] = useState({ shiftId: "", dayOfWeek: 1 });
  const [isAddingShift, setIsAddingShift] = useState(false);
  
  // Delete Shift
  const [shiftToDelete, setShiftToDelete] = useState<WorkCenterShiftWithDetails | null>(null);
  const [isDeletingShift, setIsDeletingShift] = useState(false);
  
  // Add Exception Modal
  const [showAddExceptionModal, setShowAddExceptionModal] = useState(false);
  const [newExceptionData, setNewExceptionData] = useState({
    exceptionDate: "",
    exceptionType: "closed",
    description: "",
    capacityPercentage: 0,
  });
  const [isAddingException, setIsAddingException] = useState(false);
  
  // Delete Exception
  const [exceptionToDelete, setExceptionToDelete] = useState<WorkCenterCalendarException | null>(null);
  const [isDeletingException, setIsDeletingException] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const workCenterId = parseInt(workcenter_id);
      const [workCentersData, shiftsData, allShiftsData, exceptionsData] =
        await Promise.all([
          fetchWorkCenters(),
          fetchWorkCenterShifts(),
          fetchShifts(),
          fetchWorkCenterCalendarExceptions(),
        ]);

      const wc = workCentersData.find((w) => w.id === workCenterId);
      setWorkCenter(wc || null);
      setAllShifts(allShiftsData);

      // Filter shifts for this work center
      const filteredWcShifts = shiftsData
        .filter((s) => s.work_center_id === workCenterId && s.is_active)
        .map((s) => ({
          ...s,
          shift: allShiftsData.find((shift) => shift.id === s.shift_id),
        }));
      setWcShifts(filteredWcShifts);

      // Build weekly schedule
      const days = [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
      ];
      const schedule: DaySchedule[] = days.map((dayName, index) => ({
        dayNumber: index + 1,
        dayName,
        shifts: filteredWcShifts.filter((s) => s.day_of_week === index + 1),
      }));
      setWeeklySchedule(schedule);

      // Filter exceptions for this work center
      const wcExceptions = exceptionsData.filter(
        (e) => e.work_center_id === workCenterId
      );
      setExceptions(wcExceptions);
    } catch (error) {
      console.error("Failed to fetch work center details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workcenter_id]);

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveField = async (field: string) => {
    if (!workCenter) return;
    setIsSaving(true);
    try {
      const updateData: Partial<WorkCenter> = {};
      if (field === "work_center_code") updateData.work_center_code = editValue;
      else if (field === "work_center_name") updateData.work_center_name = editValue;
      else if (field === "description") updateData.description = editValue;
      else if (field === "capacity_per_hour") updateData.capacity_per_hour = parseFloat(editValue) || 0;
      else if (field === "number_of_workers_required") updateData.number_of_workers_required = parseInt(editValue) || 0;
      else if (field === "cost_per_hour") updateData.cost_per_hour = parseFloat(editValue) || 0;
      else if (field === "status") updateData.status = editValue;

      const updated = await updateWorkCenter(workCenter.id, updateData);
      setWorkCenter(updated);
      setEditingField(null);
    } catch (error) {
      console.error("Failed to update work center:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkCenter = async () => {
    if (!workCenter) return;
    setIsDeleting(true);
    try {
      await deleteWorkCenter(workCenter.id);
      router.push("/workcenter");
    } catch (error) {
      console.error("Failed to delete work center:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddShift = async () => {
    if (!workCenter || !newShiftData.shiftId) return;
    setIsAddingShift(true);
    try {
      await createWorkCenterShift({
        work_center_id: workCenter.id,
        shift_id: parseInt(newShiftData.shiftId),
        day_of_week: newShiftData.dayOfWeek,
        effective_from: new Date().toISOString().split("T")[0],
        is_active: true,
      });
      setShowAddShiftModal(false);
      setNewShiftData({ shiftId: "", dayOfWeek: 1 });
      await loadData();
    } catch (error) {
      console.error("Failed to add shift:", error);
    } finally {
      setIsAddingShift(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    setIsDeletingShift(true);
    try {
      await deleteWorkCenterShift(shiftToDelete.id);
      setShiftToDelete(null);
      await loadData();
    } catch (error) {
      console.error("Failed to delete shift:", error);
    } finally {
      setIsDeletingShift(false);
    }
  };

  const handleAddException = async () => {
    if (!workCenter || !newExceptionData.exceptionDate) return;
    setIsAddingException(true);
    try {
      await createWorkCenterCalendarException({
        work_center_id: workCenter.id,
        exception_date: newExceptionData.exceptionDate,
        exception_type: newExceptionData.exceptionType,
        description: newExceptionData.description || undefined,
        capacity_percentage: newExceptionData.capacityPercentage,
      });
      setShowAddExceptionModal(false);
      setNewExceptionData({ exceptionDate: "", exceptionType: "closed", description: "", capacityPercentage: 0 });
      await loadData();
    } catch (error) {
      console.error("Failed to add exception:", error);
    } finally {
      setIsAddingException(false);
    }
  };

  const handleDeleteException = async () => {
    if (!exceptionToDelete) return;
    setIsDeletingException(true);
    try {
      await deleteWorkCenterCalendarException(exceptionToDelete.id);
      setExceptionToDelete(null);
      await loadData();
    } catch (error) {
      console.error("Failed to delete exception:", error);
    } finally {
      setIsDeletingException(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
      retired: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case "closed": return <XCircleIcon className="w-5 h-5" />;
      case "maintenance": return <WrenchScrewdriverIcon className="w-5 h-5" />;
      case "reduced-capacity": return <ExclamationTriangleIcon className="w-5 h-5" />;
      case "special-shift": return <ClockIcon className="w-5 h-5" />;
      default: return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
  };

  const getExceptionColor = (type: string) => {
    const colors: Record<string, string> = {
      closed: "bg-red-100 text-red-700 border-red-300",
      maintenance: "bg-yellow-100 text-yellow-700 border-yellow-300",
      "reduced-capacity": "bg-orange-100 text-orange-700 border-orange-300",
      "special-shift": "bg-blue-100 text-blue-700 border-blue-300",
    };
    return colors[type] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getExceptionLabel = (type: string) => {
    const labels: Record<string, string> = {
      closed: "Closed",
      maintenance: "Maintenance",
      "reduced-capacity": "Reduced Capacity",
      "special-shift": "Special Shift",
    };
    return labels[type] || type;
  };

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

  if (!workCenter) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Work Center not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                {/* Work Center Code - Editable */}
                {editingField === "work_center_code" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-3xl font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("work_center_code")}
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
                      <XCircleIconSolid className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {workCenter.work_center_code}
                    </h1>
                    <button
                      onClick={() => handleEditField("work_center_code", workCenter.work_center_code)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit code"
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
                      <option value="active" className="text-gray-900">ACTIVE</option>
                      <option value="inactive" className="text-gray-900">INACTIVE</option>
                      <option value="maintenance" className="text-gray-900">MAINTENANCE</option>
                      <option value="retired" className="text-gray-900">RETIRED</option>
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
                      <XCircleIconSolid className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getStatusColor(
                        workCenter.status
                      )}`}
                    >
                      {workCenter.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleEditField("status", workCenter.status)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit status"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Editable Name */}
              <div className="flex items-center gap-2">
                {editingField === "work_center_name" ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-gray-900 text-lg border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("work_center_name")}
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
                      <XCircleIconSolid className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 text-lg">{workCenter.work_center_name}</p>
                    <button
                      onClick={() => handleEditField("work_center_name", workCenter.work_center_name)}
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
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isDetailsCollapsed ? (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  Show Details
                </>
              ) : (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  Hide Details
                </>
              )}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Collapsible Details */}
        {!isDetailsCollapsed && (
          <div className="grid grid-cols-3 gap-8 mt-4">
            {/* Capacity per Hour */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Capacity per Hour:</p>
              {editingField === "capacity_per_hour" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("capacity_per_hour")}
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
                    <XCircleIconSolid className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-gray-900">
                    {workCenter.capacity_per_hour} units
                  </p>
                  <button
                    onClick={() => handleEditField("capacity_per_hour", String(workCenter.capacity_per_hour))}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit capacity"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Workers Required */}
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                <UsersIcon className="w-4 h-4" />
                Workers Required:
              </p>
              {editingField === "number_of_workers_required" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("number_of_workers_required")}
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
                    <XCircleIconSolid className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-gray-900">
                    {workCenter.number_of_workers_required}
                  </p>
                  <button
                    onClick={() => handleEditField("number_of_workers_required", String(workCenter.number_of_workers_required))}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit workers"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Cost per Hour */}
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                Cost per Hour:
              </p>
              {editingField === "cost_per_hour" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("cost_per_hour")}
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
                    <XCircleIconSolid className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-gray-900">
                    {workCenter.cost_per_hour != null ? `$${Number(workCenter.cost_per_hour).toFixed(2)}` : "-"}
                  </p>
                  <button
                    onClick={() => handleEditField("cost_per_hour", String(workCenter.cost_per_hour || 0))}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit cost"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
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
                  onClick={() => handleEditField("description", workCenter.description || "")}
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
                  <XCircleIconSolid className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <p className="text-gray-700">
                {workCenter.description || "No description"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="space-y-6">
          {/* Weekly Schedule */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Weekly Schedule
              </h2>
              <button
                onClick={() => setShowAddShiftModal(true)}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <PlusCircleIcon className="w-4 h-4" />
                Add Shift
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-7 gap-4">
                {weeklySchedule.map((day) => (
                  <div
                    key={day.dayNumber}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <h3 className="font-semibold text-sm text-gray-900">
                        {day.dayName}
                      </h3>
                    </div>

                    <div className="p-3 space-y-2 min-h-[120px]">
                      {day.shifts.length > 0 ? (
                        day.shifts.map((wcShift) => {
                          const isShiftActive = wcShift.shift?.is_active !== false;
                          return (
                            <div
                              key={wcShift.id}
                              className={`border rounded p-2 group relative ${
                                isShiftActive 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-red-50 border-red-300'
                              }`}
                            >
                              <button
                                onClick={() => setShiftToDelete(wcShift)}
                                className="absolute top-1 right-1 p-1 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <TrashIcon className="w-3 h-3" />
                              </button>
                              <div className="flex items-center gap-1 mb-1">
                                <p className={`text-xs font-semibold ${isShiftActive ? 'text-blue-900' : 'text-red-900'}`}>
                                  {wcShift.shift?.shift_name || "Shift"}
                                </p>
                                {!isShiftActive && (
                                  <ExclamationTriangleIcon className="w-3 h-3 text-red-600" title="This shift is inactive" />
                                )}
                              </div>
                              <div className={`flex items-center gap-1 text-xs ${isShiftActive ? 'text-blue-700' : 'text-red-700'}`}>
                                <ClockIcon className="w-3 h-3" />
                                <span>
                                  {wcShift.shift?.start_time} - {wcShift.shift?.end_time}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-xs text-gray-400">No shifts</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Exceptions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Calendar Exceptions
              </h2>
              <button
                onClick={() => setShowAddExceptionModal(true)}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <PlusCircleIcon className="w-4 h-4" />
                Add Exception
              </button>
            </div>

            <div className="p-6">
              {exceptions.length > 0 ? (
                <div className="space-y-3">
                  {exceptions.map((exception) => (
                    <div
                      key={exception.id}
                      className={`border rounded-lg p-4 ${getExceptionColor(exception.exception_type)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getExceptionIcon(exception.exception_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">
                              {getExceptionLabel(exception.exception_type)}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {new Date(exception.exception_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <button
                                onClick={() => setExceptionToDelete(exception)}
                                className="p-1 text-red-600 hover:bg-red-200 rounded transition-colors"
                                title="Delete exception"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {exception.description && (
                            <p className="text-sm mb-2">{exception.description}</p>
                          )}
                          {exception.capacity_percentage !== 100 && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">Capacity:</span>
                              <div className="flex-1 bg-white bg-opacity-50 rounded-full h-4 overflow-hidden">
                                <div
                                  className="h-full bg-current opacity-30"
                                  style={{ width: `${exception.capacity_percentage}%` }}
                                />
                              </div>
                              <span className="font-semibold">{exception.capacity_percentage}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No calendar exceptions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Work Center Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <TrashIcon className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Work Center</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete {workCenter.work_center_code}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteWorkCenter}
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

      {/* Add Shift Modal */}
      {showAddShiftModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddShiftModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <button onClick={() => setShowAddShiftModal(false)} className="absolute top-4 right-4">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Add Shift Assignment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                  <select
                    value={newShiftData.shiftId}
                    onChange={(e) => setNewShiftData({ ...newShiftData, shiftId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select a shift</option>
                    {allShifts.filter(s => s.is_active).map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.shift_name} ({shift.start_time} - {shift.end_time})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={newShiftData.dayOfWeek}
                    onChange={(e) => setNewShiftData({ ...newShiftData, dayOfWeek: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {dayNames.map((day, index) => (
                      <option key={index + 1} value={index + 1}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddShiftModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button onClick={handleAddShift} disabled={isAddingShift || !newShiftData.shiftId} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isAddingShift ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Shift Confirmation */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShiftToDelete(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Shift Assignment</h3>
              <p className="text-gray-600 mb-6">Remove {shiftToDelete.shift?.shift_name} from {dayNames[shiftToDelete.day_of_week - 1]}?</p>
              <div className="flex gap-3">
                <button onClick={() => setShiftToDelete(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button onClick={handleDeleteShift} disabled={isDeletingShift} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {isDeletingShift ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Exception Modal */}
      {showAddExceptionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddExceptionModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <button onClick={() => setShowAddExceptionModal(false)} className="absolute top-4 right-4">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Add Calendar Exception</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newExceptionData.exceptionDate}
                    onChange={(e) => setNewExceptionData({ ...newExceptionData, exceptionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newExceptionData.exceptionType}
                    onChange={(e) => setNewExceptionData({ ...newExceptionData, exceptionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="closed">Closed</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reduced-capacity">Reduced Capacity</option>
                    <option value="special-shift">Special Shift</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity Percentage</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newExceptionData.capacityPercentage}
                    onChange={(e) => setNewExceptionData({ ...newExceptionData, capacityPercentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newExceptionData.description}
                    onChange={(e) => setNewExceptionData({ ...newExceptionData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    rows={2}
                    placeholder="Optional description..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddExceptionModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button onClick={handleAddException} disabled={isAddingException || !newExceptionData.exceptionDate} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isAddingException ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exception Confirmation */}
      {exceptionToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExceptionToDelete(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Calendar Exception</h3>
              <p className="text-gray-600 mb-6">
                Remove {getExceptionLabel(exceptionToDelete.exception_type)} exception on {new Date(exceptionToDelete.exception_date).toLocaleDateString()}?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setExceptionToDelete(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
                <button onClick={handleDeleteException} disabled={isDeletingException} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {isDeletingException ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
