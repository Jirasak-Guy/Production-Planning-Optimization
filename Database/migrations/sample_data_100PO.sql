-- =====================================================
-- SAMPLE DATA: CAR MANUFACTURING (Modified)
-- =====================================================
-- This script provides realistic sample data for an automotive manufacturing plant
-- Products: Sedan Model A, SUV Model B, and all their components
-- NOTE: Inventory and Production Transactions tables have been removed per request.
-- =====================================================

-- Clean up existing sample data (Excluding removed tables)
-- RESTART IDENTITY resets auto-increment IDs back to 1
TRUNCATE TABLE work_center_schedule RESTART IDENTITY CASCADE;
TRUNCATE TABLE production_orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE operation_dependencies RESTART IDENTITY CASCADE;
TRUNCATE TABLE routing_bom RESTART IDENTITY CASCADE;
TRUNCATE TABLE routing RESTART IDENTITY CASCADE;
TRUNCATE TABLE operations RESTART IDENTITY CASCADE;
TRUNCATE TABLE bom RESTART IDENTITY CASCADE;
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE work_center_calendar_exceptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE work_center_shifts RESTART IDENTITY CASCADE;
TRUNCATE TABLE work_centers RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE shifts RESTART IDENTITY CASCADE;
TRUNCATE TABLE company_calendar RESTART IDENTITY CASCADE;

-- Insert default shifts
INSERT INTO shifts (shift_code, shift_name, start_time, end_time, break_duration_minutes, effective_working_minutes) VALUES
('A', 'Morning Shift', '08:00:00', '16:00:00', 60, 420),
('B', 'Afternoon Shift', '16:00:00', '00:00:00', 60, 420),
('C', 'Night Shift', '00:00:00', '08:00:00', 60, 420),
('DAY', 'Day Shift', '08:00:00', '17:00:00', 60, 480);

-- Insert some sample calendar data for 2025
INSERT INTO company_calendar (calendar_date, day_type, description, is_working_day) VALUES
('2025-01-01', 'holiday', 'New Year''s Day', false),
('2025-04-13', 'holiday', 'Songkran Festival', false),
('2025-04-14', 'holiday', 'Songkran Festival', false),
('2025-04-15', 'holiday', 'Songkran Festival', false),
('2025-05-01', 'holiday', 'Labour Day', false),
('2025-12-05', 'holiday', 'King''s Birthday', false),
('2025-12-10', 'holiday', 'Constitution Day', false),
('2025-12-31', 'holiday', 'New Year''s Eve', false);

-- Insert some sample calendar data for 2026
INSERT INTO company_calendar (calendar_date, day_type, description, is_working_day) VALUES
('2026-01-01', 'holiday', 'New Year''s Day', false),
('2026-04-13', 'holiday', 'Songkran Festival', false),
('2026-04-14', 'holiday', 'Songkran Festival', false),
('2026-04-15', 'holiday', 'Songkran Festival', false),
('2026-05-01', 'holiday', 'Labour Day', false),
('2026-12-05', 'holiday', 'King''s Birthday', false),
('2026-12-10', 'holiday', 'Constitution Day', false),
('2026-12-31', 'holiday', 'New Year''s Eve', false);

-- =====================================================
-- 1. PRODUCTS (Hierarchical Structure)
-- =====================================================

-- FINISHED PRODUCTS (Cars)
INSERT INTO products (product_code, product_name, description, type, unit, standard_cost, lead_time_days) VALUES
('CAR-SED-A', 'Sedan Model A', 'Compact sedan - base model', 'finished-product', 'unit', 18000.00, 15),
('CAR-SUV-B', 'SUV Model B', 'Mid-size SUV - premium model', 'finished-product', 'unit', 28000.00, 20);

-- MAJOR ASSEMBLIES (Semi-finished products)
INSERT INTO products (product_code, product_name, description, type, unit, standard_cost, lead_time_days) VALUES
('ASSY-BODY', 'Body Assembly', 'Complete vehicle body structure', 'semi-product', 'unit', 5000.00, 5),
('ASSY-CHASSIS', 'Chassis Assembly', 'Frame and suspension assembly', 'semi-product', 'unit', 3500.00, 4),
('ASSY-ENGINE', 'Engine Assembly 2.0L', 'Complete engine assembly with accessories', 'semi-product', 'unit', 4500.00, 7),
('ASSY-ENGINE-V6', 'Engine Assembly 3.5L V6', 'V6 engine for SUV model', 'semi-product', 'unit', 6500.00, 8),
('ASSY-TRANS', 'Transmission Assembly', 'Automatic transmission', 'semi-product', 'unit', 2800.00, 5),
('ASSY-INTERIOR', 'Interior Assembly', 'Complete interior package', 'semi-product', 'unit', 2200.00, 3),
('ASSY-ELEC', 'Electrical System', 'Wiring harness and electrical components', 'semi-product', 'unit', 1800.00, 4),
('ASSY-DASH', 'Dashboard Assembly', 'Instrument panel and dashboard', 'semi-product', 'unit', 800.00, 2);

-- SUB-ASSEMBLIES
INSERT INTO products (product_code, product_name, description, type, unit, standard_cost, lead_time_days) VALUES
('SUB-DOOR-FL', 'Front Left Door Assembly', 'Complete door with window and trim', 'semi-product', 'unit', 350.00, 2),
('SUB-DOOR-FR', 'Front Right Door Assembly', 'Complete door with window and trim', 'semi-product', 'unit', 350.00, 2),
('SUB-DOOR-RL', 'Rear Left Door Assembly', 'Complete door with window and trim', 'semi-product', 'unit', 320.00, 2),
('SUB-DOOR-RR', 'Rear Right Door Assembly', 'Complete door with window and trim', 'semi-product', 'unit', 320.00, 2),
('SUB-HOOD', 'Hood Assembly', 'Hood with hinges and support', 'semi-product', 'unit', 280.00, 2),
('SUB-TRUNK', 'Trunk/Tailgate Assembly', 'Trunk lid with mechanism', 'semi-product', 'unit', 250.00, 2),
('SUB-WHEEL', 'Wheel Assembly', 'Tire mounted on rim', 'semi-product', 'unit', 180.00, 1),
('SUB-SEAT-FRONT', 'Front Seat Assembly', 'Front seat with adjuster', 'semi-product', 'unit', 420.00, 2),
('SUB-SEAT-REAR', 'Rear Seat Assembly', 'Rear bench seat', 'semi-product', 'unit', 380.00, 2);

-- RAW MATERIALS & COMPONENTS
INSERT INTO products (product_code, product_name, description, type, unit, standard_cost, lead_time_days) VALUES
-- Metal materials
('RM-STEEL-SHEET', 'Steel Sheet', 'Cold-rolled steel sheet 1.2mm', 'raw-material', 'kg', 1.20, 1),
('RM-ALUMINUM', 'Aluminum Sheet', 'Aluminum alloy sheet 2.0mm', 'raw-material', 'kg', 3.50, 1),
('RM-STEEL-TUBE', 'Steel Tube', 'Structural steel tube for chassis', 'raw-material', 'm', 8.50, 1),
-- Engine components
('COMP-ENGINE-BLOCK', 'Engine Block', 'Cast iron engine block', 'raw-material', 'unit', 850.00, 3),
('COMP-CYLINDER-HEAD', 'Cylinder Head', 'Aluminum cylinder head', 'raw-material', 'unit', 450.00, 3),
('COMP-CRANKSHAFT', 'Crankshaft', 'Forged steel crankshaft', 'raw-material', 'unit', 320.00, 2),
('COMP-PISTON-SET', 'Piston Set', 'Set of 4 pistons with rings', 'raw-material', 'set', 180.00, 2),
('COMP-CAMSHAFT', 'Camshaft', 'Steel camshaft', 'raw-material', 'unit', 150.00, 2),
-- Transmission
('COMP-TRANS-CASE', 'Transmission Case', 'Aluminum transmission housing', 'raw-material', 'unit', 380.00, 2),
('COMP-GEARSET', 'Gear Set', 'Transmission gear set', 'raw-material', 'set', 420.00, 3),
('COMP-TORQUE-CONV', 'Torque Converter', 'Hydraulic torque converter', 'raw-material', 'unit', 280.00, 2),
-- Electrical
('COMP-BATTERY', 'Battery 12V', 'Lead-acid battery 70Ah', 'raw-material', 'unit', 120.00, 1),
('COMP-ALTERNATOR', 'Alternator', '140A alternator', 'raw-material', 'unit', 180.00, 1),
('COMP-STARTER', 'Starter Motor', 'Electric starter motor', 'raw-material', 'unit', 95.00, 1),
('COMP-ECU', 'ECU', 'Engine control unit', 'raw-material', 'unit', 450.00, 2),
('COMP-WIRING', 'Wiring Harness', 'Main vehicle wiring harness', 'raw-material', 'unit', 320.00, 2),
-- Suspension & wheels
('COMP-SHOCK', 'Shock Absorber', 'Hydraulic shock absorber', 'raw-material', 'unit', 85.00, 1),
('COMP-SPRING', 'Coil Spring', 'Suspension coil spring', 'raw-material', 'unit', 45.00, 1),
('COMP-TIRE', 'Tire 225/60R17', 'All-season tire', 'raw-material', 'unit', 95.00, 1),
('COMP-RIM', 'Alloy Rim 17"', 'Aluminum alloy wheel rim', 'raw-material', 'unit', 85.00, 1),
-- Interior
('COMP-SEAT-FRAME', 'Seat Frame', 'Steel seat frame', 'raw-material', 'unit', 85.00, 1),
('COMP-SEAT-FOAM', 'Seat Foam', 'Polyurethane seat cushion', 'raw-material', 'unit', 35.00, 1),
('COMP-SEAT-COVER', 'Seat Cover', 'Fabric seat cover', 'raw-material', 'unit', 55.00, 1),
('COMP-DASHBOARD', 'Dashboard Molding', 'Plastic dashboard molding', 'raw-material', 'unit', 180.00, 2),
('COMP-STEERING', 'Steering Wheel', 'Leather steering wheel', 'raw-material', 'unit', 95.00, 1),
('COMP-AIRBAG', 'Airbag Module', 'Driver airbag module', 'raw-material', 'unit', 220.00, 2),
-- Glass & body
('COMP-WINDSHIELD', 'Windshield', 'Laminated windshield glass', 'raw-material', 'unit', 180.00, 2),
('COMP-WINDOW', 'Side Window', 'Tempered side window glass', 'raw-material', 'unit', 65.00, 1),
('COMP-MIRROR', 'Side Mirror', 'Power-adjustable side mirror', 'raw-material', 'unit', 75.00, 1),
('COMP-BUMPER-F', 'Front Bumper', 'Plastic front bumper', 'raw-material', 'unit', 125.00, 1),
('COMP-BUMPER-R', 'Rear Bumper', 'Plastic rear bumper', 'raw-material', 'unit', 115.00, 1),
('COMP-HEADLIGHT', 'Headlight Assembly', 'LED headlight assembly', 'raw-material', 'unit', 185.00, 2),
('COMP-TAILLIGHT', 'Taillight Assembly', 'LED taillight assembly', 'raw-material', 'unit', 95.00, 1),
-- Fluids & consumables
('RM-PAINT', 'Automotive Paint', 'Base coat paint', 'raw-material', 'liter', 45.00, 1),
('RM-CLEARCOAT', 'Clear Coat', 'UV-resistant clear coat', 'raw-material', 'liter', 38.00, 1),
('RM-PRIMER', 'Primer', 'Anti-corrosion primer', 'raw-material', 'liter', 28.00, 1),
('RM-ADHESIVE', 'Structural Adhesive', 'Epoxy adhesive', 'raw-material', 'kg', 22.00, 1),
('RM-BOLT-KIT', 'Bolt & Fastener Kit', 'Assorted bolts and fasteners', 'raw-material', 'kit', 15.00, 1);

