"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WorkCenterCard from "@/app/components/WorkCenterCard";
import WorkCenterHeader, { ViewMode } from "@/app/components/WorkCenterHeader";
import AddWorkCenterModal from "@/app/components/modals/AddWorkCenterModal";
import { WorkCenter } from "@/app/types/WorkCenter";
import { fetchWorkCenters, fetchSchedulerSettings, SchedulerSettings } from "@/app/lib/data";

export default function WorkCenterPage() {
  const router = useRouter();
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<"id" | "work_center_code">("id");
  const [schedulerSettings, setSchedulerSettings] = useState<SchedulerSettings>({
    max_workers: 600,
    time_limit_seconds: 60,
    horizon_days: 365,
  });

  // Calculate total workers required
  const totalWorkersRequired = useMemo(() => {
    return workCenters.reduce((sum, wc) => sum + (wc.number_of_workers_required || 0), 0);
  }, [workCenters]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [wcData, settings] = await Promise.all([
          fetchWorkCenters(),
          fetchSchedulerSettings()
        ]);
        setWorkCenters(wcData);
        setSchedulerSettings(settings);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredWorkCenters = useMemo(() => {
    return workCenters
      .filter(
        (wc) =>
          wc.work_center_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wc.work_center_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortKey === "id") {
          return a.id - b.id;
        }
        return a.work_center_code.localeCompare(b.work_center_code);
      });
  }, [searchTerm, workCenters, sortKey]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
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
        onSortToggle={() => setSortKey(sortKey === "id" ? "work_center_code" : "id")}
        sortKey={sortKey}
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
            {/* Factory Settings */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Max Workers Setting */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Max Workers (Factory)</p>
                      <p className="text-xl font-bold text-gray-800">{schedulerSettings.max_workers.toLocaleString()}</p>
                    </div>
                  </div>
                  <Link
                    href="/gantt"
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit in Gantt Chart Settings"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Total Workers Required */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Workers Required</p>
                    <p className="text-xl font-bold text-gray-800">{totalWorkersRequired.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Capacity Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${totalWorkersRequired <= schedulerSettings.max_workers ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${totalWorkersRequired <= schedulerSettings.max_workers ? 'text-emerald-600' : 'text-red-600'}`} viewBox="0 0 20 20" fill="currentColor">
                      {totalWorkersRequired <= schedulerSettings.max_workers ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Capacity Status</p>
                    <p className={`text-xl font-bold ${totalWorkersRequired <= schedulerSettings.max_workers ? 'text-emerald-600' : 'text-red-600'}`}>
                      {totalWorkersRequired <= schedulerSettings.max_workers ? 'OK' : 'Over Capacity'}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${totalWorkersRequired <= schedulerSettings.max_workers ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min((totalWorkersRequired / schedulerSettings.max_workers) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{((totalWorkersRequired / schedulerSettings.max_workers) * 100).toFixed(1)}% utilization</p>
                </div>
              </div>
            </div>

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
