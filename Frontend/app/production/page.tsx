"use client";

import { useState, useMemo, useEffect } from "react";
import ProductionOrderCard from "@/app/components/ProductionOrderCard";
import ProductionHeader from "@/app/components/ProductionHeader";
import { ProductionOrder } from "@/app/types/Production";
import { fetchProductionOrders } from "@/app/lib/data";

export default function ProductionPage() {
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProductionOrders = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProductionOrders();
        setProductionOrders(data);
      } catch (error) {
        console.error("Failed to fetch production orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductionOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return productionOrders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, productionOrders]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilter = () => {
    console.log("Filter clicked");
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProductionOrders();
      setProductionOrders(data);
    } catch (error) {
      console.error("Failed to refresh production orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    console.log("Add clicked");
  };

  return (
    <div className="flex flex-col h-full">
      <ProductionHeader
        onSearch={handleSearch}
        onFilter={handleFilter}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">
              Loading production orders...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((po) => (
                <ProductionOrderCard key={po.id} productionOrder={po} />
              ))}
            </div>

            {filteredOrders.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No production orders found
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
