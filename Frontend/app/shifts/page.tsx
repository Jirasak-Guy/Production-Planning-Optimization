"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shift } from "@/app/types/Shift";
import { fetchShifts } from "@/app/lib/data";
import AddShiftModal from "@/app/components/modals/AddShiftModal";
import {
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  PlusCircleIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";

type ViewMode = "card" | "table";

export default function ShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<"id" | "shift_code">("id");

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchShifts();
      setShifts(data);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const filteredShifts = shifts
    .filter(
      (shift) =>
        shift.shift_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.shift_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === "id") {
        return a.id - b.id;
      }
      return a.shift_code.localeCompare(b.shift_code);
    });

  const getShiftColor = (index: number) => {
    const colors = [
      {
        bg: "from-blue-500 to-blue-600",
        light: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
      },
      {
        bg: "from-purple-500 to-purple-600",
        light: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-200",
      },
      {
        bg: "from-emerald-500 to-emerald-600",
        light: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
      },
      {
        bg: "from-orange-500 to-orange-600",
        light: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-200",
      },
      {
        bg: "from-pink-500 to-pink-600",
        light: "bg-pink-50",
        text: "text-pink-600",
        border: "border-pink-200",
      },
      {
        bg: "from-cyan-500 to-cyan-600",
        light: "bg-cyan-50",
        text: "text-cyan-600",
        border: "border-cyan-200",
      },
    ];
    return colors[index % colors.length];
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateDuration = (start: string, end: string) => {
    const [startHours, startMins] = start.split(":").map(Number);
    const [endHours, endMins] = end.split(":").map(Number);
    let totalMins = endHours * 60 + endMins - (startHours * 60 + startMins);
    if (totalMins < 0) totalMins += 24 * 60; // Handle overnight shifts
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Shifts</h2>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-400"
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Sort Button */}
            <button
              onClick={() => setSortKey(sortKey === "id" ? "shift_code" : "id")}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title={`Sort by ${sortKey === "id" ? "Code" : "ID"}`}
            >
              <ArrowsUpDownIcon className="w-5 h-5" />
              <span className="text-sm font-medium">
                {sortKey === "id" ? "ID" : "Code"}
              </span>
            </button>

            {/* View Mode Toggle Button */}
            <button
              onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
              className="p-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title={viewMode === "card" ? "Switch to Table View" : "Switch to Card View"}
            >
              {viewMode === "card" ? (
                <TableCellsIcon className="w-6 h-6" />
              ) : (
                <Squares2X2Icon className="w-6 h-6" />
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={loadShifts}
              className="p-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-6 h-6" />
            </button>

            {/* Add Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>Add Shift</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading shifts...</p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShifts.map((shift, index) => {
              const colors = getShiftColor(index);
              return (
                <div
                  key={shift.id}
                  onClick={() => router.push(`/shifts/${shift.id}`)}
                  className={`bg-white rounded-xl border ${colors.border} overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}
                >
                  {/* Card Header with Gradient */}
                  <div className={`bg-gradient-to-r ${colors.bg} px-5 py-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white/80 text-xs font-medium uppercase tracking-wide">
                          {shift.shift_code}
                        </span>
                        <h3 className="text-white text-lg font-bold mt-1">
                          {shift.shift_name}
                        </h3>
                      </div>
                      <div className="bg-white/20 p-2 rounded-lg">
                        <ClockIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    {/* Time Display */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Start
                        </p>
                        <p className={`text-xl font-bold ${colors.text}`}>
                          {formatTime(shift.start_time)}
                        </p>
                      </div>
                      <div className="flex-1 px-4">
                        <div className="relative">
                          <div className="h-0.5 bg-gray-200 w-full"></div>
                          <div
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${colors.light} px-2 py-1 rounded-full`}
                          >
                            <span
                              className={`text-xs font-medium ${colors.text}`}
                            >
                              {calculateDuration(
                                shift.start_time,
                                shift.end_time
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          End
                        </p>
                        <p className={`text-xl font-bold ${colors.text}`}>
                          {formatTime(shift.end_time)}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div
                        className={`${colors.light} rounded-lg p-3 text-center`}
                      >
                        <p className="text-xs text-gray-500">Break</p>
                        <p className={`text-lg font-bold ${colors.text}`}>
                          {shift.break_duration_minutes} min
                        </p>
                      </div>
                      <div
                        className={`${colors.light} rounded-lg p-3 text-center`}
                      >
                        <p className="text-xs text-gray-500">Effective</p>
                        <p className={`text-lg font-bold ${colors.text}`}>
                          {shift.effective_working_minutes} min
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {shift.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {shift.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        ID: {shift.id}
                      </span>
                      {shift.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Break
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredShifts.map((shift) => (
                  <tr
                    key={shift.id}
                    onClick={() => router.push(`/shifts/${shift.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {shift.shift_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {shift.shift_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(shift.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(shift.end_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {calculateDuration(shift.start_time, shift.end_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {shift.break_duration_minutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${shift.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {shift.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredShifts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No shifts found</p>
          </div>
        )}
      </div>

      <AddShiftModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadShifts}
      />
    </div>
  );
}