-- =====================================================
-- 2. BILL OF MATERIALS (BOM)
-- =====================================================

-- SEDAN MODEL A BOM (Top Level)
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
-- Major assemblies
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'ASSY-BODY'), 1.00, 'unit', 0.5, 'Body structure'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), 1.00, 'unit', 0.5, 'Chassis and suspension'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), 1.00, 'unit', 0.0, 'Engine'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), 1.00, 'unit', 0.0, 'Transmission'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), 1.00, 'unit', 0.0, 'Interior'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'ASSY-ELEC'), 1.00, 'unit', 0.0, 'Electrical system'),
-- Wheels
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'SUB-WHEEL'), 4.00, 'unit', 0.0, 'Four wheels'),
-- Direct components
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'COMP-BATTERY'), 1.00, 'unit', 0.0, 'Battery'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'RM-PAINT'), 8.00, 'liter', 10.0, 'Paint - various colors'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'RM-CLEARCOAT'), 6.00, 'liter', 8.0, 'Clear coat'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM products WHERE product_code = 'RM-BOLT-KIT'), 3.00, 'kit', 5.0, 'Fasteners');

-- SUV MODEL B BOM (Top Level)
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
-- Major assemblies (SUV uses V6 engine)
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'ASSY-BODY'), 1.00, 'unit', 0.5, 'Body structure'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), 1.00, 'unit', 0.5, 'Chassis and suspension'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), 1.00, 'unit', 0.0, 'V6 Engine'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), 1.00, 'unit', 0.0, 'Transmission'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), 1.00, 'unit', 0.0, 'Interior'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'ASSY-ELEC'), 1.00, 'unit', 0.0, 'Electrical system'),
-- Wheels
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'SUB-WHEEL'), 4.00, 'unit', 0.0, 'Four wheels'),
-- Direct components
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'COMP-BATTERY'), 1.00, 'unit', 0.0, 'Battery'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'RM-PAINT'), 10.00, 'liter', 10.0, 'Paint - various colors'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'RM-CLEARCOAT'), 8.00, 'liter', 8.0, 'Clear coat'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM products WHERE product_code = 'RM-BOLT-KIT'), 4.00, 'kit', 5.0, 'Fasteners');

-- BODY ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'SUB-DOOR-FL'), 1.00, 'unit', 0.0, 'Front left door'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'SUB-DOOR-FR'), 1.00, 'unit', 0.0, 'Front right door'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'SUB-DOOR-RL'), 1.00, 'unit', 0.0, 'Rear left door'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'SUB-DOOR-RR'), 1.00, 'unit', 0.0, 'Rear right door'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'SUB-HOOD'), 1.00, 'unit', 0.0, 'Hood'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'SUB-TRUNK'), 1.00, 'unit', 0.0, 'Trunk'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'RM-STEEL-SHEET'), 450.00, 'kg', 8.0, 'Body panels'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'RM-ALUMINUM'), 80.00, 'kg', 5.0, 'Hood and trunk'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'COMP-WINDSHIELD'), 1.00, 'unit', 2.0, 'Front windshield'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'COMP-BUMPER-F'), 1.00, 'unit', 1.0, 'Front bumper'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'COMP-BUMPER-R'), 1.00, 'unit', 1.0, 'Rear bumper'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'COMP-HEADLIGHT'), 2.00, 'unit', 0.5, 'Left and right headlights'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'COMP-TAILLIGHT'), 2.00, 'unit', 0.5, 'Left and right taillights'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'COMP-MIRROR'), 2.00, 'unit', 1.0, 'Side mirrors'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'RM-PRIMER'), 4.00, 'liter', 5.0, 'Anti-corrosion primer'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM products WHERE product_code = 'RM-ADHESIVE'), 2.50, 'kg', 3.0, 'Structural adhesive');

-- CHASSIS ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM products WHERE product_code = 'RM-STEEL-TUBE'), 45.00, 'm', 5.0, 'Frame structure'),
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM products WHERE product_code = 'COMP-SHOCK'), 4.00, 'unit', 0.0, 'Shock absorbers'),
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM products WHERE product_code = 'COMP-SPRING'), 4.00, 'unit', 0.0, 'Coil springs'),
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM products WHERE product_code = 'RM-BOLT-KIT'), 2.00, 'kit', 5.0, 'Chassis fasteners');

-- ENGINE ASSEMBLY BOM (2.0L)
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-ENGINE-BLOCK'), 1.00, 'unit', 0.0, 'Engine block'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-CYLINDER-HEAD'), 1.00, 'unit', 0.0, 'Cylinder head'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-CRANKSHAFT'), 1.00, 'unit', 0.0, 'Crankshaft'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-PISTON-SET'), 1.00, 'set', 0.0, 'Pistons'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-CAMSHAFT'), 2.00, 'unit', 0.0, 'Intake and exhaust camshafts'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-ALTERNATOR'), 1.00, 'unit', 0.0, 'Alternator'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-STARTER'), 1.00, 'unit', 0.0, 'Starter motor'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM products WHERE product_code = 'COMP-ECU'), 1.00, 'unit', 0.0, 'Engine ECU');

-- ENGINE ASSEMBLY BOM (3.5L V6)
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-ENGINE-BLOCK'), 1.00, 'unit', 0.0, 'V6 engine block'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-CYLINDER-HEAD'), 2.00, 'unit', 0.0, 'Two cylinder heads'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-CRANKSHAFT'), 1.00, 'unit', 0.0, 'Crankshaft'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-PISTON-SET'), 1.50, 'set', 0.0, '6 pistons'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-CAMSHAFT'), 4.00, 'unit', 0.0, 'Four camshafts'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-ALTERNATOR'), 1.00, 'unit', 0.0, 'Alternator'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-STARTER'), 1.00, 'unit', 0.0, 'Starter motor'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM products WHERE product_code = 'COMP-ECU'), 1.00, 'unit', 0.0, 'Engine ECU');

-- TRANSMISSION ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), (SELECT id FROM products WHERE product_code = 'COMP-TRANS-CASE'), 1.00, 'unit', 0.0, 'Transmission case'),
((SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), (SELECT id FROM products WHERE product_code = 'COMP-GEARSET'), 1.00, 'set', 0.0, 'Gear set'),
((SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), (SELECT id FROM products WHERE product_code = 'COMP-TORQUE-CONV'), 1.00, 'unit', 0.0, 'Torque converter');

-- INTERIOR ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), (SELECT id FROM products WHERE product_code = 'SUB-SEAT-FRONT'), 2.00, 'unit', 0.0, 'Front seats'),
((SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), (SELECT id FROM products WHERE product_code = 'SUB-SEAT-REAR'), 1.00, 'unit', 0.0, 'Rear seat'),
((SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), (SELECT id FROM products WHERE product_code = 'ASSY-DASH'), 1.00, 'unit', 0.0, 'Dashboard assembly'),
((SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), (SELECT id FROM products WHERE product_code = 'COMP-STEERING'), 1.00, 'unit', 0.0, 'Steering wheel'),
((SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), (SELECT id FROM products WHERE product_code = 'COMP-AIRBAG'), 2.00, 'unit', 0.0, 'Driver and passenger airbags');

-- ELECTRICAL SYSTEM BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ELEC'), (SELECT id FROM products WHERE product_code = 'COMP-WIRING'), 1.00, 'unit', 0.0, 'Main wiring harness'),
((SELECT id FROM products WHERE product_code = 'ASSY-ELEC'), (SELECT id FROM products WHERE product_code = 'COMP-ECU'), 1.00, 'unit', 0.0, 'Vehicle ECU');

-- DASHBOARD ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-DASH'), (SELECT id FROM products WHERE product_code = 'COMP-DASHBOARD'), 1.00, 'unit', 1.0, 'Dashboard molding');

-- DOOR ASSEMBLIES BOM (Similar for all doors)
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FL'), (SELECT id FROM products WHERE product_code = 'RM-STEEL-SHEET'), 15.00, 'kg', 5.0, 'Door panel'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FL'), (SELECT id FROM products WHERE product_code = 'COMP-WINDOW'), 1.00, 'unit', 1.0, 'Window glass'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FR'), (SELECT id FROM products WHERE product_code = 'RM-STEEL-SHEET'), 15.00, 'kg', 5.0, 'Door panel'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FR'), (SELECT id FROM products WHERE product_code = 'COMP-WINDOW'), 1.00, 'unit', 1.0, 'Window glass'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RL'), (SELECT id FROM products WHERE product_code = 'RM-STEEL-SHEET'), 14.00, 'kg', 5.0, 'Door panel'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RL'), (SELECT id FROM products WHERE product_code = 'COMP-WINDOW'), 1.00, 'unit', 1.0, 'Window glass'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RR'), (SELECT id FROM products WHERE product_code = 'RM-STEEL-SHEET'), 14.00, 'kg', 5.0, 'Door panel'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RR'), (SELECT id FROM products WHERE product_code = 'COMP-WINDOW'), 1.00, 'unit', 1.0, 'Window glass');

-- HOOD ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-HOOD'), (SELECT id FROM products WHERE product_code = 'RM-ALUMINUM'), 18.00, 'kg', 4.0, 'Aluminum hood panel');

-- TRUNK ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-TRUNK'), (SELECT id FROM products WHERE product_code = 'RM-STEEL-SHEET'), 22.00, 'kg', 5.0, 'Trunk lid');

-- WHEEL ASSEMBLY BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-WHEEL'), (SELECT id FROM products WHERE product_code = 'COMP-TIRE'), 1.00, 'unit', 0.0, 'Tire'),
((SELECT id FROM products WHERE product_code = 'SUB-WHEEL'), (SELECT id FROM products WHERE product_code = 'COMP-RIM'), 1.00, 'unit', 0.0, 'Alloy rim');

