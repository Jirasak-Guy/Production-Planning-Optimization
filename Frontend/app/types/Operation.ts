// =====================================================
// OPERATION TYPES
// =====================================================

export interface Operation {
    id: number;
    operation_code: string;
    operation_name: string;
    description?: string;
    operation_type?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface OperationDependency {
    id: number;
    routing_id: number;
    predecessor_routing_id: number;
    dependency_type: string; // FS, SS, FF, SF
    lag_time_minutes: number;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
