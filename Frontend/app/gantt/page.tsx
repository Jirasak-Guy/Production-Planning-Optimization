"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchGanttData, fetchShifts, fetchWorkCenterShifts, fetchSchedulerSettings, updateSchedulerSettings, SchedulerSettings } from "@/app/lib/data";
import { GanttData, GanttScheduleItem } from "@/app/types/Production";
import { Shift } from "@/app/types/Shift";
import { WorkCenterShift } from "@/app/types/WorkCenter";

// Color palette for products - vibrant colors for light theme
const PRODUCT_COLORS = [
    { bg: "rgba(99, 102, 241, 0.9)", border: "#4f46e5", text: "#ffffff" },   // Indigo
    { bg: "rgba(236, 72, 153, 0.9)", border: "#db2777", text: "#ffffff" },   // Pink
    { bg: "rgba(34, 197, 94, 0.9)", border: "#16a34a", text: "#ffffff" },    // Green
    { bg: "rgba(249, 115, 22, 0.9)", border: "#ea580c", text: "#ffffff" },   // Orange
    { bg: "rgba(139, 92, 246, 0.9)", border: "#7c3aed", text: "#ffffff" },   // Violet
    { bg: "rgba(14, 165, 233, 0.9)", border: "#0284c7", text: "#ffffff" },   // Sky
    { bg: "rgba(234, 179, 8, 0.9)", border: "#ca8a04", text: "#1f2937" },    // Yellow
    { bg: "rgba(239, 68, 68, 0.9)", border: "#dc2626", text: "#ffffff" },    // Red
    { bg: "rgba(20, 184, 166, 0.9)", border: "#0d9488", text: "#ffffff" },   // Teal
    { bg: "rgba(168, 85, 247, 0.9)", border: "#9333ea", text: "#ffffff" },   // Purple
];

// Shift background colors - subtle pastel colors
const SHIFT_COLORS = [
    "rgba(253, 224, 71, 0.2)",   // Yellow (Morning shift)
    "rgba(147, 197, 253, 0.2)",  // Blue (Afternoon shift)
    "rgba(134, 239, 172, 0.2)",  // Green (Night shift)
    "rgba(251, 207, 232, 0.2)",  // Pink
    "rgba(196, 181, 253, 0.2)",  // Purple
];

function getProductColor(id: number): typeof PRODUCT_COLORS[0] {
    return PRODUCT_COLORS[id % PRODUCT_COLORS.length];
}

function getShiftColor(shiftId: number): string {
    return SHIFT_COLORS[(shiftId - 1) % SHIFT_COLORS.length];
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
        timeZone: "UTC", // Display as UTC to match database time
    });
}

