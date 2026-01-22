"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Shift } from "@/app/types/Shift";
import { fetchShiftById, updateShift, deleteShift } from "@/app/lib/data";
import { ArrowLeftIcon, ClockIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

interface ShiftDetailPageProps {
    params: Promise<{
        shift_id: string;
    }>;
}

export default function ShiftDetailPage({ params }: ShiftDetailPageProps) {
    const router = useRouter();
    const { shift_id } = use(params);
    const [shift, setShift] = useState<Shift | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadShift = async () => {
            setIsLoading(true);
            try {
                const shiftId = parseInt(shift_id);
                const data = await fetchShiftById(shiftId);
                setShift(data);
            } catch (error) {
                console.error("Failed to fetch shift:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadShift();
    }, [shift_id]);

    const handleEditField = (field: string, currentValue: string) => {
        setEditingField(field);
        setEditValue(currentValue);
    };

    const handleSaveField = async (field: string) => {
        if (!shift) return;

        setIsSaving(true);
        try {
            const updateData: Partial<Shift> = {};

            // Helper function to convert time string to minutes
            const timeToMinutes = (time: string): number => {
                const [hours, minutes] = time.split(":").map(Number);
                return hours * 60 + minutes;
            };

            // Helper function to calculate effective working minutes
            const calculateEffectiveMinutes = (startTime: string, endTime: string, breakMinutes: number): number => {
                let startMinutes = timeToMinutes(startTime);
                let endMinutes = timeToMinutes(endTime);

                // Handle overnight shifts (e.g., 22:00 - 06:00)
                if (endMinutes <= startMinutes) {
                    endMinutes += 24 * 60; // Add 24 hours
                }

                const totalMinutes = endMinutes - startMinutes;
                return Math.max(0, totalMinutes - breakMinutes);
            };

            if (field === "shift_code") {
                updateData.shift_code = editValue;
            } else if (field === "shift_name") {
                updateData.shift_name = editValue;
            } else if (field === "start_time") {
                updateData.start_time = editValue;
                // Recalculate effective_working_minutes
                updateData.effective_working_minutes = calculateEffectiveMinutes(
                    editValue,
                    shift.end_time,
                    shift.break_duration_minutes
                );
            } else if (field === "end_time") {
                updateData.end_time = editValue;
                // Recalculate effective_working_minutes
                updateData.effective_working_minutes = calculateEffectiveMinutes(
                    shift.start_time,
                    editValue,
                    shift.break_duration_minutes
                );
            } else if (field === "break_duration_minutes") {
                const breakMinutes = parseInt(editValue);
                updateData.break_duration_minutes = breakMinutes;
                // Recalculate effective_working_minutes
                updateData.effective_working_minutes = calculateEffectiveMinutes(
                    shift.start_time,
                    shift.end_time,
                    breakMinutes
                );
            } else if (field === "is_active") {
                updateData.is_active = editValue === "true";
            } else if (field === "description") {
                updateData.description = editValue;
            }

            const updatedShift = await updateShift(shift.id, updateData);
            setShift(updatedShift);
            setEditingField(null);
            setEditValue("");
        } catch (error) {
            console.error("Failed to update shift:", error);
            alert("Failed to update shift. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingField(null);
        setEditValue("");
    };

    const handleDeleteShift = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!shift) return;

        setIsDeleting(true);
        try {
            await deleteShift(shift.id);
            router.push("/shifts");
        } catch (error) {
            console.error("Failed to delete shift:", error);
            alert("Failed to delete shift. Please try again.");
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
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

    if (!shift) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-lg">Shift not found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Delete Shift
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete shift{" "}
                            <span className="font-medium">{shift.shift_code}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
                        >
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                {/* Shift Code - Editable */}
                                {editingField === "shift_code" ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="text-3xl font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveField("shift_code")}
                                            disabled={isSaving}
                                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="Save"
                                        >
                                            <CheckCircleIcon className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
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
                                            {shift.shift_code}
                                        </h1>
                                        <button
                                            onClick={() => handleEditField("shift_code", shift.shift_code)}
                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit shift code"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {/* Status - Editable */}
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
                                            onClick={handleCancelEdit}
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
                                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${shift.is_active
                                                ? "bg-green-100 text-green-700 border-green-200"
                                                : "bg-gray-100 text-gray-600 border-gray-200"
                                                }`}
                                        >
                                            {shift.is_active ? "ACTIVE" : "INACTIVE"}
                                        </span>
                                        <button
                                            onClick={() => handleEditField("is_active", shift.is_active.toString())}
                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit status"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Shift Name - Editable */}
                            <div className="flex items-center gap-2">
                                {editingField === "shift_name" ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="text-gray-900 text-lg border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-80"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveField("shift_name")}
                                            disabled={isSaving}
                                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="Save"
                                        >
                                            <CheckCircleIcon className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={isSaving}
                                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="Cancel"
                                        >
                                            <XCircleIcon className="w-6 h-6" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-gray-600 text-lg">{shift.shift_name}</p>
                                        <button
                                            onClick={() => handleEditField("shift_name", shift.shift_name)}
                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit shift name"
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
                        onClick={handleDeleteShift}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200"
                        title="Delete this shift"
                    >
                        <TrashIcon className="w-5 h-5" />
                        <span className="font-medium">Delete</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50 p-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        Shift Details
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Start Time - Editable */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-blue-600" />
                                    <p className="text-sm text-blue-600 font-medium">Start Time</p>
                                </div>
                                {editingField !== "start_time" && (
                                    <button
                                        onClick={() => handleEditField("start_time", shift.start_time)}
                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                                        title="Edit start time"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {editingField === "start_time" ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="text-lg font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleSaveField("start_time")}
                                        disabled={isSaving}
                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Save"
                                    >
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Cancel"
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatTime(shift.start_time)}
                                </p>
                            )}
                        </div>

                        {/* End Time - Editable */}
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-purple-600" />
                                    <p className="text-sm text-purple-600 font-medium">End Time</p>
                                </div>
                                {editingField !== "end_time" && (
                                    <button
                                        onClick={() => handleEditField("end_time", shift.end_time)}
                                        className="p-1 text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors"
                                        title="Edit end time"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {editingField === "end_time" ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="text-lg font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleSaveField("end_time")}
                                        disabled={isSaving}
                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Save"
                                    >
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Cancel"
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatTime(shift.end_time)}
                                </p>
                            )}
                        </div>

                        {/* Break Duration - Editable */}
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-orange-600 font-medium">
                                    Break Duration
                                </p>
                                {editingField !== "break_duration_minutes" && (
                                    <button
                                        onClick={() => handleEditField("break_duration_minutes", shift.break_duration_minutes.toString())}
                                        className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors"
                                        title="Edit break duration"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {editingField === "break_duration_minutes" ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="text-lg font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-24"
                                        autoFocus
                                    />
                                    <span className="text-gray-600">min</span>
                                    <button
                                        onClick={() => handleSaveField("break_duration_minutes")}
                                        disabled={isSaving}
                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Save"
                                    >
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Cancel"
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-900">
                                    {shift.break_duration_minutes} min
                                </p>
                            )}
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-600 font-medium mb-2">
                                Effective Working Time
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {shift.effective_working_minutes} min
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                ({(shift.effective_working_minutes / 60).toFixed(1)} hours)
                            </p>
                        </div>
                    </div>

                    {/* Description - Editable */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-1">
                            <p className="text-sm text-gray-500">Description:</p>
                            {editingField !== "description" && (
                                <button
                                    onClick={() => handleEditField("description", shift.description || "")}
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
                                    className="flex-1 text-gray-900 border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] bg-white"
                                    autoFocus
                                />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleSaveField("description")}
                                        disabled={isSaving}
                                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Save"
                                    >
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Cancel"
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-700">{shift.description || "No description"}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
