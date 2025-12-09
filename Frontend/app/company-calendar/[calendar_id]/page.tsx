"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CompanyCalendar } from "@/app/types/Shift";
import { fetchCompanyCalendarById, updateCompanyCalendar, deleteCompanyCalendar } from "@/app/lib/data";
import { ArrowLeftIcon, CalendarDaysIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

interface CalendarDetailPageProps {
    params: Promise<{
        calendar_id: string;
    }>;
}

export default function CalendarDetailPage({ params }: CalendarDetailPageProps) {
    const router = useRouter();
    const { calendar_id } = use(params);
    const [calendar, setCalendar] = useState<CompanyCalendar | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadCalendar = async () => {
            setIsLoading(true);
            try {
                const calendarId = parseInt(calendar_id);
                const data = await fetchCompanyCalendarById(calendarId);
                setCalendar(data);
            } catch (error) {
                console.error("Failed to fetch calendar:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCalendar();
    }, [calendar_id]);

    const handleEditField = (field: string, currentValue: string) => {
        setEditingField(field);
        setEditValue(currentValue);
    };

    const handleSaveField = async (field: string) => {
        if (!calendar) return;

        setIsSaving(true);
        try {
            const updateData: Partial<CompanyCalendar> = {};

            if (field === "calendar_date") {
                updateData.calendar_date = editValue;
            } else if (field === "day_type") {
                updateData.day_type = editValue;
                // Auto-update is_working_day based on day_type
                // working-day and special-working-day are working days
                updateData.is_working_day = editValue === "working-day" || editValue === "special-working-day";
            } else if (field === "is_working_day") {
                updateData.is_working_day = editValue === "true";
            } else if (field === "description") {
                updateData.description = editValue;
            }

            const updatedCalendar = await updateCompanyCalendar(calendar.id, updateData);
            setCalendar(updatedCalendar);
            setEditingField(null);
            setEditValue("");
        } catch (error) {
            console.error("Failed to update calendar:", error);
            alert("Failed to update calendar. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingField(null);
        setEditValue("");
    };

    const handleDeleteCalendar = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!calendar) return;

        setIsDeleting(true);
        try {
            await deleteCompanyCalendar(calendar.id);
            router.push("/company-calendar");
        } catch (error) {
            console.error("Failed to delete calendar:", error);
            alert("Failed to delete calendar. Please try again.");
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const getDayTypeBadge = (dayType: string) => {
        const styles: Record<string, string> = {
            "working-day": "bg-green-100 text-green-700 border-green-200",
            "weekend": "bg-blue-100 text-blue-700 border-blue-200",
            "holiday": "bg-red-100 text-red-700 border-red-200",
            "special-working-day": "bg-yellow-100 text-yellow-700 border-yellow-200",
        };
        return styles[dayType] || "bg-gray-100 text-gray-700 border-gray-200";
    };

    const getDayTypeLabel = (dayType: string) => {
        const labels: Record<string, string> = {
            "working-day": "Working Day",
            "weekend": "Weekend",
            "holiday": "Holiday",
            "special-working-day": "Special Working Day",
        };
        return labels[dayType] || dayType;
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

    if (!calendar) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-lg">Calendar entry not found</p>
            </div>
        );
    }

    const date = new Date(calendar.calendar_date);
    const formattedDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="flex flex-col h-full">
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Delete Calendar Entry
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this calendar entry for{" "}
                            <span className="font-medium">{formattedDate}</span>? This action cannot be undone.
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
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {formattedDate}
                                </h1>

                                {/* Day Type - Editable */}
                                {editingField === "day_type" ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="px-3 py-1.5 rounded-md text-sm font-semibold border-2 border-blue-500 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            autoFocus
                                        >
                                            <option value="working-day">Working Day</option>
                                            <option value="weekend">Weekend</option>
                                            <option value="holiday">Holiday</option>
                                            <option value="special-working-day">Special Working Day</option>
                                        </select>
                                        <button
                                            onClick={() => handleSaveField("day_type")}
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
                                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getDayTypeBadge(
                                                calendar.day_type
                                            )}`}
                                        >
                                            {getDayTypeLabel(calendar.day_type).toUpperCase()}
                                        </span>
                                        <button
                                            onClick={() => handleEditField("day_type", calendar.day_type)}
                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit day type"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-600 text-lg">Calendar Entry Details</p>
                        </div>
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={handleDeleteCalendar}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200"
                        title="Delete this calendar entry"
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
                        Calendar Information
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                                    <p className="text-sm text-blue-600 font-medium">Date</p>
                                </div>
                                {editingField !== "calendar_date" && (
                                    <button
                                        onClick={() => handleEditField("calendar_date", calendar.calendar_date)}
                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                                        title="Edit date"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {editingField === "calendar_date" ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="text-lg font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleSaveField("calendar_date")}
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
                                <p className="text-xl font-bold text-gray-900">
                                    {calendar.calendar_date}
                                </p>
                            )}
                        </div>

                        <div className={`p-4 rounded-lg border ${getDayTypeBadge(calendar.day_type)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">Day Type</p>
                                {editingField !== "day_type" && (
                                    <button
                                        onClick={() => handleEditField("day_type", calendar.day_type)}
                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                        title="Edit day type"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xl font-bold">
                                {getDayTypeLabel(calendar.day_type)}
                            </p>
                        </div>

                        {/* Working Day Status - Editable */}
                        <div className={`p-4 rounded-lg border ${calendar.is_working_day
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className={`text-sm font-medium ${calendar.is_working_day ? "text-green-600" : "text-red-600"
                                    }`}>
                                    Working Day Status
                                </p>
                                {editingField !== "is_working_day" && (
                                    <button
                                        onClick={() => handleEditField("is_working_day", calendar.is_working_day.toString())}
                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                        title="Edit working day status"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {editingField === "is_working_day" ? (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="px-3 py-1.5 rounded-md text-sm font-semibold border-2 border-blue-500 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        autoFocus
                                    >
                                        <option value="true">Yes - Working Day</option>
                                        <option value="false">No - Non-Working Day</option>
                                    </select>
                                    <button
                                        onClick={() => handleSaveField("is_working_day")}
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
                                <p className="text-xl font-bold text-gray-900">
                                    {calendar.is_working_day ? "Yes - Working Day" : "No - Non-Working Day"}
                                </p>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 font-medium mb-2">Day of Week</p>
                            <p className="text-xl font-bold text-gray-900">
                                {date.toLocaleDateString("en-US", { weekday: "long" })}
                            </p>
                        </div>
                    </div>

                    {/* Description - Editable */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-1">
                            <p className="text-sm text-gray-500">Description:</p>
                            {editingField !== "description" && (
                                <button
                                    onClick={() => handleEditField("description", calendar.description || "")}
                                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit description"
                                >
                                    <PencilSquareIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        {editingField === "description" ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-full text-gray-900 border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] bg-white"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSaveField("description")}
                                        disabled={isSaving}
                                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                                    >
                                        <XCircleIcon className="w-5 h-5" />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-700">{calendar.description || "No description"}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
