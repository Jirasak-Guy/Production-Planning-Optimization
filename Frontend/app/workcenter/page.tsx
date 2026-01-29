"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import WorkCenterCard from "@/app/components/WorkCenterCard";
import WorkCenterHeader, {
  SortDirection,
  ViewMode,
  WorkCenterSortKey,
} from "@/app/components/WorkCenterHeader";
import AddWorkCenterModal from "@/app/components/modals/AddWorkCenterModal";
import { WorkCenter } from "@/app/types/WorkCenter";
import { fetchWorkCenters } from "@/app/lib/data";

export default function WorkCenterPage() {
  const router = useRouter();
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<WorkCenterSortKey>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const wcData = await fetchWorkCenters();
        setWorkCenters(wcData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredWorkCenters = useMemo(() => {
    const filtered = workCenters.filter(
      (wc) =>
        wc.work_center_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wc.work_center_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const compare = (a: WorkCenter, b: WorkCenter) => {
      switch (sortKey) {
        case "id":
          return a.id - b.id;
        case "work_center_code":
          return a.work_center_code.localeCompare(b.work_center_code);
        case "work_center_name":
          return a.work_center_name.localeCompare(b.work_center_name);
        case "description":
          return (a.description ?? "").localeCompare(b.description ?? "");
        case "capacity_per_hour":
          return a.capacity_per_hour - b.capacity_per_hour;
        case "number_of_workers_required":
          return a.number_of_workers_required - b.number_of_workers_required;
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
  }, [searchTerm, workCenters, sortKey, sortDirection]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSort = (key: WorkCenterSortKey) => {
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

  const getSortIndicator = (key: WorkCenterSortKey) => {
    if (sortKey !== key) {
      return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const getHeaderButtonClass = (key: WorkCenterSortKey) =>
    [
      "flex items-center gap-1 uppercase tracking-wider",
      sortKey === key ? "text-blue-600" : "text-gray-500 hover:text-gray-700",
    ].join(" ");

  return (
    <div className="flex flex-col h-full">
      <WorkCenterHeader
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
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
                        <button
                          type="button"
                          className={getHeaderButtonClass("work_center_code")}
                          onClick={() => handleSort("work_center_code")}
                        >
                          <span>Code</span>
                          {getSortIndicator("work_center_code")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("work_center_name")}
                          onClick={() => handleSort("work_center_name")}
                        >
                          <span>Name</span>
                          {getSortIndicator("work_center_name")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("description")}
                          onClick={() => handleSort("description")}
                        >
                          <span>Description</span>
                          {getSortIndicator("description")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("capacity_per_hour")}
                          onClick={() => handleSort("capacity_per_hour")}
                        >
                          <span>Capacity/Hour</span>
                          {getSortIndicator("capacity_per_hour")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("number_of_workers_required")}
                          onClick={() => handleSort("number_of_workers_required")}
                        >
                          <span>Workers</span>
                          {getSortIndicator("number_of_workers_required")}
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
