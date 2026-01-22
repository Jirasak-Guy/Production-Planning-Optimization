-- =====================================================
-- Production Planning Database Schema for PostgreSQL
-- =====================================================
-- Version: 1.1 (Modified)
-- Description: Schema with Inventory and Production Transactions removed
-- =====================================================

-- Enable UUID extension (optional, if you want to use UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- ORDERS Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    due_date DATE NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_orders_status CHECK (status IN ('pending', 'confirmed', 'in-production', 'completed', 'cancelled'))
);

COMMENT ON TABLE orders IS 'Customer orders table';
COMMENT ON COLUMN orders.priority IS 'Priority level 1-10, where 1 is highest priority';
COMMENT ON COLUMN orders.status IS 'Order status: pending, confirmed, in-production, completed, cancelled';

-- PRODUCTS Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    standard_cost DECIMAL(15,2),
    lead_time_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_products_type CHECK (type IN ('finished-product', 'semi-product', 'raw-material'))
);

COMMENT ON TABLE products IS 'Product master data including finished goods, semi-finished products, and raw materials';
COMMENT ON COLUMN products.type IS 'Product type: finished-product, semi-product, raw-material';
COMMENT ON COLUMN products.unit IS 'Unit of measure (e.g., pcs, kg, liters)';

-- ORDER_ITEMS Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,2),
    total_price DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

COMMENT ON TABLE order_items IS 'Line items for each order';

