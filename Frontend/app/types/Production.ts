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
    actual_start_date?: string;
    actual_end_date?: string;
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
