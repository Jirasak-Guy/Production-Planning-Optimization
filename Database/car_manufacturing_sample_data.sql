-- =====================================================
-- SAMPLE DATA: CAR MANUFACTURING (Modified)
-- =====================================================
-- This script provides realistic sample data for an automotive manufacturing plant
-- Products: Sedan Model A, SUV Model B, and all their components
-- NOTE: Inventory and Production Transactions tables have been removed per request.
-- =====================================================

-- Clean up existing sample data (Excluding removed tables)
TRUNCATE TABLE work_center_schedule CASCADE;
TRUNCATE TABLE production_orders CASCADE;
TRUNCATE TABLE operation_dependencies CASCADE;
TRUNCATE TABLE routing CASCADE;
TRUNCATE TABLE operations CASCADE;
TRUNCATE TABLE bom CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE work_center_calendar_exceptions CASCADE;
TRUNCATE TABLE work_center_shifts CASCADE;
TRUNCATE TABLE work_centers CASCADE;
TRUNCATE TABLE products CASCADE;

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
-- Body Shop
('WC-STAMP-01', 'Stamping Press #1', 'High-speed stamping press for body panels', (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 120, 2, 1, 450.00, 'active'),
('WC-STAMP-02', 'Stamping Press #2', 'High-speed stamping press for body panels', (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 120, 2, 1, 450.00, 'active'),
('WC-WELD-01', 'Body Welding Station #1', 'Robotic welding station for body assembly', (SELECT id FROM operations WHERE operation_code = 'OP-WELD-BODY'), 8, 3, 1, 380.00, 'active'),
('WC-WELD-02', 'Body Welding Station #2', 'Robotic welding station for body assembly', (SELECT id FROM operations WHERE operation_code = 'OP-WELD-BODY'), 8, 3, 1, 380.00, 'active'),
('WC-BODY-ASSY', 'Body Assembly Line', 'Main body assembly line', (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 6, 12, 1, 850.00, 'active'),
-- Paint Shop
('WC-PAINT-PREP', 'Paint Preparation', 'Surface preparation and priming', (SELECT id FROM operations WHERE operation_code = 'OP-PRIME'), 10, 4, 1, 320.00, 'active'),
('WC-PAINT-BOOTH', 'Paint Booth', 'Automated paint application booth', (SELECT id FROM operations WHERE operation_code = 'OP-PAINT-BASE'), 8, 2, 1, 520.00, 'active'),
('WC-PAINT-CURE', 'Paint Curing Oven', 'High-temperature paint curing oven', (SELECT id FROM operations WHERE operation_code = 'OP-CURE'), 8, 1, 1, 280.00, 'active'),
-- Powertrain
('WC-ENGINE-ASSY', 'Engine Assembly Line', 'Engine assembly station', (SELECT id FROM operations WHERE operation_code = 'OP-ENG-ASSY'), 4, 6, 1, 680.00, 'active'),
('WC-TRANS-ASSY', 'Transmission Assembly', 'Transmission assembly station', (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-ASSY'), 6, 4, 1, 520.00, 'active'),
('WC-POWERTRAIN-TEST', 'Powertrain Test Stand', 'Engine and transmission testing', (SELECT id FROM operations WHERE operation_code = 'OP-ENG-TEST'), 8, 2, 1, 420.00, 'active'),
-- Chassis
('WC-CHASSIS-WELD', 'Chassis Welding', 'Chassis frame welding station', (SELECT id FROM operations WHERE operation_code = 'OP-CHASSIS-WELD'), 6, 4, 1, 450.00, 'active'),
('WC-SUSPENSION', 'Suspension Assembly', 'Suspension system installation', (SELECT id FROM operations WHERE operation_code = 'OP-SUSP-INST'), 12, 3, 1, 350.00, 'active'),
-- Final Assembly
('WC-FINAL-01', 'Final Assembly Line #1', 'Main final assembly line', (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 4, 18, 1, 1250.00, 'active'),
('WC-FINAL-02', 'Final Assembly Line #2', 'Secondary final assembly line', (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 4, 18, 1, 1250.00, 'active'),
('WC-TRIM-INT', 'Interior Trim Installation', 'Interior components installation', (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 8, 8, 1, 620.00, 'active'),
('WC-ELEC-INST', 'Electrical Installation', 'Electrical system installation', (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 10, 6, 1, 580.00, 'active'),
-- Quality & Testing
('WC-QC-BODY', 'Body Quality Inspection', 'Body quality check station', (SELECT id FROM operations WHERE operation_code = 'OP-QC-BODY'), 12, 3, 1, 280.00, 'active'),
('WC-QC-FINAL', 'Final Quality Inspection', 'Final vehicle inspection', (SELECT id FROM operations WHERE operation_code = 'OP-QC-FINAL'), 6, 4, 1, 350.00, 'active'),
('WC-TEST-ROAD', 'Road Test Track', 'Vehicle road testing', (SELECT id FROM operations WHERE operation_code = 'OP-ROAD-TEST'), 8, 2, 1, 420.00, 'active'),
('WC-TEST-WATER', 'Water Leak Test', 'Water leak testing chamber', (SELECT id FROM operations WHERE operation_code = 'OP-WATER-TEST'), 12, 2, 1, 320.00, 'active');

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
WHERE wc.work_center_code IN ('WC-STAMP-01', 'WC-STAMP-02', 'WC-WELD-01', 'WC-WELD-02', 'WC-BODY-ASSY');

-- Paint Shop (2 shifts, Mon-Sat for paint curing)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A', 'B')) s
CROSS JOIN generate_series(1, 6) as dow
WHERE wc.work_center_code IN ('WC-PAINT-PREP', 'WC-PAINT-BOOTH', 'WC-PAINT-CURE');

-- Powertrain (2 shifts, Mon-Fri)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A', 'B')) s
CROSS JOIN generate_series(1, 5) as dow
WHERE wc.work_center_code IN ('WC-ENGINE-ASSY', 'WC-TRANS-ASSY', 'WC-POWERTRAIN-TEST', 'WC-CHASSIS-WELD', 'WC-SUSPENSION');

-- Final Assembly (2 shifts, Mon-Fri)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A', 'B')) s
CROSS JOIN generate_series(1, 5) as dow
WHERE wc.work_center_code IN ('WC-FINAL-01', 'WC-FINAL-02', 'WC-TRIM-INT', 'WC-ELEC-INST');

-- Quality & Testing (Day shift only, Mon-Sat)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week) 
SELECT wc.id, s.id, dow 
FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code = 'A') s
CROSS JOIN generate_series(1, 6) as dow
WHERE wc.work_center_code IN ('WC-QC-BODY', 'WC-QC-FINAL', 'WC-TEST-ROAD', 'WC-TEST-WATER');

-- =====================================================
-- 5. WORK CENTER CALENDAR EXCEPTIONS
-- =====================================================

-- Planned maintenance for Paint Booth
INSERT INTO work_center_calendar_exceptions (work_center_id, exception_date, exception_type, description, capacity_percentage) VALUES
((SELECT id FROM work_centers WHERE work_center_code = 'WC-PAINT-BOOTH'), '2025-12-15', 'maintenance', 'Quarterly maintenance - Paint booth filter replacement', 0),
((SELECT id FROM work_centers WHERE work_center_code = 'WC-PAINT-BOOTH'), '2025-12-16', 'maintenance', 'Quarterly maintenance - Paint booth filter replacement', 0);

-- Planned maintenance for Stamping Press
INSERT INTO work_center_calendar_exceptions (work_center_id, exception_date, exception_type, description, capacity_percentage) VALUES
((SELECT id FROM work_centers WHERE work_center_code = 'WC-STAMP-01'), '2026-01-10', 'maintenance', 'Annual stamping press maintenance', 0);

-- Reduced capacity during year-end inventory
INSERT INTO work_center_calendar_exceptions (work_center_id, exception_date, exception_type, description, capacity_percentage) 
SELECT wc.id, '2025-12-30', 'reduced-capacity', 'Year-end inventory count', 50.0
FROM work_centers wc
WHERE wc.work_center_code LIKE 'WC-%';

-- =====================================================
-- 6. ROUTING FOR FINISHED PRODUCTS
-- =====================================================
-- Note: Finished products only have FINAL ASSEMBLY and TESTING routing.
-- Sub-assemblies (ASSY-*, SUB-*) are produced separately with their own routing.

-- SEDAN MODEL A - Final Assembly Only
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
-- Final Assembly (using pre-made sub-assemblies from BOM)
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 10, 30, 90.0, 'Join pre-made body to chassis'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-ENGINE-INST'), 20, 20, 60.0, 'Install pre-assembled engine (ASSY-ENGINE)'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-INST'), 30, 15, 45.0, 'Install pre-assembled transmission (ASSY-TRANS)'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 40, 25, 120.0, 'Install pre-assembled interior (ASSY-INTERIOR)'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 50, 30, 90.0, 'Install pre-assembled electrical (ASSY-ELEC)'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-GLASS-INST'), 60, 20, 40.0, 'Install windshield and windows'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-WHEEL-MOUNT'), 70, 10, 20.0, 'Mount pre-assembled wheels (SUB-WHEEL x4)'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-FLUID-FILL'), 80, 15, 30.0, 'Fill all vehicle fluids'),
-- Testing and QC
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-WATER-TEST'), 90, 10, 20.0, 'Water leak test'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-QC-FINAL'), 100, 15, 45.0, 'Final vehicle inspection'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-ROAD-TEST'), 110, 10, 30.0, 'Road test'),
((SELECT id FROM products WHERE product_code = 'CAR-SED-A'), (SELECT id FROM operations WHERE operation_code = 'OP-FINAL-DETAIL'), 120, 10, 25.0, 'Final cleaning and detailing');

-- =====================================================
-- SUV MODEL B - Final Assembly Only
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
-- Final Assembly (using pre-made sub-assemblies from BOM)
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-MARRY'), 10, 40, 110.0, 'Join pre-made body to chassis (larger SUV)'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-ENGINE-INST'), 20, 25, 75.0, 'Install pre-assembled V6 engine (ASSY-ENGINE-V6)'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-INST'), 30, 20, 55.0, 'Install pre-assembled transmission (ASSY-TRANS)'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 40, 30, 150.0, 'Install pre-assembled premium interior (ASSY-INTERIOR)'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 50, 35, 110.0, 'Install pre-assembled electrical (ASSY-ELEC)'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-GLASS-INST'), 60, 25, 50.0, 'Install windshield and windows'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-WHEEL-MOUNT'), 70, 15, 25.0, 'Mount pre-assembled wheels (SUB-WHEEL x4)'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-FLUID-FILL'), 80, 20, 40.0, 'Fill all vehicle fluids'),
-- Testing and QC
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-WATER-TEST'), 90, 15, 25.0, 'Water leak test'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-QC-FINAL'), 100, 20, 55.0, 'Final vehicle inspection'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-ROAD-TEST'), 110, 15, 40.0, 'Road test - includes off-road'),
((SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), (SELECT id FROM operations WHERE operation_code = 'OP-FINAL-DETAIL'), 120, 15, 35.0, 'Final cleaning and detailing');

