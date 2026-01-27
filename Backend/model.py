from typing import Optional, List
from datetime import datetime, date, time
from decimal import Decimal

from sqlmodel import Field, SQLModel, Relationship


# =====================================================
# CORE TABLES
# =====================================================

class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_number: str = Field(max_length=50, unique=True)
    order_date: date
    due_date: date
    customer_name: str = Field(max_length=200)
    priority: int = Field(default=5, ge=1, le=10)
    status: str = Field(default="pending", max_length=50)  # pending, confirmed, in-production, completed, cancelled
    notes: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    order_items: List["OrderItem"] = Relationship(back_populates="order")


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_code: str = Field(max_length=50, unique=True)
    product_name: str = Field(max_length=200)
    description: Optional[str] = None
    type: str = Field(max_length=50)  # finished-product, semi-product, raw-material
    unit: str = Field(max_length=20)
    standard_cost: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=15)
    lead_time_days: Optional[int] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    order_items: List["OrderItem"] = Relationship(back_populates="product")
    bom_as_parent: List["BOM"] = Relationship(
        back_populates="parent_product",
        sa_relationship_kwargs={"foreign_keys": "[BOM.parent_product_id]"}
    )
    bom_as_component: List["BOM"] = Relationship(
        back_populates="component_product",
        sa_relationship_kwargs={"foreign_keys": "[BOM.component_product_id]"}
    )
    routings: List["Routing"] = Relationship(back_populates="product")
    production_orders: List["ProductionOrder"] = Relationship(back_populates="product")
    work_center_schedules: List["WorkCenterSchedule"] = Relationship(back_populates="product")


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    product_id: int = Field(foreign_key="products.id")
    quantity: Decimal = Field(decimal_places=3, max_digits=15)
    unit_price: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=15)
    total_price: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=15)
    notes: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    order: Optional[Order] = Relationship(back_populates="order_items")
    product: Optional[Product] = Relationship(back_populates="order_items")
    production_orders: List["ProductionOrder"] = Relationship(back_populates="order_item")


class BOM(SQLModel, table=True):
    __tablename__ = "bom"

    id: Optional[int] = Field(default=None, primary_key=True)
    parent_product_id: int = Field(foreign_key="products.id")
    component_product_id: int = Field(foreign_key="products.id")
    quantity_required: Decimal = Field(decimal_places=4, max_digits=15)
    unit: str = Field(max_length=20)
    scrap_percentage: Decimal = Field(default=0, decimal_places=2, max_digits=5)
    effective_from: date = Field(default_factory=date.today)
    effective_to: Optional[date] = None
    is_active: bool = Field(default=True)
    notes: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    parent_product: Optional[Product] = Relationship(
        back_populates="bom_as_parent",
        sa_relationship_kwargs={"foreign_keys": "[BOM.parent_product_id]"}
    )
    component_product: Optional[Product] = Relationship(
        back_populates="bom_as_component",
        sa_relationship_kwargs={"foreign_keys": "[BOM.component_product_id]"}
    )
    routing_bom_links: List["RoutingBOM"] = Relationship(back_populates="bom")


# =====================================================
# WORK CENTER AND SHIFT MANAGEMENT
# =====================================================

class Shift(SQLModel, table=True):
    __tablename__ = "shifts"

    id: Optional[int] = Field(default=None, primary_key=True)
    shift_code: str = Field(max_length=20, unique=True)
    shift_name: str = Field(max_length=100)
    start_time: time
    end_time: time
    break_duration_minutes: int = Field(default=0, ge=0)
    effective_working_minutes: int = Field(gt=0)
    is_active: bool = Field(default=True)
    description: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    work_centers: List["WorkCenter"] = Relationship(back_populates="default_shift")
    work_center_shifts: List["WorkCenterShift"] = Relationship(back_populates="shift")
    work_center_schedules: List["WorkCenterSchedule"] = Relationship(back_populates="shift")


class CompanyCalendar(SQLModel, table=True):
    __tablename__ = "company_calendar"

    id: Optional[int] = Field(default=None, primary_key=True)
    calendar_date: date = Field(unique=True)
    day_type: str = Field(max_length=50)  # working-day, weekend, holiday, special-working-day
    description: Optional[str] = Field(default=None, max_length=200)
    is_working_day: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)


