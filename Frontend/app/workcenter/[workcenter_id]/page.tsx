"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  WorkCenter,
  WorkCenterShift,
  WorkCenterCalendarException,
} from "@/app/types/WorkCenter";
import { Shift } from "@/app/types/Shift";
import {
  fetchWorkCenters,
  fetchWorkCenterShifts,
  fetchShifts,
  fetchWorkCenterCalendarExceptions,
} from "@/app/lib/data";
import {
  ArrowLeftIcon,
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

interface WorkCenterDetailPageProps {
  params: Promise<{
    workcenter_id: string;
  }>;
}

interface WorkCenterShiftWithDetails extends WorkCenterShift {
  shift?: Shift;
}

interface DaySchedule {
  dayNumber: number;
  dayName: string;
  shifts: WorkCenterShiftWithDetails[];
  exception?: WorkCenterCalendarException;
}

export default function WorkCenterDetailPage({
  params,
}: WorkCenterDetailPageProps) {
  const router = useRouter();
  const { workcenter_id } = use(params);
  const [workCenter, setWorkCenter] = useState<WorkCenter | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [exceptions, setExceptions] = useState<WorkCenterCalendarException[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWorkCenterData = async () => {
      setIsLoading(true);
      try {
        const workCenterId = parseInt(workcenter_id);
        const [workCentersData, shiftsData, allShiftsData, exceptionsData] =
          await Promise.all([
            fetchWorkCenters(),
            fetchWorkCenterShifts(),
            fetchShifts(),
            fetchWorkCenterCalendarExceptions(),
          ]);

        const wc = workCentersData.find((w) => w.id === workCenterId);
        setWorkCenter(wc || null);

        // Filter shifts for this work center
        const wcShifts = shiftsData
          .filter((s) => s.work_center_id === workCenterId && s.is_active)
          .map((s) => ({
            ...s,
            shift: allShiftsData.find((shift) => shift.id === s.shift_id),
          }));

        // Build weekly schedule
        const days = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        const schedule: DaySchedule[] = days.map((dayName, index) => ({
          dayNumber: index + 1,
          dayName,
          shifts: wcShifts.filter((s) => s.day_of_week === index + 1),
        }));

        setWeeklySchedule(schedule);

        // Filter exceptions for this work center
        const wcExceptions = exceptionsData.filter(
          (e) => e.work_center_id === workCenterId
        );
        setExceptions(wcExceptions);
      } catch (error) {
        console.error("Failed to fetch work center details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkCenterData();
  }, [workcenter_id]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
      retired: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case "closed":
        return <XCircleIcon className="w-5 h-5" />;
      case "maintenance":
        return <WrenchScrewdriverIcon className="w-5 h-5" />;
      case "reduced-capacity":
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case "special-shift":
        return <ClockIcon className="w-5 h-5" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
  };

  const getExceptionColor = (type: string) => {
    const colors: Record<string, string> = {
      closed: "bg-red-100 text-red-700 border-red-300",
      maintenance: "bg-yellow-100 text-yellow-700 border-yellow-300",
      "reduced-capacity": "bg-orange-100 text-orange-700 border-orange-300",
      "special-shift": "bg-blue-100 text-blue-700 border-blue-300",
    };
    return colors[type] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getExceptionLabel = (type: string) => {
    const labels: Record<string, string> = {
      closed: "Closed",
      maintenance: "Maintenance",
      "reduced-capacity": "Reduced Capacity",
      "special-shift": "Special Shift",
    };
    return labels[type] || type;
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

  if (!workCenter) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Work Center not found</p>
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
                {workCenter.work_center_code}
              </h1>
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getStatusColor(
                  workCenter.status
                )}`}
              >
                {workCenter.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600 text-lg">
              {workCenter.work_center_name}
            </p>
          </div>
        </div>

        {/* Work Center Info Grid */}
        <div className="grid grid-cols-4 gap-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Capacity per Hour:</p>
            <p className="text-base font-medium text-gray-900">
              {workCenter.capacity_per_hour} units
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
              <UsersIcon className="w-4 h-4" />
              Workers Required:
            </p>
            <p className="text-base font-medium text-gray-900">
              {workCenter.number_of_workers_required}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              Cost per Hour:
            </p>
            <p className="text-base font-medium text-gray-900">
              {workCenter.cost_per_hour != null
                ? `$${Number(workCenter.cost_per_hour).toFixed(2)}`
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Status:</p>
            <p className="text-base font-medium text-gray-900 capitalize">
              {workCenter.status}
            </p>
          </div>
        </div>

        {workCenter.description && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Description:</p>
            <p className="text-gray-700">{workCenter.description}</p>
          </div>
        )}
      </div>

      {/* Weekly Plan Section */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="space-y-6">
          {/* Weekly Schedule */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Weekly Schedule
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-7 gap-4">
                {weeklySchedule.map((day) => (
                  <div
                    key={day.dayNumber}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Day Header */}
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <h3 className="font-semibold text-sm text-gray-900">
                        {day.dayName}
                      </h3>
                    </div>

                    {/* Shifts */}
                    <div className="p-3 space-y-2 min-h-[120px]">
                      {day.shifts.length > 0 ? (
                        day.shifts.map((wcShift) => (
                          <div
                            key={wcShift.id}
                            className="bg-blue-50 border border-blue-200 rounded p-2"
                          >
                            <p className="text-xs font-semibold text-blue-900 mb-1">
                              {wcShift.shift?.shift_name || "Shift"}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-blue-700">
                              <ClockIcon className="w-3 h-3" />
                              <span>
                                {wcShift.shift?.start_time} -{" "}
                                {wcShift.shift?.end_time}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-xs text-gray-400">No shifts</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Exceptions */}
          {exceptions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Calendar Exceptions
                </h2>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {exceptions.map((exception) => (
                    <div
                      key={exception.id}
                      className={`border rounded-lg p-4 ${getExceptionColor(
                        exception.exception_type
                      )}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getExceptionIcon(exception.exception_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">
                              {getExceptionLabel(exception.exception_type)}
                            </h3>
                            <span className="text-xs font-medium">
                              {new Date(
                                exception.exception_date
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          {exception.description && (
                            <p className="text-sm mb-2">
                              {exception.description}
                            </p>
                          )}
                          {exception.capacity_percentage !== 100 && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">Capacity:</span>
                              <div className="flex-1 bg-white bg-opacity-50 rounded-full h-4 overflow-hidden">
                                <div
                                  className="h-full bg-current opacity-30"
                                  style={{
                                    width: `${exception.capacity_percentage}%`,
                                  }}
                                />
                              </div>
                              <span className="font-semibold">
                                {exception.capacity_percentage}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