-- =====================================================
-- 6C. ROUTING FOR SEMI-PRODUCTS (Sub-Assemblies)
-- =====================================================

-- ENGINE ASSEMBLY 2.0L Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-ASSY'), 10, 30, 120.0, 'Assemble engine block and internals'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-TEST'), 20, 10, 25.0, 'Test engine assembly');

-- ENGINE ASSEMBLY V6 Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-ASSY'), 10, 40, 160.0, 'Assemble V6 engine'),
((SELECT id FROM products WHERE product_code = 'ASSY-ENGINE-V6'), (SELECT id FROM operations WHERE operation_code = 'OP-ENG-TEST'), 20, 15, 35.0, 'Test V6 engine');

-- TRANSMISSION ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-ASSY'), 10, 25, 90.0, 'Assemble transmission'),
((SELECT id FROM products WHERE product_code = 'ASSY-TRANS'), (SELECT id FROM operations WHERE operation_code = 'OP-TRANS-TEST'), 20, 10, 20.0, 'Test transmission');

-- BODY ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 10, 45, 25.0, 'Stamp body panels'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-TRIM'), 20, 10, 6.0, 'Trim panels'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-WELD-BODY'), 30, 35, 90.0, 'Weld body structure'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 40, 25, 45.0, 'Fit and align panels'),
((SELECT id FROM products WHERE product_code = 'ASSY-BODY'), (SELECT id FROM operations WHERE operation_code = 'OP-QC-BODY'), 50, 10, 20.0, 'Body quality check');

