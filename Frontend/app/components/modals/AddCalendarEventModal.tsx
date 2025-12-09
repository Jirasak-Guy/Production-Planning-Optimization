"use client";

import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { createCompanyCalendar } from "@/app/lib/data";

interface AddCalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddCalendarEventModal({
    isOpen,
    onClose,
    onSuccess,
}: AddCalendarEventModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        calendar_date: "",
        day_type: "working-day",
        description: "",
        is_working_day: true,
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;

        if (name === "day_type") {
            // Auto-set is_working_day based on day_type
            const isWorkingDay = value === "working-day" || value === "special-working-day";
            setFormData((prev) => ({
                ...prev,
                [name]: value,
                is_working_day: isWorkingDay,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await createCompanyCalendar({
                calendar_date: formData.calendar_date,
                day_type: formData.day_type,
                description: formData.description || undefined,
                is_working_day: formData.is_working_day,
            });
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error("Failed to create calendar event:", error);
            alert("Failed to create calendar event. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            calendar_date: "",
            day_type: "working-day",
            description: "",
            is_working_day: true,
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add Calendar Event">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="calendar_date"
                        value={formData.calendar_date}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day Type <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="day_type"
                        value={formData.day_type}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="working-day">Working Day</option>
                        <option value="weekend">Weekend</option>
                        <option value="holiday">Holiday</option>
                        <option value="special-working-day">Special Working Day</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="e.g., National Holiday, Company Event"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="is_working_day"
                        id="is_working_day"
                        checked={formData.is_working_day}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_working_day" className="text-sm text-gray-700">
                        Working Day
                    </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Creating..." : "Create Event"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
