"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import { createProductionOrder, fetchOrders, fetchOrderItemsByOrderId, fetchProductById } from "@/app/lib/data";
import { Order, OrderItem, ProductData } from "@/app/types/CoreData";

interface AddProductionOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface OrderItemWithProduct extends OrderItem {
    product?: ProductData;
}

export default function AddProductionOrderModal({
    isOpen,
    onClose,
    onSuccess,
}: AddProductionOrderModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItemWithProduct[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string>("");
    const [selectedOrderItemId, setSelectedOrderItemId] = useState<string>("");
    const [loadingOrderItems, setLoadingOrderItems] = useState(false);

    const [formData, setFormData] = useState({
        po_number: "",
        quantity_planned: "",
        quantity_completed: "0",
        quantity_scrapped: "0",
        scheduled_start_date: "",
        scheduled_end_date: "",
        status: "planned",
        priority: "1",
        notes: "",
    });

    // Fetch orders when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchOrders().then(setOrders).catch(console.error);
        }
    }, [isOpen]);

    // Fetch order items when order is selected
    useEffect(() => {
        if (selectedOrderId) {
            setLoadingOrderItems(true);
            setSelectedOrderItemId("");
            fetchOrderItemsByOrderId(parseInt(selectedOrderId))
                .then(async (items) => {
                    // Fetch product details for each order item
                    const itemsWithProducts = await Promise.all(
                        items.map(async (item) => {
                            try {
                                const product = await fetchProductById(item.product_id);
                                return { ...item, product };
                            } catch {
                                return item;
                            }
                        })
                    );
                    setOrderItems(itemsWithProducts);
                })
                .catch(console.error)
                .finally(() => setLoadingOrderItems(false));
        } else {
            setOrderItems([]);
        }
    }, [selectedOrderId]);

    // Auto-fill quantity when order item is selected
    useEffect(() => {
        if (selectedOrderItemId) {
            const selectedItem = orderItems.find(item => item.id === parseInt(selectedOrderItemId));
            if (selectedItem) {
                setFormData(prev => ({
                    ...prev,
                    quantity_planned: selectedItem.quantity.toString(),
                }));
            }
        }
    }, [selectedOrderItemId, orderItems]);

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

        const selectedItem = orderItems.find(item => item.id === parseInt(selectedOrderItemId));
        if (!selectedItem) {
            alert("Please select an order item.");
            setIsLoading(false);
            return;
        }

        if (!formData.priority || isNaN(parseInt(formData.priority))) {
            alert("Priority is required (1-10)");
            setIsLoading(false);
            return;
        }

        try {
            await createProductionOrder({
                po_number: formData.po_number,
                order_item_id: parseInt(selectedOrderItemId),
                product_id: selectedItem.product_id,
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
        setSelectedOrderId("");
        setSelectedOrderItemId("");
        setOrderItems([]);
        setFormData({
            po_number: "",
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

    const selectedItem = orderItems.find(item => item.id === parseInt(selectedOrderItemId));
    const selectedOrder = orders.find(order => order.id === parseInt(selectedOrderId));

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Production Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Order Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Order <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">-- Select an Order --</option>
                        {orders.map((order) => (
                            <option key={order.id} value={order.id}>
                                {order.order_number} - {order.customer_name} (Due: {order.due_date})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Order Item Selection */}
                {selectedOrderId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Order Item <span className="text-red-500">*</span>
                        </label>
                        {loadingOrderItems ? (
                            <div className="text-gray-500 text-sm py-2">Loading order items...</div>
                        ) : orderItems.length === 0 ? (
                            <div className="text-orange-600 text-sm py-2">No items found for this order.</div>
                        ) : (
                            <select
                                value={selectedOrderItemId}
                                onChange={(e) => setSelectedOrderItemId(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Select an Item --</option>
                                {orderItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.product?.product_code || `Product #${item.product_id}`} - {item.product?.product_name || 'Unknown'} (Qty: {item.quantity})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {/* Selected Item Info */}
                {selectedItem && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-sm text-blue-800">
                            <strong>Product:</strong> {selectedItem.product?.product_name || 'Unknown'} ({selectedItem.product?.product_code})
                        </div>
                        <div className="text-sm text-blue-800">
                            <strong>Order Qty:</strong> {selectedItem.quantity} | <strong>Due:</strong> {selectedOrder?.due_date}
                        </div>
                    </div>
                )}

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
                            placeholder="e.g., PO-2025-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity to Produce <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="quantity_planned"
                            value={formData.quantity_planned}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="priority"
                            value={formData.priority}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (e.target.value === "") {
                                    setFormData(prev => ({ ...prev, priority: "" }));
                                    return;
                                }
                                if (!isNaN(val) && val >= 1 && val <= 10 && Number.isInteger(Number(e.target.value))) {
                                    setFormData(prev => ({ ...prev, priority: e.target.value }));
                                }
                            }}
                            onKeyDown={(e) => {
                                if (['.', 'e', 'E', '-', '+'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            min="1"
                            max="10"
                            step="1"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="1-10"
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
                            <option value="planned">Planned</option>
                            <option value="released">Released</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="on-hold">On Hold</option>
                        </select>
                    </div>
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
                            min={formData.scheduled_start_date || undefined}
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
                        disabled={isLoading || !selectedOrderItemId}
                        className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Creating..." : "Create Production Order"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