-- SEAT ASSEMBLIES BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-FRONT'), (SELECT id FROM products WHERE product_code = 'COMP-SEAT-FRAME'), 1.00, 'unit', 0.0, 'Seat frame'),
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-FRONT'), (SELECT id FROM products WHERE product_code = 'COMP-SEAT-FOAM'), 1.00, 'unit', 2.0, 'Seat foam'),
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-FRONT'), (SELECT id FROM products WHERE product_code = 'COMP-SEAT-COVER'), 1.00, 'unit', 1.0, 'Seat cover'),
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-REAR'), (SELECT id FROM products WHERE product_code = 'COMP-SEAT-FRAME'), 1.00, 'unit', 0.0, 'Seat frame'),
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-REAR'), (SELECT id FROM products WHERE product_code = 'COMP-SEAT-FOAM'), 1.50, 'unit', 2.0, 'Seat foam'),
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-REAR'), (SELECT id FROM products WHERE product_code = 'COMP-SEAT-COVER'), 1.00, 'unit', 1.0, 'Seat cover');

-- =====================================================
-- 3. OPERATIONS (moved before work_centers due to FK)
-- =====================================================

INSERT INTO operations (operation_code, operation_name, description, operation_type) VALUES
-- Body operations
('OP-STAMP', 'Stamping', 'Stamp body panels from steel sheets', 'forming'),
('OP-TRIM', 'Trimming', 'Trim excess material from stamped parts', 'finishing'),
('OP-WELD-BODY', 'Body Welding', 'Weld body panels together', 'joining'),
('OP-BODY-FIT', 'Body Fit-up', 'Fit and align body components', 'assembly'),
('OP-DOOR-ASSY', 'Door Assembly', 'Assemble door components', 'assembly'),
-- Paint operations
('OP-CLEAN', 'Cleaning', 'Clean and degrease body surface', 'preparation'),
('OP-PRIME', 'Priming', 'Apply primer coat', 'coating'),
('OP-PAINT-BASE', 'Base Coat Paint', 'Apply base color coat', 'coating'),
('OP-PAINT-CLEAR', 'Clear Coat', 'Apply clear protective coat', 'coating'),
('OP-CURE', 'Paint Curing', 'Cure paint in high-temperature oven', 'heat-treatment'),
('OP-POLISH', 'Polishing', 'Polish painted surface', 'finishing'),
-- Powertrain operations
('OP-ENG-ASSY', 'Engine Assembly', 'Assemble engine components', 'assembly'),
('OP-ENG-TEST', 'Engine Testing', 'Test engine performance', 'testing'),
('OP-TRANS-ASSY', 'Transmission Assembly', 'Assemble transmission', 'assembly'),
('OP-TRANS-TEST', 'Transmission Test', 'Test transmission operation', 'testing'),
-- Chassis operations
('OP-CHASSIS-WELD', 'Chassis Welding', 'Weld chassis frame', 'joining'),
('OP-SUSP-INST', 'Suspension Install', 'Install suspension components', 'assembly'),
('OP-WHEEL-MOUNT', 'Wheel Mounting', 'Mount wheels and tires', 'assembly'),
-- Final assembly operations
('OP-MARRY', 'Body-Chassis Marriage', 'Join body to chassis/powertrain', 'assembly'),
('OP-ENGINE-INST', 'Engine Installation', 'Install engine into vehicle', 'assembly'),
('OP-TRANS-INST', 'Transmission Install', 'Install transmission', 'assembly'),
('OP-INT-INST', 'Interior Installation', 'Install interior components', 'assembly'),
('OP-ELEC-INST', 'Electrical Install', 'Install electrical components', 'assembly'),
('OP-GLASS-INST', 'Glass Installation', 'Install windows and windshield', 'assembly'),
('OP-FLUID-FILL', 'Fluid Filling', 'Fill all vehicle fluids', 'assembly'),
-- Quality & Testing
('OP-QC-BODY', 'Body QC Inspection', 'Inspect body quality', 'inspection'),
('OP-QC-PAINT', 'Paint QC Inspection', 'Inspect paint quality', 'inspection'),
('OP-QC-FINAL', 'Final QC Inspection', 'Final vehicle inspection', 'inspection'),
('OP-WATER-TEST', 'Water Leak Test', 'Test for water leaks', 'testing'),
('OP-ROAD-TEST', 'Road Test', 'Road test vehicle', 'testing'),
('OP-FINAL-DETAIL', 'Final Detailing', 'Clean and detail finished vehicle', 'finishing');

-- =====================================================
-- 4. WORK CENTERS (Manufacturing Stations)
-- =====================================================

