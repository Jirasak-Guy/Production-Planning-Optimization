-- =====================================================
-- SAMPLE DATA: 20 PO  (2 Products × 10-Step Routing)
-- =====================================================
--
-- PRODUCT A: BIKE-LINEAR-A (Linear Sequential)
--   Fully sequential (Finish-to-Start):
--   CUT(10) → BEND(20) → WELD(30) → GRIND(40) → PRIME(50)
--   → PAINT(60) → DRY(70) → ASSY(80) → TEST(90) → QC(100)
--
-- PRODUCT B: BIKE-PARALLEL-B (Parallel Pairs)
--   Pairs can run in parallel, but each pair waits for prev pair:
--   ┌ CUT(10)  ┐     ┌ WELD(30)  ┐     ┌ PRIME(50) ┐     ┌ DRY(70)  ┐     ┌ TEST(90) ┐
--   │          ├──►  │           ├──►  │           ├──►  │          ├──►  │          │
--   └ BEND(20) ┘     └ GRIND(40) ┘     └ PAINT(60) ┘     └ ASSY(80) ┘     └ QC(100)  ┘
--
--   Dependencies:
--     30,40 depend on BOTH 10 AND 20
--     50,60 depend on BOTH 30 AND 40
--     70,80 depend on BOTH 50 AND 60
--     90,100 depend on BOTH 70 AND 80
--
-- 10 OPERATIONS → 20 WORK CENTERS (2 per operation)
-- 20 PRODUCTION ORDERS: PO-0001~0010 (Linear), PO-0011~0020 (Parallel)
-- =====================================================

-- Clean up
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

-- =====================================================
-- 1. SHIFTS
-- =====================================================
INSERT INTO shifts (shift_code, shift_name, start_time, end_time, break_duration_minutes, effective_working_minutes) VALUES
('A', 'Morning Shift',   '08:00:00', '16:00:00', 60, 420),
('B', 'Afternoon Shift', '16:00:00', '00:00:00', 60, 420),
('C', 'Night Shift',     '00:00:00', '08:00:00', 45, 435),
('D', 'Overtime Shift',  '08:00:00', '12:00:00',  0, 240);

-- =====================================================
-- 2. COMPANY CALENDAR
-- =====================================================
INSERT INTO company_calendar (calendar_date, day_type, description, is_working_day) VALUES
('2025-01-01', 'holiday', 'New Year', false),
('2025-04-13', 'holiday', 'Songkran', false),
('2025-04-14', 'holiday', 'Songkran', false),
('2025-04-15', 'holiday', 'Songkran', false),
('2025-12-31', 'holiday', 'New Year Eve', false),
('2026-01-01', 'holiday', 'New Year', false);

-- =====================================================
-- 3. PRODUCTS (2 finished + 4 raw materials)
-- =====================================================
INSERT INTO products (product_code, product_name, description, type, unit, standard_cost, lead_time_days) VALUES
('BIKE-LINEAR-A',   'Linear Bike Alpha',   'Electric bike — 10-step fully sequential routing',     'finished-product', 'unit', 12000.00, 18),
('BIKE-PARALLEL-B', 'Parallel Bike Beta',  'Electric bike — 10-step parallel-pairs routing',       'finished-product', 'unit', 13500.00, 14);

INSERT INTO products (product_code, product_name, description, type, unit, standard_cost, lead_time_days) VALUES
('MAT-ALUM',   'Aluminum Tube',          '6061-T6 aluminum tubing',          'raw-material', 'kg',    8.50, 1),
('MAT-CARBON', 'Carbon Fiber Sheet',     'Woven carbon fiber panel 3K',      'raw-material', 'sheet', 120.00, 1),
('MAT-WIRE',   'Wiring Harness',         'Pre-assembled wiring loom',        'raw-material', 'set',   85.00, 1),
('MAT-BOLT',   'Bolt & Fastener Kit',    'Stainless steel fastener set',     'raw-material', 'kit',   35.00, 1);