class WorkCenter(SQLModel, table=True):
    __tablename__ = "work_centers"

    id: Optional[int] = Field(default=None, primary_key=True)
    work_center_code: str = Field(max_length=50, unique=True)
    work_center_name: str = Field(max_length=200)
    description: Optional[str] = None
    operation_id: int = Field(foreign_key="operations.id")  # Operation this work center performs
    capacity_per_hour: int = Field(gt=0)
    number_of_workers_required: int = Field(default=1, gt=0)
    default_shift_id: Optional[int] = Field(default=None, foreign_key="shifts.id")
    cost_per_hour: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10)
    status: str = Field(default="active", max_length=50)  # active, inactive, maintenance, retired
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    operation: Optional["Operation"] = Relationship(back_populates="work_centers")
    default_shift: Optional[Shift] = Relationship(back_populates="work_centers")
    work_center_shifts: List["WorkCenterShift"] = Relationship(back_populates="work_center")
    work_center_exceptions: List["WorkCenterCalendarException"] = Relationship(back_populates="work_center")
    work_center_schedules: List["WorkCenterSchedule"] = Relationship(back_populates="work_center")


class WorkCenterShift(SQLModel, table=True):
    __tablename__ = "work_center_shifts"

    id: Optional[int] = Field(default=None, primary_key=True)
    work_center_id: int = Field(foreign_key="work_centers.id")
    shift_id: int = Field(foreign_key="shifts.id")
    day_of_week: int = Field(ge=1, le=7)  # 1=Monday, 7=Sunday
    effective_from: date = Field(default_factory=date.today)
    effective_to: Optional[date] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    work_center: Optional[WorkCenter] = Relationship(back_populates="work_center_shifts")
    shift: Optional[Shift] = Relationship(back_populates="work_center_shifts")


class WorkCenterCalendarException(SQLModel, table=True):
    __tablename__ = "work_center_calendar_exceptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    work_center_id: int = Field(foreign_key="work_centers.id")
    exception_date: date
    exception_type: str = Field(max_length=50)  # closed, maintenance, reduced-capacity, special-shift
    description: Optional[str] = Field(default=None, max_length=200)
    capacity_percentage: Decimal = Field(default=0, decimal_places=2, max_digits=5, ge=0, le=100)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    work_center: Optional[WorkCenter] = Relationship(back_populates="work_center_exceptions")


# =====================================================
# OPERATIONS AND ROUTING
# =====================================================

class Operation(SQLModel, table=True):
    __tablename__ = "operations"

    id: Optional[int] = Field(default=None, primary_key=True)
    operation_code: str = Field(max_length=50, unique=True)
    operation_name: str = Field(max_length=200)
    description: Optional[str] = None
    operation_type: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    work_centers: List["WorkCenter"] = Relationship(back_populates="operation")
    routings: List["Routing"] = Relationship(back_populates="operation")
    work_center_schedules: List["WorkCenterSchedule"] = Relationship(back_populates="operation")


class Routing(SQLModel, table=True):
    __tablename__ = "routing"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id")
    operation_id: int = Field(foreign_key="operations.id")
    sequence_number: int = Field(gt=0)
    setup_time_minutes: int = Field(default=0, ge=0)
    notes: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    product: Optional[Product] = Relationship(back_populates="routings")
    operation: Optional[Operation] = Relationship(back_populates="routings")
    dependencies: List["OperationDependency"] = Relationship(
        back_populates="routing",
        sa_relationship_kwargs={"foreign_keys": "[OperationDependency.routing_id]"},
    )
    predecessor_of: List["OperationDependency"] = Relationship(
        back_populates="predecessor_routing",
        sa_relationship_kwargs={"foreign_keys": "[OperationDependency.predecessor_routing_id]"},
    )
    routing_bom_links: List["RoutingBOM"] = Relationship(back_populates="routing")


class OperationDependency(SQLModel, table=True):
    __tablename__ = "operation_dependencies"

    id: Optional[int] = Field(default=None, primary_key=True)
    routing_id: int = Field(foreign_key="routing.id")
    predecessor_routing_id: int = Field(foreign_key="routing.id")
    dependency_type: str = Field(max_length=50)  # FS, SS, FF, SF
    lag_time_minutes: int = Field(default=0)
    notes: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    routing: Optional[Routing] = Relationship(
        back_populates="dependencies",
        sa_relationship_kwargs={"foreign_keys": "[OperationDependency.routing_id]"},
    )
    predecessor_routing: Optional[Routing] = Relationship(
        back_populates="predecessor_of",
        sa_relationship_kwargs={"foreign_keys": "[OperationDependency.predecessor_routing_id]"},
    )


# =====================================================
# ROUTING BOM (Link between Routing and BOM)
# =====================================================