INSERT INTO work_centers (work_center_code, work_center_name, description, operation_id, capacity_per_hour, number_of_workers_required, default_shift_id, cost_per_hour, status) VALUES
-- Body Shop - Stamping (2 WCs with different capacity)
('WC-STAMP-01', 'Stamping Press #1', 'High-speed stamping press for body panels', (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 120, 2, 1, 450.00, 'active'),
('WC-STAMP-02', 'Stamping Press #2', 'Older stamping press for body panels', (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 90, 2, 1, 380.00, 'active'),
-- Body Shop - Trimming
('WC-TRIM-01', 'Trimming Station #1', 'CNC trimming station', (SELECT id FROM operations WHERE operation_code = 'OP-TRIM'), 60, 2, 1, 280.00, 'active'),
-- Body Shop - Welding (2 WCs with different capacity)
('WC-WELD-01', 'Body Welding Station #1', 'Robotic welding station for body assembly', (SELECT id FROM operations WHERE operation_code = 'OP-WELD-BODY'), 10, 3, 1, 420.00, 'active'),
('WC-WELD-02', 'Body Welding Station #2', 'Manual welding station for body assembly', (SELECT id FROM operations WHERE operation_code = 'OP-WELD-BODY'), 6, 4, 1, 350.00, 'active'),
-- Body Shop - Body Fit
('WC-BODY-ASSY', 'Body Assembly Line', 'Main body assembly line', (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 6, 12, 1, 850.00, 'active'),
-- Body Shop - Door Assembly
('WC-DOOR-ASSY', 'Door Assembly Station', 'Door components assembly', (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 20, 4, 1, 320.00, 'active'),
-- Paint Shop - Cleaning
('WC-CLEAN-01', 'Cleaning Station #1', 'Automated cleaning and degreasing line', (SELECT id FROM operations WHERE operation_code = 'OP-CLEAN'), 12, 2, 1, 250.00, 'active'),
-- Paint Shop - Priming
('WC-PAINT-PREP', 'Paint Preparation', 'Surface preparation and priming', (SELECT id FROM operations WHERE operation_code = 'OP-PRIME'), 10, 4, 1, 320.00, 'active'),
-- Paint Shop - Base Coat (2 WCs with different capacity)
('WC-PAINT-BOOTH-01', 'Paint Booth #1', 'Automated paint application booth - main', (SELECT id FROM operations WHERE operation_code = 'OP-PAINT-BASE'), 8, 2, 1, 520.00, 'active'),
('WC-PAINT-BOOTH-02', 'Paint Booth #2', 'Secondary paint booth', (SELECT id FROM operations WHERE operation_code = 'OP-PAINT-BASE'), 6, 2, 1, 480.00, 'active'),
-- Paint Shop - Clear Coat
('WC-CLEAR-COAT', 'Clear Coat Booth', 'Clear coat application booth', (SELECT id FROM operations WHERE operation_code = 'OP-PAINT-CLEAR'), 8, 2, 1, 480.00, 'active'),
-- Paint Shop - Curing
('WC-PAINT-CURE', 'Paint Curing Oven', 'High-temperature paint curing oven', (SELECT id FROM operations WHERE operation_code = 'OP-CURE'), 8, 1, 1, 280.00, 'active'),
-- Paint Shop - Polishing
('WC-POLISH-01', 'Polishing Station', 'Automated polishing station', (SELECT id FROM operations WHERE operation_code = 'OP-POLISH'), 10, 3, 1, 220.00, 'active'),
-- Powertrain - Engine Assembly (2 WCs with different capacity)
('WC-ENGINE-ASSY-01', 'Engine Assembly Line #1', 'Main engine assembly station', (SELECT id FROM operations WHERE operation_code = 'OP-ENG-ASSY'), 4, 6, 1, 680.00, 'active'),
('WC-ENGINE-ASSY-02', 'Engine Assembly Line #2', 'Secondary engine assembly', (SELECT id FROM operations WHERE operation_code = 'OP-ENG-ASSY'), 3, 5, 1, 600.00, 'active'),
-- Powertrain - Engine Test
('WC-ENG-TEST', 'Engine Test Stand', 'Engine testing station', (SELECT id FROM operations WHERE operation_code = 'OP-ENG-TEST'), 8, 2, 1, 420.00, 'active'),
-- Powertrain - Transmission Assembly
('WC-TRANS-ASSY', 'Transmission Assembly', 'Transmission assembly station', (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-ASSY'), 6, 4, 1, 520.00, 'active'),
-- Powertrain - Transmission Test
('WC-TRANS-TEST', 'Transmission Test Stand', 'Transmission testing station', (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-TEST'), 10, 2, 1, 350.00, 'active'),
-- Chassis - Chassis Welding (2 WCs with different capacity)
('WC-CHASSIS-WELD-01', 'Chassis Welding #1', 'Main chassis frame welding station', (SELECT id FROM operations WHERE operation_code = 'OP-CHASSIS-WELD'), 6, 4, 1, 450.00, 'active'),
('WC-CHASSIS-WELD-02', 'Chassis Welding #2', 'Secondary chassis welding', (SELECT id FROM operations WHERE operation_code = 'OP-CHASSIS-WELD'), 4, 3, 1, 380.00, 'active'),
-- Chassis - Suspension
('WC-SUSPENSION', 'Suspension Assembly', 'Suspension system installation', (SELECT id FROM operations WHERE operation_code = 'OP-SUSP-INST'), 12, 3, 1, 350.00, 'active'),
-- Chassis - Wheel Mounting
('WC-WHEEL-MOUNT', 'Wheel Mounting Station', 'Wheel and tire mounting', (SELECT id FROM operations WHERE operation_code = 'OP-WHEEL-MOUNT'), 20, 2, 1, 180.00, 'active'),
-- Final Assembly - Marriage (2 WCs with different capacity)
('WC-FINAL-01', 'Final Assembly Line #1', 'Main final assembly line', (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 4, 18, 1, 1250.00, 'active'),
('WC-FINAL-02', 'Final Assembly Line #2', 'Secondary final assembly line', (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 3, 15, 1, 1100.00, 'active'),
-- Final Assembly - Engine Installation
('WC-ENG-INST', 'Engine Installation Station', 'Engine installation into vehicle', (SELECT id FROM operations WHERE operation_code = 'OP-ENGINE-INST'), 6, 4, 1, 380.00, 'active'),
-- Final Assembly - Transmission Installation
('WC-TRANS-INST', 'Transmission Install Station', 'Transmission installation', (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-INST'), 8, 3, 1, 320.00, 'active'),
-- Final Assembly - Interior (2 WCs with different capacity)
('WC-TRIM-INT-01', 'Interior Trim Installation #1', 'Main interior installation line', (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 8, 8, 1, 620.00, 'active'),
('WC-TRIM-INT-02', 'Interior Trim Installation #2', 'Secondary interior line', (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 6, 6, 1, 520.00, 'active'),
-- Final Assembly - Electrical
('WC-ELEC-INST', 'Electrical Installation', 'Electrical system installation', (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 10, 6, 1, 580.00, 'active'),
-- Final Assembly - Glass Installation
('WC-GLASS-INST', 'Glass Installation Station', 'Windshield and window installation', (SELECT id FROM operations WHERE operation_code = 'OP-GLASS-INST'), 15, 3, 1, 280.00, 'active'),
-- Final Assembly - Fluid Filling
('WC-FLUID-FILL', 'Fluid Filling Station', 'All vehicle fluids filling', (SELECT id FROM operations WHERE operation_code = 'OP-FLUID-FILL'), 20, 2, 1, 150.00, 'active'),
-- Quality & Testing - Body QC (2 WCs with different capacity)
('WC-QC-BODY-01', 'Body Quality Inspection #1', 'Main body quality check station', (SELECT id FROM operations WHERE operation_code = 'OP-QC-BODY'), 12, 3, 1, 280.00, 'active'),
('WC-QC-BODY-02', 'Body Quality Inspection #2', 'Secondary body QC', (SELECT id FROM operations WHERE operation_code = 'OP-QC-BODY'), 8, 2, 1, 220.00, 'active'),
-- Quality & Testing - Paint QC
('WC-QC-PAINT', 'Paint Quality Inspection', 'Paint quality check station', (SELECT id FROM operations WHERE operation_code = 'OP-QC-PAINT'), 10, 2, 1, 250.00, 'active'),
-- Quality & Testing - Final QC
('WC-QC-FINAL', 'Final Quality Inspection', 'Final vehicle inspection', (SELECT id FROM operations WHERE operation_code = 'OP-QC-FINAL'), 6, 4, 1, 350.00, 'active'),
-- Quality & Testing - Water Test
('WC-TEST-WATER', 'Water Leak Test', 'Water leak testing chamber', (SELECT id FROM operations WHERE operation_code = 'OP-WATER-TEST'), 12, 2, 1, 320.00, 'active'),
-- Quality & Testing - Road Test (2 WCs with different capacity)
('WC-TEST-ROAD-01', 'Road Test Track #1', 'Main vehicle road testing', (SELECT id FROM operations WHERE operation_code = 'OP-ROAD-TEST'), 8, 2, 1, 420.00, 'active'),
('WC-TEST-ROAD-02', 'Road Test Track #2', 'Secondary road test', (SELECT id FROM operations WHERE operation_code = 'OP-ROAD-TEST'), 6, 2, 1, 380.00, 'active'),
-- Final Detailing
('WC-DETAIL', 'Final Detailing Station', 'Vehicle cleaning and detailing', (SELECT id FROM operations WHERE operation_code = 'OP-FINAL-DETAIL'), 10, 4, 1, 200.00, 'active');

-- =====================================================
-- 4. WORK CENTER SHIFTS SCHEDULE
-- =====================================================

-- Most work centers operate 2 shifts, Monday to Friday
-- Shift A (Morning): 08:00-16:00
-- Shift B (Afternoon): 16:00-00:00

-- Body Shop (2 shifts, Mon-Fri)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A', 'B')) s
CROSS JOIN generate_series(1, 5) as dow
WHERE wc.work_center_code IN ('WC-STAMP-01', 'WC-STAMP-02', 'WC-TRIM-01', 'WC-WELD-01', 'WC-WELD-02', 'WC-BODY-ASSY', 'WC-DOOR-ASSY');

-- Paint Shop (2 shifts, Mon-Sat)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A', 'B')) s
CROSS JOIN generate_series(1, 6) as dow
WHERE wc.work_center_code IN ('WC-CLEAN-01', 'WC-PAINT-PREP', 'WC-PAINT-BOOTH-01', 'WC-PAINT-BOOTH-02', 'WC-CLEAR-COAT', 'WC-PAINT-CURE', 'WC-POLISH-01');

-- Powertrain & Chassis (2 shifts, Mon-Fri)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A', 'B')) s
CROSS JOIN generate_series(1, 5) as dow
WHERE wc.work_center_code IN ('WC-ENGINE-ASSY-01', 'WC-ENGINE-ASSY-02', 'WC-ENG-TEST', 'WC-TRANS-ASSY', 'WC-TRANS-TEST', 'WC-CHASSIS-WELD-01', 'WC-CHASSIS-WELD-02', 'WC-SUSPENSION', 'WC-WHEEL-MOUNT');

-- Final Assembly (2 shifts, Mon-Fri)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A', 'B')) s
CROSS JOIN generate_series(1, 5) as dow
WHERE wc.work_center_code IN ('WC-FINAL-01', 'WC-FINAL-02', 'WC-ENG-INST', 'WC-TRANS-INST', 'WC-TRIM-INT-01', 'WC-TRIM-INT-02', 'WC-ELEC-INST', 'WC-GLASS-INST', 'WC-FLUID-FILL', 'WC-DETAIL');

-- Quality & Testing (Day shift only, Mon-Sat)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code = 'A') s
CROSS JOIN generate_series(1, 6) as dow
WHERE wc.work_center_code IN ('WC-QC-BODY-01', 'WC-QC-BODY-02', 'WC-QC-PAINT', 'WC-QC-FINAL', 'WC-TEST-WATER', 'WC-TEST-ROAD-01', 'WC-TEST-ROAD-02');

-- =====================================================
-- 5. WORK CENTER CALENDAR EXCEPTIONS
-- =====================================================

-- Planned maintenance for Paint Booth
INSERT INTO work_center_calendar_exceptions (work_center_id, exception_date, exception_type, description) VALUES
((SELECT id FROM work_centers WHERE work_center_code = 'WC-PAINT-BOOTH-01'), '2025-12-15', 'maintenance', 'Quarterly maintenance - Paint booth filter replacement'),
((SELECT id FROM work_centers WHERE work_center_code = 'WC-PAINT-BOOTH-01'), '2025-12-16', 'maintenance', 'Quarterly maintenance - Paint booth filter replacement');

-- Planned maintenance for Stamping Press
INSERT INTO work_center_calendar_exceptions (work_center_id, exception_date, exception_type, description) VALUES
((SELECT id FROM work_centers WHERE work_center_code = 'WC-STAMP-01'), '2026-01-10', 'maintenance', 'Annual stamping press maintenance');


-- =====================================================
-- 6. ROUTING FOR FINISHED PRODUCTS
-- =====================================================
-- Note: Finished products only have FINAL ASSEMBLY and TESTING routing.
-- Sub-assemblies (ASSY-*, SUB-*) are produced separately with their own routing.

-- SEDAN MODEL A - Final Assembly Only
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
-- Final Assembly (using pre-made sub-assemblies from BOM)
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 10, 30, 'Join pre-made body to chassis'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-ENGINE-INST'), 20, 20, 'Install pre-assembled engine'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-INST'), 30, 15, 'Install pre-assembled transmission'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 40, 25, 'Install pre-assembled interior'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 50, 30, 'Install pre-assembled electrical'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-GLASS-INST'), 60, 20, 'Install windshield and windows'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-WHEEL-MOUNT'), 70, 10, 'Mount pre-assembled wheels'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-FLUID-FILL'), 80, 15, 'Fill all vehicle fluids'),
-- Testing and QC
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-WATER-TEST'), 90, 10, 'Water leak test'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-QC-FINAL'), 100, 15, 'Final vehicle inspection'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-ROAD-TEST'), 110, 10, 'Road test'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-FINAL-DETAIL'), 120, 10, 'Final cleaning and detailing');

-- =====================================================
-- SUV MODEL B - Final Assembly Only
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
-- Final Assembly (using pre-made sub-assemblies from BOM)
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 10, 40, 'Join pre-made body to chassis (larger SUV)'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-ENGINE-INST'), 20, 25, 'Install pre-assembled V6 engine'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-INST'), 30, 20, 'Install pre-assembled transmission'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 40, 30, 'Install pre-assembled premium interior'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 50, 35, 'Install pre-assembled electrical'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-GLASS-INST'), 60, 25, 'Install windshield and windows'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-WHEEL-MOUNT'), 70, 15, 'Mount pre-assembled wheels'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-FLUID-FILL'), 80, 20, 'Fill all vehicle fluids'),
-- Testing and QC
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-WATER-TEST'), 90, 15, 'Water leak test'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-QC-FINAL'), 100, 20, 'Final vehicle inspection'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-ROAD-TEST'), 110, 15, 'Road test - includes off-road'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-FINAL-DETAIL'), 120, 15, 'Final cleaning and detailing');

-- =====================================================
-- 6C. ROUTING FOR SEMI-PRODUCTS (Sub-Assemblies)
-- =====================================================

-- ENGINE ASSEMBLY 2.0L Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-ASSY'), 10, 30, 'Assemble engine block and internals'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-TEST'), 20, 10, 'Test engine assembly');

-- ENGINE ASSEMBLY V6 Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-ASSY'), 10, 40, 'Assemble V6 engine'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-TEST'), 20, 15, 'Test V6 engine');

-- TRANSMISSION ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-ASSY'), 10, 25, 'Assemble transmission'),
((SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-TEST'), 20, 10, 'Test transmission');

-- BODY ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 10, 45, 'Stamp body panels'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-TRIM'), 20, 10, 'Trim panels'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-WELD-BODY'), 30, 35, 'Weld body structure'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 40, 25, 'Fit and align panels'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-QC-BODY'), 50, 10, 'Body quality check');

-- CHASSIS ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM operations WHERE operation_code = 'OP-CHASSIS-WELD'), 10, 30, 'Weld chassis frame'),
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM operations WHERE operation_code = 'OP-SUSP-INST'), 20, 20, 'Install suspension components');

-- INTERIOR ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 20, 'Assemble interior components');

-- ELECTRICAL SYSTEM Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ELEC'), (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 10, 15, 'Assemble electrical harness');

-- DASHBOARD ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-DASH'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 15, 'Assemble dashboard');

-- WHEEL ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-WHEEL'), (SELECT id FROM operations WHERE operation_code = 'OP-WHEEL-MOUNT'), 10, 5, 'Mount tire on rim');

-- FRONT SEAT ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-FRONT'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 10, 'Assemble front seat');

-- REAR SEAT ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-REAR'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 10, 'Assemble rear seat');

-- DOOR ASSEMBLIES Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FL'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 'Assemble front left door'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FR'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 'Assemble front right door'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RL'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 'Assemble rear left door'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RR'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 'Assemble rear right door');

-- HOOD ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-HOOD'), (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 10, 15, 'Stamp hood panel'),
((SELECT id FROM products WHERE product_code = 'SUB-HOOD'), (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 20, 10, 'Fit hood hardware');

-- TRUNK ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-TRUNK'), (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 10, 15, 'Stamp trunk panel'),
((SELECT id FROM products WHERE product_code = 'SUB-TRUNK'), (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 20, 10, 'Fit trunk hardware');

-- =====================================================
-- 7. OPERATION DEPENDENCIES
-- =====================================================
-- Note: Since finished products now only have final assembly,
-- dependencies are simpler. Sub-assemblies have their own dependencies.

-- SEDAN MODEL A - Final Assembly Dependencies (Sequential)
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
-- Engine install after marriage
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 10),
 'FS', 0, 'Install engine after body-chassis marriage'),