-- CHASSIS ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM operations WHERE operation_code = 'OP-CHASSIS-WELD'), 10, 30, 60.0, 'Weld chassis frame'),
((SELECT id FROM products WHERE product_code = 'ASSY-CHASSIS'), (SELECT id FROM operations WHERE operation_code = 'OP-SUSP-INST'), 20, 20, 35.0, 'Install suspension components');

-- INTERIOR ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-INTERIOR'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 20, 80.0, 'Assemble interior components');

-- ELECTRICAL SYSTEM Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-ELEC'), (SELECT id FROM operations WHERE operation_code = 'OP-ELEC-INST'), 10, 15, 60.0, 'Assemble electrical harness');

-- DASHBOARD ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'ASSY-DASH'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 15, 40.0, 'Assemble dashboard');

-- WHEEL ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-WHEEL'), (SELECT id FROM operations WHERE operation_code = 'OP-WHEEL-MOUNT'), 10, 5, 8.0, 'Mount tire on rim');

-- FRONT SEAT ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-FRONT'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 10, 25.0, 'Assemble front seat');

-- REAR SEAT ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-SEAT-REAR'), (SELECT id FROM operations WHERE operation_code = 'OP-INT-INST'), 10, 10, 20.0, 'Assemble rear seat');

-- DOOR ASSEMBLIES Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FL'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 15.0, 'Assemble front left door'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-FR'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 15.0, 'Assemble front right door'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RL'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 12.0, 'Assemble rear left door'),
((SELECT id FROM products WHERE product_code = 'SUB-DOOR-RR'), (SELECT id FROM operations WHERE operation_code = 'OP-DOOR-ASSY'), 10, 8, 12.0, 'Assemble rear right door');

