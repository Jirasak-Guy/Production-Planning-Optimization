// =====================================================
// CORE DATA TYPES
// =====================================================

export interface Order {
    id: number;
    order_number: string;
    order_date: string;
    due_date: string;
    customer_name: string;
    priority: number;
    status: string; // pending, confirmed, in-production, completed, cancelled
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ProductData {
    id: number;
    product_code: string;
    product_name: string;
    description?: string;
    type: string; // finished-product, semi-product, raw-material
    unit: string;
    standard_cost?: number;
    lead_time_days?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    unit_price?: number;
    total_price?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface BOM {
    id: number;
    parent_product_id: number;
    component_product_id: number;
    quantity_required: number;
    unit: string;
    scrap_percentage: number;
    effective_from: string;
    effective_to?: string;
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}