-- Trans install after engine
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 30),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 20),
 'FS', 0, 'Install transmission after engine'),
-- Interior after trans
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 40),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 30),
 'FS', 0, 'Install interior after drivetrain'),
-- Electrical after trans (can be parallel with interior)
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 50),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 30),
 'FS', 0, 'Install electrical after drivetrain'),
-- Glass after interior and electrical
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 60),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 40),
 'FS', 0, 'Install glass after interior'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 60),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 50),
 'FS', 0, 'Install glass after electrical'),
-- Wheels after glass
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 70),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 60),
 'FS', 0, 'Mount wheels after glass'),
-- Fluids after wheels
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 80),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 70),
 'FS', 0, 'Fill fluids after wheels'),
-- Testing sequence
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 90),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 80),
 'FS', 0, 'Water test after fluids'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 100),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 90),
 'FS', 0, 'Final QC after water test'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 110),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 100),
 'FS', 0, 'Road test after final QC'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 120),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SED-A') AND sequence_number = 110),
 'FS', 0, 'Final detail after road test');

-- SUV MODEL B - Final Assembly Dependencies (Sequential)
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 10),
 'FS', 0, 'Install V6 engine after body-chassis marriage'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 30),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 20),
 'FS', 0, 'Install transmission after engine'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 40),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 30),
 'FS', 0, 'Install interior after drivetrain'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 50),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 30),
 'FS', 0, 'Install electrical after drivetrain'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 60),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 40),
 'FS', 0, 'Install glass after interior'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 60),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 50),
 'FS', 0, 'Install glass after electrical'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 70),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 60),
 'FS', 0, 'Mount wheels after glass'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 80),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 70),
 'FS', 0, 'Fill fluids after wheels'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 90),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 80),
 'FS', 0, 'Water test after fluids'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 100),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 90),
 'FS', 0, 'Final QC after water test'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 110),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 100),
 'FS', 0, 'Road test after final QC'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 120),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'CAR-SUV-B') AND sequence_number = 110),
 'FS', 0, 'Final detail after road test');

-- SEMI-PRODUCT DEPENDENCIES

-- Engine Assembly 2.0L
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-ENGINE') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-ENGINE') AND sequence_number = 10),
 'FS', 0, 'Test engine after assembly');

-- Engine Assembly V6
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6') AND sequence_number = 10),
 'FS', 0, 'Test V6 engine after assembly');

-- Transmission Assembly
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-TRANS') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-TRANS') AND sequence_number = 10),
 'FS', 0, 'Test transmission after assembly');

-- Body Assembly
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 10),
 'FS', 0, 'Trim after stamping'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 30),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 20),
 'FS', 0, 'Weld after trimming'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 40),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 30),
 'FS', 30, 'Fit after welding (30min cool down)'),
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 50),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-BODY') AND sequence_number = 40),
 'FS', 0, 'QC after fitting');

-- Chassis Assembly
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS') AND sequence_number = 10),
 'FS', 0, 'Install suspension after chassis welding');

-- Hood Assembly
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'SUB-HOOD') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'SUB-HOOD') AND sequence_number = 10),
 'FS', 0, 'Fit hardware after stamping');

-- Trunk Assembly
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'SUB-TRUNK') AND sequence_number = 20),
 (SELECT id FROM routing WHERE product_id = (SELECT id FROM products WHERE product_code = 'SUB-TRUNK') AND sequence_number = 10),
 'FS', 0, 'Fit hardware after stamping');

-- =====================================================
-- 8. ROUTING BOM (Link BOM Components to Routing Steps)
-- =====================================================
-- This links which materials/components are consumed at which routing step

-- SEDAN MODEL A - Component consumption during final assembly
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
-- At Marriage step (seq 10): Body and Chassis assemblies
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'ASSY-BODY'),
 'at_start', 'Body assembly consumed at marriage'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'ASSY-CHASSIS'),
 'at_start', 'Chassis assembly consumed at marriage'),
-- At Engine Install step (seq 20)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 20),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'ASSY-ENGINE'),
 'at_start', 'Engine assembly consumed at engine install'),
-- At Transmission Install step (seq 30)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 30),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'ASSY-TRANS'),
 'at_start', 'Transmission consumed at trans install'),
-- At Interior Install step (seq 40)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'ASSY-INTERIOR'),
 'at_start', 'Interior consumed at interior install'),
-- At Electrical Install step (seq 50)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 50),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'ASSY-ELEC'),
 'at_start', 'Electrical system consumed at elec install'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 50),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'COMP-BATTERY'),
 'at_start', 'Battery consumed at elec install'),
-- At Wheel Mount step (seq 70)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 70),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'SUB-WHEEL'),
 'at_start', 'Wheels consumed at wheel mount');

-- SUV MODEL B - Component consumption during final assembly
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
-- At Marriage step (seq 10): Body and Chassis assemblies
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'ASSY-BODY'),
 'at_start', 'Body assembly consumed at marriage'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'ASSY-CHASSIS'),
 'at_start', 'Chassis assembly consumed at marriage'),
-- At Engine Install step (seq 20) - V6
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 20),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'ASSY-ENGINE-V6'),
 'at_start', 'V6 Engine assembly consumed at engine install'),
-- At Transmission Install step (seq 30)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 30),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'ASSY-TRANS'),
 'at_start', 'Transmission consumed at trans install'),
-- At Interior Install step (seq 40)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'ASSY-INTERIOR'),
 'at_start', 'Interior consumed at interior install'),
-- At Electrical Install step (seq 50)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 50),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'ASSY-ELEC'),
 'at_start', 'Electrical system consumed at elec install'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 50),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'COMP-BATTERY'),
 'at_start', 'Battery consumed at elec install'),
-- At Wheel Mount step (seq 70)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 70),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'SUB-WHEEL'),
 'at_start', 'Wheels consumed at wheel mount'),
-- Consumables for CAR-SUV-B (Paint, Clearcoat, Bolt-kit) at Final Detail step (seq 120)
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 120),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'RM-PAINT'),
 'at_start', 'Paint consumed during final assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 120),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'RM-CLEARCOAT'),
 'at_start', 'Clearcoat consumed during final assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SUV-B' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SUV-B' AND c.product_code = 'RM-BOLT-KIT'),
 'proportional', 'Bolt kit consumed throughout assembly');

-- SEDAN MODEL A - Additional consumables
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 120),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'RM-PAINT'),
 'at_start', 'Paint consumed during final assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 120),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'RM-CLEARCOAT'),
 'at_start', 'Clearcoat consumed during final assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'CAR-SED-A' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'CAR-SED-A' AND c.product_code = 'RM-BOLT-KIT'),
 'proportional', 'Bolt kit consumed throughout assembly');

-- =====================================================
-- 8B. ROUTING BOM FOR SEMI-PRODUCTS
-- =====================================================
-- Link all BOM components to their corresponding routing steps for semi-products

-- ENGINE ASSEMBLY 2.0L - Routing BOM
-- All engine components consumed at first step (Engine Assembly)
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-ENGINE-BLOCK'),
 'at_start', 'Engine block consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-CYLINDER-HEAD'),
 'at_start', 'Cylinder head consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-CRANKSHAFT'),
 'at_start', 'Crankshaft consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-PISTON-SET'),
 'at_start', 'Piston set consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-CAMSHAFT'),
 'at_start', 'Camshafts consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-ALTERNATOR'),
 'at_end', 'Alternator installed at assembly end'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-STARTER'),
 'at_end', 'Starter motor installed at assembly end'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE' AND c.product_code = 'COMP-ECU'),
 'at_end', 'ECU installed at assembly end');

-- ENGINE ASSEMBLY V6 - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-ENGINE-BLOCK'),
 'at_start', 'V6 engine block consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-CYLINDER-HEAD'),
 'at_start', 'Cylinder heads (2) consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-CRANKSHAFT'),
 'at_start', 'Crankshaft consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-PISTON-SET'),
 'at_start', 'Piston set (1.5) consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-CAMSHAFT'),
 'at_start', 'Camshafts (4) consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-ALTERNATOR'),
 'at_end', 'Alternator installed at assembly end'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-STARTER'),
 'at_end', 'Starter motor installed at assembly end'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ENGINE-V6' AND c.product_code = 'COMP-ECU'),
 'at_end', 'ECU installed at assembly end');

-- TRANSMISSION ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-TRANS' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-TRANS' AND c.product_code = 'COMP-TRANS-CASE'),
 'at_start', 'Transmission case consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-TRANS' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-TRANS' AND c.product_code = 'COMP-GEARSET'),
 'at_start', 'Gear set consumed at assembly start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-TRANS' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-TRANS' AND c.product_code = 'COMP-TORQUE-CONV'),
 'at_end', 'Torque converter installed at assembly end');

-- BODY ASSEMBLY - Routing BOM
-- Stamping step (seq 10): Steel and aluminum sheets
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'RM-STEEL-SHEET'),
 'at_start', 'Steel sheet consumed for stamping body panels'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'RM-ALUMINUM'),
 'at_start', 'Aluminum sheet consumed for stamping');
-- Welding step (seq 30): Adhesive
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 30),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'RM-ADHESIVE'),
 'proportional', 'Structural adhesive used during welding'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 30),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'RM-PRIMER'),
 'at_end', 'Primer applied after welding');
-- Body fit-up step (seq 40): Doors, hood, trunk, components
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'SUB-DOOR-FL'),
 'at_start', 'Front left door installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'SUB-DOOR-FR'),
 'at_start', 'Front right door installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'SUB-DOOR-RL'),
 'at_start', 'Rear left door installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'SUB-DOOR-RR'),
 'at_start', 'Rear right door installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'SUB-HOOD'),
 'at_start', 'Hood installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'SUB-TRUNK'),
 'at_start', 'Trunk installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'COMP-WINDSHIELD'),
 'at_end', 'Windshield installed at body fit-up end'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'COMP-BUMPER-F'),
 'at_start', 'Front bumper installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'COMP-BUMPER-R'),
 'at_start', 'Rear bumper installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'COMP-HEADLIGHT'),
 'at_end', 'Headlights installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'COMP-TAILLIGHT'),
 'at_end', 'Taillights installed during body fit-up'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-BODY' AND r.sequence_number = 40),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-BODY' AND c.product_code = 'COMP-MIRROR'),
 'at_end', 'Side mirrors installed during body fit-up');

-- CHASSIS ASSEMBLY - Routing BOM
-- Chassis welding step (seq 10): Steel tube and bolt kit
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-CHASSIS' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-CHASSIS' AND c.product_code = 'RM-STEEL-TUBE'),
 'at_start', 'Steel tube consumed for chassis frame welding'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-CHASSIS' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-CHASSIS' AND c.product_code = 'RM-BOLT-KIT'),
 'proportional', 'Bolt kit used throughout chassis welding');
