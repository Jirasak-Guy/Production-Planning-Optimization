"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import { createShift } from "@/app/lib/data";

interface AddShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddShiftModal({
    isOpen,
    onClose,
    onSuccess,
}: AddShiftModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        shift_code: "",
        shift_name: "",
        start_time: "08:00",
        end_time: "17:00",
        break_duration_minutes: "60",
        effective_working_minutes: "",
        description: "",
        is_active: true,
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    // Auto-calculate effective working minutes
    useEffect(() => {
        const calculateEffectiveMinutes = () => {
            if (formData.start_time && formData.end_time) {
                const [startHour, startMin] = formData.start_time.split(':').map(Number);
                const [endHour, endMin] = formData.end_time.split(':').map(Number);

                let startMinutes = startHour * 60 + startMin;
                let endMinutes = endHour * 60 + endMin;

                // Handle overnight shifts
                if (endMinutes < startMinutes) {
                    endMinutes += 24 * 60;
                }

                const totalMinutes = endMinutes - startMinutes;
                const breakMinutes = parseInt(formData.break_duration_minutes) || 0;
                const effectiveMinutes = Math.max(0, totalMinutes - breakMinutes);

                setFormData((prev) => ({
                    ...prev,
                    effective_working_minutes: effectiveMinutes.toString(),
                }));
            }
        };

        calculateEffectiveMinutes();
    }, [formData.start_time, formData.end_time, formData.break_duration_minutes]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await createShift({
                shift_code: formData.shift_code,
                shift_name: formData.shift_name,
                start_time: formData.start_time,
                end_time: formData.end_time,
                break_duration_minutes: parseInt(formData.break_duration_minutes),
                effective_working_minutes: parseInt(formData.effective_working_minutes),
                description: formData.description || undefined,
                is_active: formData.is_active,
            });
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error("Failed to create shift:", error);
            alert("Failed to create shift. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            shift_code: "",
            shift_name: "",
            start_time: "08:00",
            end_time: "17:00",
            break_duration_minutes: "60",
            effective_working_minutes: "",
            description: "",
            is_active: true,
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Shift">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shift Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="shift_code"
                            value={formData.shift_code}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., SHIFT-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shift Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="shift_name"
                            value={formData.shift_name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Morning Shift"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="time"
                            name="start_time"
                            value={formData.start_time}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="time"
                            name="end_time"
                            value={formData.end_time}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Break Duration (min) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="break_duration_minutes"
                            value={formData.break_duration_minutes}
                            onChange={handleChange}
                            required
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="60"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Effective Working (min)
                        </label>
                        <input
                            type="number"
                            name="effective_working_minutes"
                            value={formData.effective_working_minutes}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-100 focus:outline-none"
                            placeholder="Auto-calculated"
                        />
                        <p className="text-xs text-gray-500 mt-1">Auto-calculated from times</p>
                    </div>
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
                        placeholder="Enter shift description"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="is_active"
                        id="is_active_shift"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active_shift" className="text-sm text-gray-700">
                        Active
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
                        {isLoading ? "Creating..." : "Create Shift"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
