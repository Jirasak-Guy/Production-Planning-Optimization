# Job Shop Scheduling System
## ภาพรวมโครงการ (Project Overview)

ระบบจัดการตารางการผลิตแบบ Job Shop Scheduling ที่ใช้ Constraint Programming (CP-SAT) จาก Google OR-Tools ในการหาตารางการผลิตที่เหมาะสมที่สุด โดยคำนึงถึงข้อจำกัดต่างๆ เช่น ทรัพยากร กะการทำงาน วันหยุด และลำดับการผลิต

---

## 📋 Requirements (ข้อกำหนดของระบบ)

### Functional Requirements
1. **การจัดการคำสั่งผลิต (Production Order Management)**
   - รองรับการสร้าง แก้ไข และลบคำสั่งผลิต
   - ติดตามสถานะการผลิต (planned, released, in-progress, completed, cancelled, on-hold)
   - กำหนดลำดับความสำคัญ (Priority 1-10)

2. **การจัดตารางการผลิต (Production Scheduling)**
   - คำนวณตารางการผลิตอัตโนมัติโดยใช้ Optimization Algorithm
   - คำนึงถึงข้อจำกัดของทรัพยากร (Work Centers, Workers)
   - รองรับการทำงานหลายกะ (Multiple Shifts)
   - คำนึงถึงวันหยุดและปฏิทินบริษัท

3. **การจัดการทรัพยากร (Resource Management)**
   - จัดการ Work Centers และกำลังการผลิต
   - กำหนดจำนวนพนักงานที่ต้องการต่อ Work Center
   - ติดตามสถานะ Work Center (active, inactive, maintenance, retired)

4. **การจัดการข้อมูลหลัก (Master Data Management)**
   - จัดการข้อมูลสินค้า (Products)
   - จัดการ Bill of Materials (BOM)
   - จัดการ Routing และ Operations
   - จัดการกะการทำงาน (Shifts)

---

## 🏗️ System Architecture

### Technology Stack

#### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLModel
- **Optimization Engine**: Google OR-Tools CP-SAT Solver
- **API**: RESTful API with CORS support

#### Frontend
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Heroicons

#### Database
- **RDBMS**: PostgreSQL
- **Schema Version**: 1.1

---

## 🧠 Logic & Algorithm

### Optimization Algorithm: Constraint Programming (CP-SAT)

ระบบใช้ **Google OR-Tools CP-SAT Solver** ซึ่งเป็น Constraint Programming Solver ที่มีประสิทธิภาพสูงในการแก้ปัญหา Job Shop Scheduling

#### Core Logic Components

1. **Task Modeling**
   - แต่ละ Operation ในการผลิตถูกสร้างเป็น Interval Variable
   - กำหนด Start Time, End Time, และ Duration
   - รองรับ Setup Time และ Processing Time

2. **Resource Constraints**
   - **No Overlap Constraint**: Work Center แต่ละตัวทำงานได้ครั้งละ 1 งานเท่านั้น
   - **Worker Constraint**: จำนวนพนักงานรวมต้องไม่เกินจำนวนที่มีอยู่
   - **Cumulative Constraint**: ใช้ติดตามการใช้ทรัพยากรที่มีจำนวนจำกัด

3. **Precedence Constraints (BOM Dependencies)**
   - Operation ที่ต้องใช้ Component จาก Operation อื่นต้องรอให้ Operation นั้นเสร็จก่อน
   - รองรับ Dependency Types: FS (Finish-to-Start), SS, FF, SF

4. **Time Constraints**
   - **Shift Constraints**: งานต้องทำในช่วงเวลากะทำงานเท่านั้น
   - **Break Intervals**: คำนึงถึงเวลาพักของแต่ละกะ
   - **Holiday Constraints**: ไม่สามารถทำงานในวันหยุดได้
   - **Existing Schedule Blocks**: คำนึงถึงงานที่ถูก schedule ไว้แล้ว

5. **Objective Function**
   - **Minimize Makespan**: ลดเวลาการผลิตรวมให้น้อยที่สุด

### Scheduling Algorithm Flow

```
1. Load Data
   ├── Production Orders
   ├── Products & BOM
   ├── Routing & Operations
   ├── Work Centers
   ├── Shifts & Calendar
   └── Existing Schedules

2. Build CP Model
   ├── Create Interval Variables for each task
   ├── Add Alternative Machines (if multiple work centers available)
   ├── Add Setup Time
   └── Add Processing Time

3. Add Constraints
   ├── No Overlap Constraints (per Work Center)
   ├── BOM Precedence Constraints
   ├── Worker Cumulative Constraints
   ├── Shift Time Windows
   ├── Break Intervals
   └── Holiday Exclusions

4. Define Objective
   └── Minimize Makespan

5. Solve
   ├── Run CP-SAT Solver (with time limit)
   └── Extract Solution

6. Save Results
   ├── Update Production Orders (scheduled dates)
   ├── Create Work Center Schedule entries
   └── Return schedule data
```

---

## 🔄 Conditions & Business Rules

### Scheduling Conditions

1. **Work Center Availability**
   - Work Center ต้องมีสถานะ `active`
   - ต้องไม่อยู่ในช่วง maintenance หรือ exception dates

2. **Shift Rules**
   - งานสามารถทำได้เฉพาะในช่วงเวลากะทำงาน
   - ต้องหักเวลาพัก (break_duration_minutes)
   - กะต้องตรงกับวันในสัปดาห์ที่กำหนด (day_of_week)