class RoutingBOM(SQLModel, table=True):
    __tablename__ = "routing_bom"

    id: Optional[int] = Field(default=None, primary_key=True)
    routing_id: int = Field(foreign_key="routing.id")
    bom_id: int = Field(foreign_key="bom.id")
    consumption_timing: str = Field(default="at_start", max_length=20)  # at_start, at_end, proportional
    notes: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    routing: Optional[Routing] = Relationship(back_populates="routing_bom_links")
    bom: Optional[BOM] = Relationship(back_populates="routing_bom_links")


# =====================================================
# PRODUCTION TRACKING
# =====================================================

class ProductionOrder(SQLModel, table=True):
    __tablename__ = "production_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    po_number: str = Field(max_length=50, unique=True)
    order_item_id: Optional[int] = Field(default=None, foreign_key="order_items.id")
    product_id: int = Field(foreign_key="products.id")
    quantity_planned: Decimal = Field(decimal_places=3, max_digits=15, gt=0)
    quantity_completed: Decimal = Field(default=0, decimal_places=3, max_digits=15, ge=0)
    quantity_scrapped: Decimal = Field(default=0, decimal_places=3, max_digits=15, ge=0)
    scheduled_start_date: Optional[date] = None
    scheduled_end_date: Optional[date] = None
    schedule_status: str = Field(default="Unschedule", max_length=50)
    status: str = Field(default="planned", max_length=50)  # planned, released, in-progress, completed, cancelled, on-hold
    priority: int = Field(default=5, ge=1, le=10)
    notes: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    order_item: Optional[OrderItem] = Relationship(back_populates="production_orders")
    product: Optional[Product] = Relationship(back_populates="production_orders")
    work_center_schedules: List["WorkCenterSchedule"] = Relationship(back_populates="production_order")


class WorkCenterSchedule(SQLModel, table=True):
    __tablename__ = "work_center_schedule"

    id: Optional[int] = Field(default=None, primary_key=True)
    work_center_id: int = Field(foreign_key="work_centers.id")
    production_order_id: int = Field(foreign_key="production_orders.id")
    product_id: int = Field(foreign_key="products.id")
    operation_id: int = Field(foreign_key="operations.id")
    shift_id: Optional[int] = Field(default=None, foreign_key="shifts.id")
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    status: str = Field(default="scheduled", max_length=50)  # scheduled, in-progress, completed, cancelled
    notes: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Relationships
    work_center: Optional[WorkCenter] = Relationship(back_populates="work_center_schedules")
    production_order: Optional[ProductionOrder] = Relationship(back_populates="work_center_schedules")
    product: Optional[Product] = Relationship(back_populates="work_center_schedules")
    operation: Optional[Operation] = Relationship(back_populates="work_center_schedules")
    shift: Optional[Shift] = Relationship(back_populates="work_center_schedules")


# class Inventory(SQLModel, table=True):
#     __tablename__ = "inventory"

#     id: Optional[int] = Field(default=None, primary_key=True)
#     product_id: int = Field(foreign_key="products.id")
#     location: str = Field(default="main-warehouse", max_length=100)
#     quantity_on_hand: Decimal = Field(default=0, decimal_places=3, max_digits=15, ge=0)
#     quantity_reserved: Decimal = Field(default=0, decimal_places=3, max_digits=15, ge=0)
#     # quantity_available is a generated column in PostgreSQL, not mapped here
#     reorder_point: Optional[Decimal] = Field(default=None, decimal_places=3, max_digits=15)
#     reorder_quantity: Optional[Decimal] = Field(default=None, decimal_places=3, max_digits=15)
#     last_count_date: Optional[date] = None
#     created_at: Optional[datetime] = Field(default_factory=datetime.now)
#     updated_at: Optional[datetime] = Field(default_factory=datetime.now)

#     # Relationships
#     product: Optional[Product] = Relationship(back_populates="inventory")


# class ProductionTransaction(SQLModel, table=True):
#     __tablename__ = "production_transactions"

#     id: Optional[int] = Field(default=None, primary_key=True)
#     transaction_type: str = Field(max_length=50)  # receipt, issue, scrap, adjustment, return
#     product_id: int = Field(foreign_key="products.id")
#     production_order_id: Optional[int] = Field(default=None, foreign_key="production_orders.id")
#     work_center_id: Optional[int] = Field(default=None, foreign_key="work_centers.id")
#     quantity: Decimal = Field(decimal_places=3, max_digits=15)
#     transaction_date: datetime = Field(default_factory=datetime.now)
#     reference_number: Optional[str] = Field(default=None, max_length=100)
#     notes: Optional[str] = None
#     created_by: Optional[str] = Field(default=None, max_length=100)
#     created_at: Optional[datetime] = Field(default_factory=datetime.now)

#     # Relationships
#     production_order: Optional[ProductionOrder] = Relationship(back_populates="production_transactions")