-- Suspension install step (seq 20): Shocks and springs
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-CHASSIS' AND r.sequence_number = 20),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-CHASSIS' AND c.product_code = 'COMP-SHOCK'),
 'at_start', 'Shock absorbers installed in suspension step'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-CHASSIS' AND r.sequence_number = 20),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-CHASSIS' AND c.product_code = 'COMP-SPRING'),
 'at_start', 'Coil springs installed in suspension step');

-- INTERIOR ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-INTERIOR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-INTERIOR' AND c.product_code = 'SUB-SEAT-FRONT'),
 'at_start', 'Front seats installed in interior assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-INTERIOR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-INTERIOR' AND c.product_code = 'SUB-SEAT-REAR'),
 'at_start', 'Rear seat installed in interior assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-INTERIOR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-INTERIOR' AND c.product_code = 'ASSY-DASH'),
 'at_start', 'Dashboard assembly installed in interior'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-INTERIOR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-INTERIOR' AND c.product_code = 'COMP-STEERING'),
 'at_end', 'Steering wheel installed in interior'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-INTERIOR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-INTERIOR' AND c.product_code = 'COMP-AIRBAG'),
 'at_end', 'Airbags installed in interior');

-- ELECTRICAL SYSTEM - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ELEC' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ELEC' AND c.product_code = 'COMP-WIRING'),
 'at_start', 'Wiring harness consumed in electrical assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-ELEC' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-ELEC' AND c.product_code = 'COMP-ECU'),
 'at_end', 'ECU installed in electrical system');

-- DASHBOARD ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'ASSY-DASH' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'ASSY-DASH' AND c.product_code = 'COMP-DASHBOARD'),
 'at_start', 'Dashboard molding consumed in dashboard assembly');

-- WHEEL ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-WHEEL' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-WHEEL' AND c.product_code = 'COMP-TIRE'),
 'at_start', 'Tire consumed in wheel assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-WHEEL' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-WHEEL' AND c.product_code = 'COMP-RIM'),
 'at_start', 'Alloy rim consumed in wheel assembly');

-- FRONT SEAT ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-SEAT-FRONT' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-SEAT-FRONT' AND c.product_code = 'COMP-SEAT-FRAME'),
 'at_start', 'Seat frame consumed in front seat assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-SEAT-FRONT' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-SEAT-FRONT' AND c.product_code = 'COMP-SEAT-FOAM'),
 'at_start', 'Seat foam consumed in front seat assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-SEAT-FRONT' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-SEAT-FRONT' AND c.product_code = 'COMP-SEAT-COVER'),
 'at_end', 'Seat cover installed in front seat assembly');

-- REAR SEAT ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-SEAT-REAR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-SEAT-REAR' AND c.product_code = 'COMP-SEAT-FRAME'),
 'at_start', 'Seat frame consumed in rear seat assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-SEAT-REAR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-SEAT-REAR' AND c.product_code = 'COMP-SEAT-FOAM'),
 'at_start', 'Seat foam consumed in rear seat assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-SEAT-REAR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-SEAT-REAR' AND c.product_code = 'COMP-SEAT-COVER'),
 'at_end', 'Seat cover installed in rear seat assembly');

-- DOOR ASSEMBLIES - Routing BOM
-- Front Left Door
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-FL' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-FL' AND c.product_code = 'RM-STEEL-SHEET'),
 'at_start', 'Steel sheet consumed for FL door panel'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-FL' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-FL' AND c.product_code = 'COMP-WINDOW'),
 'at_end', 'Window glass installed in FL door');
-- Front Right Door
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-FR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-FR' AND c.product_code = 'RM-STEEL-SHEET'),
 'at_start', 'Steel sheet consumed for FR door panel'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-FR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-FR' AND c.product_code = 'COMP-WINDOW'),
 'at_end', 'Window glass installed in FR door');
-- Rear Left Door
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-RL' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-RL' AND c.product_code = 'RM-STEEL-SHEET'),
 'at_start', 'Steel sheet consumed for RL door panel'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-RL' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-RL' AND c.product_code = 'COMP-WINDOW'),
 'at_end', 'Window glass installed in RL door');
-- Rear Right Door
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-RR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-RR' AND c.product_code = 'RM-STEEL-SHEET'),
 'at_start', 'Steel sheet consumed for RR door panel'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-DOOR-RR' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-DOOR-RR' AND c.product_code = 'COMP-WINDOW'),
 'at_end', 'Window glass installed in RR door');

-- HOOD ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-HOOD' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-HOOD' AND c.product_code = 'RM-ALUMINUM'),
 'at_start', 'Aluminum sheet consumed for hood stamping');

-- TRUNK ASSEMBLY - Routing BOM
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id = p.id WHERE p.product_code = 'SUB-TRUNK' AND r.sequence_number = 10),
 (SELECT b.id FROM bom b JOIN products p ON b.parent_product_id = p.id JOIN products c ON b.component_product_id = c.id WHERE p.product_code = 'SUB-TRUNK' AND c.product_code = 'RM-STEEL-SHEET'),
 'at_start', 'Steel sheet consumed for trunk stamping');

-- =====================================================

-- =====================================================
-- 9. SAMPLE ORDERS (GENERATED)
-- =====================================================


-- Generated Set 1
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-001', '2026-02-08', '2026-03-22', 'Customer 1', 2, 'confirmed', 'Generated Order 1');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-001'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-001', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-001') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-02-08', '2026-03-22', 'released', 6, 'Generated PO 1 (5 units)');


-- Generated Set 2
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-002', '2026-01-07', '2026-02-24', 'Customer 2', 3, 'confirmed', 'Generated Order 2');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-002'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-002', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-002') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-07', '2026-02-24', 'released', 2, 'Generated PO 2 (6 units)');


-- Generated Set 3
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-003', '2026-01-19', '2026-04-12', 'Customer 3', 4, 'confirmed', 'Generated Order 3');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-003'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-003', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-003') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-19', '2026-04-12', 'released', 8, 'Generated PO 3 (7 units)');


-- Generated Set 4
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-004', '2026-01-11', '2026-02-27', 'Customer 4', 5, 'confirmed', 'Generated Order 4');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-004'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-004', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-004') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-11', '2026-02-27', 'released', 5, 'Generated PO 4 (8 units)');


-- Generated Set 5
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-005', '2026-01-03', '2026-02-02', 'Customer 5', 6, 'confirmed', 'Generated Order 5');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-005'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-005', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-005') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-01-03', '2026-02-02', 'released', 2, 'Generated PO 5 (9 units)');


-- Generated Set 6
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-006', '2026-02-12', '2026-03-16', 'Customer 6', 7, 'confirmed', 'Generated Order 6');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-006'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-006', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-006') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-02-12', '2026-03-16', 'released', 1, 'Generated PO 6 (10 units)');


-- Generated Set 7
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-007', '2026-02-03', '2026-03-14', 'Customer 7', 8, 'confirmed', 'Generated Order 7');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-007'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-007', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-007') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-02-03', '2026-03-14', 'released', 9, 'Generated PO 7 (5 units)');


-- Generated Set 8
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-008', '2026-01-22', '2026-04-03', 'Customer 8', 9, 'confirmed', 'Generated Order 8');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-008'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-008', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-008') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-22', '2026-04-03', 'released', 7, 'Generated PO 8 (6 units)');


-- Generated Set 9
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-009', '2026-01-09', '2026-03-18', 'Customer 9', 10, 'confirmed', 'Generated Order 9');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-009'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-009', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-009') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-09', '2026-03-18', 'released', 10, 'Generated PO 9 (7 units)');


-- Generated Set 10
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-010', '2026-01-05', '2026-03-05', 'Customer 10', 1, 'confirmed', 'Generated Order 10');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-010'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-010', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-010') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-05', '2026-03-05', 'released', 5, 'Generated PO 10 (8 units)');


-- Generated Set 11
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-011', '2026-02-04', '2026-04-26', 'Customer 11', 2, 'confirmed', 'Generated Order 11');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-011'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-011', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-011') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-04', '2026-04-26', 'released', 3, 'Generated PO 11 (9 units)');


-- Generated Set 12
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-012', '2026-01-22', '2026-03-26', 'Customer 12', 3, 'confirmed', 'Generated Order 12');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-012'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-012', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-012') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-22', '2026-03-26', 'released', 1, 'Generated PO 12 (10 units)');


-- Generated Set 13
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-013', '2026-01-23', '2026-03-25', 'Customer 13', 4, 'confirmed', 'Generated Order 13');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-013'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-013', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-013') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-23', '2026-03-25', 'released', 10, 'Generated PO 13 (5 units)');


-- Generated Set 14
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-014', '2026-01-21', '2026-03-15', 'Customer 14', 5, 'confirmed', 'Generated Order 14');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-014'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-014', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-014') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-21', '2026-03-15', 'released', 7, 'Generated PO 14 (6 units)');


-- Generated Set 15
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-015', '2026-02-02', '2026-03-16', 'Customer 15', 6, 'confirmed', 'Generated Order 15');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-015'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-015', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-015') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-02-02', '2026-03-16', 'released', 10, 'Generated PO 15 (7 units)');


-- Generated Set 16
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-016', '2026-01-18', '2026-03-05', 'Customer 16', 7, 'confirmed', 'Generated Order 16');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-016'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-016', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-016') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-18', '2026-03-05', 'released', 10, 'Generated PO 16 (8 units)');


-- Generated Set 17
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-017', '2026-02-17', '2026-05-02', 'Customer 17', 8, 'confirmed', 'Generated Order 17');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-017'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-017', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-017') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-17', '2026-05-02', 'released', 4, 'Generated PO 17 (9 units)');


-- Generated Set 18
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-018', '2026-02-10', '2026-04-12', 'Customer 18', 9, 'confirmed', 'Generated Order 18');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-018'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-018', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-018') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-02-10', '2026-04-12', 'released', 8, 'Generated PO 18 (10 units)');


-- Generated Set 19
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-019', '2026-02-05', '2026-04-05', 'Customer 19', 10, 'confirmed', 'Generated Order 19');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-019'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-019', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-019') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-02-05', '2026-04-05', 'released', 7, 'Generated PO 19 (5 units)');


-- Generated Set 20
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-020', '2026-02-21', '2026-04-24', 'Customer 20', 1, 'confirmed', 'Generated Order 20');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-020'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-020', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-020') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-02-21', '2026-04-24', 'released', 6, 'Generated PO 20 (6 units)');


-- Generated Set 21
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-021', '2026-01-04', '2026-03-24', 'Customer 21', 2, 'confirmed', 'Generated Order 21');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-021'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-021', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-021') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-04', '2026-03-24', 'released', 6, 'Generated PO 21 (7 units)');


-- Generated Set 22
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-022', '2026-02-16', '2026-05-09', 'Customer 22', 3, 'confirmed', 'Generated Order 22');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-022'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-022', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-022') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-02-16', '2026-05-09', 'released', 3, 'Generated PO 22 (8 units)');