3. **Worker Constraints**
   - จำนวนพนักงานรวมที่ทำงานพร้อมกันต้องไม่เกิน `max_workers`
   - แต่ละ Work Center ต้องการพนักงานตามที่กำหนดใน `number_of_workers_required`

4. **BOM & Routing Rules**
   - ต้องทำตาม Routing Sequence (sequence_number)
   - Component ต้องผลิตเสร็จก่อนที่ Parent Product จะเริ่มผลิต
   - รองรับ Operation Dependencies (FS, SS, FF, SF)

5. **Priority Rules**
   - Order ที่มี priority สูง (เลขน้อย) จะได้รับการพิจารณาก่อน
   - Due Date ใกล้จะได้รับความสำคัญมากขึ้น

---

## 🗄️ Database Schema

### Core Tables

#### 1. **orders** - คำสั่งซื้อจากลูกค้า
```sql
- id (PK, SERIAL)
- order_number (VARCHAR(50), UNIQUE, NOT NULL)
- order_date (DATE, NOT NULL)
- due_date (DATE, NOT NULL)
- customer_name (VARCHAR(200), NOT NULL)
- priority (INTEGER, DEFAULT 5, CHECK 1-10)
- status (VARCHAR(50), DEFAULT 'pending')
  -- pending, confirmed, in-production, completed, cancelled
- notes (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 2. **products** - ข้อมูลสินค้า
```sql
- id (PK, SERIAL)
- product_code (VARCHAR(50), UNIQUE, NOT NULL)
- product_name (VARCHAR(200), NOT NULL)
- description (TEXT)
- type (VARCHAR(50), NOT NULL)
  -- finished-product, semi-product, raw-material
