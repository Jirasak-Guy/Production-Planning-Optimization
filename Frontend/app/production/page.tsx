"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductionOrderCard from "@/app/components/ProductionOrderCard";
import ProductionHeader, { ViewMode } from "@/app/components/ProductionHeader";
import AddProductionOrderModal from "@/app/components/modals/AddProductionOrderModal";
import { ProductionOrder } from "@/app/types/Production";
import { fetchProductionOrders } from "@/app/lib/data";

export default function ProductionPage() {
  const router = useRouter();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    setIsAddModalOpen(true);
  };

  const handleAddSuccess = () => {
    handleRefresh();
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleRowClick = (poId: number) => {
    router.push(`/production/${poId}`);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      planned: "bg-gray-100 text-gray-800",
      released: "bg-blue-100 text-blue-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      "on-hold": "bg-orange-100 text-orange-800",
    };
    return statusStyles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex flex-col h-full">
      <ProductionHeader
        onSearch={handleSearch}
        onFilter={handleFilter}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
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
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((po) => (
                  <ProductionOrderCard key={po.id} productionOrder={po} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PO Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty Planned
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scheduled Start
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(po.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {po.po_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {po.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.quantity_planned}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.quantity_completed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.scheduled_start_date
                            ? new Date(po.scheduled_start_date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(po.status)}`}
                          >
                            {po.status.replace("-", " ")}
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
                <p className="text-gray-500 text-lg">
                  No production orders found
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <AddProductionOrderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