-- BOM (Bill of Materials) Table
CREATE TABLE bom (
    id SERIAL PRIMARY KEY,
    parent_product_id INTEGER NOT NULL,
    component_product_id INTEGER NOT NULL,
    quantity_required DECIMAL(15,4) NOT NULL CHECK (quantity_required > 0),
    unit VARCHAR(20) NOT NULL,
    scrap_percentage DECIMAL(5,2) DEFAULT 0 CHECK (scrap_percentage >= 0 AND scrap_percentage <= 100),
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bom_parent FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_bom_component FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_bom_not_self_reference CHECK (parent_product_id != component_product_id),
    CONSTRAINT chk_bom_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

COMMENT ON TABLE bom IS 'Bill of Materials - defines product structure and components';
COMMENT ON COLUMN bom.quantity_required IS 'Quantity of component required per 1 unit of parent product';
COMMENT ON COLUMN bom.scrap_percentage IS 'Expected scrap/waste percentage for this component';

-- =====================================================
-- WORK CENTER AND SHIFT MANAGEMENT
-- =====================================================

-- SHIFTS Table
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    shift_code VARCHAR(20) UNIQUE NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INTEGER DEFAULT 0 CHECK (break_duration_minutes >= 0),
    effective_working_minutes INTEGER NOT NULL CHECK (effective_working_minutes > 0),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE shifts IS 'Work shift definitions';
COMMENT ON COLUMN shifts.effective_working_minutes IS 'Net working minutes per shift excluding breaks';

-- COMPANY_CALENDAR Table
CREATE TABLE company_calendar (
    id SERIAL PRIMARY KEY,
    calendar_date DATE UNIQUE NOT NULL,
    day_type VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    is_working_day BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_calendar_day_type CHECK (day_type IN ('working-day', 'weekend', 'holiday', 'special-working-day'))
);

COMMENT ON TABLE company_calendar IS 'Company calendar including holidays and special working days';
COMMENT ON COLUMN company_calendar.day_type IS 'Day type: working-day, weekend, holiday, special-working-day';

-- =====================================================
-- OPERATIONS (must be before work_centers due to FK)
-- =====================================================

-- OPERATIONS Table
CREATE TABLE operations (
    id SERIAL PRIMARY KEY,
    operation_code VARCHAR(50) UNIQUE NOT NULL,
    operation_name VARCHAR(200) NOT NULL,
    description TEXT,
    operation_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE operations IS 'Manufacturing operations/processes';

-- WORK_CENTERS Table
CREATE TABLE work_centers (
    id SERIAL PRIMARY KEY,
    work_center_code VARCHAR(50) UNIQUE NOT NULL,
    work_center_name VARCHAR(200) NOT NULL,
    description TEXT,
    operation_id INTEGER NOT NULL,
    capacity_per_hour INTEGER NOT NULL CHECK (capacity_per_hour > 0),
    number_of_workers_required INTEGER DEFAULT 1 CHECK (number_of_workers_required > 0),
    default_shift_id INTEGER,
    cost_per_hour DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_work_centers_operation FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_work_centers_shift FOREIGN KEY (default_shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
    CONSTRAINT chk_work_centers_status CHECK (status IN ('active', 'inactive', 'maintenance', 'retired'))
);

COMMENT ON TABLE work_centers IS 'Work centers / production stations';
COMMENT ON COLUMN work_centers.capacity_per_hour IS 'Production capacity per hour (units)';
COMMENT ON COLUMN work_centers.operation_id IS 'The operation this work center can perform';

-- WORK_CENTER_SHIFTS Table (Junction Table)
CREATE TABLE work_center_shifts (
    id SERIAL PRIMARY KEY,
    work_center_id INTEGER NOT NULL,
    shift_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wc_shifts_work_center FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE CASCADE,
    CONSTRAINT fk_wc_shifts_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    CONSTRAINT chk_wc_shifts_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT uk_wc_shifts UNIQUE (work_center_id, shift_id, day_of_week, effective_from)
);

COMMENT ON TABLE work_center_shifts IS 'Shift assignments for work centers by day of week';
COMMENT ON COLUMN work_center_shifts.day_of_week IS 'Day of week: 1=Monday, 2=Tuesday, ..., 7=Sunday';

-- WORK_CENTER_CALENDAR_EXCEPTIONS Table
CREATE TABLE work_center_calendar_exceptions (
    id SERIAL PRIMARY KEY,
    work_center_id INTEGER NOT NULL,
    exception_date DATE NOT NULL,
    exception_type VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    capacity_percentage DECIMAL(5,2) DEFAULT 0 CHECK (capacity_percentage >= 0 AND capacity_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wc_exceptions_work_center FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE CASCADE,
    CONSTRAINT chk_wc_exceptions_type CHECK (exception_type IN ('closed', 'maintenance', 'reduced-capacity', 'special-shift')),
    CONSTRAINT uk_wc_exceptions UNIQUE (work_center_id, exception_date)
);

COMMENT ON TABLE work_center_calendar_exceptions IS 'Exceptions to normal work center schedule (maintenance, closures, etc.)';
COMMENT ON COLUMN work_center_calendar_exceptions.capacity_percentage IS 'Capacity percentage: 0=closed, 100=full capacity';

-- =====================================================
-- ROUTING
-- =====================================================

-- ROUTING Table
CREATE TABLE routing (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    operation_id INTEGER NOT NULL,
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    setup_time_minutes INTEGER DEFAULT 0 CHECK (setup_time_minutes >= 0),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_routing_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_routing_operation FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
    CONSTRAINT uk_routing UNIQUE (product_id, sequence_number)
);

COMMENT ON TABLE routing IS 'Production routing - sequence of operations for each product';
COMMENT ON COLUMN routing.sequence_number IS 'Order of operations (1, 2, 3, ...)';
COMMENT ON COLUMN routing.setup_time_minutes IS 'One-time setup time before production starts';

-- OPERATION_DEPENDENCIES Table
CREATE TABLE operation_dependencies (
    id SERIAL PRIMARY KEY,
    routing_id INTEGER NOT NULL,
    predecessor_routing_id INTEGER NOT NULL,
    dependency_type VARCHAR(50) NOT NULL,
    lag_time_minutes INTEGER DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_op_dep_routing FOREIGN KEY (routing_id) REFERENCES routing(id) ON DELETE CASCADE,
    CONSTRAINT fk_op_dep_predecessor FOREIGN KEY (predecessor_routing_id) REFERENCES routing(id) ON DELETE CASCADE,
    CONSTRAINT chk_op_dep_not_self CHECK (routing_id != predecessor_routing_id),
    CONSTRAINT chk_op_dep_type CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
    CONSTRAINT uk_op_dep UNIQUE (routing_id, predecessor_routing_id)
);

COMMENT ON TABLE operation_dependencies IS 'Dependencies between operations in routing';
COMMENT ON COLUMN operation_dependencies.dependency_type IS 'Dependency type: FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish)';
COMMENT ON COLUMN operation_dependencies.lag_time_minutes IS 'Lag time (positive) or lead time (negative) in minutes between operations';

-- Create detailed comment explaining dependency types
COMMENT ON COLUMN operation_dependencies.dependency_type IS 
'Operation dependency types:
- FS (Finish-to-Start): Successor cannot start until predecessor finishes [DEFAULT/MOST COMMON]
  Example: Cannot start Assembly until Welding finishes
  
- SS (Start-to-Start): Successor cannot start until predecessor starts
  Example: Quality inspection can start when machining starts (parallel inspection)
  
- FF (Finish-to-Finish): Successor cannot finish until predecessor finishes
  Example: Packaging cannot finish until final quality check finishes
  
- SF (Start-to-Finish): Successor cannot finish until predecessor starts [RARE]
  Example: Just-in-time scenarios where delivery cannot finish until production starts';

-- =====================================================
-- ROUTING BOM (Link between Routing and BOM)
-- =====================================================

-- ROUTING_BOM Table - Links which BOM components are consumed at which routing step
CREATE TABLE routing_bom (
    id SERIAL PRIMARY KEY,
    routing_id INTEGER NOT NULL,
    bom_id INTEGER NOT NULL,
    consumption_timing VARCHAR(20) DEFAULT 'at_start',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_routing_bom_routing FOREIGN KEY (routing_id) REFERENCES routing(id) ON DELETE CASCADE,
    CONSTRAINT fk_routing_bom_bom FOREIGN KEY (bom_id) REFERENCES bom(id) ON DELETE CASCADE,
    CONSTRAINT chk_routing_bom_timing CHECK (consumption_timing IN ('at_start', 'at_end', 'proportional')),
    CONSTRAINT uk_routing_bom UNIQUE (routing_id, bom_id)
);

COMMENT ON TABLE routing_bom IS 'Links BOM components to routing steps - defines when materials are consumed during production';
COMMENT ON COLUMN routing_bom.routing_id IS 'The routing step where this component is consumed';
COMMENT ON COLUMN routing_bom.bom_id IS 'The BOM component being consumed';
COMMENT ON COLUMN routing_bom.consumption_timing IS 'When material is consumed: at_start (beginning of operation), at_end (completion), proportional (throughout)';

-- =====================================================
-- PRODUCTION TRACKING
-- =====================================================

-- PRODUCTION_ORDERS Table
CREATE TABLE production_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    order_item_id INTEGER,
    product_id INTEGER NOT NULL,
    quantity_planned DECIMAL(15,3) NOT NULL CHECK (quantity_planned > 0),
    quantity_completed DECIMAL(15,3) DEFAULT 0 CHECK (quantity_completed >= 0),
    quantity_scrapped DECIMAL(15,3) DEFAULT 0 CHECK (quantity_scrapped >= 0),
    scheduled_start_date DATE,
    scheduled_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'planned',
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_production_orders_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
    CONSTRAINT fk_production_orders_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_production_orders_status CHECK (status IN ('planned', 'released', 'in-progress', 'completed', 'cancelled', 'on-hold')),
    CONSTRAINT chk_production_orders_dates CHECK (scheduled_end_date IS NULL OR scheduled_end_date >= scheduled_start_date),
    CONSTRAINT chk_production_orders_actual_dates CHECK (actual_end_date IS NULL OR actual_end_date >= actual_start_date)
);

COMMENT ON TABLE production_orders IS 'Production orders tracking';
COMMENT ON COLUMN production_orders.status IS 'Status: planned, released, in-progress, completed, cancelled, on-hold';

-- WORK_CENTER_SCHEDULE Table
CREATE TABLE work_center_schedule (
    id SERIAL PRIMARY KEY,
    work_center_id INTEGER NOT NULL,
    production_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    operation_id INTEGER NOT NULL,
    shift_id INTEGER,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'scheduled',
    quantity_planned DECIMAL(15,3) NOT NULL,
    quantity_completed DECIMAL(15,3) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wc_schedule_work_center FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wc_schedule_production_order FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_wc_schedule_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wc_schedule_operation FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wc_schedule_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
    CONSTRAINT chk_wc_schedule_status CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
    CONSTRAINT chk_wc_schedule_dates CHECK (scheduled_end > scheduled_start)
);

COMMENT ON TABLE work_center_schedule IS 'Detailed scheduling of operations on work centers';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Orders indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_due_date ON orders(due_date);

-- Products indexes
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_active ON products(is_active);

-- Order Items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- BOM indexes
CREATE INDEX idx_bom_parent_product_id ON bom(parent_product_id);
CREATE INDEX idx_bom_component_product_id ON bom(component_product_id);
CREATE INDEX idx_bom_active ON bom(is_active);

-- Work Centers indexes
CREATE INDEX idx_work_centers_code ON work_centers(work_center_code);
CREATE INDEX idx_work_centers_status ON work_centers(status);
CREATE INDEX idx_work_centers_operation_id ON work_centers(operation_id);

-- Company Calendar indexes
CREATE INDEX idx_company_calendar_date ON company_calendar(calendar_date);
CREATE INDEX idx_company_calendar_working_day ON company_calendar(is_working_day);

-- Work Center Shifts indexes
CREATE INDEX idx_wc_shifts_work_center_id ON work_center_shifts(work_center_id);
CREATE INDEX idx_wc_shifts_shift_id ON work_center_shifts(shift_id);
CREATE INDEX idx_wc_shifts_day_of_week ON work_center_shifts(day_of_week);

-- Work Center Calendar Exceptions indexes
CREATE INDEX idx_wc_exceptions_work_center_id ON work_center_calendar_exceptions(work_center_id);
CREATE INDEX idx_wc_exceptions_date ON work_center_calendar_exceptions(exception_date);

-- Operations indexes
CREATE INDEX idx_operations_code ON operations(operation_code);

-- Routing indexes
CREATE INDEX idx_routing_product_id ON routing(product_id);
CREATE INDEX idx_routing_operation_id ON routing(operation_id);

-- Operation Dependencies indexes
CREATE INDEX idx_op_dep_routing_id ON operation_dependencies(routing_id);
CREATE INDEX idx_op_dep_predecessor_id ON operation_dependencies(predecessor_routing_id);
CREATE INDEX idx_op_dep_type ON operation_dependencies(dependency_type);

-- Routing BOM indexes
CREATE INDEX idx_routing_bom_routing_id ON routing_bom(routing_id);
CREATE INDEX idx_routing_bom_bom_id ON routing_bom(bom_id);
CREATE INDEX idx_routing_bom_active ON routing_bom(is_active);

-- Production Orders indexes
CREATE INDEX idx_production_orders_po_number ON production_orders(po_number);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_product_id ON production_orders(product_id);
CREATE INDEX idx_production_orders_scheduled_dates ON production_orders(scheduled_start_date, scheduled_end_date);

-- Work Center Schedule indexes
CREATE INDEX idx_wc_schedule_work_center_id ON work_center_schedule(work_center_id);
CREATE INDEX idx_wc_schedule_production_order_id ON work_center_schedule(production_order_id);
CREATE INDEX idx_wc_schedule_product_id ON work_center_schedule(product_id);
CREATE INDEX idx_wc_schedule_dates ON work_center_schedule(scheduled_start, scheduled_end);
CREATE INDEX idx_wc_schedule_status ON work_center_schedule(status);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_updated_at BEFORE UPDATE ON bom
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_calendar_updated_at BEFORE UPDATE ON company_calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_centers_updated_at BEFORE UPDATE ON work_centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_center_shifts_updated_at BEFORE UPDATE ON work_center_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_exceptions_updated_at BEFORE UPDATE ON work_center_calendar_exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_updated_at BEFORE UPDATE ON routing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_op_dependencies_updated_at BEFORE UPDATE ON operation_dependencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_bom_updated_at BEFORE UPDATE ON routing_bom
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_schedule_updated_at BEFORE UPDATE ON work_center_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF SCHEMA
-- =====================================================