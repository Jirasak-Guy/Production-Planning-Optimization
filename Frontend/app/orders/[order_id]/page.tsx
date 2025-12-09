"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Order, OrderItem, ProductData } from "@/app/types/CoreData";
import {
  fetchOrderById,
  fetchOrderItemsByOrderId,
  fetchProducts,
} from "@/app/lib/data";
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import AddOrderItemModal from "@/app/components/modals/AddOrderItemModal";
import { updateOrder, deleteOrder, deleteOrderItem } from "@/app/lib/data";

interface OrderDetailPageProps {
  params: Promise<{
    order_id: string;
  }>;
}

interface OrderItemWithProduct extends OrderItem {
  product?: ProductData;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const { order_id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItemWithProduct | null>(null);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(true);

  useEffect(() => {
    const loadOrderData = async () => {
      setIsLoading(true);
      try {
        const orderId = parseInt(order_id);
        const [orderData, orderItemsData, productsData] = await Promise.all([
          fetchOrderById(orderId),
          fetchOrderItemsByOrderId(orderId),
          fetchProducts(),
        ]);

        setOrder(orderData);

        const itemsWithProducts = orderItemsData.map((item) => ({
          ...item,
          product: productsData.find((p) => p.id === item.product_id),
        }));

        setOrderItems(itemsWithProducts);
      } catch (error) {
        console.error("Failed to fetch order details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderData();
  }, [order_id]);

  const reloadOrderItems = async () => {
    try {
      const orderId = parseInt(order_id);
      const [orderItemsData, productsData] = await Promise.all([
        fetchOrderItemsByOrderId(orderId),
        fetchProducts(),
      ]);

      const itemsWithProducts = orderItemsData.map((item) => ({
        ...item,
        product: productsData.find((p) => p.id === item.product_id),
      }));

      setOrderItems(itemsWithProducts);
    } catch (error) {
      console.error("Failed to reload order items:", error);
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveField = async (field: string) => {
    if (!order) return;
    
    // Validate due_date is not before order_date
    if (field === "due_date") {
      const orderDate = new Date(order.order_date);
      const dueDate = new Date(editValue);
      
      if (dueDate < orderDate) {
        alert("Due Date cannot be before Order Date!");
        return;
      }
    }
    
    // Validate order_date is not after due_date
    if (field === "order_date") {
      const orderDate = new Date(editValue);
      const dueDate = new Date(order.due_date);
      
      if (orderDate > dueDate) {
        alert("Order Date cannot be after Due Date!");
        return;
      }
    }
    
    setIsSaving(true);
    try {
      const updateData: Partial<Order> = {};
      
      if (field === "order_number") {
        updateData.order_number = editValue;
      } else if (field === "customer_name") {
        updateData.customer_name = editValue;
      } else if (field === "order_date") {
        updateData.order_date = editValue;
      } else if (field === "due_date") {
        updateData.due_date = editValue;
      } else if (field === "priority") {
        updateData.priority = parseInt(editValue);
      } else if (field === "status") {
        updateData.status = editValue;
      } else if (field === "notes") {
        updateData.notes = editValue;
      }

      const updatedOrder = await updateOrder(order.id, updateData);
      setOrder(updatedOrder);
      setEditingField(null);
      setEditValue("");
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!order) return;
    
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      router.push("/orders");
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert("Failed to delete order. Please try again.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteItem = (item: OrderItemWithProduct) => {
    setItemToDelete(item);
    setShowDeleteItemConfirm(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setIsDeletingItem(true);
    try {
      await deleteOrderItem(itemToDelete.id);
      await reloadOrderItems();
      setShowDeleteItemConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete order item:", error);
      alert("Failed to delete item. Please try again.");
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-blue-100 text-blue-800 border-blue-200",
      "in-production": "bg-purple-100 text-purple-800 border-purple-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "PENDING",
      confirmed: "CONFIRMED",
      "in-production": "IN PRODUCTION",
      completed: "COMPLETED",
      cancelled: "CANCELLED",
    };
    return labels[status] || status.toUpperCase();
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

  if (!order) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Order not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
              {editingField === "order_number" ? (
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">Order </span>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-3xl font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("order_number")}
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
                    Order {order.order_number}
                  </h1>
                  <button
                    onClick={() => handleEditField("order_number", order.order_number)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit order number"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
              {editingField === "status" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-3 py-1.5 rounded-md text-sm font-semibold border-2 border-blue-500 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    autoFocus
                  >
                    <option value="pending" className="text-gray-900">PENDING</option>
                    <option value="confirmed" className="text-gray-900">CONFIRMED</option>
                    <option value="in-production" className="text-gray-900">IN PRODUCTION</option>
                    <option value="completed" className="text-gray-900">COMPLETED</option>
                    <option value="cancelled" className="text-gray-900">CANCELLED</option>
                  </select>
                  <button
                    onClick={() => handleSaveField("status")}
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
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                  <button
                    onClick={() => handleEditField("status", order.status)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit status"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingField === "customer_name" ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-gray-900 text-lg border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("customer_name")}
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
                  <p className="text-gray-600 text-lg">{order.customer_name}</p>
                  <button
                    onClick={() => handleEditField("customer_name", order.customer_name)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit customer name"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
          {/* Delete Order Button */}
          <button
            onClick={handleDeleteOrder}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200"
            title="Delete this order"
          >
            <TrashIcon className="w-5 h-5" />
            <span className="font-medium">Delete</span>
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          {isDetailsCollapsed ? (
            <>
              <ChevronDownIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Show Order Details</span>
            </>
          ) : (
            <>
              <ChevronUpIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Hide Order Details</span>
            </>
          )}
        </button>

        {/* Collapsible Order Info */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isDetailsCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
        {/* Order Info Grid */}
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Order Date:</p>
            <div className="flex items-center gap-2">
              {editingField === "order_date" ? (
                <>
                  <input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    max={order.due_date.split('T')[0]}
                    className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("order_date")}
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
                  <p className="text-base font-medium text-gray-900">
                    {new Date(order.order_date).toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => handleEditField("order_date", order.order_date.split('T')[0])}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit order date"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Due Date:</p>
            <div className="flex items-center gap-2">
              {editingField === "due_date" ? (
                <>
                  <input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    min={order.order_date.split('T')[0]}
                    className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("due_date")}
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
                  <p className="text-base font-medium text-gray-900">
                    {new Date(order.due_date).toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => handleEditField("due_date", order.due_date.split('T')[0])}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit due date"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Priority:</p>
            <div className="flex items-center gap-2">
              {editingField === "priority" ? (
                <>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("priority")}
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
                  <p className="text-base font-medium text-gray-900">
                    {order.priority}
                  </p>
                  <button
                    onClick={() => handleEditField("priority", order.priority.toString())}
                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit priority"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>


        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between mb-1">
            <p className="text-sm text-gray-500">Notes:</p>
            {editingField !== "notes" && (
              <button
                onClick={() => handleEditField("notes", order.notes || "")}
                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit notes"
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          {editingField === "notes" ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full text-gray-900 border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] bg-white"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveField("notes")}
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
            <p className="text-gray-700">{order.notes || "No notes"}</p>
          )}
        </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Products</h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    System
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orderItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.product ? (
                        <Link
                          href={`/products/${item.product_id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {item.product.product_code}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {item.product?.product_name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${item.product?.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {item.product?.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.product?.type || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.product?.unit || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.unit_price != null
                        ? `$${Number(item.unit_price).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {item.total_price != null
                        ? `$${Number(item.total_price).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete item"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orderItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No items found</p>
            </div>
          )}
        </div>
      </div>

      <AddOrderItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={reloadOrderItems}
        orderId={parseInt(order_id)}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              {/* Warning Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Order
              </h3>
              
              {/* Message */}
              <p className="text-gray-600 text-center mb-2">
                Are you sure you want to delete order
              </p>
              <p className="text-lg font-semibold text-gray-900 text-center mb-4">
                "{order.order_number}"?
              </p>
              
              {/* Warning Text */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-700 text-center">
                  ⚠️ This action cannot be undone. All order data will be permanently deleted.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-5 h-5" />
                      <span>Delete Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {showDeleteItemConfirm && itemToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeletingItem && setShowDeleteItemConfirm(false)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              {/* Warning Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
                <TrashIcon className="h-8 w-8 text-orange-600" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Remove Product
              </h3>
              
              {/* Message */}
              <p className="text-gray-600 text-center mb-2">
                Are you sure you want to remove
              </p>
              <p className="text-lg font-semibold text-gray-900 text-center mb-4">
                "{itemToDelete.product?.product_name || `Item #${itemToDelete.id}`}"
              </p>
              <p className="text-gray-500 text-center text-sm mb-4">
                Quantity: {itemToDelete.quantity.toLocaleString()}
              </p>
              
              {/* Warning Text */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-orange-700 text-center">
                  This product will be removed from this order.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteItemConfirm(false);
                    setItemToDelete(null);
                  }}
                  disabled={isDeletingItem}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteItem}
                  disabled={isDeletingItem}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingItem ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-5 h-5" />
                      <span>Remove</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
