// =====================================================
// ROUTING TYPES
// =====================================================

export interface Routing {
    id: number;
    product_id: number;
    operation_id: number;
    work_center_id: number;
    sequence_number: number;
    setup_time_minutes: number;
    time_per_unit_minutes: number;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
