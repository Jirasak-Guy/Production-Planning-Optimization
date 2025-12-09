"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import { createOrderItem, fetchProducts } from "@/app/lib/data";
import { ProductData } from "@/app/types/CoreData";

interface AddOrderItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    orderId: number;
}

export default function AddOrderItemModal({
    isOpen,
    onClose,
    onSuccess,
    orderId,
}: AddOrderItemModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<ProductData[]>([]);
    const [formData, setFormData] = useState({
        product_id: "",
        quantity: "",
        unit_price: "",
        notes: "",
    });

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await fetchProducts();
                setProducts(data.filter((p) => p.is_active));
            } catch (error) {
                console.error("Failed to fetch products:", error);
            }
        };

        if (isOpen) {
            loadProducts();
        }
    }, [isOpen]);

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
            const quantity = parseInt(formData.quantity);
            const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : undefined;
            const totalPrice = unitPrice ? quantity * unitPrice : undefined;

            await createOrderItem({
                order_id: orderId,
                product_id: parseInt(formData.product_id),
                quantity: quantity,
                unit_price: unitPrice,
                total_price: totalPrice,
                notes: formData.notes || undefined,
            });
            onSuccess();
            onClose();
            resetForm();
        } catch (error) {
            console.error("Failed to create order item:", error);
            alert("Failed to add product. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            product_id: "",
            quantity: "",
            unit_price: "",
            notes: "",
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const selectedProduct = products.find(
        (p) => p.id === parseInt(formData.product_id)
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add Product to Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="product_id"
                        value={formData.product_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select a product</option>
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
                            <span className="font-medium">Type:</span> {selectedProduct.type}
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
                            Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price
                        </label>
                        <input
                            type="number"
                            name="unit_price"
                            value={formData.unit_price}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {formData.quantity && formData.unit_price && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800">
                            <span className="font-medium">Total Price:</span> $
                            {(parseInt(formData.quantity) * parseFloat(formData.unit_price)).toFixed(2)}
                        </p>
                    </div>
                )}

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
                        {isLoading ? "Adding..." : "Add Product"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