-- HOOD ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-HOOD'), (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 10, 15, 10.0, 'Stamp hood panel'),
((SELECT id FROM products WHERE product_code = 'SUB-HOOD'), (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 20, 10, 8.0, 'Fit hood hardware');

-- TRUNK ASSEMBLY Routing
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, time_per_unit_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code = 'SUB-TRUNK'), (SELECT id FROM operations WHERE operation_code = 'OP-STAMP'), 10, 15, 12.0, 'Stamp trunk panel'),
((SELECT id FROM products WHERE product_code = 'SUB-TRUNK'), (SELECT id FROM operations WHERE operation_code = 'OP-BODY-FIT'), 20, 10, 10.0, 'Fit trunk hardware');

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
-- 9. SAMPLE ORDERS
-- =====================================================

INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2025-001', '2025-12-01', '2025-12-20', 'Premier Auto Dealer Network', 1, 'confirmed', 'Urgent dealer stock replenishment'),
('ORD-2025-002', '2025-12-05', '2026-01-15', 'National Fleet Services', 3, 'confirmed', 'Fleet order - 10 sedans'),
('ORD-2025-003', '2025-12-10', '2026-01-30', 'Luxury Motors Inc', 2, 'pending', 'SUV premium order');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
-- Order 1: 5 Sedans
((SELECT id FROM orders WHERE order_number = 'ORD-2025-001'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 19500.00, 97500.00, 'Red (2), Blue (2), White (1)'),
-- Order 2: 10 Sedans
((SELECT id FROM orders WHERE order_number = 'ORD-2025-002'), (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 10, 18800.00, 188000.00, 'Fleet white - all same spec'),
-- Order 3: 3 SUVs
((SELECT id FROM orders WHERE order_number = 'ORD-2025-003'), (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 3, 29500.00, 88500.00, 'Black (2), Silver (1) - Premium package');

-- =====================================================
-- 10. SAMPLE PRODUCTION ORDERS
-- =====================================================

INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, status, priority, notes) VALUES
-- For Order 1 (Urgent)
('PO-2025-0001', (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2025-001') LIMIT 1), 
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 5, 0, '2025-12-03', '2025-12-18', 'released', 1, 'Urgent production run'),

-- For Order 2 (Fleet)
('PO-2025-0002', (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2025-002') LIMIT 1),
 (SELECT id FROM products WHERE product_code = 'CAR-SED-A'), 10, 2, '2025-12-08', '2026-01-12', 'in-progress', 3, 'Fleet production - 2 completed'),

-- For Order 3 (SUV - not started yet)
('PO-2025-0003', (SELECT id FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-2025-003') LIMIT 1),
 (SELECT id FROM products WHERE product_code = 'CAR-SUV-B'), 3, 0, '2025-12-15', '2026-01-25', 'planned', 2, 'Premium SUV order');

-- =====================================================
-- END OF CAR MANUFACTURING SAMPLE DATA
-- =====================================================

-- Summary statistics
SELECT 'Sample Data Loaded Successfully!' as status;
SELECT 'Products: ' || COUNT(*) as summary FROM products;
SELECT 'BOM Lines: ' || COUNT(*) as summary FROM bom;
SELECT 'Work Centers: ' || COUNT(*) as summary FROM work_centers;
SELECT 'Operations: ' || COUNT(*) as summary FROM operations;
SELECT 'Routing Steps: ' || COUNT(*) as summary FROM routing;
SELECT 'Operation Dependencies: ' || COUNT(*) as summary FROM operation_dependencies;
SELECT 'Orders: ' || COUNT(*) as summary FROM orders;
SELECT 'Production Orders: ' || COUNT(*) as summary FROM production_orders;
SELECT 'Schedule Entries: ' || COUNT(*) as summary FROM work_center_schedule;