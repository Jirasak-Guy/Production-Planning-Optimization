"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import OrderCard from "@/app/components/OrderCard";
import OrdersHeader, {
  OrdersSortKey,
  SortDirection,
  ViewMode,
} from "@/app/components/OrdersHeader";
import AddOrderModal from "@/app/components/modals/AddOrderModal";
import { Order } from "@/app/types/CoreData";
import { fetchOrders } from "@/app/lib/data";

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<OrdersSortKey>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const data = await fetchOrders();
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(
      (order) =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const compare = (a: Order, b: Order) => {
      switch (sortKey) {
        case "id":
          return a.id - b.id;
        case "order_number":
          return a.order_number.localeCompare(b.order_number);
        case "customer_name":
          return a.customer_name.localeCompare(b.customer_name);
        case "order_date":
          return (
            new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
          );
        case "due_date":
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "priority":
          return a.priority - b.priority;
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    };

    return filtered.sort((a, b) => {
      const result = compare(a, b);
      return sortDirection === "asc" ? result : -result;
    });
  }, [searchTerm, orders, sortKey, sortDirection]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSort = (key: OrdersSortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to refresh orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleAddSuccess = () => {
    handleRefresh();
  };

  const handleRowClick = (orderId: number) => {
    router.push(`/orders/${orderId}`);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      "in-production": "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusStyles[status] || "bg-gray-100 text-gray-800";
  };

  const getSortIndicator = (key: OrdersSortKey) => {
    if (sortKey !== key) {
      return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const getHeaderButtonClass = (key: OrdersSortKey) =>
    [
      "flex items-center gap-1 uppercase tracking-wider",
      sortKey === key ? "text-blue-600" : "text-gray-500 hover:text-gray-700",
    ].join(" ");

  return (
    <div className="flex flex-col h-full">
      <OrdersHeader
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Loading orders...</p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("order_number")}
                          onClick={() => handleSort("order_number")}
                        >
                          <span>Order Number</span>
                          {getSortIndicator("order_number")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("customer_name")}
                          onClick={() => handleSort("customer_name")}
                        >
                          <span>Customer</span>
                          {getSortIndicator("customer_name")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("order_date")}
                          onClick={() => handleSort("order_date")}
                        >
                          <span>Order Date</span>
                          {getSortIndicator("order_date")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("due_date")}
                          onClick={() => handleSort("due_date")}
                        >
                          <span>Due Date</span>
                          {getSortIndicator("due_date")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("priority")}
                          onClick={() => handleSort("priority")}
                        >
                          <span>Priority</span>
                          {getSortIndicator("priority")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("status")}
                          onClick={() => handleSort("status")}
                        >
                          <span>Status</span>
                          {getSortIndicator("status")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(order.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(order.status)}`}
                          >
                            {order.status.replace("-", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredOrders.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No orders found</p>
              </div>
            )}
          </>
        )}
      </div>

      <AddOrderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
