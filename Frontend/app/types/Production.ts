// =====================================================
// PRODUCTION TRACKING TYPES
// =====================================================

export interface ProductionOrder {
    id: number;
    po_number: string;
    order_item_id?: number;
    product_id: number;
    quantity_planned: number;
    quantity_completed: number;
    quantity_scrapped: number;
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    schedule_status?: string; // Unschedule, SubOptimal, Optimal, Infeasible
    status: string; // planned, released, in-progress, completed, cancelled, on-hold
    priority: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkCenterSchedule {
    id: number;
    work_center_id: number;
    production_order_id: number;
    product_id: number;
    operation_id: number;
    shift_id?: number;
    scheduled_start: string;
    scheduled_end: string;
    actual_start?: string;
    actual_end?: string;
    status: string; // scheduled, in-progress, completed, cancelled
    quantity_planned: number;
    quantity_completed: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// Gantt Chart Types
export interface GanttScheduleItem {
    id: number;
    work_center_id: number;
    work_center_code: string;
    work_center_name: string;
    production_order_id: number;
    po_number: string;
    product_id: number;
    product_code: string;
    product_name: string;
    operation_id: number;
    operation_code: string;
    operation_name: string;
    scheduled_start: string;
    scheduled_end: string;
    actual_start?: string;
    actual_end?: string;
    status: string;
    quantity_planned: number;
    quantity_completed: number;
    number_of_workers_required: number;
}

export interface GanttData {
    schedules: GanttScheduleItem[];
    work_centers: {
        id: number;
        code: string;
        name: string;
        number_of_workers_required: number;
    }[];
    date_range: {
        start: string;
        end: string;
    };
    holidays: string[];
}
