"use client";

import { useState, useEffect } from "react";
import { CompanyCalendar } from "@/app/types/Shift";
import { fetchCompanyCalendar } from "@/app/lib/data";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

export default function CompanyCalendarPage() {
  const [calendarData, setCalendarData] = useState<CompanyCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<CompanyCalendar | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const loadCalendarData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCompanyCalendar();
      setCalendarData(data);
    } catch (error) {
      console.error("Failed to fetch company calendar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getCalendarDataForDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return calendarData.find((item) => item.calendar_date === dateStr);
  };

  const getDayTypeStyles = (dayType: string | undefined) => {
    if (!dayType) return "bg-white hover:bg-gray-50";

    const styles: Record<string, string> = {
      "working-day": "bg-green-100 hover:bg-green-200 border-green-300",
      weekend: "bg-blue-100 hover:bg-blue-200 border-blue-300",
      holiday: "bg-red-100 hover:bg-red-200 border-red-300",
      "special-working-day":
        "bg-yellow-100 hover:bg-yellow-200 border-yellow-300",
    };
    return styles[dayType] || "bg-gray-100 hover:bg-gray-200";
  };

  const getDayTypeBadgeStyles = (dayType: string) => {
    const styles: Record<string, string> = {
      "working-day": "bg-green-500 text-white",
      weekend: "bg-blue-500 text-white",
      holiday: "bg-red-500 text-white",
      "special-working-day": "bg-yellow-500 text-white",
    };
    return styles[dayType] || "bg-gray-500 text-white";
  };

  const handleMouseEnter = (e: React.MouseEvent, dayData: CompanyCalendar) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
    setHoveredDay(dayData);
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const { daysInMonth, startingDayOfWeek, year, month } =
    getDaysInMonth(currentDate);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-24 bg-gray-50 border border-gray-100"
        ></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = getCalendarDataForDate(year, month, day);
      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === month &&
        new Date().getFullYear() === year;

      days.push(
        <div
          key={day}
          className={`h-24 p-2 border border-gray-200 cursor-pointer transition-all duration-200 ${getDayTypeStyles(
            dayData?.day_type
          )} ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
          onMouseEnter={(e) => dayData && handleMouseEnter(e, dayData)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex justify-between items-start">
            <span
              className={`text-sm font-semibold ${
                isToday ? "text-blue-600" : "text-gray-700"
              }`}
            >
              {day}
            </span>
            {dayData && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getDayTypeBadgeStyles(
                  dayData.day_type
                )}`}
              >
                {dayData.day_type.replace("-", " ")}
              </span>
            )}
          </div>
          {dayData?.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {dayData.description}
            </p>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Company Calendar</h2>

          <div className="flex items-center gap-3">
            {/* Filter Button */}
            <button
              onClick={() => console.log("Filter clicked")}
              className="p-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Filter"
            >
              <FunnelIcon className="w-6 h-6" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={loadCalendarData}
              className="p-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-6 h-6" />
            </button>

            {/* Add Button */}
            <button
              onClick={() => console.log("Add clicked")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Next Month"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Month/Year Display */}
          <h3 className="text-lg font-semibold text-gray-700">
            {monthNames[month]} {year}
          </h3>

          {/* Legend */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Legend:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-xs text-gray-600">Working</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-xs text-gray-600">Weekend</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-xs text-gray-600">Holiday</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-xs text-gray-600">Special</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading calendar data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {weekdays.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-sm font-semibold text-gray-600 border-b border-gray-200"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">{renderCalendarDays()}</div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-xl p-4 max-w-xs transform -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {new Date(hoveredDay.calendar_date).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs rounded-full ${getDayTypeBadgeStyles(
                  hoveredDay.day_type
                )}`}
              >
                {hoveredDay.day_type.replace("-", " ")}
              </span>
              <span className="text-sm text-gray-300">
                {hoveredDay.is_working_day ? "Working Day" : "Non-Working Day"}
              </span>
            </div>
            {hoveredDay.description && (
              <p className="text-sm text-gray-300 border-t border-gray-700 pt-2">
                {hoveredDay.description}
              </p>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
