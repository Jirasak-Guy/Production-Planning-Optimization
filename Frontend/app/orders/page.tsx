"use client";

import { useState, useMemo, useEffect } from "react";
import OrderCard from "@/app/components/OrderCard";
import OrdersHeader from "@/app/components/OrdersHeader";
import { Order } from "@/app/types/CoreData";
import { fetchOrders } from "@/app/lib/data";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    return orders.filter(
      (order) =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, orders]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilter = () => {
    console.log("Filter clicked");
    // TODO: Implement filter dialog
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
    console.log("Add clicked");
    // TODO: Open add order dialog
  };

  return (
    <div className="flex flex-col h-full">
      <OrdersHeader
        onSearch={handleSearch}
        onFilter={handleFilter}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>

            {filteredOrders.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No orders found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
