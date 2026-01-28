"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchGanttData, fetchShifts, fetchWorkCenterShifts } from "@/app/lib/data";
import { GanttData, GanttScheduleItem } from "@/app/types/Production";
import { Shift } from "@/app/types/Shift";
import { WorkCenterShift } from "@/app/types/WorkCenter";

// Modern color palette - softer, more professional colors
const PRODUCT_COLORS = [
    { bg: "#6366f1", border: "#4f46e5", text: "#ffffff" },   // Indigo
    { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" },   // Violet
    { bg: "#06b6d4", border: "#0891b2", text: "#ffffff" },   // Cyan
    { bg: "#10b981", border: "#059669", text: "#ffffff" },   // Emerald
    { bg: "#f59e0b", border: "#d97706", text: "#1f2937" },   // Amber
    { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },   // Red
    { bg: "#ec4899", border: "#db2777", text: "#ffffff" },   // Pink
    { bg: "#14b8a6", border: "#0d9488", text: "#ffffff" },   // Teal
    { bg: "#f97316", border: "#ea580c", text: "#ffffff" },   // Orange
    { bg: "#84cc16", border: "#65a30d", text: "#1f2937" },   // Lime
];

// Shift background colors - very subtle
const SHIFT_COLORS = [
    "rgba(253, 230, 138, 0.25)",   // Yellow (Morning)
    "rgba(147, 197, 253, 0.25)",   // Blue (Afternoon)
    "rgba(167, 243, 208, 0.25)",   // Green (Night)
    "rgba(251, 207, 232, 0.25)",   // Pink
    "rgba(196, 181, 253, 0.25)",   // Purple
];

function getProductColor(id: number): typeof PRODUCT_COLORS[0] {
    return PRODUCT_COLORS[id % PRODUCT_COLORS.length];
}

function getShiftColor(shiftId: number): string {
    return SHIFT_COLORS[(shiftId - 1) % SHIFT_COLORS.length];
}

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString("th-TH", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
    });
}

