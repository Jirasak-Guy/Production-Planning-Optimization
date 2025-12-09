"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import WorkCenterCard from "@/app/components/WorkCenterCard";
import WorkCenterHeader, { ViewMode } from "@/app/components/WorkCenterHeader";
import AddWorkCenterModal from "@/app/components/modals/AddWorkCenterModal";
import { WorkCenter } from "@/app/types/WorkCenter";
import { fetchWorkCenters } from "@/app/lib/data";

export default function WorkCenterPage() {
  const router = useRouter();
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const loadWorkCenters = async () => {
      setIsLoading(true);
      try {
        const data = await fetchWorkCenters();
        setWorkCenters(data);
      } catch (error) {
        console.error("Failed to fetch work centers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkCenters();
  }, []);

  const filteredWorkCenters = useMemo(() => {
    return workCenters.filter(
      (wc) =>
        wc.work_center_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wc.work_center_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, workCenters]);

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
      const data = await fetchWorkCenters();
      setWorkCenters(data);
    } catch (error) {
      console.error("Failed to refresh work centers:", error);
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

  const handleRowClick = (workCenterId: number) => {
    router.push(`/workcenter/${workCenterId}`);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      retired: "bg-red-100 text-red-800",
    };
    return statusStyles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex flex-col h-full">
      <WorkCenterHeader
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
            <p className="text-gray-500 text-lg">Loading work centers...</p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredWorkCenters.map((workCenter) => (
                  <WorkCenterCard key={workCenter.id} workCenter={workCenter} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity/Hour
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredWorkCenters.map((wc) => (
                      <tr
                        key={wc.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(wc.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {wc.work_center_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {wc.work_center_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {wc.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {wc.capacity_per_hour}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {wc.number_of_workers_required}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(wc.status)}`}
                          >
                            {wc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredWorkCenters.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No work centers found</p>
              </div>
            )}
          </>
        )}
      </div>

      <AddWorkCenterModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
