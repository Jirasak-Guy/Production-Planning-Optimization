"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchGanttData, fetchShifts, fetchWorkCenterShifts, pivotTask } from "@/app/lib/data";
import { GanttData, GanttScheduleItem } from "@/app/types/Production";
import { Shift } from "@/app/types/Shift";
import { WorkCenterShift } from "@/app/types/WorkCenter";

// Modern color palette - 25 distinct professional colors
const PRODUCT_COLORS = [
    { bg: "#6366f1", border: "#4f46e5", text: "#ffffff" },   // Indigo
    { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },   // Red
    { bg: "#10b981", border: "#059669", text: "#ffffff" },   // Emerald
    { bg: "#f59e0b", border: "#d97706", text: "#1f2937" },   // Amber
    { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" },   // Violet
    { bg: "#06b6d4", border: "#0891b2", text: "#ffffff" },   // Cyan
    { bg: "#ec4899", border: "#db2777", text: "#ffffff" },   // Pink
    { bg: "#f97316", border: "#ea580c", text: "#ffffff" },   // Orange
    { bg: "#14b8a6", border: "#0d9488", text: "#ffffff" },   // Teal
    { bg: "#84cc16", border: "#65a30d", text: "#1f2937" },   // Lime
    { bg: "#e11d48", border: "#be123c", text: "#ffffff" },   // Rose
    { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },   // Blue
    { bg: "#a855f7", border: "#9333ea", text: "#ffffff" },   // Purple
    { bg: "#22c55e", border: "#16a34a", text: "#ffffff" },   // Green
    { bg: "#eab308", border: "#ca8a04", text: "#1f2937" },   // Yellow
    { bg: "#0ea5e9", border: "#0284c7", text: "#ffffff" },   // Sky
    { bg: "#d946ef", border: "#c026d3", text: "#ffffff" },   // Fuchsia
    { bg: "#fb923c", border: "#f97316", text: "#1f2937" },   // Light Orange
    { bg: "#2dd4bf", border: "#14b8a6", text: "#1f2937" },   // Light Teal
    { bg: "#a3e635", border: "#84cc16", text: "#1f2937" },   // Light Lime
    { bg: "#818cf8", border: "#6366f1", text: "#ffffff" },   // Light Indigo
    { bg: "#f472b6", border: "#ec4899", text: "#ffffff" },   // Light Pink
    { bg: "#38bdf8", border: "#0ea5e9", text: "#ffffff" },   // Light Sky
    { bg: "#c084fc", border: "#a855f7", text: "#ffffff" },   // Light Purple
    { bg: "#4ade80", border: "#22c55e", text: "#1f2937" },   // Light Green
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
    const [selectedPOs, setSelectedPOs] = useState<Set<number>>(new Set());
    const [showPOFilter, setShowPOFilter] = useState(false);
    const [colorMode, setColorMode] = useState<'po' | 'product'>('po');
    const [contextMenu, setContextMenu] = useState<{ task: GanttScheduleItem; x: number; y: number } | null>(null);
    const [pivotLoading, setPivotLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const sidebarScrollRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartScrollRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const isScrollingSidebar = useRef(false);
    const isScrollingChart = useRef(false);

    const ROW_HEIGHT = 40;
    const HEADER_HEIGHT = 60;
    const SIDEBAR_WIDTH = 240;

    useEffect(() => {
        loadData();
    }, []);

    // Close PO filter dropdown when clicking outside
    const poFilterRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (poFilterRef.current && !poFilterRef.current.contains(event.target as Node)) {
                setShowPOFilter(false);
            }
        };
        if (showPOFilter) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPOFilter]);

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

    // Get unique POs from schedules with date range
    const uniquePOs = useMemo(() => {
        if (!ganttData) return [];
        const poMap = new Map<number, {
            id: number;
            po_number: string;
            start_date: string;
            end_date: string;
        }>();
        ganttData.schedules.forEach((schedule) => {
            if (!poMap.has(schedule.production_order_id)) {
                poMap.set(schedule.production_order_id, {
                    id: schedule.production_order_id,
                    po_number: schedule.po_number,
                    start_date: schedule.scheduled_start,
                    end_date: schedule.scheduled_end,
                });
            } else {
                const existing = poMap.get(schedule.production_order_id)!;
                // Update start_date if this schedule starts earlier
                if (new Date(schedule.scheduled_start) < new Date(existing.start_date)) {
                    existing.start_date = schedule.scheduled_start;
                }
                // Update end_date if this schedule ends later
                if (new Date(schedule.scheduled_end) > new Date(existing.end_date)) {
                    existing.end_date = schedule.scheduled_end;
                }
            }
        });
        return Array.from(poMap.values()).sort((a, b) => a.po_number.localeCompare(b.po_number));
    }, [ganttData]);

    // Filter schedules based on selected POs
    const filteredSchedules = useMemo(() => {
        if (!ganttData) return [];
        if (selectedPOs.size === 0) return ganttData.schedules; // Show all if none selected
        return ganttData.schedules.filter((s) => selectedPOs.has(s.production_order_id));
    }, [ganttData, selectedPOs]);

    // Toggle PO selection
    const togglePO = (poId: number) => {
        setSelectedPOs((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(poId)) {
                newSet.delete(poId);
            } else {
                newSet.add(poId);
            }
            return newSet;
        });
    };

    // Select/Deselect all POs
    const selectAllPOs = () => {
        setSelectedPOs(new Set(uniquePOs.map((po) => po.id)));
    };
    const clearAllPOs = () => {
        setSelectedPOs(new Set());
    };
    // Interface for Operation Group
    interface OperationGroup {
        operation_id: number;
        operation_code: string;
        operation_name: string;
        work_centers: {
            id: number;
            code: string;
            name: string;
            number_of_workers_required: number;
        }[];
    }

    // Group schedules by Operation first, then by Work Center
    const operationGroups = useMemo<OperationGroup[]>(() => {
        if (!ganttData) return [];

        const operationMap = new Map<number, {
            operation_id: number;
            operation_code: string;
            operation_name: string;
            work_center_ids: Set<number>;
        }>();

        // Group work centers by operation
        filteredSchedules.forEach((schedule) => {
            if (!operationMap.has(schedule.operation_id)) {
                operationMap.set(schedule.operation_id, {
                    operation_id: schedule.operation_id,
                    operation_code: schedule.operation_code,
                    operation_name: schedule.operation_name,
                    work_center_ids: new Set(),
                });
            }
            operationMap.get(schedule.operation_id)!.work_center_ids.add(schedule.work_center_id);
        });

        // Convert to array and add work center details
        const groups: OperationGroup[] = [];
        Array.from(operationMap.values())
            .sort((a, b) => a.operation_id - b.operation_id)
            .forEach((op) => {
                const workCenters = ganttData.work_centers
                    .filter((wc) => op.work_center_ids.has(wc.id))
                    .sort((a, b) => a.code.localeCompare(b.code));

                groups.push({
                    operation_id: op.operation_id,
                    operation_code: op.operation_code,
                    operation_name: op.operation_name,
                    work_centers: workCenters,
                });
            });

        return groups;
    }, [ganttData, filteredSchedules]);

    // Create a flat list of rows for rendering (operation headers + work centers)
    interface RowItem {
        type: 'operation' | 'work_center';
        operation_id: number;
        operation_code: string;
        operation_name: string;
        work_center?: {
            id: number;
            code: string;
            name: string;
            number_of_workers_required: number;
        };
    }

    const flatRows = useMemo<RowItem[]>(() => {
        const rows: RowItem[] = [];
        operationGroups.forEach((group) => {
            // Add operation header row
            rows.push({
                type: 'operation',
                operation_id: group.operation_id,
                operation_code: group.operation_code,
                operation_name: group.operation_name,
            });
            // Add work center rows under this operation
            group.work_centers.forEach((wc) => {
                rows.push({
                    type: 'work_center',
                    operation_id: group.operation_id,
                    operation_code: group.operation_code,
                    operation_name: group.operation_name,
                    work_center: wc,
                });
            });
        });
        return rows;
    }, [operationGroups]);

    const totalHeight = flatRows.length * ROW_HEIGHT;

    // Build a color map for products: each unique product_id gets a unique color index
    const productColorMap = useMemo(() => {
        const map = new Map<number, number>();
        const uniqueProductIds = Array.from(
            new Set(filteredSchedules.map((s) => s.product_id))
        );
        uniqueProductIds.forEach((pid, index) => {
            map.set(pid, index);
        });
        return map;
    }, [filteredSchedules]);

    function getProductColorByMap(productId: number): typeof PRODUCT_COLORS[0] {
        const index = productColorMap.get(productId) ?? 0;
        return PRODUCT_COLORS[index % PRODUCT_COLORS.length];
    }

    // Build a color map for POs: each unique production_order_id gets a unique color index
    const poColorMap = useMemo(() => {
        const map = new Map<number, number>();
        const uniquePOIds = Array.from(
            new Set(filteredSchedules.map((s) => s.production_order_id))
        );
        uniquePOIds.forEach((poId, index) => {
            map.set(poId, index);
        });
        return map;
    }, [filteredSchedules]);

    function getPOColorByMap(poId: number): typeof PRODUCT_COLORS[0] {
        const index = poColorMap.get(poId) ?? 0;
        return PRODUCT_COLORS[index % PRODUCT_COLORS.length];
    }

    function getTaskColor(task: GanttScheduleItem): typeof PRODUCT_COLORS[0] {
        if (colorMode === 'product') {
            return getProductColorByMap(task.product_id);
        }
        return getPOColorByMap(task.production_order_id);
    }

    // Unique products from filtered schedules for the legend
    const uniqueProducts = useMemo(() => {
        const map = new Map<number, { id: number; code: string; name: string }>();
        filteredSchedules.forEach((s) => {
            if (!map.has(s.product_id)) {
                map.set(s.product_id, {
                    id: s.product_id,
                    code: s.product_code,
                    name: s.product_name,
                });
            }
        });
        return Array.from(map.values());
    }, [filteredSchedules]);

    const schedulesByOperationAndWorkCenter = useMemo(() => {
        if (!ganttData) return new Map<string, GanttScheduleItem[]>();

        const map = new Map<string, GanttScheduleItem[]>();
        filteredSchedules.forEach((schedule) => {
            const key = `${schedule.operation_id}_${schedule.work_center_id}`;
            const existing = map.get(key) || [];
            existing.push(schedule);
            map.set(key, existing);
        });

        map.forEach((tasks, key) => {
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
                    current.status === last.status &&
                    isConsecutive
                ) {
                    last.scheduled_end = current.scheduled_end;
                } else {
                    mergedTasks.push({ ...current });
                }
            }
            map.set(key, mergedTasks);
        });

        return map;
    }, [ganttData, filteredSchedules]);

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

    // Right-click context menu for pivot
    const handleTaskRightClick = (e: React.MouseEvent, task: GanttScheduleItem) => {
        e.preventDefault();
        e.stopPropagation();
        setHoveredTask(null); // Hide tooltip

        const MENU_WIDTH = 320;
        const MENU_HEIGHT = 200;
        let x = e.clientX;
        let y = e.clientY;
        if (x + MENU_WIDTH > window.innerWidth) x = e.clientX - MENU_WIDTH;
        if (y + MENU_HEIGHT > window.innerHeight) y = e.clientY - MENU_HEIGHT;

        setContextMenu({ task, x, y });
    };

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [contextMenu]);

    // Execute pivot
    const handlePivot = async (task: GanttScheduleItem) => {
        setPivotLoading(true);
        try {
            const result = await pivotTask(task.id);
            setContextMenu(null);
            // Reload data
            await loadData();
        } catch (err) {
            setToastMessage({
                text: `❌ เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error'
            });
        } finally {
            setPivotLoading(false);
        }
    };

    // Auto-hide toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

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
                                {filteredSchedules.length} tasks • {filteredSchedules.filter(s => s.status === "completed").length} completed • {ganttData.work_centers.length} work centers
                            </p>
                        </div>

                        {/* PO Filter */}
                        <div ref={poFilterRef} className="relative">
                            <button
                                onClick={() => setShowPOFilter(!showPOFilter)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${selectedPOs.size > 0
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                PO Filter
                                {selectedPOs.size > 0 && (
                                    <span className="px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded-full">
                                        {selectedPOs.size}
                                    </span>
                                )}
                                <svg className={`w-4 h-4 transition-transform ${showPOFilter ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* PO Filter Dropdown */}
                            {showPOFilter && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                                    {/* Header */}
                                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                        <span className="text-xs font-semibold text-slate-500 uppercase">Production Orders</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={selectAllPOs}
                                                className="px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                                            >
                                                All
                                            </button>
                                            <button
                                                onClick={clearAllPOs}
                                                className="px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 rounded"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    {/* PO List */}
                                    <div className="max-h-60 overflow-y-auto">
                                        {uniquePOs.map((po) => {
                                            const startDate = new Date(po.start_date);
                                            const endDate = new Date(po.end_date);
                                            const formatDate = (d: Date) => d.toLocaleDateString("th-TH", {
                                                day: "2-digit",
                                                month: "short",
                                                timeZone: "UTC",
                                            });
                                            return (
                                                <label
                                                    key={po.id}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPOs.has(po.id)}
                                                        onChange={() => togglePO(po.id)}
                                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-slate-700">{po.po_number}</div>
                                                        <div className="text-xs text-slate-400">
                                                            {formatDate(startDate)} – {formatDate(endDate)}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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
                                onClick={handleZoomIn}
                                disabled={daysToShow <= 1}
                                className="p-2 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Decrease Days"
                            >
                                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="px-2 text-xs font-medium text-slate-600 min-w-[50px] text-center border-x border-slate-200">
                                {daysToShow}d
                            </span>
                            <button
                                onClick={handleZoomOut}
                                disabled={daysToShow >= 30}
                                className="p-2 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Increase Days"
                            >
                                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Right: Actions & Legend */}
                    <div className="flex items-center gap-3">
                        {/* Color Mode Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setColorMode('po')}
                                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                                    colorMode === 'po'
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                PO
                            </button>
                            <button
                                onClick={() => setColorMode('product')}
                                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                                    colorMode === 'product'
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Product
                            </button>
                        </div>

                        {/* Color Legend */}
                        {colorMode === 'product' && uniqueProducts.length > 0 && (
                            <div className="relative group/product-legend">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden cursor-default max-w-[150px] sm:max-w-[200px]">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div
                                            className="w-3 h-3 rounded shrink-0"
                                            style={{ backgroundColor: getProductColorByMap(uniqueProducts[0].id).bg }}
                                        />
                                        <span className="text-xs text-slate-600 font-medium truncate max-w-[50px]">
                                            {uniqueProducts[0].code}
                                        </span>
                                    </div>
                                    {uniqueProducts.length > 1 && (
                                        <span className="text-[10px] text-slate-500 font-medium shrink-0">
                                            +{uniqueProducts.length - 1}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute top-0 right-0 z-50 flex flex-wrap items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-xl max-w-[400px] min-w-[200px] opacity-0 invisible group-hover/product-legend:opacity-100 group-hover/product-legend:visible transition-all duration-200 origin-top-right">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Products</span>
                                    {uniqueProducts.map((product) => {
                                        const color = getProductColorByMap(product.id);
                                        return (
                                            <div key={product.id} className="flex items-center gap-1.5 shrink-0" title={product.name}>
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: color.bg }}
                                                />
                                                <span className="text-xs text-slate-600 font-medium">{product.code}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {colorMode === 'po' && uniquePOs.length > 0 && (
                            <div className="relative group/po-legend">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden cursor-default max-w-[150px] sm:max-w-[200px]">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div
                                            className="w-3 h-3 rounded shrink-0"
                                            style={{ backgroundColor: getPOColorByMap(uniquePOs[0].id).bg }}
                                        />
                                        <span className="text-xs text-slate-600 font-medium truncate max-w-[50px]">
                                            {uniquePOs[0].po_number}
                                        </span>
                                    </div>
                                    {uniquePOs.length > 1 && (
                                        <span className="text-[10px] text-slate-500 font-medium shrink-0">
                                            +{uniquePOs.length - 1}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute top-0 right-0 z-50 flex flex-wrap items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-xl max-w-[400px] min-w-[200px] opacity-0 invisible group-hover/po-legend:opacity-100 group-hover/po-legend:visible transition-all duration-200 origin-top-right">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">POs</span>
                                    {uniquePOs.map((po) => {
                                        const color = getPOColorByMap(po.id);
                                        return (
                                            <div key={po.id} className="flex items-center gap-1.5 shrink-0" title={po.po_number}>
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: color.bg }}
                                                />
                                                <span className="text-xs text-slate-600 font-medium">{po.po_number}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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
                        Operations / WC
                    </div>

                    {/* Operation & Work Center List */}
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
                            {flatRows.map((row, index) => {
                                if (row.type === 'operation') {
                                    // Operation Header Row
                                    return (
                                        <div
                                            key={`op-${row.operation_id}`}
                                            className="flex items-center px-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50"
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-indigo-700 text-sm truncate">
                                                    {row.operation_code}
                                                </div>
                                                <div className="text-indigo-500 text-xs truncate">{row.operation_name}</div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Work Center Row (indented)
                                    const wc = row.work_center!;
                                    return (
                                        <div
                                            key={`wc-${row.operation_id}-${wc.id}`}
                                            className={`flex items-center pl-6 pr-3 border-b border-slate-100 transition-colors hover:bg-indigo-50/50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-slate-800 text-sm truncate">
                                                    {wc.code}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-400 ml-2">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                </svg>
                                                <span className="text-xs font-medium">{wc.number_of_workers_required}</span>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
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
                                        className={`flex-1 flex flex-col items-center justify-center border-r border-slate-100 transition-colors min-w-0
                                            ${isHoliday ? "bg-red-50" : isToday ? "bg-indigo-50" : isWeekend ? "bg-slate-50" : "bg-white"}`}
                                    >
                                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isHoliday ? "text-red-500" : isToday ? "text-indigo-600" : "text-slate-500"}`}>
                                            {daysToShow > 14 ? date.toLocaleDateString("en-US", { weekday: "narrow" }) : date.toLocaleDateString("en-US", { weekday: "short" })}
                                        </span>
                                        <span className={`text-sm font-bold ${isHoliday ? "text-red-600" : isToday ? "text-indigo-700" : "text-slate-800"}`}>
                                            {date.getDate()}
                                        </span>
                                        <span className={`text-[10px] font-medium ${isHoliday ? "text-red-400" : isToday ? "text-indigo-500" : "text-slate-400"}`}>
                                            {daysToShow > 14 ? date.toLocaleDateString("en-US", { month: "numeric" }) : date.toLocaleDateString("en-US", { month: "short" })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Task Rows */}
                        <div className="relative">
                            {flatRows.map((row, rowIndex) => {
                                if (row.type === 'operation') {
                                    // Operation Header Row - no tasks, just a background
                                    return (
                                        <div
                                            key={`op-chart-${row.operation_id}`}
                                            className="relative border-b border-slate-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/50"
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            {/* Grid for dates */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {visibleDateRange.map((date, dateIndex) => {
                                                    const isToday = date.toDateString() === new Date().toDateString();
                                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                    const isHoliday = ganttData.holidays.includes(date.toISOString().split("T")[0]);

                                                    return (
                                                        <div
                                                            key={dateIndex}
                                                            className={`flex-1 h-full border-r border-slate-100 relative
                                                                ${isHoliday ? "bg-red-100/40" : isToday ? "bg-indigo-50/30" : isWeekend ? "bg-slate-100/30" : ""}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Work Center Row - show tasks
                                    const wc = row.work_center!;
                                    const tasks = schedulesByOperationAndWorkCenter.get(`${row.operation_id}_${wc.id}`) || [];

                                    return (
                                        <div
                                            key={`wc-chart-${row.operation_id}-${wc.id}`}
                                            className={`relative border-b border-slate-100 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
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

                                                const color = getTaskColor(task);
                                                const isCompleted = task.status === "completed";

                                                return (
                                                    <div
                                                        key={task.id}
                                                        className="absolute top-1 bottom-1 cursor-pointer overflow-hidden"
                                                        style={{
                                                            left,
                                                            width,
                                                            backgroundColor: isCompleted ? `${color.bg}99` : color.bg,
                                                            opacity: isCompleted ? 0.65 : 1,
                                                        }}
                                                        onMouseMove={(e) => handleMouseMove(e, task)}
                                                        onMouseLeave={handleMouseLeave}
                                                        onContextMenu={(e) => handleTaskRightClick(e, task)}
                                                    >
                                                        {/* Completed stripe overlay */}
                                                        {isCompleted && (
                                                            <div
                                                                className="absolute inset-0"
                                                                style={{
                                                                    backgroundImage: `repeating-linear-gradient(
                                                                        -45deg,
                                                                        transparent,
                                                                        transparent 3px,
                                                                        rgba(255,255,255,0.35) 3px,
                                                                        rgba(255,255,255,0.35) 6px
                                                                    )`,
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Context Menu (Right-click) */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[60] animate-in fade-in zoom-in-95 duration-150"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <div className="bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[300px] overflow-hidden">
                        {/* Menu Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-bold text-slate-800 text-sm">Marking Completed</span>
                            </div>
                        </div>

                        {/* Task Info */}
                        <div className="px-4 py-3 space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Task</span>
                                <span className="text-xs font-semibold text-slate-700">
                                    {contextMenu.task.po_number} • {contextMenu.task.operation_name}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Work Center</span>
                                <span className="text-xs text-slate-700">{contextMenu.task.work_center_code}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Pivot Time</span>
                                <span className="text-xs font-medium text-amber-700">{formatDateTime(contextMenu.task.scheduled_start)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                            <button
                                onClick={() => handlePivot(contextMenu.task)}
                                disabled={pivotLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                            >
                                {pivotLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Marking...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Mark Completed
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setContextMenu(null)}
                                className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-sm font-medium rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-sm`}>
                    <div className={`px-4 py-3 rounded-xl shadow-lg border ${toastMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{toastMessage.text}</span>
                            <button
                                onClick={() => setToastMessage(null)}
                                className="ml-auto text-current opacity-50 hover:opacity-100"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tooltip */}
            {
                hoveredTask && (
                    <div
                        className="fixed z-50 pointer-events-none animate-in fade-in duration-150"
                        style={{ left: tooltipPos.x, top: tooltipPos.y }}
                    >
                        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-4 shadow-2xl min-w-[300px]">
                            {/* Header */}
                            <div className="flex items-start gap-3 mb-4 pb-3 border-b border-slate-100">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md"
                                    style={{ backgroundColor: getTaskColor(hoveredTask).bg }}
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
                )
            }
        </div >
    );
}