-- Generated Set 23
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-023', '2026-02-01', '2026-04-03', 'Customer 23', 4, 'confirmed', 'Generated Order 23');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-023'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-023', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-023') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-01', '2026-04-03', 'released', 4, 'Generated PO 23 (9 units)');


-- Generated Set 24
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-024', '2026-01-05', '2026-03-27', 'Customer 24', 5, 'confirmed', 'Generated Order 24');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-024'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-024', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-024') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-05', '2026-03-27', 'released', 1, 'Generated PO 24 (10 units)');


-- Generated Set 25
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-025', '2026-01-25', '2026-03-23', 'Customer 25', 6, 'confirmed', 'Generated Order 25');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-025'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-025', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-025') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-25', '2026-03-23', 'released', 9, 'Generated PO 25 (5 units)');


-- Generated Set 26
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-026', '2026-02-09', '2026-04-15', 'Customer 26', 7, 'confirmed', 'Generated Order 26');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-026'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-026', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-026') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-02-09', '2026-04-15', 'released', 5, 'Generated PO 26 (6 units)');


-- Generated Set 27
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-027', '2026-01-01', '2026-03-14', 'Customer 27', 8, 'confirmed', 'Generated Order 27');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-027'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-027', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-027') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-01', '2026-03-14', 'released', 10, 'Generated PO 27 (7 units)');


-- Generated Set 28
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-028', '2026-02-06', '2026-03-10', 'Customer 28', 9, 'confirmed', 'Generated Order 28');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-028'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-028', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-028') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-02-06', '2026-03-10', 'released', 3, 'Generated PO 28 (8 units)');


-- Generated Set 29
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-029', '2026-02-25', '2026-05-19', 'Customer 29', 10, 'confirmed', 'Generated Order 29');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-029'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-029', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-029') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-25', '2026-05-19', 'released', 8, 'Generated PO 29 (9 units)');


-- Generated Set 30
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-030', '2026-02-22', '2026-04-11', 'Customer 30', 1, 'confirmed', 'Generated Order 30');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-030'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-030', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-030') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-02-22', '2026-04-11', 'released', 4, 'Generated PO 30 (10 units)');


-- Generated Set 31
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-031', '2026-01-03', '2026-02-22', 'Customer 31', 2, 'confirmed', 'Generated Order 31');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-031'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-031', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-031') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-03', '2026-02-22', 'released', 10, 'Generated PO 31 (5 units)');


-- Generated Set 32
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-032', '2026-01-25', '2026-03-25', 'Customer 32', 3, 'confirmed', 'Generated Order 32');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-032'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-032', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-032') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-25', '2026-03-25', 'released', 10, 'Generated PO 32 (6 units)');


-- Generated Set 33
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-033', '2026-01-14', '2026-04-05', 'Customer 33', 4, 'confirmed', 'Generated Order 33');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-033'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-033', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-033') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-14', '2026-04-05', 'released', 3, 'Generated PO 33 (7 units)');


-- Generated Set 34
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-034', '2026-01-17', '2026-02-22', 'Customer 34', 5, 'confirmed', 'Generated Order 34');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-034'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-034', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-034') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-17', '2026-02-22', 'released', 9, 'Generated PO 34 (8 units)');


-- Generated Set 35
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-035', '2026-02-03', '2026-04-02', 'Customer 35', 6, 'confirmed', 'Generated Order 35');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-035'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-035', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-035') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-03', '2026-04-02', 'released', 10, 'Generated PO 35 (9 units)');


-- Generated Set 36
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-036', '2026-02-08', '2026-04-23', 'Customer 36', 7, 'confirmed', 'Generated Order 36');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-036'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-036', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-036') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-02-08', '2026-04-23', 'released', 7, 'Generated PO 36 (10 units)');


-- Generated Set 37
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-037', '2026-01-30', '2026-04-15', 'Customer 37', 8, 'confirmed', 'Generated Order 37');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-037'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-037', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-037') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-30', '2026-04-15', 'released', 7, 'Generated PO 37 (5 units)');


-- Generated Set 38
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-038', '2026-01-29', '2026-04-19', 'Customer 38', 9, 'confirmed', 'Generated Order 38');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-038'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-038', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-038') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-29', '2026-04-19', 'released', 9, 'Generated PO 38 (6 units)');


-- Generated Set 39
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-039', '2026-02-19', '2026-04-22', 'Customer 39', 10, 'confirmed', 'Generated Order 39');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-039'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-039', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-039') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-02-19', '2026-04-22', 'released', 4, 'Generated PO 39 (7 units)');


-- Generated Set 40
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-040', '2026-01-08', '2026-02-23', 'Customer 40', 1, 'confirmed', 'Generated Order 40');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-040'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-040', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-040') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-08', '2026-02-23', 'released', 1, 'Generated PO 40 (8 units)');


-- Generated Set 41
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-041', '2026-02-01', '2026-03-31', 'Customer 41', 2, 'confirmed', 'Generated Order 41');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-041'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-041', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-041') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-01', '2026-03-31', 'released', 9, 'Generated PO 41 (9 units)');


-- Generated Set 42
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-042', '2026-01-16', '2026-02-26', 'Customer 42', 3, 'confirmed', 'Generated Order 42');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-042'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-042', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-042') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-16', '2026-02-26', 'released', 4, 'Generated PO 42 (10 units)');


-- Generated Set 43
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-043', '2026-02-07', '2026-04-05', 'Customer 43', 4, 'confirmed', 'Generated Order 43');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-043'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-043', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-043') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-02-07', '2026-04-05', 'released', 6, 'Generated PO 43 (5 units)');


-- Generated Set 44
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-044', '2026-01-26', '2026-04-19', 'Customer 44', 5, 'confirmed', 'Generated Order 44');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-044'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-044', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-044') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-26', '2026-04-19', 'released', 5, 'Generated PO 44 (6 units)');


-- Generated Set 45
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-045', '2026-01-06', '2026-03-23', 'Customer 45', 6, 'confirmed', 'Generated Order 45');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-045'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-045', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-045') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-06', '2026-03-23', 'released', 3, 'Generated PO 45 (7 units)');


-- Generated Set 46
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-046', '2026-01-28', '2026-03-29', 'Customer 46', 7, 'confirmed', 'Generated Order 46');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-046'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-046', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-046') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-28', '2026-03-29', 'released', 8, 'Generated PO 46 (8 units)');


-- Generated Set 47
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-047', '2026-02-28', '2026-04-03', 'Customer 47', 8, 'confirmed', 'Generated Order 47');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-047'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-047', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-047') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-28', '2026-04-03', 'released', 4, 'Generated PO 47 (9 units)');


-- Generated Set 48
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-048', '2026-01-09', '2026-03-21', 'Customer 48', 9, 'confirmed', 'Generated Order 48');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-048'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-048', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-048') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-09', '2026-03-21', 'released', 6, 'Generated PO 48 (10 units)');


-- Generated Set 49
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-049', '2026-01-24', '2026-03-12', 'Customer 49', 10, 'confirmed', 'Generated Order 49');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-049'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-049', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-049') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-24', '2026-03-12', 'released', 10, 'Generated PO 49 (5 units)');


-- Generated Set 50
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-050', '2026-01-31', '2026-04-02', 'Customer 50', 1, 'confirmed', 'Generated Order 50');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-050'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-050', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-050') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-31', '2026-04-02', 'released', 2, 'Generated PO 50 (6 units)');


-- Generated Set 51
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-051', '2026-01-27', '2026-03-21', 'Customer 51', 2, 'confirmed', 'Generated Order 51');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-051'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-051', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-051') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-27', '2026-03-21', 'released', 8, 'Generated PO 51 (7 units)');


-- Generated Set 52
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-052', '2026-01-20', '2026-02-25', 'Customer 52', 3, 'confirmed', 'Generated Order 52');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-052'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-052', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-052') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-20', '2026-02-25', 'released', 2, 'Generated PO 52 (8 units)');


-- Generated Set 53
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-053', '2026-01-23', '2026-03-06', 'Customer 53', 4, 'confirmed', 'Generated Order 53');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-053'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-053', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-053') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-01-23', '2026-03-06', 'released', 1, 'Generated PO 53 (9 units)');


-- Generated Set 54
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-054', '2026-02-24', '2026-05-12', 'Customer 54', 5, 'confirmed', 'Generated Order 54');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-054'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-054', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-054') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-02-24', '2026-05-12', 'released', 9, 'Generated PO 54 (10 units)');


-- Generated Set 55
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-055', '2026-01-10', '2026-04-04', 'Customer 55', 6, 'confirmed', 'Generated Order 55');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-055'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-055', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-055') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-10', '2026-04-04', 'released', 4, 'Generated PO 55 (5 units)');


-- Generated Set 56
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-056', '2026-02-11', '2026-04-08', 'Customer 56', 7, 'confirmed', 'Generated Order 56');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-056'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-056', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-056') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-02-11', '2026-04-08', 'released', 1, 'Generated PO 56 (6 units)');


-- Generated Set 57
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-057', '2026-01-26', '2026-03-06', 'Customer 57', 8, 'confirmed', 'Generated Order 57');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-057'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-057', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-057') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-26', '2026-03-06', 'released', 8, 'Generated PO 57 (7 units)');


-- Generated Set 58
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-058', '2026-01-08', '2026-03-07', 'Customer 58', 9, 'confirmed', 'Generated Order 58');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-058'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-058', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-058') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-08', '2026-03-07', 'released', 5, 'Generated PO 58 (8 units)');


-- Generated Set 59
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-059', '2026-01-30', '2026-03-01', 'Customer 59', 10, 'confirmed', 'Generated Order 59');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-059'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-059', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-059') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-01-30', '2026-03-01', 'released', 2, 'Generated PO 59 (9 units)');


-- Generated Set 60
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-060', '2026-01-02', '2026-02-06', 'Customer 60', 1, 'confirmed', 'Generated Order 60');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-060'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-060', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-060') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-02', '2026-02-06', 'released', 8, 'Generated PO 60 (10 units)');


-- Generated Set 61
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-061', '2026-01-19', '2026-02-18', 'Customer 61', 2, 'confirmed', 'Generated Order 61');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-061'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-061', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-061') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-19', '2026-02-18', 'released', 3, 'Generated PO 61 (5 units)');


-- Generated Set 62
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-062', '2026-02-04', '2026-04-03', 'Customer 62', 3, 'confirmed', 'Generated Order 62');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-062'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-062', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-062') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-02-04', '2026-04-03', 'released', 9, 'Generated PO 62 (6 units)');


-- Generated Set 63
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-063', '2026-02-05', '2026-04-13', 'Customer 63', 4, 'confirmed', 'Generated Order 63');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-063'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-063', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-063') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-02-05', '2026-04-13', 'released', 10, 'Generated PO 63 (7 units)');


-- Generated Set 64
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-064', '2026-01-12', '2026-03-17', 'Customer 64', 5, 'confirmed', 'Generated Order 64');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-064'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-064', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-064') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-12', '2026-03-17', 'released', 6, 'Generated PO 64 (8 units)');


