"use client";

import { useState, useEffect } from "react";
import { OrderItem, ProductData } from "@/app/types/CoreData";
import { updateOrderItem } from "@/app/lib/data";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface EditOrderItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderItem: OrderItem | null;
    product: ProductData | null;
    onSuccess: () => void;
}

export default function EditOrderItemModal({
    isOpen,
    onClose,
    orderItem,
    product,
    onSuccess,
}: EditOrderItemModalProps) {
    const [quantity, setQuantity] = useState("");
    const [unitPrice, setUnitPrice] = useState("");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (orderItem && isOpen) {
            setQuantity(String(orderItem.quantity));
            setUnitPrice(orderItem.unit_price != null ? String(orderItem.unit_price) : "");
            setNotes(orderItem.notes || "");
            setError(null);
        }
    }, [orderItem, isOpen]);

    if (!isOpen || !orderItem) return null;

    // Calculate total price
    const qty = parseInt(quantity) || 0;
    const price = unitPrice ? parseFloat(unitPrice) : (product?.standard_cost ? Number(product.standard_cost) : 0);
    const totalPrice = qty * price;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        try {
            const qtyValue = parseInt(quantity);
            if (isNaN(qtyValue) || qtyValue <= 0) {
                throw new Error("Quantity must be greater than 0");
            }

            // Use entered unit_price, or fallback to product's standard_cost
            let finalUnitPrice: number | undefined;
            if (unitPrice) {
                finalUnitPrice = parseFloat(unitPrice);
                if (isNaN(finalUnitPrice) || finalUnitPrice < 0) {
                    throw new Error("Unit Price must be a valid positive number");
                }
            } else if (product?.standard_cost) {
                finalUnitPrice = Number(product.standard_cost);
            }

            const finalTotalPrice = finalUnitPrice ? qtyValue * finalUnitPrice : undefined;

            await updateOrderItem(orderItem.id, {
                quantity: qtyValue,
                unit_price: finalUnitPrice,
                total_price: finalTotalPrice,
                notes: notes.trim() || undefined,
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update order item");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Edit Order Item</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {product?.product_code} - {product?.product_name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Product Info */}
                        {product && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    <span className="font-medium">Type:</span> {product.type}
                                </p>
                                <p className="text-sm text-blue-800">
                                    <span className="font-medium">Unit:</span> {product.unit}
                                </p>
                                {product.standard_cost && (
                                    <p className="text-sm text-blue-800">
                                        <span className="font-medium">Standard Cost:</span> $
                                        {Number(product.standard_cost).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    required
                                />
                            </div>

                            {/* Unit Price */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit Price
                                    {product?.standard_cost && !unitPrice && (
                                        <span className="text-xs text-gray-500 font-normal ml-1">
                                            (using Standard Cost)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    placeholder={product?.standard_cost ? `${Number(product.standard_cost).toFixed(2)} (Standard Cost)` : "0.00"}
                                />
                            </div>
                        </div>

                        {/* Total Price Preview */}
                        {qty > 0 && price > 0 && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800">
                                    <span className="font-medium">Total Price:</span> ${totalPrice.toFixed(2)}
                                    {!unitPrice && product?.standard_cost && (
                                        <span className="text-xs text-green-600 ml-2">(using Standard Cost)</span>
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                                placeholder="Optional notes..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