-- =====================================================
-- 4. BOM (Bill of Materials)
-- =====================================================
-- Linear Bike BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'BIKE-LINEAR-A'), (SELECT id FROM products WHERE product_code = 'MAT-ALUM'),   10, 'kg',    8, 'Frame tubing'),
((SELECT id FROM products WHERE product_code = 'BIKE-LINEAR-A'), (SELECT id FROM products WHERE product_code = 'MAT-CARBON'),  3, 'sheet',10, 'Carbon panels'),
((SELECT id FROM products WHERE product_code = 'BIKE-LINEAR-A'), (SELECT id FROM products WHERE product_code = 'MAT-WIRE'),    4, 'set',   5, 'Wiring harness'),
((SELECT id FROM products WHERE product_code = 'BIKE-LINEAR-A'), (SELECT id FROM products WHERE product_code = 'MAT-BOLT'),    3, 'kit',   5, 'Fasteners');

-- Parallel Bike BOM
INSERT INTO bom (parent_product_id, component_product_id, quantity_required, unit, scrap_percentage, notes) VALUES
((SELECT id FROM products WHERE product_code = 'BIKE-PARALLEL-B'), (SELECT id FROM products WHERE product_code = 'MAT-ALUM'),   12, 'kg',    8, 'Frame tubing'),
((SELECT id FROM products WHERE product_code = 'BIKE-PARALLEL-B'), (SELECT id FROM products WHERE product_code = 'MAT-CARBON'),  4, 'sheet',10, 'Carbon panels'),
((SELECT id FROM products WHERE product_code = 'BIKE-PARALLEL-B'), (SELECT id FROM products WHERE product_code = 'MAT-WIRE'),    5, 'set',   5, 'Wiring harness'),
((SELECT id FROM products WHERE product_code = 'BIKE-PARALLEL-B'), (SELECT id FROM products WHERE product_code = 'MAT-BOLT'),    4, 'kit',   5, 'Fasteners');

-- =====================================================
-- 5. OPERATIONS (10 total)
-- =====================================================
INSERT INTO operations (operation_code, operation_name, description, operation_type) VALUES
('OP-CUT',   'Cutting',       'Cut raw materials into shaped pieces',  'forming'),
('OP-BEND',  'Bending',       'CNC tube bending into shape',           'forming'),
('OP-WELD',  'Welding',       'TIG weld pieces into structure',        'joining'),
('OP-GRIND', 'Grinding',      'Surface grinding and weld smoothing',   'finishing'),
('OP-PRIME', 'Priming',       'Apply anti-corrosion primer coat',      'coating'),
('OP-PAINT', 'Painting',      'Paint and powder-coat surfaces',        'coating'),
('OP-DRY',   'Drying/Curing', 'Oven curing of coatings',              'coating'),
('OP-ASSY',  'Assembly',      'Assemble all components together',      'assembly'),
('OP-TEST',  'Testing',       'Electrical and performance testing',    'testing'),
('OP-QC',    'Quality Check', 'Final quality inspection',              'inspection');