- unit (VARCHAR(20), NOT NULL)
- standard_cost (DECIMAL(15,2))
- lead_time_days (INTEGER)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 3. **order_items** - รายการสินค้าในคำสั่งซื้อ
```sql
- id (PK, SERIAL)
- order_id (INTEGER, FK -> orders, NOT NULL)
- product_id (INTEGER, FK -> products, NOT NULL)
- quantity (DECIMAL(15,3), NOT NULL, CHECK > 0)
- unit_price (DECIMAL(15,2))
- total_price (DECIMAL(15,2))
- notes (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 4. **bom** - Bill of Materials (โครงสร้างสินค้า)
```sql
- id (PK, SERIAL)
- parent_product_id (INTEGER, FK -> products, NOT NULL)
- component_product_id (INTEGER, FK -> products, NOT NULL)
- quantity_required (DECIMAL(15,4), NOT NULL, CHECK > 0)
- unit (VARCHAR(20), NOT NULL)
- scrap_percentage (DECIMAL(5,2), DEFAULT 0, CHECK 0-100)
- effective_from (DATE, DEFAULT CURRENT_DATE)
- effective_to (DATE)
- is_active (BOOLEAN, DEFAULT true)
- notes (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

### Work Center & Shift Tables

#### 5. **shifts** - กะการทำงาน
```sql
- id (PK, SERIAL)
- shift_code (VARCHAR(20), UNIQUE, NOT NULL)
- shift_name (VARCHAR(100), NOT NULL)
- start_time (TIME, NOT NULL)
- end_time (TIME, NOT NULL)
- break_duration_minutes (INTEGER, DEFAULT 0, CHECK >= 0)
- effective_working_minutes (INTEGER, NOT NULL, CHECK > 0)
- is_active (BOOLEAN, DEFAULT true)
- description (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 6. **company_calendar** - ปฏิทินบริษัท
```sql
- id (PK, SERIAL)
- calendar_date (DATE, UNIQUE, NOT NULL)
- day_type (VARCHAR(50), NOT NULL)
  -- working-day, weekend, holiday, special-working-day
- description (VARCHAR(200))
- is_working_day (BOOLEAN, NOT NULL, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

### Routing & Operations Tables

#### 7. **operations** - กระบวนการผลิต
```sql
- id (PK, SERIAL)
- operation_code (VARCHAR(50), UNIQUE, NOT NULL)
- operation_name (VARCHAR(200), NOT NULL)
- description (TEXT)
- operation_type (VARCHAR(50))
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 8. **work_centers** - สถานีการผลิต
```sql
- id (PK, SERIAL)
- work_center_code (VARCHAR(50), UNIQUE, NOT NULL)
- work_center_name (VARCHAR(200), NOT NULL)
- description (TEXT)
- operation_id (INTEGER, FK -> operations, NOT NULL)
- capacity_per_hour (INTEGER, NOT NULL, CHECK > 0)
- number_of_workers_required (INTEGER, DEFAULT 1, CHECK > 0)
- default_shift_id (INTEGER, FK -> shifts)
- cost_per_hour (DECIMAL(10,2))
- status (VARCHAR(50), DEFAULT 'active')
  -- active, inactive, maintenance, retired
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 9. **work_center_shifts** - กำหนดกะให้ Work Center
```sql
- id (PK, SERIAL)
- work_center_id (INTEGER, FK -> work_centers, NOT NULL)
- shift_id (INTEGER, FK -> shifts, NOT NULL)
- day_of_week (INTEGER, NOT NULL, CHECK 1-7)
  -- 1=Monday, 2=Tuesday, ..., 7=Sunday
- effective_from (DATE, NOT NULL, DEFAULT CURRENT_DATE)
- effective_to (DATE)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
- UNIQUE (work_center_id, shift_id, day_of_week, effective_from)
```

#### 10. **work_center_calendar_exceptions** - ข้อยกเว้นปฏิทิน Work Center
```sql
- id (PK, SERIAL)
- work_center_id (INTEGER, FK -> work_centers, NOT NULL)
- exception_date (DATE, NOT NULL)
- exception_type (VARCHAR(50), NOT NULL)
  -- closed, maintenance, reduced-capacity, special-shift
- description (VARCHAR(200))
- capacity_percentage (DECIMAL(5,2), DEFAULT 0, CHECK 0-100)
  -- 0=closed, 100=full capacity
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
- UNIQUE (work_center_id, exception_date)
```

#### 11. **routing** - ลำดับการผลิต
```sql
- id (PK, SERIAL)
- product_id (INTEGER, FK -> products, NOT NULL)
- operation_id (INTEGER, FK -> operations, NOT NULL)
- sequence_number (INTEGER, NOT NULL, CHECK > 0)
- setup_time_minutes (INTEGER, DEFAULT 0, CHECK >= 0)
- notes (TEXT)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
- UNIQUE (product_id, sequence_number)
```

#### 12. **operation_dependencies** - ความสัมพันธ์ระหว่าง Operations
```sql
- id (PK, SERIAL)
- routing_id (INTEGER, FK -> routing, NOT NULL)
- predecessor_routing_id (INTEGER, FK -> routing, NOT NULL)
- dependency_type (VARCHAR(50), NOT NULL)
  -- FS (Finish-to-Start), SS (Start-to-Start), 
  -- FF (Finish-to-Finish), SF (Start-to-Finish)
- lag_time_minutes (INTEGER, DEFAULT 0)
- notes (TEXT)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
- UNIQUE (routing_id, predecessor_routing_id)
```

#### 13. **routing_bom** - เชื่อม Routing กับ BOM
```sql
- id (PK, SERIAL)
- routing_id (INTEGER, FK -> routing, NOT NULL)
- bom_id (INTEGER, FK -> bom, NOT NULL)
- consumption_timing (VARCHAR(20), DEFAULT 'at_start')
  -- at_start, at_end, proportional
- notes (TEXT)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
- UNIQUE (routing_id, bom_id)
```

### Production Tables

#### 14. **production_orders** - คำสั่งผลิต
```sql
- id (PK, SERIAL)
- po_number (VARCHAR(50), UNIQUE, NOT NULL)
- order_item_id (INTEGER, FK -> order_items)
- product_id (INTEGER, FK -> products, NOT NULL)
- quantity_planned (DECIMAL(15,3), NOT NULL, CHECK > 0)
- quantity_completed (DECIMAL(15,3), DEFAULT 0, CHECK >= 0)
- quantity_scrapped (DECIMAL(15,3), DEFAULT 0, CHECK >= 0)
- scheduled_start_date (DATE)
- scheduled_end_date (DATE)
- schedule_status (VARCHAR(50), DEFAULT 'Unschedule')
- status (VARCHAR(50), NOT NULL, DEFAULT 'planned')
  -- planned, released, in-progress, completed, cancelled, on-hold
- priority (INTEGER, DEFAULT 5, CHECK 1-10)
- notes (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 15. **work_center_schedule** - ตารางการผลิตรายละเอียด
```sql
- id (PK, SERIAL)
- work_center_id (INTEGER, FK -> work_centers, NOT NULL)
- production_order_id (INTEGER, FK -> production_orders, NOT NULL)
- product_id (INTEGER, FK -> products, NOT NULL)
- operation_id (INTEGER, FK -> operations, NOT NULL)
- shift_id (INTEGER, FK -> shifts)
- scheduled_start (TIMESTAMP WITH TIME ZONE, NOT NULL)
- scheduled_end (TIMESTAMP WITH TIME ZONE, NOT NULL)
- actual_start (TIMESTAMP WITH TIME ZONE)
- actual_end (TIMESTAMP WITH TIME ZONE)
- status (VARCHAR(50), DEFAULT 'scheduled')
  -- scheduled, in-progress, completed, cancelled
- notes (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

#### 16. **scheduler_settings** - การตั้งค่า Scheduler
```sql
- id (PK, SERIAL)
- setting_key (VARCHAR(100), UNIQUE, NOT NULL)
- setting_value (VARCHAR(500), NOT NULL)
- setting_type (VARCHAR(20), DEFAULT 'string')
  -- string, integer, float, boolean
- description (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

**Default Settings:**
- `max_workers` = 600 (integer) - Maximum workers in factory
- `time_limit_seconds` = 60 (integer) - Solver time limit
- `horizon_days` = 365 (integer) - Planning horizon

### Database Relationships

![Entity Relationship Diagram](ERD.png)

---

---

## 🔄 Data Flow (การไหลของข้อมูล)

### Overview: Database → Data Manager → CP-SAT → Database

```
┌─────────────────┐
│   PostgreSQL    │
│    Database     │
└────────┬────────┘
         │ 1. Load Data
         ▼
┌─────────────────────────────────────┐
│   SchedulingDataManager             │
│   (data_manager.py)                 │
│                                     │
│   • Load Productions                │
│   • Load Jobs (with BOM tree)       │
│   • Load Work Centers & Shifts      │
│   • Load Dependencies               │
│   • Load Holidays                   │
│   • Load Existing Schedules         │
└────────┬────────────────────────────┘
         │ 2. Prepare Input Data
         ▼
┌─────────────────────────────────────┐
│   ProductionScheduler               │
│   (scheduler.py)                    │
│                                     │
│   • Build CP-SAT Model              │
│   • Add Constraints                 │
│   • Define Objective                │
│   • Solve with OR-Tools             │
└────────┬────────────────────────────┘
         │ 3. Extract Results
         ▼
┌─────────────────────────────────────┐
│   ScheduleResult                    │
│   (schedule_data, tasks, segments)  │
└────────┬────────────────────────────┘
         │ 4. Save to Database
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   • production_orders (update dates)│
│   • work_center_schedule (insert)  │
└─────────────────┘
```

---

##  Input Data Structures (from data_manager.py)

### 1. **SchedulingDataManager** - Main Data Container

ตัวจัดการข้อมูลหลักที่โหลดข้อมูลจาก Database และเตรียมให้ CP-SAT Solver

```python
class SchedulingDataManager:
    # Name Mappings (for display)
    product_names: Dict[int, str]           # product_id -> product_name
    work_center_names: Dict[int, str]       # wc_id -> wc_name
    operation_names: Dict[int, str]         # operation_id -> operation_name
    po_names: Dict[int, str]                # po_id -> po_number
    
    # Core Data
    productions: List[ProductionOrder]      # Production orders to schedule
    jobs: Dict[Tuple[int, int], JobData]    # (production_id, product_id) -> JobData
    work_centers: Dict[int, WorkCenterInfo] # wc_id -> WorkCenterInfo
    operation_to_work_centers: Dict[int, List[int]]  # operation_id -> [wc_ids]
    operation_dependencies: Dict[Tuple[int, int], int]  # (routing_id, pred_id) -> lag_time
    production_dates: Dict[int, ProductionDateInfo]  # production_id -> dates
    holidays: List[Tuple[int, int]]         # [(start_minute, duration_minutes)]
    
    # Existing Schedule Data (for constraints)
    existing_schedule_blocks: List[ExistingScheduleBlock]
    existing_worker_usage: List[ExistingWorkerUsage]
    
    # Time Reference
    schedule_start_time: datetime           # Base time for minute calculations
```

### 2. **JobData** - Production Job Information

แต่ละ Job แทนการผลิตสินค้าหนึ่งชิ้น (รวม BOM tree)

```python
@dataclass
class JobData:
    production_id: int          # Production order ID
    product_id: int             # Product to manufacture
    quantity: int               # Quantity to produce
    routing: List[Routing]      # Sequence of operations (sorted by sequence_number)
    bom_children: List[BOM]     # Child components needed (for dependencies)
```

**Example:**
```python
JobData(
    production_id=1,
    product_id=10,  # Sedan Car
    quantity=5,
    routing=[
        Routing(id=1, operation_id=1, sequence_number=1, setup_time_minutes=30),
        Routing(id=2, operation_id=2, sequence_number=2, setup_time_minutes=20),
    ],
    bom_children=[
        BOM(parent_product_id=10, component_product_id=20, quantity_required=4),
    ]
)
```

### 3. **WorkCenterInfo** - Work Center Details

ข้อมูล Work Center พร้อมกะการทำงาน

```python
@dataclass
class WorkCenterInfo:
    id: int                                 # Work center ID
    name: str                               # Work center name
    cost_per_hour: int                      # Operating cost per hour
    capacity_per_hour: float                # Production capacity (units/hour)
    shifts: Dict[int, List[Tuple]]          # day_of_week -> [(start_time, end_time)]
    number_of_workers_required: int         # Workers needed to operate
```

**Example:**
```python
WorkCenterInfo(
    id=3,
    name="Welding Station A",
    cost_per_hour=500,
    capacity_per_hour=10.0,
    shifts={
        1: [(time(8, 0), time(17, 0))],   # Monday: 8:00-17:00
        2: [(time(8, 0), time(17, 0))],   # Tuesday: 8:00-17:00
        # ... other days
    },
    number_of_workers_required=2
)
```

### 4. **ProductionDateInfo** - Production Timing

กำหนดเวลาเริ่มต้นและสิ้นสุดของ Production Order (in minutes from schedule_start_time)

```python
@dataclass
class ProductionDateInfo:
    release_minutes: int        # Earliest start time (minutes from base)
    due_minutes: int            # Latest finish time (minutes from base)
```

**Example:**
```python
ProductionDateInfo(
    release_minutes=0,          # Can start immediately
    due_minutes=14400           # Must finish within 10 days (14400 min)
)
```

### 5. **ExistingScheduleBlock** - Blocked Time Slots

งานที่ถูก schedule ไว้แล้ว (ต้องหลีกเลี่ยง)

```python
@dataclass
class ExistingScheduleBlock:
    work_center_id: int         # Which work center is blocked
    start_minutes: int          # Block start time
    end_minutes: int            # Block end time
    production_order_id: int    # Reference to existing PO
```

**Example:**
```python
ExistingScheduleBlock(
    work_center_id=3,
    start_minutes=480,          # Day 1, 08:00
    end_minutes=720,            # Day 1, 12:00
    production_order_id=99      # PO #99 is already scheduled here
)
```

### 6. **ExistingWorkerUsage** - Worker Allocation

การใช้พนักงานจากงานที่ schedule ไว้แล้ว

```python
@dataclass
class ExistingWorkerUsage:
    start_minutes: int          # When workers are allocated
    end_minutes: int            # When workers are freed
    workers_required: int       # Number of workers used
    work_center_id: int         # Which work center
    production_order_id: int    # Reference to existing PO
```

**Example:**
```python
ExistingWorkerUsage(
    start_minutes=480,
    end_minutes=720,
    workers_required=2,
    work_center_id=3,
    production_order_id=99
)
```

---

## 📊 Data Structures (Output from CP-SAT)

### 1. **ScheduleResult** (Python Dataclass)
```python
@dataclass
class ScheduleResult:
    status: str                    # "OPTIMAL", "FEASIBLE", "INFEASIBLE"
    makespan: Optional[int]        # Total production time in minutes
    schedule_data: List[Dict]      # List of scheduled tasks
    segments: List[Dict]           # Task segments (for split tasks)
    tasks: List[Dict]              # Task details
    solve_time_seconds: float      # Solver execution time
    message: str                   # Status message
```

### 2. **Task Interval** (CP-SAT Model)
```python
{
    'start_var': IntVar,           # Start time variable
    'end_var': IntVar,             # End time variable
    'interval_var': IntervalVar,   # Interval variable
    'duration': int,               # Task duration in minutes
    'setup_time': int,             # Setup time in minutes
    'work_center_id': int,         # Assigned work center
    'workers_required': int        # Number of workers needed
}
```

### 3. **Schedule Data Output**
```python
{
    'production_order_id': int,
    'product_id': int,
    'product_code': str,
    'product_name': str,
    'operation_id': int,
    'operation_name': str,
    'work_center_id': int,
    'work_center_name': str,
    'start_time': datetime,        # Scheduled start
    'end_time': datetime,          # Scheduled end
    'duration_minutes': int,
    'setup_time_minutes': int,
    'workers_required': int
}
```

---

## 📥 Input Format

### API Endpoint: `POST /schedule`

#### Request Body
```json
{
  "production_order_ids": [1, 2, 3],
  "settings": {
    "max_shift_duration": 120,
    "max_workers": 600,
    "time_limit_seconds": 60,
    "save_to_db": true
  }
}
```

#### Parameters
- **production_order_ids**: รายการ ID ของคำสั่งผลิตที่ต้องการจัดตาราง
- **max_shift_duration**: ระยะเวลากะทำงานสูงสุด (นาที) (ค่าเริ่มต้น: 120)
- **max_workers**: จำนวนพนักงานสูงสุดที่มีอยู่ (ค่าเริ่มต้น: 600)
- **time_limit_seconds**: เวลาจำกัดสำหรับ Solver (วินาที) (ค่าเริ่มต้น: 60)
- **save_to_db**: บันทึกผลลัพธ์ลงฐานข้อมูลหรือไม่ (ค่าเริ่มต้น: true)

---

## 📤 Output Format

### Success Response
```json
{
  "status": "OPTIMAL",
  "makespan": 14400,
  "solve_time_seconds": 12.5,
  "message": "Scheduling completed successfully",
  "schedule_data": [
    {
      "production_order_id": 1,
      "product_id": 10,
      "product_code": "CAR-001",
      "product_name": "Sedan Car",
      "operation_id": 5,
      "operation_name": "Welding",
      "work_center_id": 3,
      "work_center_name": "Welding Station A",
      "start_time": "2026-02-12T08:00:00+07:00",
      "end_time": "2026-02-12T12:00:00+07:00",
      "duration_minutes": 240,
      "setup_time_minutes": 30,
      "workers_required": 2
    }
  ],
  "tasks": [
    {
      "task_id": "po_1_op_5",
      "start": 480,
      "end": 720,
      "duration": 240
    }
  ]
}
```

### Error Response
```json
{
  "status": "INFEASIBLE",
  "message": "No feasible solution found. Constraints are too tight.",
  "solve_time_seconds": 60.0,
  "schedule_data": []
}
```

---

## 📝 Notes

- ระบบใช้ CP-SAT Solver ซึ่งเป็น deterministic algorithm ผลลัพธ์จะเหมือนเดิมเมื่อ input เหมือนกัน
- การเพิ่ม time_limit_seconds จะช่วยให้ได้ solution ที่ดีขึ้น แต่ใช้เวลานานขึ้น
- ควรตั้งค่า max_workers ให้ตรงกับจำนวนพนักงานจริงในโรงงาน
- สามารถปรับแต่ง objective function ใน `scheduler.py` ได้ตามต้องการ

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 20+
- PostgreSQL 14+

### Backend Setup

1. **Clone Repository**
```bash
git clone https://github.com/Jirasak-Guy/Next-React-CSI
cd Next-React-CSI/Backend
```

2. **Create Virtual Environment**
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
```

3. **Install Dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure Environment**
Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/production_db
```

5. **Setup Database**
```bash
# Create database
psql -U postgres -c "CREATE DATABASE production_db;"

# Run schema
psql -U postgres -d production_db -f ../Database/schema.sql

# (Optional) Load sample data
psql -U postgres -d production_db -f ../Database/car_manufacturing_sample_data.sql
```

6. **Run Backend Server**
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to Frontend**
```bash
cd ../Frontend
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
Create `.env` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Run Development Server**
```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`

---

## 📁 Project Structure

```
Next-React-CSI/
├── Backend/
│   ├── main.py                 # FastAPI application & API endpoints
│   ├── scheduler.py            # CP-SAT scheduling logic
│   ├── model.py                # SQLModel database models
│   ├── data_manager.py         # Data loading & management
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment variables
│
├── Frontend/
│   ├── app/                    # Next.js app directory
│   ├── public/                 # Static assets
│   ├── package.json            # Node dependencies
│   └── .env                    # Environment variables
│
├── Database/
│   ├── schema.sql              # Database schema
│   └── car_manufacturing_sample_data.sql  # Sample data
│
└── README.md                   # This file
```

---

## 📚 API Documentation

### Endpoints หลัก

#### Production Orders (คำสั่งผลิต)
- `GET /production-orders` - ดึงรายการคำสั่งผลิตทั้งหมด
- `GET /production-orders/{id}` - ดึงคำสั่งผลิตเฉพาะ
- `POST /production-orders` - สร้างคำสั่งผลิตใหม่
- `PUT /production-orders/{id}` - แก้ไขคำสั่งผลิต
- `DELETE /production-orders/{id}` - ลบคำสั่งผลิต
- `POST /production-orders/{id}/clear-schedule` - ล้างตารางการผลิต

#### Scheduling (การจัดตาราง)
- `POST /schedule` - รันการจัดตารางแบบ optimization
- `GET /gantt-data` - ดึงข้อมูล Gantt chart พร้อมตาราง

#### Work Center Schedule (ตารางการผลิต)
- `GET /work-center-schedule` - ดึงตารางการผลิตทั้งหมด
- `GET /work-center-schedule/{id}` - ดึงตารางเฉพาะ
- `POST /work-center-schedule` - สร้างรายการตาราง
- `PUT /work-center-schedule/{id}` - แก้ไขรายการตาราง
- `DELETE /work-center-schedule/{id}` - ลบรายการตาราง

#### Master Data (ข้อมูลหลัก)
- **Products (สินค้า)**: `/products` (GET, POST, PUT, DELETE)
- **Orders (คำสั่งซื้อ)**: `/orders` (GET, POST, PUT, DELETE)
- **Order Items (รายการสั่งซื้อ)**: `/order-items` (GET, POST, PUT, DELETE)
- **BOM (โครงสร้างสินค้า)**: `/bom` (GET, POST, PUT, DELETE)
- **Operations (กระบวนการผลิต)**: `/operations` (GET, POST, PUT, DELETE)
- **Work Centers (สถานีผลิต)**: `/work-centers` (GET, POST, PUT, DELETE)
- **Shifts (กะการทำงาน)**: `/shifts` (GET, POST, PUT, DELETE)
- **Routing (ลำดับการผลิต)**: `/routing` (GET, POST, PUT, DELETE)
- **Company Calendar (ปฏิทินบริษัท)**: `/company-calendar` (GET, POST, PUT, DELETE)

เอกสาร API แบบเต็มดูได้ที่: `http://localhost:8000/docs`

---

# API Testing Guide — ขั้นตอนการสร้างข้อมูลทดสอบ

> **Base URL:** `http://localhost:8000`
>
> ใช้ Postman, Thunder Client, หรือ `curl` ในการส่ง request
> ทุก request ใช้ `Content-Type: application/json`

---

## ลำดับการสร้างข้อมูล (สำคัญ!)

ต้องสร้างตามลำดับนี้ เพราะบาง table มี Foreign Key ที่อ้างอิงไปยัง table อื่น

---

### ขั้นตอนที่ 1 — สร้างข้อมูลพื้นฐาน (ไม่มี FK)

ข้อมูลเหล่านี้ไม่มี dependency สร้างก่อนได้เลย (ลำดับไม่สำคัญ)

#### 1.1 Products

```
POST /products
```

**ตัวอย่าง 1 (Finished Product):**
```json
{
    "product_code": "PROD-001",
    "product_name": "Test Product A",
    "description": "First test product",
    "type": "finished-product",
    "unit": "pcs",
    "standard_cost": 100.00,
    "lead_time_days": 5,
    "is_active": true
}
```

**ตัวอย่าง 2 (Semi Product):**
```json
{
    "product_code": "PROD-002",
    "product_name": "Test Product B",
    "description": "Second test product",
    "type": "semi-product",
    "unit": "pcs",
    "standard_cost": 50.00,
    "lead_time_days": 3,
    "is_active": true
}
```

#### 1.2 Orders

```
POST /orders
```

```json
{
    "id": 1,
    "order_number": "ORD-001",
    "order_date": "2026-02-10",
    "due_date": "2026-03-10",
    "customer_name": "Customer-Test",
    "priority": 5,
    "status": "pending",
    "notes": "Test Create"
}
```

#### 1.3 Shifts (กะการทำงาน)

```
POST /shifts
```

```json
{
    "shift_code": "SHIFT-A",
    "shift_name": "Morning Shift",
    "start_time": "08:00:00",
    "end_time": "16:00:00",
    "break_duration_minutes": 60,
    "effective_working_minutes": 420,
    "is_active": true,
    "description": "Standard morning shift"
}
```

#### 1.4 Operations (ขั้นตอนการผลิต)

```
POST /operations
```

```json
{
    "operation_code": "OP-001",
    "operation_name": "Assembly",
    "description": "General assembly operation",
    "operation_type": "manual",
    "is_active": true
}
```

#### 1.5 Company Calendar (ปฏิทินบริษัท)

```
POST /company-calendar
```

```json
{
    "calendar_date": "2026-02-14",
    "day_type": "holiday",
    "description": "Valentine's Day",
    "is_working_day": false
}
```

---

### ขั้นตอนที่ 2 — สร้างข้อมูลที่ขึ้นกับขั้นตอนที่ 1

#### 2.1 Order Items (รายการสินค้าในคำสั่งซื้อ)

```
POST /order-items
```

| Field | ต้องมีก่อน |
|---|---|
| `order_id` | Orders (ขั้นตอน 1.2) |
| `product_id` | Products (ขั้นตอน 1.1) |

```json
{
    "order_id": 1,
    "product_id": 1,
    "quantity": 10.0,
    "unit_price": 100.00,
    "total_price": 1000.00,
    "notes": "Test Order Item"
}
```

#### 2.2 BOM (Bill of Materials)

```
POST /bom
```

| Field | ต้องมีก่อน |
|---|---|
| `parent_product_id` | Products (ขั้นตอน 1.1) |
| `component_product_id` | Products (ขั้นตอน 1.1) |

```json
{
    "parent_product_id": 1,
    "component_product_id": 2,
    "quantity_required": 2.0,
    "unit": "pcs",
    "scrap_percentage": 0.0,
    "effective_from": "2026-01-01",
    "is_active": true,
    "notes": "Test BOM"
}
```

#### 2.3 Work Centers (ศูนย์การทำงาน)

```
POST /work-centers
```

| Field | ต้องมีก่อน |
|---|---|
| `operation_id` | Operations (ขั้นตอน 1.4) |
| `default_shift_id` | Shifts (ขั้นตอน 1.3) — *optional* |

```json
{
    "work_center_code": "WC-001",
    "work_center_name": "Assembly Line 1",
    "description": "Main assembly line",
    "operation_id": 1,
    "capacity_per_hour": 100,
    "number_of_workers_required": 5,
    "default_shift_id": 1,
    "cost_per_hour": 500.00,
    "status": "active",
    "is_active": true
}
```

#### 2.4 Routing (เส้นทางการผลิต)

```
POST /routing
```

| Field | ต้องมีก่อน |
|---|---|
| `product_id` | Products (ขั้นตอน 1.1) |
| `operation_id` | Operations (ขั้นตอน 1.4) |

```json
{
    "product_id": 1,
    "operation_id": 1,
    "sequence_number": 10,
    "setup_time_minutes": 30,
    "notes": "First step",
    "is_active": true
}
```

**ตัวอย่าง 2 (Routing Step 2):**
*ต้องสร้างอันนี้ก่อน ถึงจะสร้าง Operation Dependencies ในขั้นตอน 3.4 ได้*
```json
{
    "product_id": 1,
    "operation_id": 1,
    "sequence_number": 20,
    "setup_time_minutes": 15,
    "notes": "Second step",
    "is_active": true
}
```

---

### ขั้นตอนที่ 3 — สร้างข้อมูลที่ขึ้นกับขั้นตอนที่ 2

#### 3.1 Work Center Shifts

```
POST /work-center-shifts
```

| Field | ต้องมีก่อน |
|---|---|
| `work_center_id` | Work Centers (ขั้นตอน 2.3) |
| `shift_id` | Shifts (ขั้นตอน 1.3) |

```json
{
    "work_center_id": 1,
    "shift_id": 1,
    "day_of_week": 1,
    "effective_from": "2026-01-01",
    "is_active": true
}
```

#### 3.2 Work Center Calendar Exceptions

```
POST /work-center-calendar-exceptions
```

| Field | ต้องมีก่อน |
|---|---|
| `work_center_id` | Work Centers (ขั้นตอน 2.3) |

```json
{
    "work_center_id": 1,
    "exception_date": "2026-03-01",
    "exception_type": "maintenance",
    "description": "Scheduled maintenance",
    "capacity_percentage": 0.0
}
```

#### 3.3 Routing BOM (เชื่อม Routing กับ BOM)

```
POST /routing-bom
```

| Field | ต้องมีก่อน |
|---|---|
| `routing_id` | Routing (ขั้นตอน 2.4) |
| `bom_id` | BOM (ขั้นตอน 2.2) |

```json
{
    "routing_id": 1,
    "bom_id": 1,
    "consumption_timing": "at_start",
    "notes": "Consume at start",
    "is_active": true
}
```

#### 3.4 Operation Dependencies (ลำดับขั้นตอนการผลิต)

```
POST /operation-dependencies
```

| Field | ต้องมีก่อน |
|---|---|
| `routing_id` | Routing (ขั้นตอน 2.4) |
| `predecessor_routing_id` | Routing (ขั้นตอน 2.4) |

```json
{
    "routing_id": 2,
    "predecessor_routing_id": 1,
    "dependency_type": "FS",
    "lag_time_minutes": 0,
    "notes": "Wait for OP-001 to finish",
    "is_active": true
}
```

#### 3.5 Production Orders (ใบสั่งผลิต)

```
POST /production-orders
```

| Field | ต้องมีก่อน |
|---|---|
| `product_id` | Products (ขั้นตอน 1.1) |
| `order_item_id` | Order Items (ขั้นตอน 2.1) — *optional* |

```json
{
    "po_number": "PO-2026-001",
    "order_item_id": 1,
    "product_id": 1,
    "quantity_planned": 10.0,
    "scheduled_start_date": "2026-02-15",
    "scheduled_end_date": "2026-03-05",
    "status": "planned",
    "priority": 5,
    "notes": "Initial production run"
}
```

---

### ขั้นตอนที่ 4 — สร้าง Schedule

#### 4.1 Work Center Schedule (สร้าง manual)

```
POST /work-center-schedule
```

| Field | ต้องมีก่อน |
|---|---|
| `work_center_id` | Work Centers (ขั้นตอน 2.3) |
| `production_order_id` | Production Orders (ขั้นตอน 3.5) |
| `product_id` | Products (ขั้นตอน 1.1) |
| `operation_id` | Operations (ขั้นตอน 1.4) |
| `shift_id` | Shifts (ขั้นตอน 1.3) — *optional* |

```json
{
    "work_center_id": 1,
    "production_order_id": 1,
    "product_id": 1,
    "operation_id": 1,
    "shift_id": 1,
    "scheduled_start": "2026-02-15T08:00:00",
    "scheduled_end": "2026-02-15T10:00:00",
    "status": "scheduled",
    "notes": "Scheduled manually"
}
```

#### 4.2 Schedule — สั่ง Optimize (CP-SAT Solver)

```
POST /schedule
```

| Field | ต้องมีก่อน |
|---|---|
| `production_ids` | Production Orders (ขั้นตอน 3.5) |

> ระบบจะรัน optimization solver เพื่อจัด schedule ให้อัตโนมัติ

```json
{
    "production_ids": [
        1
    ],
    "max_shift_duration": 120,
    "max_workers": 600,
    "time_limit_seconds": 60,
    "save_to_db": true
}
```

---

## สรุปลำดับ (Diagram)

```
ขั้นตอน 1 (ไม่มี dependency)
├── Products
├── Orders
├── Shifts
├── Operations
└── Company Calendar

ขั้นตอน 2 (ขึ้นกับขั้นตอน 1)
├── Order Items        ← Orders + Products
├── BOM                ← Products
├── Work Centers       ← Operations + Shifts
└── Routing            ← Products + Operations

ขั้นตอน 3 (ขึ้นกับขั้นตอน 2)
├── Work Center Shifts              ← Work Centers + Shifts
├── Work Center Calendar Exceptions ← Work Centers
├── Routing BOM                     ← Routing + BOM
├── Operation Dependencies          ← Routing
└── Production Orders               ← Products + Order Items

ขั้นตอน 4 (ขึ้นกับขั้นตอน 3)
├── Work Center Schedule  ← Work Centers + Production Orders + ...
└── Schedule (Optimize)   ← Production Orders
```

---

## API อื่นๆ ที่มีให้ใช้

ทุก resource รองรับ CRUD:

| Method | Path | คำอธิบาย |
|---|---|---|
| `GET` | `/{resource}` | ดูทั้งหมด |
| `GET` | `/{resource}/{id}` | ดูรายตัว |
| `POST` | `/{resource}` | สร้างใหม่ |
| `PUT` | `/{resource}/{id}` | แก้ไข |
| `DELETE` | `/{resource}/{id}` | ลบ |

### API พิเศษ

| Method | Path | คำอธิบาย |
|---|---|---|
| `GET` | `/orders/{id}/order-items` | ดู order items ของ order นั้น |
| `GET` | `/operations/{id}/work-centers` | ดู work centers ของ operation นั้น |
| `GET` | `/routing/{id}/bom-links` | ดู BOM ที่เชื่อมกับ routing step |
| `POST` | `/production-orders/{id}/clear-schedule` | ล้าง schedule ของ PO |
| `GET` | `/gantt-data` | ดูข้อมูล Gantt chart |
| `GET` | `/scheduler-settings` | ดูการตั้งค่า scheduler |
| `PUT` | `/scheduler-settings` | แก้ไขการตั้งค่า scheduler |

---

## ตัวอย่างการตอบกลับ (Response Examples)

### 1. กรณีสำเร็จ (Success - 200 OK)

เมื่อสร้างข้อมูลสำเร็จ Server จะตอบกลับด้วย JSON ของข้อมูลที่ถูกสร้าง พร้อม `id` ที่ระบบกำหนดให้

**ตัวอย่าง Response (POST /products):**
```json
{
    "id": 1,
    "product_code": "PROD-001",
    "product_name": "Test Product A",
    "description": "First test product",
    "type": "finished-product",
    "unit": "pcs",
    "standard_cost": 100.0,
    "lead_time_days": 5,
    "is_active": true,
    "created_at": "2026-02-13T10:00:00",
    "updated_at": "2026-02-13T10:00:00"
}
```

### 2. กรณีเกิดข้อผิดพลาด (Common Errors)

#### 2.1 ลืมสร้างข้อมูลที่จำเป็นก่อน (Foreign Key Violation)
**อาการ:** ได้รับ Error `500 Internal Server Error`
**สาเหตุ:** พยายามสร้างข้อมูลที่ต้องอ้างอิง ID จากตารางอื่น แต่ ID นั้นยังไม่มีอยู่จริง
> **ตัวอย่าง:** ยิง `POST /order-items` โดยใส่ `order_id: 1` แต่ยังไม่ได้สร้าง Order ที่มี ID 1

#### 2.2 ข้อมูลซ้ำ (Unique Constraint Violation)
**อาการ:** ได้รับ Error `500 Internal Server Error`
**สาเหตุ:** พยายามสร้างข้อมูลที่มีค่าห้ามซ้ำ (เช่น `product_code`, `order_number`) ซ้ำกับที่มีอยู่แล้ว

#### 2.3 ข้อมูลผิดรูปแบบ (Validation Error - 422)
**อาการ:** ได้รับ Error `422 Unprocessable Entity` พร้อมรายละเอียด `msg`
**สาเหตุ:** ส่งข้อมูลผิดประเภท (เช่น ส่ง string ใส่ช่องตัวเลข) หรือขาด field จำเป็น

**ตัวอย่าง Response:**
```json
{
    "detail": [
        {
            "type": "missing",
            "loc": ["body", "product_code"],
            "msg": "Field required",
            "input": {...}
        }
    ]
}
```

### 3. กรณีสั่ง Schedule แต่ไม่มี Production Order

**อาการ:** สั่ง `POST /schedule` แต่ไม่ใส่ ID หรือใส่ ID ที่ไม่มีอยู่จริง

**Response:**
```json
{
    "status": "NO_DATA",
    "makespan": null,
    "solve_time_seconds": 0.0,
    "message": "No production orders to schedule",
    "segments": null,
    "tasks": null
}
```
