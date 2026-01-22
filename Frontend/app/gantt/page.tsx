"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchGanttData } from "@/app/lib/data";
import { GanttData, GanttScheduleItem } from "@/app/types/Production";
import {
    ChartBarIcon,
    CalendarDaysIcon,
} from "@heroicons/react/24/outline";

// Color palette for products - vibrant colors
const PRODUCT_COLORS = [
    { bg: "rgba(99, 102, 241, 0.85)", border: "#4f46e5", text: "#ffffff" },   // Indigo
    { bg: "rgba(236, 72, 153, 0.85)", border: "#db2777", text: "#ffffff" },   // Pink
    { bg: "rgba(34, 197, 94, 0.85)", border: "#16a34a", text: "#ffffff" },    // Green
    { bg: "rgba(249, 115, 22, 0.85)", border: "#ea580c", text: "#ffffff" },   // Orange
    { bg: "rgba(139, 92, 246, 0.85)", border: "#7c3aed", text: "#ffffff" },   // Violet
    { bg: "rgba(14, 165, 233, 0.85)", border: "#0284c7", text: "#ffffff" },   // Sky
    { bg: "rgba(234, 179, 8, 0.85)", border: "#ca8a04", text: "#1f2937" },    // Yellow
    { bg: "rgba(239, 68, 68, 0.85)", border: "#dc2626", text: "#ffffff" },    // Red
    { bg: "rgba(20, 184, 166, 0.85)", border: "#0d9488", text: "#ffffff" },   // Teal
    { bg: "rgba(168, 85, 247, 0.85)", border: "#9333ea", text: "#ffffff" },   // Purple
];

function getProductColor(id: number): typeof PRODUCT_COLORS[0] {
    return PRODUCT_COLORS[id % PRODUCT_COLORS.length];
}