-- =====================================================
-- 6. WORK CENTERS (20 = 2 per operation)
-- =====================================================
INSERT INTO work_centers (work_center_code, work_center_name, description, operation_id, capacity_per_hour, number_of_workers_required, default_shift_id, cost_per_hour, status) VALUES
('WC-CUT-01',   'CNC Cutter #1',    'High-speed CNC tube cutter',  (SELECT id FROM operations WHERE operation_code = 'OP-CUT'),   60, 2, 1, 380.00, 'active'),
('WC-CUT-02',   'CNC Cutter #2',    'Standard CNC cutter',         (SELECT id FROM operations WHERE operation_code = 'OP-CUT'),   40, 2, 1, 320.00, 'active'),
('WC-BEND-01',  'CNC Bender #1',    'Hydraulic CNC tube bender',   (SELECT id FROM operations WHERE operation_code = 'OP-BEND'),  15, 2, 1, 350.00, 'active'),
('WC-BEND-02',  'CNC Bender #2',    'Manual hydraulic bender',     (SELECT id FROM operations WHERE operation_code = 'OP-BEND'),  10, 2, 1, 280.00, 'active'),
('WC-WELD-01',  'Welding Station #1','TIG robotic welding',        (SELECT id FROM operations WHERE operation_code = 'OP-WELD'),  10, 3, 1, 420.00, 'active'),
('WC-WELD-02',  'Welding Station #2','Manual TIG welding',         (SELECT id FROM operations WHERE operation_code = 'OP-WELD'),   8, 4, 1, 350.00, 'active'),
('WC-GRIND-01', 'Grinder #1',       'Belt grinder station',        (SELECT id FROM operations WHERE operation_code = 'OP-GRIND'), 20, 2, 1, 300.00, 'active'),
('WC-GRIND-02', 'Grinder #2',       'Bench grinder station',       (SELECT id FROM operations WHERE operation_code = 'OP-GRIND'), 15, 1, 1, 250.00, 'active'),
('WC-PRIME-01', 'Primer Booth #1',  'Spray primer booth',           (SELECT id FROM operations WHERE operation_code = 'OP-PRIME'), 12, 2, 1, 400.00, 'active'),
('WC-PRIME-02', 'Primer Booth #2',  'Dip primer tank',              (SELECT id FROM operations WHERE operation_code = 'OP-PRIME'),  8, 1, 1, 320.00, 'active'),
('WC-PAINT-01', 'Paint Booth #1',   'Automated powder coat booth',  (SELECT id FROM operations WHERE operation_code = 'OP-PAINT'),  8, 2, 1, 480.00, 'active'),
('WC-PAINT-02', 'Paint Booth #2',   'Secondary spray booth',        (SELECT id FROM operations WHERE operation_code = 'OP-PAINT'),  6, 2, 1, 420.00, 'active'),
('WC-DRY-01',   'Curing Oven #1',   'Convection curing oven',      (SELECT id FROM operations WHERE operation_code = 'OP-DRY'),  10, 1, 1, 280.00, 'active'),
('WC-DRY-02',   'Curing Oven #2',   'IR curing oven',              (SELECT id FROM operations WHERE operation_code = 'OP-DRY'),   8, 1, 1, 250.00, 'active'),
('WC-ASSY-01',  'Assembly Line #1', 'Main assembly line',            (SELECT id FROM operations WHERE operation_code = 'OP-ASSY'),  4, 6, 1, 560.00, 'active'),
('WC-ASSY-02',  'Assembly Line #2', 'Secondary assembly line',       (SELECT id FROM operations WHERE operation_code = 'OP-ASSY'),  3, 5, 1, 480.00, 'active'),
('WC-TEST-01',  'Test Bench #1',    'Main electrical test bench',    (SELECT id FROM operations WHERE operation_code = 'OP-TEST'),  8, 2, 1, 400.00, 'active'),
('WC-TEST-02',  'Test Bench #2',    'Secondary test bench',          (SELECT id FROM operations WHERE operation_code = 'OP-TEST'),  6, 2, 1, 350.00, 'active'),
('WC-QC-01',    'QC Station #1',    'Main QC inspection',            (SELECT id FROM operations WHERE operation_code = 'OP-QC'),   10, 3, 1, 320.00, 'active'),
('WC-QC-02',    'QC Station #2',    'Secondary QC',                  (SELECT id FROM operations WHERE operation_code = 'OP-QC'),    8, 2, 1, 260.00, 'active');

-- =====================================================
-- 7. WORK CENTER SHIFTS
-- =====================================================
-- Primary WCs (#01): Mon-Thu=ABC, Fri=AB, Sat=D(overtime)
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week)
SELECT wc.id, s.id, dow FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A','B','C')) s
CROSS JOIN generate_series(1,4) as dow
WHERE wc.work_center_code IN ('WC-CUT-01','WC-BEND-01','WC-WELD-01','WC-GRIND-01','WC-PRIME-01','WC-PAINT-01','WC-DRY-01','WC-ASSY-01','WC-TEST-01','WC-QC-01');

INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week)
SELECT wc.id, s.id, 5 FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A','B')) s
WHERE wc.work_center_code IN ('WC-CUT-01','WC-BEND-01','WC-WELD-01','WC-GRIND-01','WC-PRIME-01','WC-PAINT-01','WC-DRY-01','WC-ASSY-01','WC-TEST-01','WC-QC-01');

INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week)
SELECT wc.id, s.id, 6 FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code = 'D') s
WHERE wc.work_center_code IN ('WC-CUT-01','WC-WELD-01','WC-ASSY-01');

-- Secondary WCs (#02): Mon-Thu=AB, Fri=A
INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week)
SELECT wc.id, s.id, dow FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code IN ('A','B')) s
CROSS JOIN generate_series(1,4) as dow
WHERE wc.work_center_code IN ('WC-CUT-02','WC-BEND-02','WC-WELD-02','WC-GRIND-02','WC-PRIME-02','WC-PAINT-02','WC-DRY-02','WC-ASSY-02','WC-TEST-02','WC-QC-02');

INSERT INTO work_center_shifts (work_center_id, shift_id, day_of_week)
SELECT wc.id, s.id, 5 FROM work_centers wc
CROSS JOIN (SELECT id FROM shifts WHERE shift_code = 'A') s
WHERE wc.work_center_code IN ('WC-CUT-02','WC-BEND-02','WC-WELD-02','WC-GRIND-02','WC-PRIME-02','WC-PAINT-02','WC-DRY-02','WC-ASSY-02','WC-TEST-02','WC-QC-02');

-- =====================================================
-- 7B. CALENDAR EXCEPTIONS
-- =====================================================
INSERT INTO work_center_calendar_exceptions (work_center_id, exception_date, exception_type, description, capacity_percentage) VALUES
((SELECT id FROM work_centers WHERE work_center_code = 'WC-PAINT-01'), '2025-12-15', 'maintenance', 'Filter & ventilation overhaul', 0),
((SELECT id FROM work_centers WHERE work_center_code = 'WC-WELD-01'),  '2025-12-22', 'maintenance', 'Robot calibration', 0),
((SELECT id FROM work_centers WHERE work_center_code = 'WC-CUT-01'),   '2025-12-10', 'reduced-capacity', 'Tool changeover — half capacity', 50),
((SELECT id FROM work_centers WHERE work_center_code = 'WC-ASSY-01'),  '2025-12-29', 'maintenance', 'Year-end deep clean', 0),
((SELECT id FROM work_centers WHERE work_center_code = 'WC-TEST-01'),  '2026-01-06', 'maintenance', 'Instrument recalibration', 0);

-- =====================================================
-- 8. ROUTING — Both products use same 10 operations
-- =====================================================

-- BIKE-LINEAR-A: CUT(10)→BEND(20)→WELD(30)→GRIND(40)→PRIME(50)→PAINT(60)→DRY(70)→ASSY(80)→TEST(90)→QC(100)
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-CUT'),   10, 25, 'Cut tubes & panels'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-BEND'),  20, 20, 'Bend frame tubes'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-WELD'),  30, 20, 'Weld frame'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-GRIND'), 40, 15, 'Grind weld seams'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-PRIME'), 50, 15, 'Apply primer'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-PAINT'), 60, 20, 'Paint body'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-DRY'),   70, 10, 'Oven cure'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-ASSY'),  80, 30, 'Final assembly'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-TEST'),  90, 15, 'Performance test'),
((SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'), (SELECT id FROM operations WHERE operation_code='OP-QC'),   100, 10, 'Quality check');

-- BIKE-PARALLEL-B: Same 10 ops, but paired-parallel dependencies
INSERT INTO routing (product_id, operation_id, sequence_number, setup_time_minutes, notes) VALUES
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-CUT'),   10, 25, 'Cut tubes & panels'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-BEND'),  20, 20, 'Bend frame tubes'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-WELD'),  30, 20, 'Weld frame'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-GRIND'), 40, 15, 'Grind weld seams'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-PRIME'), 50, 15, 'Apply primer'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-PAINT'), 60, 20, 'Paint body'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-DRY'),   70, 10, 'Oven cure'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-ASSY'),  80, 30, 'Final assembly'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-TEST'),  90, 15, 'Performance test'),
((SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), (SELECT id FROM operations WHERE operation_code='OP-QC'),   100, 10, 'Quality check');

