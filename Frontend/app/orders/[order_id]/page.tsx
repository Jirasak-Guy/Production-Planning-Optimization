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
import { ArrowLeftIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import AddOrderItemModal from "@/app/components/modals/AddOrderItemModal";

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
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Order {order.order_number}
              </h1>
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getStatusColor(
                  order.status
                )}`}
              >
                {getStatusLabel(order.status)}
              </span>
            </div>
            <p className="text-gray-600 text-lg">{order.customer_name}</p>
          </div>
        </div>

        {/* Order Info Grid */}
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Order Date:</p>
            <p className="text-base font-medium text-gray-900">
              {new Date(order.order_date).toLocaleDateString("en-US", {
                month: "numeric",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Due Date:</p>
            <p className="text-base font-medium text-gray-900">
              {new Date(order.due_date).toLocaleDateString("en-US", {
                month: "numeric",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Priority:</p>
            <p className="text-base font-medium text-gray-900">
              {order.priority}
            </p>
          </div>
        </div>

        {order.notes && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Notes:</p>
            <p className="text-gray-700">{order.notes}</p>
          </div>
        )}
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
    </div>
  );
}