// Helper function to format date
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
    });
}

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString("th-TH", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Generate date array for header
function generateDateRange(start: string, end: string): Date[] {
    const dates: Date[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Add padding days
    startDate.setDate(startDate.getDate() - 1);
    endDate.setDate(endDate.getDate() + 1);

    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// Calculate position and width for a task bar (percentage-based)
function calculateTaskPosition(
    start: string,
    end: string,
    visibleDates: Date[],
    _dayWidth: number // kept for compatibility but not used
): { left: string; width: string; visible: boolean } {
    if (visibleDates.length === 0) {
        return { left: "0%", width: "0%", visible: false };
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const rangeStart = visibleDates[0];
    const rangeEnd = new Date(visibleDates[visibleDates.length - 1]);
    rangeEnd.setDate(rangeEnd.getDate() + 1); // End of last visible day

    // Check if task is visible in current range
    if (endDate < rangeStart || startDate >= rangeEnd) {
        return { left: "0%", width: "0%", visible: false };
    }

    const totalRange = rangeEnd.getTime() - rangeStart.getTime();

    // Clamp start and end to visible range
    const clampedStart = Math.max(startDate.getTime(), rangeStart.getTime());
    const clampedEnd = Math.min(endDate.getTime(), rangeEnd.getTime());

    const leftPercent = ((clampedStart - rangeStart.getTime()) / totalRange) * 100;
    const widthPercent = ((clampedEnd - clampedStart) / totalRange) * 100;

    return {
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 1)}%`, // Minimum 1% width
        visible: true,
    };
}

export default function GanttPage() {
    const [ganttData, setGanttData] = useState<GanttData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dayWidth, setDayWidth] = useState(100);
    const [hoveredTask, setHoveredTask] = useState<GanttScheduleItem | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [currentStartIndex, setCurrentStartIndex] = useState(0);
    const sidebarScrollRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartScrollRef = useRef<HTMLDivElement>(null);
    const isScrollingSidebar = useRef(false);
    const isScrollingChart = useRef(false);

    const ROW_HEIGHT = 50;
    const HEADER_HEIGHT = 80;
    const SIDEBAR_WIDTH = 200;
    const DAYS_TO_SHOW = 7;

    useEffect(() => {
        loadData();
    }, []);

    // Calculate dayWidth to show exactly 7 days in viewport
    useEffect(() => {
        const calculateDayWidth = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.clientWidth - SIDEBAR_WIDTH;
                const calculatedWidth = Math.floor(containerWidth / DAYS_TO_SHOW);
                setDayWidth(Math.max(calculatedWidth, 80)); // Minimum 80px per day
            }
        };

        calculateDayWidth();
        window.addEventListener('resize', calculateDayWidth);
        return () => window.removeEventListener('resize', calculateDayWidth);
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const data = await fetchGanttData();
            setGanttData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    const dateRange = useMemo(() => {
        if (!ganttData?.date_range) return [];
        return generateDateRange(ganttData.date_range.start, ganttData.date_range.end);
    }, [ganttData]);

    // Get visible dates (only 7 days at a time)
    const visibleDateRange = useMemo(() => {
        return dateRange.slice(currentStartIndex, currentStartIndex + DAYS_TO_SHOW);
    }, [dateRange, currentStartIndex]);

    const totalHeight = (ganttData?.work_centers.length || 0) * ROW_HEIGHT;

    // Group schedules by work center
    const schedulesByWorkCenter = useMemo(() => {
        if (!ganttData) return new Map<number, GanttScheduleItem[]>();
        const map = new Map<number, GanttScheduleItem[]>();
        ganttData.schedules.forEach((schedule) => {
            const existing = map.get(schedule.work_center_id) || [];
            existing.push(schedule);
            map.set(schedule.work_center_id, existing);
        });
        return map;
    }, [ganttData]);

    // Get unique POs for legend
    const uniquePOs = useMemo(() => {
        if (!ganttData) return [];
        const poMap = new Map<number, { id: number; po_number: string; product_code: string }>();
        ganttData.schedules.forEach((s) => {
            if (!poMap.has(s.production_order_id)) {
                poMap.set(s.production_order_id, {
                    id: s.production_order_id,
                    po_number: s.po_number,
                    product_code: s.product_code,
                });
            }
        });
        return Array.from(poMap.values());
    }, [ganttData]);

    const handleMouseMove = (e: React.MouseEvent, task: GanttScheduleItem) => {
        setHoveredTask(task);

        // Calculate safe position to keep tooltip on screen
        const TOOLTIP_WIDTH = 300;
        const TOOLTIP_HEIGHT = 250;
        const PADDING = 20;

        let x = e.clientX + 10;
        let y = e.clientY + 10;

        // Check right edge
        if (x + TOOLTIP_WIDTH > window.innerWidth) {
            x = e.clientX - TOOLTIP_WIDTH - 10;
        }

        // Check bottom edge
        if (y + TOOLTIP_HEIGHT > window.innerHeight) {
            y = e.clientY - TOOLTIP_HEIGHT - 10;
        }

        setTooltipPos({ x, y });
    };

    const handleMouseLeave = () => {
        setHoveredTask(null);
    };

    const goToPreviousWeek = () => {
        setCurrentStartIndex((prev) => Math.max(0, prev - DAYS_TO_SHOW));
    };

    const goToNextWeek = () => {
        setCurrentStartIndex((prev) =>
            Math.min(dateRange.length - DAYS_TO_SHOW, prev + DAYS_TO_SHOW)
        );
    };

    const goToToday = () => {
        if (!ganttData) return;
        const today = new Date();
        const rangeStart = new Date(ganttData.date_range.start);
        rangeStart.setDate(rangeStart.getDate() - 1); // Adjust for padding
        const daysDiff = Math.floor((today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
        // Center today in the view
        const targetIndex = Math.max(0, Math.min(dateRange.length - DAYS_TO_SHOW, daysDiff - Math.floor(DAYS_TO_SHOW / 2)));
        setCurrentStartIndex(targetIndex);
    };

    const canGoPrevious = currentStartIndex > 0;
    const canGoNext = currentStartIndex < dateRange.length - DAYS_TO_SHOW;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-300 text-lg">Loading Gantt Chart...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="text-center bg-red-900/30 p-8 rounded-2xl border border-red-500/30">
                    <p className="text-red-400 text-xl mb-4">Error: {error}</p>
                    <button
                        onClick={loadData}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!ganttData || ganttData.schedules.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="text-center">
                    <ChartBarIcon className="w-24 h-24 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-xl">No schedule data available</p>
                    <p className="text-slate-500 mt-2">Add some work center schedules to view the Gantt chart</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25">
                            <ChartBarIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Production Gantt Chart</h1>
                            <p className="text-slate-400 text-sm">
                                {ganttData.schedules.length} tasks across {ganttData.work_centers.length} work centers
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Today Button */}
                        <button
                            onClick={goToToday}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/25"
                        >
                            <CalendarDaysIcon className="w-5 h-5" />
                            Today
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-3">
                    {uniquePOs.map((po) => {
                        const color = getProductColor(po.id);
                        return (
                            <div
                                key={po.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                                style={{
                                    backgroundColor: color.bg,
                                    border: `2px solid ${color.border}`,
                                }}
                            >
                                <span style={{ color: color.text }} className="font-medium">
                                    {po.po_number}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Date Range Slider */}
                <div className="mt-4 bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">
                            {visibleDateRange.length > 0 && (
                                <>
                                    {visibleDateRange[0].toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                    {" - "}
                                    {visibleDateRange[visibleDateRange.length - 1].toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                </>
                            )}
                        </span>
                        <span className="text-slate-500 text-xs">
                            {dateRange.length > 0 && (
                                <>
                                    ทั้งหมด: {dateRange[0].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                                    {" - "}
                                    {dateRange[dateRange.length - 1].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                                </>
                            )}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, dateRange.length - DAYS_TO_SHOW)}
                        value={currentStartIndex}
                        onChange={(e) => setCurrentStartIndex(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        style={{
                            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentStartIndex / Math.max(1, dateRange.length - DAYS_TO_SHOW)) * 100}%, #334155 ${(currentStartIndex / Math.max(1, dateRange.length - DAYS_TO_SHOW)) * 100}%, #334155 100%)`
                        }}
                    />
                </div>
            </div>

            {/* Gantt Chart Container */}
            <div ref={chartContainerRef} className="flex-1 flex overflow-hidden">
                {/* Sidebar - Work Centers (Fixed Header + Scrollable Body synced with chart) */}
                <div
                    className="shrink-0 bg-slate-800/80 border-r border-slate-700/50 flex flex-col"
                    style={{ width: SIDEBAR_WIDTH }}
                >
                    {/* Sidebar Header - Fixed */}
                    <div
                        className="shrink-0 bg-slate-800 border-b border-slate-700/50 flex items-center justify-center font-semibold text-slate-300"
                        style={{ height: HEADER_HEIGHT }}
                    >
                        Work Centers
                    </div>

                    {/* Work Center List - Synced scroll (no visible scrollbar) */}
                    <div
                        className="flex-1 overflow-hidden"
                        style={{ position: 'relative' }}
                    >
                        <div
                            ref={sidebarScrollRef}
                            className="absolute inset-0 overflow-y-scroll"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                marginRight: '-20px',
                                paddingRight: '20px',
                            }}
                            onScroll={(e) => {
                                // Prevent infinite loop
                                if (isScrollingChart.current) return;
                                isScrollingSidebar.current = true;
                                // Sync scroll with main chart area
                                if (chartScrollRef.current) {
                                    chartScrollRef.current.scrollTop = e.currentTarget.scrollTop;
                                }
                                requestAnimationFrame(() => {
                                    isScrollingSidebar.current = false;
                                });
                            }}
                        >
                            {ganttData.work_centers.map((wc, index) => (
                                <div
                                    key={wc.id}
                                    className={`flex items-center px-4 border-b border-slate-700/30 ${index % 2 === 0 ? "bg-slate-800/50" : "bg-slate-800/30"
                                        }`}
                                    style={{ height: ROW_HEIGHT }}
                                >
                                    <div>
                                        <div className="font-medium text-white text-sm">{wc.code}</div>
                                        <div className="text-slate-400 text-xs truncate" style={{ maxWidth: SIDEBAR_WIDTH - 32 }}>
                                            {wc.name}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Chart Area */}
                <div
                    ref={chartScrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    onScroll={(e) => {
                        // Prevent infinite loop
                        if (isScrollingSidebar.current) return;
                        isScrollingChart.current = true;
                        // Sync sidebar scroll
                        if (sidebarScrollRef.current) {
                            sidebarScrollRef.current.scrollTop = e.currentTarget.scrollTop;
                        }
                        requestAnimationFrame(() => {
                            isScrollingChart.current = false;
                        });
                    }}
                >
                    <div style={{ minHeight: totalHeight + HEADER_HEIGHT }}>
                        {/* Date Header */}
                        <div
                            className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 flex"
                            style={{ height: HEADER_HEIGHT }}
                        >
                            {visibleDateRange.map((date, index) => {
                                const isToday = date.toDateString() === new Date().toDateString();
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const isHoliday = ganttData.holidays.includes(date.toISOString().split("T")[0]);

                                return (
                                    <div
                                        key={index}
                                        className={`flex-1 flex flex-col items-center justify-center border-r border-slate-700/30 ${isToday
                                            ? "bg-indigo-600/30"
                                            : isHoliday
                                                ? "bg-red-900/30"
                                                : isWeekend
                                                    ? "bg-slate-700/30"
                                                    : ""
                                            }`}
                                    >
                                        <div className={`text-xs ${isWeekend || isHoliday ? "text-red-400" : "text-slate-500"}`}>
                                            {date.toLocaleDateString("en-US", { weekday: "short" })}
                                        </div>
                                        <div
                                            className={`text-lg font-bold ${isToday ? "text-indigo-400" : isWeekend || isHoliday ? "text-red-400" : "text-white"
                                                }`}
                                        >
                                            {date.getDate()}
                                        </div>
                                        <div className={`text-xs ${isWeekend || isHoliday ? "text-red-400" : "text-slate-500"}`}>
                                            {date.toLocaleDateString("en-US", { month: "short" })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Task Rows */}
                        <div className="relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 pointer-events-none flex">
                                {visibleDateRange.map((date, index) => {
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                    const isHoliday = ganttData.holidays.includes(date.toISOString().split("T")[0]);

                                    return (
                                        <div
                                            key={index}
                                            className={`flex-1 h-full border-r border-slate-700/20 ${isToday
                                                ? "bg-indigo-600/10"
                                                : isHoliday
                                                    ? "bg-red-900/20"
                                                    : isWeekend
                                                        ? "bg-slate-700/10"
                                                        : ""
                                                }`}
                                            style={{ height: totalHeight }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Work Center Rows with Tasks */}
                            {ganttData.work_centers.map((wc, wcIndex) => {
                                const tasks = schedulesByWorkCenter.get(wc.id) || [];

                                return (
                                    <div
                                        key={wc.id}
                                        className={`relative border-b border-slate-700/20 ${wcIndex % 2 === 0 ? "" : "bg-slate-800/20"
                                            }`}
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        {tasks.map((task) => {
                                            const { left, width, visible } = calculateTaskPosition(
                                                task.scheduled_start,
                                                task.scheduled_end,
                                                visibleDateRange,
                                                dayWidth
                                            );

                                            if (!visible) return null;

                                            const color = getProductColor(task.production_order_id);

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="absolute top-2 bottom-2 rounded-lg cursor-pointer transform hover:scale-105 hover:z-30 transition-all duration-200 shadow-lg"
                                                    style={{
                                                        left,
                                                        width,
                                                        backgroundColor: color.bg,
                                                        borderLeft: `4px solid ${color.border}`,
                                                        boxShadow: `0 4px 12px ${color.border}40`,
                                                    }}
                                                    onMouseMove={(e) => handleMouseMove(e, task)}
                                                    onMouseLeave={handleMouseLeave}
                                                >
                                                    <div
                                                        className="h-full px-2 flex items-center overflow-hidden"
                                                        style={{ color: color.text }}
                                                    >
                                                        <div className="truncate text-xs font-medium">
                                                            <span className="font-bold">{task.po_number}</span>
                                                            <span className="opacity-75 ml-1">• {task.product_code}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredTask && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-xl p-4 shadow-2xl min-w-[280px]">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: getProductColor(hoveredTask.production_order_id).border }}
                            />
                            <div>
                                <div className="font-bold text-white">{hoveredTask.po_number}</div>
                                <div className="text-slate-400 text-sm">{hoveredTask.product_name}</div>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Product:</span>
                                <span className="text-white font-medium">{hoveredTask.product_code}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Operation:</span>
                                <span className="text-white">{hoveredTask.operation_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Work Center:</span>
                                <span className="text-white">{hoveredTask.work_center_code}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Start:</span>
                                <span className="text-white">{formatDateTime(hoveredTask.scheduled_start)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">End:</span>
                                <span className="text-white">{formatDateTime(hoveredTask.scheduled_end)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Quantity:</span>
                                <span className="text-white">{hoveredTask.quantity_planned.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Status:</span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${hoveredTask.status === "completed"
                                        ? "bg-green-500/20 text-green-400"
                                        : hoveredTask.status === "in-progress"
                                            ? "bg-yellow-500/20 text-yellow-400"
                                            : hoveredTask.status === "cancelled"
                                                ? "bg-red-500/20 text-red-400"
                                                : "bg-blue-500/20 text-blue-400"
                                        }`}
                                >
                                    {hoveredTask.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