-- =====================================================
-- 9. OPERATION DEPENDENCIES
-- =====================================================

-- === BIKE-LINEAR-A: Linear chain 10→20→30→…→100 (9 deps) ===
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=20),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=10),
 'FS', 0, 'Bend after cut'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=30),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=20),
 'FS', 0, 'Weld after bend'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=40),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=30),
 'FS', 0, 'Grind after weld'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=50),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=40),
 'FS', 0, 'Prime after grind'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=60),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=50),
 'FS', 0, 'Paint after prime'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=70),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=60),
 'FS', 0, 'Dry after paint'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=80),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=70),
 'FS', 0, 'Assemble after drying'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=90),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=80),
 'FS', 0, 'Test after assembly'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=100),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-LINEAR-A') AND sequence_number=90),
 'FS', 0, 'QC after test');

-- === BIKE-PARALLEL-B: Parallel pairs (16 deps) ===
-- Pair (10,20) = no predecessors (start together)
-- Pair (30,40) depends on BOTH 10 AND 20
INSERT INTO operation_dependencies (routing_id, predecessor_routing_id, dependency_type, lag_time_minutes, notes) VALUES
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=30),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=10),
 'FS', 0, 'Weld waits for cut'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=30),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=20),
 'FS', 0, 'Weld waits for bend'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=40),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=10),
 'FS', 0, 'Grind waits for cut'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=40),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=20),
 'FS', 0, 'Grind waits for bend'),
-- Pair (50,60) depends on BOTH 30 AND 40
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=50),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=30),
 'FS', 0, 'Prime waits for weld'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=50),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=40),
 'FS', 0, 'Prime waits for grind'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=60),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=30),
 'FS', 0, 'Paint waits for weld'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=60),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=40),
 'FS', 0, 'Paint waits for grind'),
-- Pair (70,80) depends on BOTH 50 AND 60
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=70),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=50),
 'FS', 0, 'Dry waits for prime'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=70),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=60),
 'FS', 0, 'Dry waits for paint'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=80),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=50),
 'FS', 0, 'Assy waits for prime'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=80),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=60),
 'FS', 0, 'Assy waits for paint'),
-- Pair (90,100) depends on BOTH 70 AND 80
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=90),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=70),
 'FS', 0, 'Test waits for dry'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=90),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=80),
 'FS', 0, 'Test waits for assy'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=100),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=70),
 'FS', 0, 'QC waits for dry'),
((SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=100),
 (SELECT id FROM routing WHERE product_id=(SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B') AND sequence_number=80),
 'FS', 0, 'QC waits for assy');

-- =====================================================
-- 10. ROUTING BOM
-- =====================================================
-- Linear Bike: Aluminum at CUT, Carbon at CUT, Wire at ASSY, Bolts at ASSY
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-LINEAR-A' AND r.sequence_number=10),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-LINEAR-A' AND cp.product_code='MAT-ALUM'),
 'at_start', 'Aluminum cut at start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-LINEAR-A' AND r.sequence_number=10),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-LINEAR-A' AND cp.product_code='MAT-CARBON'),
 'at_start', 'Carbon cut at start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-LINEAR-A' AND r.sequence_number=80),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-LINEAR-A' AND cp.product_code='MAT-WIRE'),
 'at_start', 'Wiring at assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-LINEAR-A' AND r.sequence_number=80),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-LINEAR-A' AND cp.product_code='MAT-BOLT'),
 'proportional', 'Fasteners throughout assembly');