function generateDateRange(start: string, end: string): Date[] {
    const dates: Date[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function calculateTaskPosition(
    start: string,
    end: string,
    visibleDates: Date[],
): { left: string; width: string; visible: boolean } {
    if (visibleDates.length === 0) {
        return { left: "0%", width: "0%", visible: false };
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const rangeStart = visibleDates[0];
    const rangeEnd = new Date(visibleDates[visibleDates.length - 1]);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    if (endDate < rangeStart || startDate >= rangeEnd) {
        return { left: "0%", width: "0%", visible: false };
    }

    const totalRange = rangeEnd.getTime() - rangeStart.getTime();
    const clampedStart = Math.max(startDate.getTime(), rangeStart.getTime());
    const clampedEnd = Math.min(endDate.getTime(), rangeEnd.getTime());
    const leftPercent = ((clampedStart - rangeStart.getTime()) / totalRange) * 100;
    const widthPercent = ((clampedEnd - clampedStart) / totalRange) * 100;

    return {
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.5)}%`,
        visible: true,
    };
}

function timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function calculateShiftPosition(shift: Shift): { left: string; width: string } {
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);
    const MINUTES_IN_DAY = 24 * 60;

    let duration = endMinutes - startMinutes;
    if (duration < 0) {
        duration = MINUTES_IN_DAY - startMinutes + endMinutes;
    }

    const leftPercent = (startMinutes / MINUTES_IN_DAY) * 100;
    const widthPercent = (duration / MINUTES_IN_DAY) * 100;

    return {
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
    };
}

function getDayOfWeek(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
}

export default function GanttPage() {
    const [ganttData, setGanttData] = useState<GanttData | null>(null);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [workCenterShifts, setWorkCenterShifts] = useState<WorkCenterShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredTask, setHoveredTask] = useState<GanttScheduleItem | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [currentStartIndex, setCurrentStartIndex] = useState(0);
    const [daysToShow, setDaysToShow] = useState(7);

    const sidebarScrollRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartScrollRef = useRef<HTMLDivElement>(null);
    const isScrollingSidebar = useRef(false);
    const isScrollingChart = useRef(false);

    const ROW_HEIGHT = 56;
    const HEADER_HEIGHT = 56;
    const SIDEBAR_WIDTH = 180;

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [data, shiftsData, wcShiftsData] = await Promise.all([
                fetchGanttData(),
                fetchShifts(),
                fetchWorkCenterShifts()
            ]);
            setGanttData(data);
            setShifts(shiftsData.filter(s => s.is_active));
            setWorkCenterShifts(wcShiftsData.filter(wcs => wcs.is_active));
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

    const visibleDateRange = useMemo(() => {
        return dateRange.slice(currentStartIndex, currentStartIndex + daysToShow);
    }, [dateRange, currentStartIndex, daysToShow]);

    const totalHeight = (ganttData?.work_centers.length || 0) * ROW_HEIGHT;

    const shiftMap = useMemo(() => {
        const map = new Map<number, Shift>();
        shifts.forEach(s => map.set(s.id, s));
        return map;
    }, [shifts]);

    const workCenterShiftMap = useMemo(() => {
        const map = new Map<number, Map<number, Shift[]>>();
        workCenterShifts.forEach(wcs => {
            if (!map.has(wcs.work_center_id)) {
                map.set(wcs.work_center_id, new Map<number, Shift[]>());
            }
            const dayMap = map.get(wcs.work_center_id)!;
            if (!dayMap.has(wcs.day_of_week)) {
                dayMap.set(wcs.day_of_week, []);
            }
            const shift = shiftMap.get(wcs.shift_id);
            if (shift) {
                dayMap.get(wcs.day_of_week)!.push(shift);
            }
        });
        return map;
    }, [workCenterShifts, shiftMap]);

    const uniqueUsedShifts = useMemo(() => {
        const usedShiftIds = new Set<number>();
        workCenterShifts.forEach(wcs => usedShiftIds.add(wcs.shift_id));
        return shifts
            .filter(s => usedShiftIds.has(s.id))
            .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    }, [workCenterShifts, shifts]);

    const schedulesByWorkCenter = useMemo(() => {
        if (!ganttData) return new Map<number, GanttScheduleItem[]>();

        const map = new Map<number, GanttScheduleItem[]>();
        ganttData.schedules.forEach((schedule) => {
            const existing = map.get(schedule.work_center_id) || [];
            existing.push(schedule);
            map.set(schedule.work_center_id, existing);
        });

        map.forEach((tasks, wcId) => {
            tasks.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

            const mergedTasks: GanttScheduleItem[] = [];
            for (let i = 0; i < tasks.length; i++) {
                const current = tasks[i];
                if (mergedTasks.length === 0) {
                    mergedTasks.push({ ...current });
                    continue;
                }

                const last = mergedTasks[mergedTasks.length - 1];
                const lastEnd = new Date(last.scheduled_end).getTime();
                const currentStart = new Date(current.scheduled_start).getTime();
                const isConsecutive = (currentStart - lastEnd) <= 90000;

                if (
                    current.product_id === last.product_id &&
                    current.production_order_id === last.production_order_id &&
                    isConsecutive
                ) {
                    last.scheduled_end = current.scheduled_end;
                } else {
                    mergedTasks.push({ ...current });
                }
            }
            map.set(wcId, mergedTasks);
        });

        return map;
    }, [ganttData]);

    const handleMouseMove = (e: React.MouseEvent, task: GanttScheduleItem) => {
        setHoveredTask(task);
        const TOOLTIP_WIDTH = 320;
        const TOOLTIP_HEIGHT = 280;

        let x = e.clientX + 15;
        let y = e.clientY + 15;

        if (x + TOOLTIP_WIDTH > window.innerWidth) {
            x = e.clientX - TOOLTIP_WIDTH - 15;
        }
        if (y + TOOLTIP_HEIGHT > window.innerHeight) {
            y = e.clientY - TOOLTIP_HEIGHT - 15;
        }

        setTooltipPos({ x, y });
    };

    const handleMouseLeave = () => {
        setHoveredTask(null);
    };

    const handleZoomIn = () => {
        setDaysToShow(prev => Math.max(1, prev - 1));
        setCurrentStartIndex(prev => Math.min(prev, Math.max(0, dateRange.length - Math.max(1, daysToShow - 1))));
    };

    const handleZoomOut = () => {
        setDaysToShow(prev => Math.min(30, prev + 1));
        setCurrentStartIndex(prev => Math.min(prev, Math.max(0, dateRange.length - Math.min(30, daysToShow + 1))));
    };

    const goToToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const index = dateRange.findIndex(d => d.toDateString() === today.toDateString());
        if (index !== -1) {
            setCurrentStartIndex(Math.max(0, Math.min(index, dateRange.length - daysToShow)));
        }
    };

    const getWorkCenterShiftsForDate = (workCenterId: number, date: Date): Shift[] => {
        const dayOfWeek = getDayOfWeek(date);
        const dayMap = workCenterShiftMap.get(workCenterId);
        if (!dayMap) return [];
        return dayMap.get(dayOfWeek) || [];
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-600 font-medium">Loading Gantt Chart...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-red-100 max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-red-600 font-semibold text-lg mb-2">Error Loading Data</p>
                    <p className="text-slate-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={loadData}
                        className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all font-medium shadow-md hover:shadow-lg"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!ganttData || ganttData.schedules.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <p className="text-slate-700 font-semibold text-xl mb-2">No Schedule Data</p>
                    <p className="text-slate-500">Add some work center schedules to view the Gantt chart</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Clean Header */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Left: Title & Info */}
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">Production Schedule</h1>
                            <p className="text-xs text-slate-500">
                                {ganttData.schedules.length} tasks • {ganttData.work_centers.length} work centers
                            </p>
                        </div>
                    </div>

                    {/* Center: Navigation & Zoom */}
                    <div className="flex items-center gap-2">
                        {/* Today Button */}
                        <button
                            onClick={goToToday}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                            Today
                        </button>

                        {/* Date Navigator */}
                        <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setCurrentStartIndex(prev => Math.max(0, prev - daysToShow))}
                                disabled={currentStartIndex === 0}
                                className="p-2 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="px-3 text-sm font-medium text-slate-700 min-w-[180px] text-center">
                                {visibleDateRange.length > 0 && (
                                    <>
                                        {visibleDateRange[0].toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                                        {" – "}
                                        {visibleDateRange[visibleDateRange.length - 1].toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                                    </>
                                )}
                            </span>
                            <button
                                onClick={() => setCurrentStartIndex(prev => Math.min(dateRange.length - daysToShow, prev + daysToShow))}
                                disabled={currentStartIndex >= dateRange.length - daysToShow}
                                className="p-2 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden ml-2">
                            <button
                                onClick={handleZoomOut}
                                disabled={daysToShow >= 30}
                                className="p-2 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Zoom Out"
                            >
                                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            <span className="px-2 text-xs font-medium text-slate-600 min-w-[50px] text-center border-x border-slate-200">
                                {daysToShow}d
                            </span>
                            <button
                                onClick={handleZoomIn}
                                disabled={daysToShow <= 1}
                                className="p-2 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Zoom In"
                            >
                                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Right: Actions & Legend */}
                    <div className="flex items-center gap-3">
                        {/* Shift Legend */}
                        {uniqueUsedShifts.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                                {uniqueUsedShifts.map((shift) => (
                                    <div key={shift.id} className="flex items-center gap-1.5" title={`${shift.shift_name} (${shift.start_time} - ${shift.end_time})`}>
                                        <div
                                            className="w-3 h-3 rounded"
                                            style={{ backgroundColor: getShiftColor(shift.id).replace('0.25', '0.7') }}
                                        />
                                        <span className="text-xs text-slate-600 font-medium">{shift.shift_code}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Refresh */}
                        <button
                            onClick={loadData}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Refresh"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline Slider */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2">
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 font-medium min-w-[60px]">
                        {dateRange.length > 0 && dateRange[0].toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, dateRange.length - daysToShow)}
                        value={currentStartIndex}
                        onChange={(e) => setCurrentStartIndex(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                            [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md
                            [&::-webkit-slider-thumb]:hover:bg-indigo-600 [&::-webkit-slider-thumb]:transition-colors"
                    />
                    <span className="text-xs text-slate-400 font-medium min-w-[60px] text-right">
                        {dateRange.length > 0 && dateRange[dateRange.length - 1].toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                    </span>
                </div>
            </div>

            {/* Gantt Chart */}
            <div ref={chartContainerRef} className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="shrink-0 bg-white border-r border-slate-200 flex flex-col" style={{ width: SIDEBAR_WIDTH }}>
                    {/* Sidebar Header */}
                    <div
                        className="shrink-0 bg-slate-50 border-b border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        style={{ height: HEADER_HEIGHT }}
                    >
                        Work Centers
                    </div>

                    {/* Work Center List */}
                    <div className="flex-1 overflow-hidden relative">
                        <div
                            ref={sidebarScrollRef}
                            className="absolute inset-0 overflow-y-scroll"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            onScroll={(e) => {
                                if (isScrollingChart.current) return;
                                isScrollingSidebar.current = true;
                                if (chartScrollRef.current) {
                                    chartScrollRef.current.scrollTop = e.currentTarget.scrollTop;
                                }
                                requestAnimationFrame(() => { isScrollingSidebar.current = false; });
                            }}
                        >
                            {ganttData.work_centers.map((wc, index) => (
                                <div
                                    key={wc.id}
                                    className={`flex items-center px-3 border-b border-slate-100 transition-colors hover:bg-indigo-50/50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                                    style={{ height: ROW_HEIGHT }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800 text-sm truncate">{wc.code}</div>
                                        <div className="text-slate-500 text-xs truncate">{wc.name}</div>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400 ml-2">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                        </svg>
                                        <span className="text-xs font-medium">{wc.number_of_workers_required}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Chart */}
                <div
                    ref={chartScrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    onScroll={(e) => {
                        if (isScrollingSidebar.current) return;
                        isScrollingChart.current = true;
                        if (sidebarScrollRef.current) {
                            sidebarScrollRef.current.scrollTop = e.currentTarget.scrollTop;
                        }
                        requestAnimationFrame(() => { isScrollingChart.current = false; });
                    }}
                >
                    <div style={{ minHeight: totalHeight + HEADER_HEIGHT }}>
                        {/* Date Header */}
                        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 flex" style={{ height: HEADER_HEIGHT }}>
                            {visibleDateRange.map((date, index) => {
                                const isToday = date.toDateString() === new Date().toDateString();
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const isHoliday = ganttData.holidays.includes(date.toISOString().split("T")[0]);

                                return (
                                    <div
                                        key={index}
                                        className={`flex-1 flex flex-col items-center justify-center border-r border-slate-100 transition-colors
                                            ${isHoliday ? "bg-red-50" : isToday ? "bg-indigo-50" : isWeekend ? "bg-slate-50" : "bg-white"}`}
                                    >
                                        <div className={`text-[10px] font-medium uppercase tracking-wide ${isHoliday ? "text-red-400" : isToday ? "text-indigo-500" : "text-slate-400"}`}>
                                            {date.toLocaleDateString("en-US", { weekday: "short" })}
                                        </div>
                                        <div className={`text-xl font-bold ${isHoliday ? "text-red-500" : isToday ? "text-indigo-600" : "text-slate-800"}`}>
                                            {date.getDate()}
                                        </div>
                                        <div className={`text-[10px] ${isHoliday ? "text-red-400" : "text-slate-400"}`}>
                                            {date.toLocaleDateString("en-US", { month: "short" })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Task Rows */}
                        <div className="relative">
                            {ganttData.work_centers.map((wc, wcIndex) => {
                                const tasks = schedulesByWorkCenter.get(wc.id) || [];

                                return (
                                    <div
                                        key={wc.id}
                                        className={`relative border-b border-slate-100 ${wcIndex % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        {/* Grid & Shift backgrounds */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {visibleDateRange.map((date, dateIndex) => {
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                const isHoliday = ganttData.holidays.includes(date.toISOString().split("T")[0]);
                                                const shiftsForDay = getWorkCenterShiftsForDate(wc.id, date);

                                                return (
                                                    <div
                                                        key={dateIndex}
                                                        className={`flex-1 h-full border-r border-slate-100 relative
                                                            ${isHoliday ? "bg-red-100/40" : isToday ? "bg-indigo-50/30" : isWeekend ? "bg-slate-100/30" : ""}`}
                                                    >
                                                        {/* Shift stripes */}
                                                        {!isHoliday && shiftsForDay.map((shift) => {
                                                            const pos = calculateShiftPosition(shift);
                                                            return (
                                                                <div
                                                                    key={shift.id}
                                                                    className="absolute top-1 bottom-1 rounded"
                                                                    style={{
                                                                        left: pos.left,
                                                                        width: pos.width,
                                                                        backgroundColor: getShiftColor(shift.id),
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Task Bars */}
                                        {tasks.map((task) => {
                                            const { left, width, visible } = calculateTaskPosition(
                                                task.scheduled_start,
                                                task.scheduled_end,
                                                visibleDateRange,
                                            );

                                            if (!visible) return null;

                                            const color = getProductColor(task.production_order_id);

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="absolute top-2 bottom-2 rounded-lg cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:z-30 shadow-sm hover:shadow-lg group"
                                                    style={{
                                                        left,
                                                        width,
                                                        backgroundColor: color.bg,
                                                        borderLeft: `3px solid ${color.border}`,
                                                    }}
                                                    onMouseMove={(e) => handleMouseMove(e, task)}
                                                    onMouseLeave={handleMouseLeave}
                                                >
                                                    <div className="h-full px-2 flex items-center overflow-hidden" style={{ color: color.text }}>
                                                        <div className="truncate">
                                                            <span className="text-xs font-bold">{task.po_number}</span>
                                                            <span className="text-xs opacity-80 ml-1.5">• {task.product_code}</span>
                                                        </div>
                                                    </div>
                                                    {/* Hover glow effect */}
                                                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                                        style={{ boxShadow: `0 0 0 2px ${color.border}40` }} />
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
                    className="fixed z-50 pointer-events-none animate-in fade-in duration-150"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-4 shadow-2xl min-w-[300px]">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4 pb-3 border-b border-slate-100">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md"
                                style={{ backgroundColor: getProductColor(hoveredTask.production_order_id).bg }}
                            >
                                {hoveredTask.po_number.slice(-3)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 text-lg">{hoveredTask.po_number}</div>
                                <div className="text-slate-500 text-sm truncate">{hoveredTask.product_name}</div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Product</span>
                                <span className="text-slate-700 font-medium text-sm">{hoveredTask.product_code}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Operation</span>
                                <span className="text-slate-700 text-sm">{hoveredTask.operation_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Work Center</span>
                                <span className="text-slate-700 text-sm">{hoveredTask.work_center_code}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Start</span>
                                <span className="text-slate-700 text-sm font-medium">{formatDateTime(hoveredTask.scheduled_start)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">End</span>
                                <span className="text-slate-700 text-sm font-medium">{formatDateTime(hoveredTask.scheduled_end)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Quantity</span>
                                <span className="text-slate-700 text-sm font-semibold">{hoveredTask.quantity_planned.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                <span className="text-slate-400 text-sm">Status</span>
                                <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${hoveredTask.status === "completed"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : hoveredTask.status === "in-progress"
                                            ? "bg-amber-100 text-amber-700"
                                            : hoveredTask.status === "cancelled"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-indigo-100 text-indigo-700"
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
