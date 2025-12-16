"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import { createWorkCenter, fetchOperations } from "@/app/lib/data";
import { Operation } from "@/app/types/Operation";

interface AddWorkCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddWorkCenterModal({
    isOpen,
    onClose,
    onSuccess,
}: AddWorkCenterModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [formData, setFormData] = useState({
        work_center_code: "",
        work_center_name: "",
        description: "",
        operation_id: "",
        capacity_per_hour: "",
        number_of_workers_required: "",
        cost_per_hour: "",
        status: "active",
        is_active: true,
    });

    // Load operations when modal opens
    useEffect(() => {
        if (isOpen) {
            const loadOperations = async () => {
                try {
                    const ops = await fetchOperations();
                    setOperations(ops.filter(op => op.is_active));
                } catch (error) {
                    console.error("Failed to fetch operations:", error);
                }
            };
            loadOperations();
        }
    }, [isOpen]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await createWorkCenter({
                work_center_code: formData.work_center_code,
                work_center_name: formData.work_center_name,
                description: formData.description || undefined,
                operation_id: parseInt(formData.operation_id),
                capacity_per_hour: parseInt(formData.capacity_per_hour),
                number_of_workers_required: parseInt(formData.number_of_workers_required),
                cost_per_hour: formData.cost_per_hour ? parseFloat(formData.cost_per_hour) : undefined,
                status: formData.status,
                is_active: formData.is_active,
            });
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error("Failed to create work center:", error);
            alert("Failed to create work center. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            work_center_code: "",
            work_center_name: "",
            description: "",
            operation_id: "",
            capacity_per_hour: "",
            number_of_workers_required: "",
            cost_per_hour: "",
            status: "active",
            is_active: true,
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Work Center">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Work Center Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="work_center_code"
                            value={formData.work_center_code}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., WC-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="retired">Retired</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Center Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="work_center_name"
                        value={formData.work_center_name}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter work center name"
                    />
                </div>

                {/* Operation Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Operation <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="operation_id"
                        value={formData.operation_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select an operation</option>
                        {operations.map((op) => (
                            <option key={op.id} value={op.id}>
                                {op.operation_code} - {op.operation_name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        The operation this work center can perform
                    </p>
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
                        placeholder="Enter work center description"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capacity/Hour <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="capacity_per_hour"
                            value={formData.capacity_per_hour}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Workers Required <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="number_of_workers_required"
                            value={formData.number_of_workers_required}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cost/Hour
                        </label>
                        <input
                            type="number"
                            name="cost_per_hour"
                            value={formData.cost_per_hour}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="is_active"
                        id="is_active_wc"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active_wc" className="text-sm text-gray-700">
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
                        {isLoading ? "Creating..." : "Create Work Center"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