-- Parallel Bike: same pattern
INSERT INTO routing_bom (routing_id, bom_id, consumption_timing, notes) VALUES
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-PARALLEL-B' AND r.sequence_number=10),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-PARALLEL-B' AND cp.product_code='MAT-ALUM'),
 'at_start', 'Aluminum cut at start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-PARALLEL-B' AND r.sequence_number=10),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-PARALLEL-B' AND cp.product_code='MAT-CARBON'),
 'at_start', 'Carbon cut at start'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-PARALLEL-B' AND r.sequence_number=80),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-PARALLEL-B' AND cp.product_code='MAT-WIRE'),
 'at_start', 'Wiring at assembly'),
((SELECT r.id FROM routing r JOIN products p ON r.product_id=p.id WHERE p.product_code='BIKE-PARALLEL-B' AND r.sequence_number=80),
 (SELECT b.id FROM bom b JOIN products pp ON b.parent_product_id=pp.id JOIN products cp ON b.component_product_id=cp.id WHERE pp.product_code='BIKE-PARALLEL-B' AND cp.product_code='MAT-BOLT'),
 'proportional', 'Fasteners throughout assembly');

-- =====================================================
-- 11. ORDERS
-- =====================================================
INSERT INTO orders (order_number, order_date, due_date, customer_name, priority, status, notes) VALUES
('ORD-2025-001', '2025-12-01', '2025-12-20', 'EV Motors Dealer',   1, 'confirmed', 'Urgent Linear bikes'),
('ORD-2025-002', '2025-12-03', '2026-01-10', 'GreenWheel Fleet',   2, 'confirmed', 'Fleet order'),
('ORD-2025-003', '2025-12-05', '2026-01-15', 'Metro Transit Corp', 3, 'confirmed', 'Parallel bikes order'),
('ORD-2025-004', '2025-12-08', '2026-01-25', 'Premium Cycles Inc', 2, 'confirmed', 'Mixed order');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES
((SELECT id FROM orders WHERE order_number='ORD-2025-001'), (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),   150, 13000,  1950000, 'Linear bikes batch'),
((SELECT id FROM orders WHERE order_number='ORD-2025-002'), (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),   200, 13000,  2600000, 'Fleet linear bikes'),
((SELECT id FROM orders WHERE order_number='ORD-2025-003'), (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), 350, 14500,  5075000, 'Parallel bikes batch'),
((SELECT id FROM orders WHERE order_number='ORD-2025-004'), (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),   350, 13000,  4550000, 'Mixed - linear'),
((SELECT id FROM orders WHERE order_number='ORD-2025-004'), (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'), 350, 14500,  5075000, 'Mixed - parallel');

-- =====================================================
-- 12. PRODUCTION ORDERS (PO-0001 ~ PO-0020, qty 50-100 each)
-- =====================================================
-- PO-0001~0010: BIKE-LINEAR-A
-- PO-0011~0020: BIKE-PARALLEL-B
INSERT INTO production_orders (po_number, order_item_id, product_id, quantity_planned, quantity_completed, scheduled_start_date, scheduled_end_date, schedule_status, status, priority, notes) VALUES

('PO-2025-0001',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-001' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 70, 0, '2025-12-01', '2025-12-10', 'Unschedule', 'released', 1, 'PO#1 Linear batch'),

('PO-2025-0002',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-001' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 80, 0, '2025-12-03', '2025-12-15', 'Unschedule', 'released', 1, 'PO#2 Linear batch'),

('PO-2025-0003',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-002' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 100, 0, '2025-12-05', '2025-12-20', 'Unschedule', 'planned', 2, 'PO#3 Fleet linear'),

('PO-2025-0004',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-002' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 100, 0, '2025-12-08', '2025-12-25', 'Unschedule', 'planned', 2, 'PO#4 Fleet linear'),

('PO-2025-0005',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 60, 0, '2025-12-10', '2025-12-30', 'Unschedule', 'planned', 2, 'PO#5 Mixed linear'),

('PO-2025-0006',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 90, 0, '2025-12-12', '2026-01-05', 'Unschedule', 'planned', 2, 'PO#6 Mixed linear'),

('PO-2025-0007',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 75, 0, '2025-12-15', '2026-01-10', 'Unschedule', 'planned', 2, 'PO#7 Mixed linear'),

('PO-2025-0008',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 55, 0, '2025-12-18', '2026-01-15', 'Unschedule', 'planned', 2, 'PO#8 Mixed linear'),

('PO-2025-0009',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 85, 0, '2025-12-20', '2026-01-20', 'Unschedule', 'planned', 2, 'PO#9 Mixed linear'),

('PO-2025-0010',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-LINEAR-A' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-LINEAR-A'),
 65, 0, '2025-12-25', '2026-01-25', 'Unschedule', 'planned', 3, 'PO#10 Mixed linear'),

('PO-2025-0011',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-003' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 80, 0, '2025-12-02', '2025-12-12', 'Unschedule', 'released', 1, 'PO#11 Parallel batch 1'),

('PO-2025-0012',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-003' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 60, 0, '2025-12-05', '2025-12-18', 'Unschedule', 'released', 1, 'PO#12 Parallel batch 2'),

('PO-2025-0013',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-003' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 95, 0, '2025-12-08', '2025-12-22', 'Unschedule', 'planned', 2, 'PO#13 Parallel batch 3'),

('PO-2025-0014',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-003' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 55, 0, '2025-12-12', '2025-12-28', 'Unschedule', 'planned', 3, 'PO#14 Parallel batch 4'),

('PO-2025-0015',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-003' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 60, 0, '2025-12-15', '2026-01-05', 'Unschedule', 'planned', 3, 'PO#15 Parallel batch 5'),

('PO-2025-0016',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 70, 0, '2025-12-18', '2026-01-10', 'Unschedule', 'planned', 2, 'PO#16 Mixed parallel'),

('PO-2025-0017',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 100, 0, '2025-12-20', '2026-01-15', 'Unschedule', 'planned', 2, 'PO#17 Mixed parallel'),

('PO-2025-0018',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 50, 0, '2025-12-22', '2026-01-20', 'Unschedule', 'planned', 3, 'PO#18 Mixed parallel'),

('PO-2025-0019',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 75, 0, '2025-12-25', '2026-01-25', 'Unschedule', 'planned', 3, 'PO#19 Mixed parallel'),

('PO-2025-0020',
 (SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id WHERE o.order_number='ORD-2025-004' AND p.product_code='BIKE-PARALLEL-B' LIMIT 1),
 (SELECT id FROM products WHERE product_code='BIKE-PARALLEL-B'),
 55, 0, '2025-12-28', '2026-01-30', 'Unschedule', 'planned', 3, 'PO#20 Mixed parallel');

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT '=== Sample Data (20 PO — 2 Products × 10-Step Routing) ===' as status;
SELECT 'Products: ' || COUNT(*) as summary FROM products;
SELECT 'BOM Lines: ' || COUNT(*) as summary FROM bom;
SELECT 'Operations: ' || COUNT(*) as summary FROM operations;
SELECT 'Work Centers: ' || COUNT(*) as summary FROM work_centers;
SELECT 'Shifts: ' || COUNT(*) as summary FROM shifts;
SELECT 'WC Shift Assignments: ' || COUNT(*) as summary FROM work_center_shifts;
SELECT 'Routing Steps: ' || COUNT(*) as summary FROM routing;
SELECT 'Dependencies: ' || COUNT(*) as summary FROM operation_dependencies;
SELECT 'Routing BOM: ' || COUNT(*) as summary FROM routing_bom;
SELECT 'Orders: ' || COUNT(*) as summary FROM orders;
SELECT 'Production Orders: ' || COUNT(*) as summary FROM production_orders;