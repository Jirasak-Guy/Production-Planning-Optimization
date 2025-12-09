"use client";

import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { createProductionOrder } from "@/app/lib/data";

interface AddProductionOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddProductionOrderModal({
    isOpen,
    onClose,
    onSuccess,
}: AddProductionOrderModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        po_number: "",
        product_id: "",
        quantity_planned: "",
        quantity_completed: "0",
        quantity_scrapped: "0",
        scheduled_start_date: "",
        scheduled_end_date: "",
        status: "planned",
        priority: "1",
        notes: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await createProductionOrder({
                po_number: formData.po_number,
                product_id: parseInt(formData.product_id),
                quantity_planned: parseInt(formData.quantity_planned),
                quantity_completed: parseInt(formData.quantity_completed),
                quantity_scrapped: parseInt(formData.quantity_scrapped),
                scheduled_start_date: formData.scheduled_start_date || undefined,
                scheduled_end_date: formData.scheduled_end_date || undefined,
                status: formData.status,
                priority: parseInt(formData.priority),
                notes: formData.notes || undefined,
            });
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error("Failed to create production order:", error);
            alert("Failed to create production order. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            po_number: "",
            product_id: "",
            quantity_planned: "",
            quantity_completed: "0",
            quantity_scrapped: "0",
            scheduled_start_date: "",
            scheduled_end_date: "",
            status: "planned",
            priority: "1",
            notes: "",
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Production Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            PO Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="po_number"
                            value={formData.po_number}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., PO-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="product_id"
                            value={formData.product_id}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter product ID"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Planned <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="quantity_planned"
                            value={formData.quantity_planned}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="1">1 - Highest</option>
                            <option value="2">2 - High</option>
                            <option value="3">3 - Medium</option>
                            <option value="4">4 - Low</option>
                            <option value="5">5 - Lowest</option>
                        </select>
                    </div>
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
                        <option value="planned">Planned</option>
                        <option value="released">Released</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="on-hold">On Hold</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Scheduled Start Date
                        </label>
                        <input
                            type="date"
                            name="scheduled_start_date"
                            value={formData.scheduled_start_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Scheduled End Date
                        </label>
                        <input
                            type="date"
                            name="scheduled_end_date"
                            value={formData.scheduled_end_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Enter notes"
                    />
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
                        {isLoading ? "Creating..." : "Create Production Order"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
