// =====================================================
// WORK CENTER TYPES
// =====================================================

export interface WorkCenter {
    id: number;
    work_center_code: string;
    work_center_name: string;
    description?: string;
    operation_id: number;  // Operation this work center performs
    capacity_per_hour: number;
    number_of_workers_required: number;
    default_shift_id?: number;
    cost_per_hour?: number;
    status: string; // active, inactive, maintenance, retired
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkCenterShift {
    id: number;
    work_center_id: number;
    shift_id: number;
    day_of_week: number; // 1=Monday, 7=Sunday
    effective_from: string;
    effective_to?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkCenterCalendarException {
    id: number;
    work_center_id: number;
    exception_date: string;
    exception_type: string; // closed, maintenance
    description?: string;
    created_at: string;
    updated_at: string;
}
