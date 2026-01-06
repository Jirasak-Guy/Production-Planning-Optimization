// =====================================================
// ROUTING TYPES
// =====================================================

export interface Routing {
    id: number;
    product_id: number;
    operation_id: number;
    sequence_number: number;
    setup_time_minutes: number;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RoutingBOM {
    id: number;
    routing_id: number;
    bom_id: number;
    consumption_timing: string; // at_start, at_end, proportional
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