-- Generated Set 65
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-065', '2026-02-13', '2026-05-07', 'Customer 65', 6, 'confirmed', 'Generated Order 65');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-065'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-065', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-065') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-13', '2026-05-07', 'released', 3, 'Generated PO 65 (9 units)');


-- Generated Set 66
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-066', '2026-01-10', '2026-02-14', 'Customer 66', 7, 'confirmed', 'Generated Order 66');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-066'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-066', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-066') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-10', '2026-02-14', 'released', 9, 'Generated PO 66 (10 units)');


-- Generated Set 67
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-067', '2026-02-07', '2026-04-17', 'Customer 67', 8, 'confirmed', 'Generated Order 67');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-067'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-067', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-067') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-02-07', '2026-04-17', 'released', 3, 'Generated PO 67 (5 units)');


-- Generated Set 68
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-068', '2026-02-18', '2026-05-09', 'Customer 68', 9, 'confirmed', 'Generated Order 68');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-068'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-068', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-068') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-02-18', '2026-05-09', 'released', 6, 'Generated PO 68 (6 units)');


-- Generated Set 69
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-069', '2026-02-15', '2026-03-29', 'Customer 69', 10, 'confirmed', 'Generated Order 69');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-069'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-069', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-069') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-02-15', '2026-03-29', 'released', 7, 'Generated PO 69 (7 units)');


-- Generated Set 70
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-070', '2026-02-14', '2026-03-31', 'Customer 70', 1, 'confirmed', 'Generated Order 70');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-070'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-070', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-070') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-02-14', '2026-03-31', 'released', 2, 'Generated PO 70 (8 units)');


-- Generated Set 71
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-071', '2026-02-02', '2026-03-11', 'Customer 71', 2, 'confirmed', 'Generated Order 71');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-071'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-071', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-071') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-02', '2026-03-11', 'released', 8, 'Generated PO 71 (9 units)');


-- Generated Set 72
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-072', '2026-02-20', '2026-04-30', 'Customer 72', 3, 'confirmed', 'Generated Order 72');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-072'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-072', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-072') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-02-20', '2026-04-30', 'released', 6, 'Generated PO 72 (10 units)');


-- Generated Set 73
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-073', '2026-01-27', '2026-02-28', 'Customer 73', 4, 'confirmed', 'Generated Order 73');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-073'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-073', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-073') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-27', '2026-02-28', 'released', 4, 'Generated PO 73 (5 units)');


-- Generated Set 74
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-074', '2026-02-09', '2026-04-28', 'Customer 74', 5, 'confirmed', 'Generated Order 74');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-074'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-074', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-074') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-02-09', '2026-04-28', 'released', 5, 'Generated PO 74 (6 units)');


-- Generated Set 75
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-075', '2026-01-28', '2026-04-02', 'Customer 75', 6, 'confirmed', 'Generated Order 75');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-075'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-075', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-075') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-28', '2026-04-02', 'released', 7, 'Generated PO 75 (7 units)');


-- Generated Set 76
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-076', '2026-01-02', '2026-02-18', 'Customer 76', 7, 'confirmed', 'Generated Order 76');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-076'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-076', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-076') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-02', '2026-02-18', 'released', 7, 'Generated PO 76 (8 units)');


-- Generated Set 77
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-077', '2026-02-27', '2026-05-10', 'Customer 77', 8, 'confirmed', 'Generated Order 77');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-077'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-077', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-077') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-02-27', '2026-05-10', 'released', 8, 'Generated PO 77 (9 units)');


-- Generated Set 78
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-078', '2026-01-13', '2026-04-01', 'Customer 78', 9, 'confirmed', 'Generated Order 78');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-078'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-078', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-078') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-13', '2026-04-01', 'released', 1, 'Generated PO 78 (10 units)');


-- Generated Set 79
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-079', '2026-02-06', '2026-04-17', 'Customer 79', 10, 'confirmed', 'Generated Order 79');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-079'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-079', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-079') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-02-06', '2026-04-17', 'released', 5, 'Generated PO 79 (5 units)');


-- Generated Set 80
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-080', '2026-01-15', '2026-03-08', 'Customer 80', 1, 'confirmed', 'Generated Order 80');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-080'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-080', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-080') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-15', '2026-03-08', 'released', 5, 'Generated PO 80 (6 units)');


-- Generated Set 81
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-081', '2026-01-11', '2026-02-19', 'Customer 81', 2, 'confirmed', 'Generated Order 81');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-081'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-081', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-081') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-11', '2026-02-19', 'released', 1, 'Generated PO 81 (7 units)');


-- Generated Set 82
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-082', '2026-01-20', '2026-02-19', 'Customer 82', 3, 'confirmed', 'Generated Order 82');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-082'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-082', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-082') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-20', '2026-02-19', 'released', 1, 'Generated PO 82 (8 units)');


-- Generated Set 83
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-083', '2026-01-01', '2026-02-20', 'Customer 83', 4, 'confirmed', 'Generated Order 83');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-083'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-083', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-083') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-01-01', '2026-02-20', 'released', 9, 'Generated PO 83 (9 units)');


-- Generated Set 84
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-084', '2026-01-31', '2026-04-13', 'Customer 84', 5, 'confirmed', 'Generated Order 84');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-084'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-084', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-084') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-31', '2026-04-13', 'released', 2, 'Generated PO 84 (10 units)');


-- Generated Set 85
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-085', '2026-02-26', '2026-05-04', 'Customer 85', 6, 'confirmed', 'Generated Order 85');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-085'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-085', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-085') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-02-26', '2026-05-04', 'released', 1, 'Generated PO 85 (5 units)');


-- Generated Set 86
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-086', '2026-01-17', '2026-03-24', 'Customer 86', 7, 'confirmed', 'Generated Order 86');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-086'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-086', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-086') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-17', '2026-03-24', 'released', 5, 'Generated PO 86 (6 units)');


-- Generated Set 87
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-087', '2026-01-04', '2026-03-24', 'Customer 87', 8, 'confirmed', 'Generated Order 87');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-087'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-087', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-087') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-04', '2026-03-24', 'released', 3, 'Generated PO 87 (7 units)');


-- Generated Set 88
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-088', '2026-01-12', '2026-04-07', 'Customer 88', 9, 'confirmed', 'Generated Order 88');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-088'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-088', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-088') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-12', '2026-04-07', 'released', 7, 'Generated PO 88 (8 units)');


-- Generated Set 89
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-089', '2026-01-15', '2026-03-17', 'Customer 89', 10, 'confirmed', 'Generated Order 89');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-089'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-089', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-089') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-01-15', '2026-03-17', 'released', 2, 'Generated PO 89 (9 units)');


-- Generated Set 90
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-090', '2026-02-23', '2026-05-08', 'Customer 90', 1, 'confirmed', 'Generated Order 90');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-090'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-090', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-090') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-02-23', '2026-05-08', 'released', 5, 'Generated PO 90 (10 units)');


-- Generated Set 91
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-091', '2026-01-13', '2026-03-30', 'Customer 91', 2, 'confirmed', 'Generated Order 91');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-091'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-091', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-091') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-13', '2026-03-30', 'released', 6, 'Generated PO 91 (5 units)');


-- Generated Set 92
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-092', '2026-01-21', '2026-02-28', 'Customer 92', 3, 'confirmed', 'Generated Order 92');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-092'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-092', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-092') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-21', '2026-02-28', 'released', 7, 'Generated PO 92 (6 units)');


-- Generated Set 93
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-093', '2026-01-18', '2026-03-23', 'Customer 93', 4, 'confirmed', 'Generated Order 93');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-093'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-093', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-093') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-01-18', '2026-03-23', 'released', 4, 'Generated PO 93 (7 units)');


-- Generated Set 94
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-094', '2026-01-29', '2026-03-14', 'Customer 94', 5, 'confirmed', 'Generated Order 94');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-094'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-094', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-094') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-29', '2026-03-14', 'released', 8, 'Generated PO 94 (8 units)');


-- Generated Set 95
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-095', '2026-01-14', '2026-03-15', 'Customer 95', 6, 'confirmed', 'Generated Order 95');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-095'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 9, 18000.0, 162000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-095', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-095') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 9, 0, '2026-01-14', '2026-03-15', 'released', 2, 'Generated PO 95 (9 units)');


-- Generated Set 96
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-096', '2026-01-24', '2026-04-01', 'Customer 96', 7, 'confirmed', 'Generated Order 96');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-096'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 10, 28000.0, 280000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-096', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-096') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 10, 0, '2026-01-24', '2026-04-01', 'released', 3, 'Generated PO 96 (10 units)');


-- Generated Set 97
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-097', '2026-01-07', '2026-02-14', 'Customer 97', 8, 'confirmed', 'Generated Order 97');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-097'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 18000.0, 90000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-097', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-097') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 5, 0, '2026-01-07', '2026-02-14', 'released', 9, 'Generated PO 97 (5 units)');


-- Generated Set 98
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-098', '2026-01-06', '2026-03-15', 'Customer 98', 9, 'confirmed', 'Generated Order 98');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-098'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 6, 28000.0, 168000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-098', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-098') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 6, 0, '2026-01-06', '2026-03-15', 'released', 6, 'Generated PO 98 (6 units)');


-- Generated Set 99
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-099', '2026-02-10', '2026-04-25', 'Customer 99', 10, 'confirmed', 'Generated Order 99');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-099'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 7, 18000.0, 126000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-099', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-099') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 
 7, 0, '2026-02-10', '2026-04-25', 'released', 2, 'Generated PO 99 (7 units)');


-- Generated Set 100
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2026-100', '2026-01-16', '2026-03-19', 'Customer 100', 1, 'confirmed', 'Generated Order 100');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number = 'ORD-2026-100'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 8, 28000.0, 224000.0, 'Auto-generated item');

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
('PO-2026-100', 
 (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2026-100') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 
 8, 0, '2026-01-16', '2026-03-19', 'released', 4, 'Generated PO 100 (8 units)');
-- =====================================================
-- 10. SAMPLE PRODUCTION ORDERS (Replaced by above)
-- =====================================================
-- (Included in the loops above)

-- END OF CAR MANUFACTURING SAMPLE DATA
-- =====================================================

-- Summary statistics
SELECT 'Sample Data Loaded Successfully!' as status;
SELECT 'Products: ' || COUNT(*) as summary FROM products;
SELECT 'BOM Lines: ' || COUNT(*) as summary FROM bom;
SELECT 'Work Centers: ' || COUNT(*) as summary FROM work_centers;
SELECT 'Operations: ' || COUNT(*) as summary FROM operations;
SELECT 'Routing Steps: ' || COUNT(*) as summary FROM routing;
SELECT 'Routing BOM Links: ' || COUNT(*) as summary FROM routing_bom;
SELECT 'Operation Dependencies: ' || COUNT(*) as summary FROM operation_dependencies;
SELECT 'Orders: ' || COUNT(*) as summary FROM orders;
SELECT 'Production Orders: ' || COUNT(*) as summary FROM production_orders;
SELECT 'Schedule Entries: ' || COUNT(*) as summary FROM work_center_schedule;