// Generate date array for header
function generateDateRange(start: string, end: string): Date[] {
    const dates: Date[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    // No padding - show exact date range from data
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

// Parse time string (HH:MM:SS) to minutes from midnight
function timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Calculate shift position and width as percentage of day
function calculateShiftPosition(shift: Shift): { left: string; width: string } {
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);

    const MINUTES_IN_DAY = 24 * 60;

    // Handle overnight shifts (end time < start time)
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

// Get day of week from Date (1=Monday, 7=Sunday) matching database format
function getDayOfWeek(date: Date): number {
    const day = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    return day === 0 ? 7 : day; // Convert to 1=Monday, ..., 7=Sunday
}

export default function GanttPage() {
    const [ganttData, setGanttData] = useState<GanttData | null>(null);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [workCenterShifts, setWorkCenterShifts] = useState<WorkCenterShift[]>([]);
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
    const HEADER_HEIGHT = 70;
    const SIDEBAR_WIDTH = 200;
    const [daysToShow, setDaysToShow] = useState(7);
    const [showDaysDropdown, setShowDaysDropdown] = useState(false);
    const DAYS_OPTIONS = [1, 3, 5, 7, 14, 21, 30];

    // Scheduler Settings
    const [schedulerSettings, setSchedulerSettings] = useState<SchedulerSettings>({
        max_workers: 600,
        time_limit_seconds: 60,
        horizon_days: 365,
    });
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingSettings, setEditingSettings] = useState<SchedulerSettings>({
        max_workers: 600,
        time_limit_seconds: 60,
        horizon_days: 365,
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Calculate dayWidth to show exactly N days in viewport
    useEffect(() => {
        const calculateDayWidth = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.clientWidth - SIDEBAR_WIDTH;
                const calculatedWidth = Math.floor(containerWidth / daysToShow);
                setDayWidth(Math.max(calculatedWidth, 60)); // Minimum 60px per day
            }
        };

        calculateDayWidth();
        window.addEventListener('resize', calculateDayWidth);
        return () => window.removeEventListener('resize', calculateDayWidth);
    }, [daysToShow]);

    async function loadData() {
        try {
            setLoading(true);
            const [data, shiftsData, wcShiftsData, settings] = await Promise.all([
                fetchGanttData(),
                fetchShifts(),
                fetchWorkCenterShifts(),
                fetchSchedulerSettings()
            ]);
            setGanttData(data);
            // Only keep active shifts
            const activeShifts = shiftsData.filter(s => s.is_active);
            setShifts(activeShifts);
            // Only keep active work center shifts
            const activeWcShifts = wcShiftsData.filter(wcs => wcs.is_active);
            setWorkCenterShifts(activeWcShifts);
            // Set scheduler settings
            setSchedulerSettings(settings);
            setEditingSettings(settings);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    async function saveSchedulerSettings() {
        try {
            setIsSavingSettings(true);
            const updated = await updateSchedulerSettings(editingSettings);
            setSchedulerSettings(updated);
            setShowSettingsModal(false);
        } catch (err) {
            console.error("Failed to save settings:", err);
            alert("Failed to save settings");
        } finally {
            setIsSavingSettings(false);
        }
    }

    const dateRange = useMemo(() => {
        if (!ganttData?.date_range) return [];
        return generateDateRange(ganttData.date_range.start, ganttData.date_range.end);
    }, [ganttData]);

    // Get visible dates (N days at a time)
    const visibleDateRange = useMemo(() => {
        return dateRange.slice(currentStartIndex, currentStartIndex + daysToShow);
    }, [dateRange, currentStartIndex, daysToShow]);

    const totalHeight = (ganttData?.work_centers.length || 0) * ROW_HEIGHT;

    // Create a map of shift_id -> Shift for quick lookup
    const shiftMap = useMemo(() => {
        const map = new Map<number, Shift>();
        shifts.forEach(s => map.set(s.id, s));
        return map;
    }, [shifts]);

    // Create a map of work_center_id -> Map<day_of_week, Shift[]>
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

    // Get unique shifts used across all work centers for legend
    const uniqueUsedShifts = useMemo(() => {
        const usedShiftIds = new Set<number>();
        workCenterShifts.forEach(wcs => usedShiftIds.add(wcs.shift_id));
        return shifts
            .filter(s => usedShiftIds.has(s.id))
            .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    }, [workCenterShifts, shifts]);

    // Group schedules by work center and merge consecutive tasks with same product_id
    const schedulesByWorkCenter = useMemo(() => {
        if (!ganttData) return new Map<number, GanttScheduleItem[]>();
        
        const map = new Map<number, GanttScheduleItem[]>();
        
        // First, group by work center
        ganttData.schedules.forEach((schedule) => {
            const existing = map.get(schedule.work_center_id) || [];
            existing.push(schedule);
            map.set(schedule.work_center_id, existing);
        });
        
        // Then, for each work center, merge consecutive tasks with same product_id
        map.forEach((tasks, wcId) => {
            // Sort by scheduled_start
            tasks.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
            
            const mergedTasks: GanttScheduleItem[] = [];
            
            for (let i = 0; i < tasks.length; i++) {
                const current = tasks[i];
                
                if (mergedTasks.length === 0) {
                    // First task, just add a copy
                    mergedTasks.push({ ...current });
                    continue;
                }
                
                const last = mergedTasks[mergedTasks.length - 1];
                
                // Check if this task should be merged with the last one
                // Conditions: same product_id AND same production_order_id AND consecutive (end time approx start time)
                const lastEnd = new Date(last.scheduled_end).getTime();
                const currentStart = new Date(current.scheduled_start).getTime();
                // Allow a gap of up to 1.5 minutes (90000ms) to account for minute-based scheduling gaps (e.g., 12:52 -> 12:53)
                const isConsecutive = (currentStart - lastEnd) <= 90000; 
                
                if (
                    current.product_id === last.product_id &&
                    current.production_order_id === last.production_order_id &&
                    isConsecutive
                ) {
                    // Merge: extend the last task's end time to current task's end time
                    last.scheduled_end = current.scheduled_end;
                    
                    // User requested NOT to sum up quantities
                    // last.quantity_planned += current.quantity_planned;
                    // last.quantity_completed += current.quantity_completed;
                } else {
                    // Not consecutive or different product, add as new task
                    mergedTasks.push({ ...current });
                }
            }
            
            map.set(wcId, mergedTasks);
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
        setCurrentStartIndex((prev) => Math.max(0, prev - daysToShow));
    };

    const goToNextWeek = () => {
        setCurrentStartIndex((prev) =>
            Math.min(dateRange.length - daysToShow, prev + daysToShow)
        );
    };

    const handleDaysChange = (days: number) => {
        setDaysToShow(days);
        setShowDaysDropdown(false);
        // Adjust currentStartIndex if needed
        setCurrentStartIndex((prev) => Math.min(prev, Math.max(0, dateRange.length - days)));
    };

    const canGoPrevious = currentStartIndex > 0;
    const canGoNext = currentStartIndex < dateRange.length - daysToShow;

    // Get shifts for a work center on a specific date
    const getWorkCenterShiftsForDate = (workCenterId: number, date: Date): Shift[] => {
        const dayOfWeek = getDayOfWeek(date);
        const dayMap = workCenterShiftMap.get(workCenterId);
        if (!dayMap) return [];
        return dayMap.get(dayOfWeek) || [];
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading Gantt Chart...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center bg-red-50 p-8 rounded-xl border border-red-200">
                    <p className="text-red-600 text-xl mb-4">Error: {error}</p>
                    <button
                        onClick={loadData}
                        className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!ganttData || ganttData.schedules.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-500 text-xl">No schedule data available</p>
                    <p className="text-gray-400 mt-2">Add some work center schedules to view the Gantt chart</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-800">Production Gantt Chart</h1>
                            <p className="text-gray-500 text-sm">
                                {ganttData.schedules.length} tasks across {ganttData.work_centers.length} work centers
                            </p>
                            <p className="text-gray-500 text-sm">
                                {dateRange.length > 0 && (
                                    <>
                                        Total: {dateRange[0].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                                        {" - "}
                                        {dateRange[dateRange.length - 1].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Shift Legend */}
                        {uniqueUsedShifts.length > 0 && (
                            <div className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-gray-100 rounded-lg">
                                <span className="text-xs text-gray-500 font-medium">Shifts:</span>
                                {uniqueUsedShifts.map((shift) => (
                                    <div key={shift.id} className="flex items-center gap-1">
                                        <div
                                            className="w-3 h-3 rounded border border-gray-300"
                                            style={{ backgroundColor: getShiftColor(shift.id).replace('0.2', '0.6') }}
                                        />
                                        <span className="text-xs text-gray-600" title={`${shift.shift_name} (${shift.start_time} - ${shift.end_time})`}>
                                            {shift.shift_code}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Days Selector Dropdown */}
                        <div className="relative z-[100]">
                            <button
                                onClick={() => setShowDaysDropdown(!showDaysDropdown)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {daysToShow} Days
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>

                            {showDaysDropdown && (
                                <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                                    {DAYS_OPTIONS.map((days) => (
                                        <button
                                            key={days}
                                            onClick={() => handleDaysChange(days)}
                                            className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${daysToShow === days ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                                }`}
                                        >
                                            <span>{days} Days</span>
                                            {daysToShow === days && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Scheduler Settings Info */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            <span className="text-sm text-purple-700 font-medium">{schedulerSettings.max_workers}</span>
                            <span className="text-purple-300">|</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-purple-700 font-medium">{schedulerSettings.time_limit_seconds}s</span>
                        </div>

                        {/* Settings Button */}
                        <button
                            onClick={() => {
                                setEditingSettings(schedulerSettings);
                                setShowSettingsModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors shadow-sm"
                            title="Scheduler Settings"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            Settings
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Date Range Slider */}
                <div className="mt-4 bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600 text-sm font-medium">
                            {visibleDateRange.length > 0 && (
                                <>
                                    {visibleDateRange[0].toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                    {" - "}
                                    {visibleDateRange[visibleDateRange.length - 1].toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                </>
                            )}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, dateRange.length - daysToShow)}
                        value={currentStartIndex}
                        onChange={(e) => setCurrentStartIndex(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            </div>

            {/* Gantt Chart Container */}
            <div ref={chartContainerRef} className="flex-1 flex overflow-hidden">
                {/* Sidebar - Work Centers (Fixed Header + Scrollable Body synced with chart) */}
                <div
                    className="shrink-0 bg-white border-r border-gray-200 flex flex-col"
                    style={{ width: SIDEBAR_WIDTH }}
                >
                    {/* Sidebar Header - Fixed */}
                    <div
                        className="shrink-0 bg-gray-50 border-b border-gray-200 flex items-center justify-center font-semibold text-gray-600 text-sm uppercase tracking-wide"
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
                                    className={`flex items-center px-4 border-b border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                        }`}
                                    style={{ height: ROW_HEIGHT }}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800 text-sm">{wc.code}</div>
                                        <div className="text-gray-500 text-xs truncate" style={{ maxWidth: SIDEBAR_WIDTH - 70 }}>
                                            {wc.name}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-500" title="Workers Required">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                        </svg>
                                        <span className="text-xs font-medium">{wc.number_of_workers_required}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Chart Area */}
                <div
                    ref={chartScrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden bg-white"
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
                            className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 flex"
                            style={{ height: HEADER_HEIGHT }}
                        >
                            {visibleDateRange.map((date, index) => {
                                const isToday = date.toDateString() === new Date().toDateString();
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const isHoliday = ganttData.holidays.includes(date.toISOString().split("T")[0]);

                                return (
                                    <div
                                        key={index}
                                        className={`flex-1 flex flex-col items-center justify-center border-r border-gray-200 ${isHoliday
                                            ? "bg-red-100"
                                            : isToday
                                                ? "bg-blue-50"
                                                : ""
                                            }`}
                                    >
                                        <div className={`text-xs ${isHoliday ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                            {date.toLocaleDateString("en-US", { weekday: "short" })}
                                        </div>
                                        <div
                                            className={`text-lg font-bold ${isHoliday ? "text-red-600" : isToday ? "text-blue-600" : "text-gray-800"
                                                }`}
                                        >
                                            {date.getDate()}
                                        </div>
                                        <div className={`text-xs ${isHoliday ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                            {date.toLocaleDateString("en-US", { month: "short" })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Task Rows */}
                        <div className="relative">
                            {/* Work Center Rows with Tasks */}
                            {ganttData.work_centers.map((wc, wcIndex) => {
                                const tasks = schedulesByWorkCenter.get(wc.id) || [];

                                return (
                                    <div
                                        key={wc.id}
                                        className={`relative border-b border-gray-100 ${wcIndex % 2 === 0 ? "" : "bg-gray-50/30"
                                            }`}
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        {/* Shift backgrounds for this work center */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {visibleDateRange.map((date, dateIndex) => {
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                const isHoliday = ganttData.holidays.includes(date.toISOString().split("T")[0]);
                                                const shiftsForDay = getWorkCenterShiftsForDate(wc.id, date);

                                                return (
                                                    <div
                                                        key={dateIndex}
                                                        className={`flex-1 h-full border-r border-gray-100 relative ${isHoliday
                                                            ? "bg-red-200/60"
                                                            : isToday
                                                                ? "bg-blue-50/30"
                                                                : ""
                                                            }`}
                                                    >
                                                        {/* Shift background stripes for each configured shift (only show if NOT a holiday) */}
                                                        {!isHoliday && shiftsForDay.map((shift) => {
                                                            const pos = calculateShiftPosition(shift);
                                                            return (
                                                                <div
                                                                    key={shift.id}
                                                                    className="absolute top-0 bottom-0"
                                                                    style={{
                                                                        left: pos.left,
                                                                        width: pos.width,
                                                                        backgroundColor: getShiftColor(shift.id),
                                                                        height: '100%',
                                                                    }}
                                                                    title={`${shift.shift_name} (${shift.start_time} - ${shift.end_time})`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Task bars */}
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
                                                    className="absolute top-2 bottom-2 rounded-md cursor-pointer transform hover:scale-105 hover:z-30 transition-all duration-200 shadow-sm hover:shadow-md"
                                                    style={{
                                                        left,
                                                        width,
                                                        backgroundColor: color.bg,
                                                        borderLeft: `4px solid ${color.border}`,
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
                                                            <span className="opacity-80 ml-1">• {task.product_code}</span>
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
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xl min-w-[280px]">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: getProductColor(hoveredTask.production_order_id).border }}
                            />
                            <div>
                                <div className="font-bold text-gray-800">{hoveredTask.po_number}</div>
                                <div className="text-gray-500 text-sm">{hoveredTask.product_name}</div>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Product:</span>
                                <span className="text-gray-800 font-medium">{hoveredTask.product_code}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Operation:</span>
                                <span className="text-gray-800">{hoveredTask.operation_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Work Center:</span>
                                <span className="text-gray-800">{hoveredTask.work_center_code}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Start:</span>
                                <span className="text-gray-800">{formatDateTime(hoveredTask.scheduled_start)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">End:</span>
                                <span className="text-gray-800">{formatDateTime(hoveredTask.scheduled_end)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Quantity:</span>
                                <span className="text-gray-800">{hoveredTask.quantity_planned.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Workers Required:</span>
                                <span className="text-gray-800">{hoveredTask.number_of_workers_required}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status:</span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${hoveredTask.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : hoveredTask.status === "in-progress"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : hoveredTask.status === "cancelled"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-blue-100 text-blue-700"
                                        }`}
                                >
                                    {hoveredTask.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 flex items-start justify-end z-50 p-4 pointer-events-none">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden pointer-events-auto border border-gray-200 mt-16 mr-2">
                        {/* Modal Header */}
                        <div className="bg-purple-500 px-5 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                    </svg>
                                    <h2 className="text-lg font-semibold text-white">Scheduler Settings</h2>
                                </div>
                                <button
                                    onClick={() => setShowSettingsModal(false)}
                                    className="text-white hover:text-purple-200 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            {/* Max Workers */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                    </svg>
                                    Max Workers (Factory)
                                </label>
                                <input
                                    type="number"
                                    value={editingSettings.max_workers}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, max_workers: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    min={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Maximum workers available for scheduling</p>
                            </div>

                            {/* Time Limit */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Time Limit (Seconds)
                                </label>
                                <input
                                    type="number"
                                    value={editingSettings.time_limit_seconds}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, time_limit_seconds: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    min={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Maximum time for scheduler optimization</p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-5 py-3 flex justify-end gap-2">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                disabled={isSavingSettings}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveSchedulerSettings}
                                disabled={isSavingSettings}
                                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm"
                            >
                                {isSavingSettings ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Save
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
