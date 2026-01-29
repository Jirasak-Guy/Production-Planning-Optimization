"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import { createBOM, fetchProducts } from "@/app/lib/data";
import { ProductData } from "@/app/types/CoreData";

interface AddBOMItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    parentProductId: number;
    parentProductCode: string;
}

export default function AddBOMItemModal({
    isOpen,
    onClose,
    onSuccess,
    parentProductId,
    parentProductCode,
}: AddBOMItemModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<ProductData[]>([]);
    const [formData, setFormData] = useState({
        component_product_id: "",
        quantity_required: "",
        unit: "",
        scrap_percentage: "0",
        effective_from: new Date().toISOString().split('T')[0],
        notes: "",
    });

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await fetchProducts();
                // Filter out the parent product and inactive products
                setProducts(data.filter((p) => p.is_active && p.id !== parentProductId));
            } catch (error) {
                console.error("Failed to fetch products:", error);
            }
        };

        if (isOpen) {
            loadProducts();
        }
    }, [isOpen, parentProductId]);

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
            await createBOM({
                parent_product_id: parentProductId,
                component_product_id: parseInt(formData.component_product_id),
                quantity_required: parseFloat(formData.quantity_required),
                unit: formData.unit,
                scrap_percentage: parseFloat(formData.scrap_percentage),
                effective_from: formData.effective_from,
                is_active: true,
                notes: formData.notes || undefined,
            });
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error("Failed to create BOM item:", error);
            alert("Failed to add component. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            component_product_id: "",
            quantity_required: "",
            unit: "",
            scrap_percentage: "0",
            effective_from: new Date().toISOString().split('T')[0],
            notes: "",
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const selectedProduct = products.find(
        (p) => p.id === parseInt(formData.component_product_id)
    );

    // Auto-fill unit when product is selected
    useEffect(() => {
        if (selectedProduct) {
            setFormData((prev) => ({
                ...prev,
                unit: selectedProduct.unit,
            }));
        }
    }, [selectedProduct]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add Component to BOM">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                    <p className="text-sm text-gray-600">
                        Adding component to: <span className="font-semibold text-gray-900">{parentProductCode}</span>
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Component Product <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="component_product_id"
                        value={formData.component_product_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select a component</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.product_code} - {product.product_name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedProduct && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                            <span className="font-medium">Type:</span> {selectedProduct.type.replace("-", " ")}
                        </p>
                        <p className="text-sm text-blue-800">
                            <span className="font-medium">Unit:</span> {selectedProduct.unit}
                        </p>
                        {selectedProduct.standard_cost && (
                            <p className="text-sm text-blue-800">
                                <span className="font-medium">Standard Cost:</span> $
                                {Number(selectedProduct.standard_cost).toFixed(2)}
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Required <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="quantity_required"
                            value={formData.quantity_required}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            required
                            min="0.001"
                            step="0.001"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., unit, kg, liter"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Scrap Percentage
                        </label>
                        <div className="flex items-center">
                            <input
                                type="number"
                                name="scrap_percentage"
                                value={formData.scrap_percentage}
                                onChange={handleChange}
                                onKeyDown={(e) => {
                                    if (['-', '+', 'e', 'E'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0"
                            />
                            <span className="ml-2 text-gray-600">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Effective From <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="effective_from"
                            value={formData.effective_from}
                            onChange={handleChange}
                            required
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
                        {isLoading ? "Adding..." : "Add Component"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
