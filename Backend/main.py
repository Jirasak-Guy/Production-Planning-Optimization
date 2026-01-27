import os
from typing import Annotated,List, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Session, create_engine, select
from fastapi.middleware.cors import CORSMiddleware

from model import (
    Product,
    Order,
    OrderItem,
    BOM,
    Shift,
    CompanyCalendar,
    WorkCenter,
    WorkCenterShift,
    WorkCenterCalendarException,
    Operation,
    Routing,
    RoutingBOM,
    OperationDependency,
    ProductionOrder,
    WorkCenterSchedule,
    SchedulerSettings,
)
from scheduler import run_scheduling

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# ORDERS
# =====================================================

@app.get("/orders", response_model=list[Order])
def read_orders(session: SessionDep):
    return session.exec(select(Order)).all()


@app.get("/orders/{order_id}", response_model=Order)
def read_order(order_id: int, session: SessionDep):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.post("/orders", response_model=Order)
def create_order(order: Order, session: SessionDep):
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@app.put("/orders/{order_id}", response_model=Order)
def update_order(order_id: int, order_data: Order, session: SessionDep):
    db_order = session.get(Order, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    order_dict = order_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in order_dict.items():
        setattr(db_order, key, value)
    session.add(db_order)
    session.commit()
    session.refresh(db_order)
    return db_order


@app.delete("/orders/{order_id}")
def delete_order(order_id: int, session: SessionDep):
    db_order = session.get(Order, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get all order items for this order
    order_items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    
    for item in order_items:
        # Delete production orders linked to this order item
        production_orders = session.exec(
            select(ProductionOrder).where(ProductionOrder.order_item_id == item.id)
        ).all()
        
        for po in production_orders:
            # Delete work center schedules linked to this production order
            schedules = session.exec(
                select(WorkCenterSchedule).where(WorkCenterSchedule.production_order_id == po.id)
            ).all()
            for schedule in schedules:
                session.delete(schedule)
            
            session.delete(po)
        
        # Delete the order item
        session.delete(item)
    
    session.delete(db_order)
    session.commit()
    return {"message": "Order deleted successfully"}


@app.get("/orders/{order_id}/order-items", response_model=list[OrderItem])
def read_order_items_by_order_id(order_id: int, session: SessionDep):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()


# =====================================================
# PRODUCTS
# =====================================================

@app.get("/products", response_model=list[Product])
def read_products(session: SessionDep):
    return session.exec(select(Product)).all()


@app.get("/products/{product_id}", response_model=Product)
def read_product(product_id: int, session: SessionDep):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/products", response_model=Product)
def create_product(product: Product, session: SessionDep):
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: Product, session: SessionDep):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    product_dict = product_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in product_dict.items():
        setattr(db_product, key, value)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product


@app.delete("/products/{product_id}")
def delete_product(product_id: int, session: SessionDep):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete related order items first
    order_items = session.exec(select(OrderItem).where(OrderItem.product_id == product_id)).all()
    for item in order_items:
        session.delete(item)
    
    # Delete related BOM entries (both as parent and component)
    bom_as_parent = session.exec(select(BOM).where(BOM.parent_product_id == product_id)).all()
    for bom in bom_as_parent:
        session.delete(bom)
    
    bom_as_component = session.exec(select(BOM).where(BOM.component_product_id == product_id)).all()
    for bom in bom_as_component:
        session.delete(bom)
    
    # Delete related routing entries
    routings = session.exec(select(Routing).where(Routing.product_id == product_id)).all()
    for routing in routings:
        # Delete operation dependencies for this routing first
        deps = session.exec(select(OperationDependency).where(
            (OperationDependency.routing_id == routing.id) | 
            (OperationDependency.predecessor_routing_id == routing.id)
        )).all()
        for dep in deps:
            session.delete(dep)
        session.delete(routing)
    
    # Delete related production orders
    production_orders = session.exec(select(ProductionOrder).where(ProductionOrder.product_id == product_id)).all()
    for po in production_orders:
        # Delete work center schedules for this production order first
        schedules = session.exec(select(WorkCenterSchedule).where(WorkCenterSchedule.production_order_id == po.id)).all()
        for schedule in schedules:
            session.delete(schedule)
        session.delete(po)
    
    session.delete(db_product)
    session.commit()
    return {"message": "Product deleted successfully"}


# =====================================================
# ORDER ITEMS
# =====================================================

@app.get("/order-items", response_model=list[OrderItem])
def read_order_items(session: SessionDep):
    return session.exec(select(OrderItem)).all()


@app.get("/order-items/{order_item_id}", response_model=OrderItem)
def read_order_item(order_item_id: int, session: SessionDep):
    item = session.get(OrderItem, order_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    return item


@app.post("/order-items", response_model=OrderItem)
def create_order_item(order_item: OrderItem, session: SessionDep):
    session.add(order_item)
    session.commit()
    session.refresh(order_item)
    return order_item


@app.put("/order-items/{order_item_id}", response_model=OrderItem)
def update_order_item(order_item_id: int, order_item_data: OrderItem, session: SessionDep):
    db_order_item = session.get(OrderItem, order_item_id)
    if not db_order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    order_item_dict = order_item_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in order_item_dict.items():
        setattr(db_order_item, key, value)
    session.add(db_order_item)
    session.commit()
    session.refresh(db_order_item)
    return db_order_item


@app.delete("/order-items/{order_item_id}")
def delete_order_item(order_item_id: int, session: SessionDep):
    db_order_item = session.get(OrderItem, order_item_id)
    if not db_order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Delete production orders linked to this order item
    production_orders = session.exec(
        select(ProductionOrder).where(ProductionOrder.order_item_id == order_item_id)
    ).all()
    
    for po in production_orders:
        # Delete work center schedules linked to this production order
        schedules = session.exec(
            select(WorkCenterSchedule).where(WorkCenterSchedule.production_order_id == po.id)
        ).all()
        for schedule in schedules:
            session.delete(schedule)
        
        session.delete(po)
    
    session.delete(db_order_item)
    session.commit()
    return {"message": "Order item deleted successfully"}


# =====================================================
# BOM
# =====================================================

@app.get("/bom", response_model=list[BOM])
def read_bom(session: SessionDep):
    return session.exec(select(BOM)).all()


@app.get("/bom/{bom_id}", response_model=BOM)
def read_bom_entry(bom_id: int, session: SessionDep):
    bom = session.get(BOM, bom_id)
    if not bom:
        raise HTTPException(status_code=404, detail="BOM entry not found")
    return bom


@app.post("/bom", response_model=BOM)
def create_bom(bom: BOM, session: SessionDep):
    session.add(bom)
    session.commit()
    session.refresh(bom)
    return bom


@app.put("/bom/{bom_id}", response_model=BOM)
def update_bom(bom_id: int, bom_data: BOM, session: SessionDep):
    db_bom = session.get(BOM, bom_id)
    if not db_bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    bom_dict = bom_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in bom_dict.items():
        setattr(db_bom, key, value)
    session.add(db_bom)
    session.commit()
    session.refresh(db_bom)
    return db_bom


@app.delete("/bom/{bom_id}")
def delete_bom(bom_id: int, session: SessionDep):
    db_bom = session.get(BOM, bom_id)
    if not db_bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    
    # Delete related routing_bom links first
    routing_bom_links = session.exec(select(RoutingBOM).where(RoutingBOM.bom_id == bom_id)).all()
    for link in routing_bom_links:
        session.delete(link)
    
    session.delete(db_bom)
    session.commit()
    return {"message": "BOM deleted successfully"}


# =====================================================
# SHIFTS
# =====================================================

@app.get("/shifts", response_model=list[Shift])
def read_shifts(session: SessionDep):
    return session.exec(select(Shift)).all()


@app.get("/shifts/{shift_id}", response_model=Shift)
def read_shift(shift_id: int, session: SessionDep):
    shift = session.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@app.post("/shifts", response_model=Shift)
def create_shift(shift: Shift, session: SessionDep):
    session.add(shift)
    session.commit()
    session.refresh(shift)
    return shift


@app.put("/shifts/{shift_id}", response_model=Shift)
def update_shift(shift_id: int, shift_data: Shift, session: SessionDep):
    db_shift = session.get(Shift, shift_id)
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift_dict = shift_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in shift_dict.items():
        setattr(db_shift, key, value)
    session.add(db_shift)
    session.commit()
    session.refresh(db_shift)
    return db_shift


@app.delete("/shifts/{shift_id}")
def delete_shift(shift_id: int, session: SessionDep):
    db_shift = session.get(Shift, shift_id)
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Delete related work center shifts first
    work_center_shifts = session.exec(select(WorkCenterShift).where(WorkCenterShift.shift_id == shift_id)).all()
    for wcs in work_center_shifts:
        session.delete(wcs)
    
    # Delete related work center schedule entries
    schedules = session.exec(select(WorkCenterSchedule).where(WorkCenterSchedule.shift_id == shift_id)).all()
    for schedule in schedules:
        session.delete(schedule)
    
    session.delete(db_shift)
    session.commit()
    return {"message": "Shift deleted successfully"}


# =====================================================
# COMPANY CALENDAR
# =====================================================

@app.get("/company-calendar", response_model=list[CompanyCalendar])
def read_company_calendar(session: SessionDep):
    return session.exec(select(CompanyCalendar)).all()


@app.get("/company-calendar/{calendar_id}", response_model=CompanyCalendar)
def read_company_calendar_entry(calendar_id: int, session: SessionDep):
    calendar = session.get(CompanyCalendar, calendar_id)
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar entry not found")
    return calendar


@app.post("/company-calendar", response_model=CompanyCalendar)
def create_company_calendar(calendar: CompanyCalendar, session: SessionDep):
    session.add(calendar)
    session.commit()
    session.refresh(calendar)
    return calendar


@app.put("/company-calendar/{calendar_id}", response_model=CompanyCalendar)
def update_company_calendar(calendar_id: int, calendar_data: CompanyCalendar, session: SessionDep):
    db_calendar = session.get(CompanyCalendar, calendar_id)
    if not db_calendar:
        raise HTTPException(status_code=404, detail="Company calendar not found")
    calendar_dict = calendar_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in calendar_dict.items():
        setattr(db_calendar, key, value)
    session.add(db_calendar)
    session.commit()
    session.refresh(db_calendar)
    return db_calendar


@app.delete("/company-calendar/{calendar_id}")
def delete_company_calendar(calendar_id: int, session: SessionDep):
    db_calendar = session.get(CompanyCalendar, calendar_id)
    if not db_calendar:
        raise HTTPException(status_code=404, detail="Company calendar not found")
    session.delete(db_calendar)
    session.commit()
    return {"message": "Company calendar deleted successfully"}


# =====================================================
# WORK CENTERS
# =====================================================

@app.get("/work-centers", response_model=list[WorkCenter])
def read_work_centers(session: SessionDep):
    return session.exec(select(WorkCenter)).all()


@app.get("/work-centers/{work_center_id}", response_model=WorkCenter)
def read_work_center(work_center_id: int, session: SessionDep):
    work_center = session.get(WorkCenter, work_center_id)
    if not work_center:
        raise HTTPException(status_code=404, detail="Work center not found")
    return work_center


@app.post("/work-centers", response_model=WorkCenter)
def create_work_center(work_center: WorkCenter, session: SessionDep):
    session.add(work_center)
    session.commit()
    session.refresh(work_center)
    return work_center


@app.put("/work-centers/{work_center_id}", response_model=WorkCenter)
def update_work_center(work_center_id: int, work_center_data: WorkCenter, session: SessionDep):
    db_work_center = session.get(WorkCenter, work_center_id)
    if not db_work_center:
        raise HTTPException(status_code=404, detail="Work center not found")
    work_center_dict = work_center_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in work_center_dict.items():
        setattr(db_work_center, key, value)
    session.add(db_work_center)
    session.commit()
    session.refresh(db_work_center)
    return db_work_center


@app.delete("/work-centers/{work_center_id}")
def delete_work_center(work_center_id: int, session: SessionDep):
    db_work_center = session.get(WorkCenter, work_center_id)
    if not db_work_center:
        raise HTTPException(status_code=404, detail="Work center not found")
    
    # Delete related work center shifts first
    work_center_shifts = session.exec(select(WorkCenterShift).where(WorkCenterShift.work_center_id == work_center_id)).all()
    for wcs in work_center_shifts:
        session.delete(wcs)
    
    # Delete related work center calendar exceptions
    exceptions = session.exec(select(WorkCenterCalendarException).where(
        WorkCenterCalendarException.work_center_id == work_center_id
    )).all()
    for exception in exceptions:
        session.delete(exception)
    
    # Delete related work center schedules
    schedules = session.exec(select(WorkCenterSchedule).where(
        WorkCenterSchedule.work_center_id == work_center_id
    )).all()
    for schedule in schedules:
        session.delete(schedule)
    
    session.delete(db_work_center)
    session.commit()
    return {"message": "Work center deleted successfully"}


# =====================================================
# WORK CENTER SHIFTS
# =====================================================

@app.get("/work-center-shifts", response_model=list[WorkCenterShift])
def read_work_center_shifts(session: SessionDep):
    return session.exec(select(WorkCenterShift)).all()


@app.get("/work-center-shifts/{work_center_shift_id}", response_model=WorkCenterShift)
def read_work_center_shift(work_center_shift_id: int, session: SessionDep):
    shift = session.get(WorkCenterShift, work_center_shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Work center shift not found")
    return shift


@app.post("/work-center-shifts", response_model=WorkCenterShift)
def create_work_center_shift(work_center_shift: WorkCenterShift, session: SessionDep):
    session.add(work_center_shift)
    session.commit()
    session.refresh(work_center_shift)
    return work_center_shift


@app.put("/work-center-shifts/{work_center_shift_id}", response_model=WorkCenterShift)
def update_work_center_shift(work_center_shift_id: int, work_center_shift_data: WorkCenterShift, session: SessionDep):
    db_work_center_shift = session.get(WorkCenterShift, work_center_shift_id)
    if not db_work_center_shift:
        raise HTTPException(status_code=404, detail="Work center shift not found")
    work_center_shift_dict = work_center_shift_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in work_center_shift_dict.items():
        setattr(db_work_center_shift, key, value)
    session.add(db_work_center_shift)
    session.commit()
    session.refresh(db_work_center_shift)
    return db_work_center_shift


@app.delete("/work-center-shifts/{work_center_shift_id}")
def delete_work_center_shift(work_center_shift_id: int, session: SessionDep):
    db_work_center_shift = session.get(WorkCenterShift, work_center_shift_id)
    if not db_work_center_shift:
        raise HTTPException(status_code=404, detail="Work center shift not found")
    session.delete(db_work_center_shift)
    session.commit()
    return {"message": "Work center shift deleted successfully"}


# =====================================================
# WORK CENTER CALENDAR EXCEPTIONS
# =====================================================

@app.get("/work-center-calendar-exceptions", response_model=list[WorkCenterCalendarException])
def read_work_center_calendar_exceptions(session: SessionDep):
    return session.exec(select(WorkCenterCalendarException)).all()


@app.get("/work-center-calendar-exceptions/{exception_id}", response_model=WorkCenterCalendarException)
def read_work_center_calendar_exception(exception_id: int, session: SessionDep):
    exception = session.get(WorkCenterCalendarException, exception_id)
    if not exception:
        raise HTTPException(status_code=404, detail="Work center calendar exception not found")
    return exception


@app.post("/work-center-calendar-exceptions", response_model=WorkCenterCalendarException)
def create_work_center_calendar_exception(exception: WorkCenterCalendarException, session: SessionDep):
    session.add(exception)
    session.commit()
    session.refresh(exception)
    return exception


@app.put("/work-center-calendar-exceptions/{exception_id}", response_model=WorkCenterCalendarException)
def update_work_center_calendar_exception(exception_id: int, exception_data: WorkCenterCalendarException, session: SessionDep):
    db_exception = session.get(WorkCenterCalendarException, exception_id)
    if not db_exception:
        raise HTTPException(status_code=404, detail="Work center calendar exception not found")
    exception_dict = exception_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in exception_dict.items():
        setattr(db_exception, key, value)
    session.add(db_exception)
    session.commit()
    session.refresh(db_exception)
    return db_exception


@app.delete("/work-center-calendar-exceptions/{exception_id}")
def delete_work_center_calendar_exception(exception_id: int, session: SessionDep):
    db_exception = session.get(WorkCenterCalendarException, exception_id)
    if not db_exception:
        raise HTTPException(status_code=404, detail="Work center calendar exception not found")
    session.delete(db_exception)
    session.commit()
    return {"message": "Work center calendar exception deleted successfully"}


# =====================================================
# OPERATIONS
# =====================================================

@app.get("/operations", response_model=list[Operation])
def read_operations(session: SessionDep):
    return session.exec(select(Operation)).all()


@app.get("/operations/{operation_id}", response_model=Operation)
def read_operation(operation_id: int, session: SessionDep):
    operation = session.get(Operation, operation_id)
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")
    return operation


@app.post("/operations", response_model=Operation)
def create_operation(operation: Operation, session: SessionDep):
    session.add(operation)
    session.commit()
    session.refresh(operation)
    return operation


@app.put("/operations/{operation_id}", response_model=Operation)
def update_operation(operation_id: int, operation_data: Operation, session: SessionDep):
    db_operation = session.get(Operation, operation_id)
    if not db_operation:
        raise HTTPException(status_code=404, detail="Operation not found")
    operation_dict = operation_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in operation_dict.items():
        setattr(db_operation, key, value)
    session.add(db_operation)
    session.commit()
    session.refresh(db_operation)
    return db_operation


@app.delete("/operations/{operation_id}")
def delete_operation(operation_id: int, session: SessionDep):
    db_operation = session.get(Operation, operation_id)
    if not db_operation:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    # 1. Delete related work center schedules first
    # This covers schedules that perform this operation
    schedules = session.exec(select(WorkCenterSchedule).where(WorkCenterSchedule.operation_id == operation_id)).all()
    for schedule in schedules:
        session.delete(schedule)

    # 2. Delete related work centers (and their related data)
    # WorkCenter has a mandatory operation_id, so they must be deleted
    work_centers = session.exec(select(WorkCenter).where(WorkCenter.operation_id == operation_id)).all()
    for wc in work_centers:
        # Delete related shifts
        shifts = session.exec(select(WorkCenterShift).where(WorkCenterShift.work_center_id == wc.id)).all()
        for shift in shifts:
            session.delete(shift)
        
        # Delete related exceptions
        exceptions = session.exec(select(WorkCenterCalendarException).where(WorkCenterCalendarException.work_center_id == wc.id)).all()
        for exception in exceptions:
            session.delete(exception)
            
        # Delete related schedules (for this WC, if any remained - e.g. potentially different operation_id?)
        wc_schedules = session.exec(select(WorkCenterSchedule).where(WorkCenterSchedule.work_center_id == wc.id)).all()
        for wc_schedule in wc_schedules:
            if wc_schedule in session: # Check if not already deleted in step 1
                 session.delete(wc_schedule)
            else:
                # If it's not in session context anymore but essentially acts as a safeguard
                # Since step 1 loaded schedules by Op ID, and we are iterating. 
                # SQLAlchemy session identity map handles this.
                pass
        
        session.delete(wc)

    # 3. Delete related routing entries
    routings = session.exec(select(Routing).where(Routing.operation_id == operation_id)).all()
    for routing in routings:
        # Delete operation dependencies for each routing first
        deps = session.exec(select(OperationDependency).where(
            (OperationDependency.routing_id == routing.id) | 
            (OperationDependency.predecessor_routing_id == routing.id)
        )).all()
        for dep in deps:
            session.delete(dep)
        session.delete(routing)
    
    session.delete(db_operation)
    session.commit()
    return {"message": "Operation deleted successfully"}


@app.get("/operations/{operation_id}/work-centers", response_model=list[WorkCenter])
def read_work_centers_by_operation(operation_id: int, session: SessionDep):
    """Get all work centers that can perform this operation"""
    operation = session.get(Operation, operation_id)
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")
    return session.exec(select(WorkCenter).where(WorkCenter.operation_id == operation_id)).all()


# =====================================================
# ROUTING
# =====================================================

@app.get("/routing", response_model=list[Routing])
def read_routing(session: SessionDep):
    return session.exec(select(Routing)).all()


@app.get("/routing/{routing_id}", response_model=Routing)
def read_routing_entry(routing_id: int, session: SessionDep):
    routing = session.get(Routing, routing_id)
    if not routing:
        raise HTTPException(status_code=404, detail="Routing not found")
    return routing


@app.post("/routing", response_model=Routing)
def create_routing(routing: Routing, session: SessionDep):
    session.add(routing)
    session.commit()
    session.refresh(routing)
    return routing


@app.put("/routing/{routing_id}", response_model=Routing)
def update_routing(routing_id: int, routing_data: Routing, session: SessionDep):
    db_routing = session.get(Routing, routing_id)
    if not db_routing:
        raise HTTPException(status_code=404, detail="Routing not found")
    routing_dict = routing_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in routing_dict.items():
        setattr(db_routing, key, value)
    session.add(db_routing)
    session.commit()
    session.refresh(db_routing)
    return db_routing


@app.delete("/routing/{routing_id}")
def delete_routing(routing_id: int, session: SessionDep):
    db_routing = session.get(Routing, routing_id)
    if not db_routing:
        raise HTTPException(status_code=404, detail="Routing not found")
    
    # Delete related routing_bom links first
    routing_bom_links = session.exec(select(RoutingBOM).where(RoutingBOM.routing_id == routing_id)).all()
    for link in routing_bom_links:
        session.delete(link)
    
    # Delete related operation dependencies first (both as routing_id and predecessor_routing_id)
    dependencies = session.exec(select(OperationDependency).where(
        (OperationDependency.routing_id == routing_id) | 
        (OperationDependency.predecessor_routing_id == routing_id)
    )).all()
    for dep in dependencies:
        session.delete(dep)
    
    session.delete(db_routing)
    session.commit()
    return {"message": "Routing deleted successfully"}


@app.get("/routing/{routing_id}/bom-links", response_model=list[RoutingBOM])
def read_routing_bom_by_routing(routing_id: int, session: SessionDep):
    """Get all BOM components linked to a specific routing step"""
    routing = session.get(Routing, routing_id)
    if not routing:
        raise HTTPException(status_code=404, detail="Routing not found")
    return session.exec(select(RoutingBOM).where(RoutingBOM.routing_id == routing_id)).all()


# =====================================================
# ROUTING BOM
# =====================================================

@app.get("/routing-bom", response_model=list[RoutingBOM])
def read_routing_bom(session: SessionDep):
    """Get all routing-bom links"""
    return session.exec(select(RoutingBOM)).all()


@app.get("/routing-bom/{routing_bom_id}", response_model=RoutingBOM)
def read_routing_bom_entry(routing_bom_id: int, session: SessionDep):
    entry = session.get(RoutingBOM, routing_bom_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Routing BOM not found")
    return entry


@app.post("/routing-bom", response_model=RoutingBOM)
def create_routing_bom(routing_bom: RoutingBOM, session: SessionDep):
    session.add(routing_bom)
    session.commit()
    session.refresh(routing_bom)
    return routing_bom


@app.put("/routing-bom/{routing_bom_id}", response_model=RoutingBOM)
def update_routing_bom(routing_bom_id: int, routing_bom_data: RoutingBOM, session: SessionDep):
    db_routing_bom = session.get(RoutingBOM, routing_bom_id)
    if not db_routing_bom:
        raise HTTPException(status_code=404, detail="Routing BOM not found")
    routing_bom_dict = routing_bom_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in routing_bom_dict.items():
        setattr(db_routing_bom, key, value)
    session.add(db_routing_bom)
    session.commit()
    session.refresh(db_routing_bom)
    return db_routing_bom


@app.delete("/routing-bom/{routing_bom_id}")
def delete_routing_bom(routing_bom_id: int, session: SessionDep):
    db_routing_bom = session.get(RoutingBOM, routing_bom_id)
    if not db_routing_bom:
        raise HTTPException(status_code=404, detail="Routing BOM not found")
    session.delete(db_routing_bom)
    session.commit()
    return {"message": "Routing BOM deleted successfully"}


# =====================================================
# OPERATION DEPENDENCIES
# =====================================================

@app.get("/operation-dependencies", response_model=list[OperationDependency])
def read_operation_dependencies(session: SessionDep):
    return session.exec(select(OperationDependency)).all()


@app.get("/operation-dependencies/{dependency_id}", response_model=OperationDependency)
def read_operation_dependency(dependency_id: int, session: SessionDep):
    dep = session.get(OperationDependency, dependency_id)
    if not dep:
        raise HTTPException(status_code=404, detail="Operation dependency not found")
    return dep


@app.post("/operation-dependencies", response_model=OperationDependency)
def create_operation_dependency(dependency: OperationDependency, session: SessionDep):
    session.add(dependency)
    session.commit()
    session.refresh(dependency)
    return dependency


@app.put("/operation-dependencies/{dependency_id}", response_model=OperationDependency)
def update_operation_dependency(dependency_id: int, dependency_data: OperationDependency, session: SessionDep):
    db_dependency = session.get(OperationDependency, dependency_id)
    if not db_dependency:
        raise HTTPException(status_code=404, detail="Operation dependency not found")
    dependency_dict = dependency_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in dependency_dict.items():
        setattr(db_dependency, key, value)
    session.add(db_dependency)
    session.commit()
    session.refresh(db_dependency)
    return db_dependency


@app.delete("/operation-dependencies/{dependency_id}")
def delete_operation_dependency(dependency_id: int, session: SessionDep):
    db_dependency = session.get(OperationDependency, dependency_id)
    if not db_dependency:
        raise HTTPException(status_code=404, detail="Operation dependency not found")
    session.delete(db_dependency)
    session.commit()
    return {"message": "Operation dependency deleted successfully"}


# =====================================================
# PRODUCTION ORDERS
# =====================================================

@app.get("/production-orders", response_model=list[ProductionOrder])
def read_production_orders(session: SessionDep):
    return session.exec(select(ProductionOrder)).all()


@app.get("/production-orders/{production_order_id}", response_model=ProductionOrder)
def read_production_order(production_order_id: int, session: SessionDep):
    production_order = session.get(ProductionOrder, production_order_id)
    if not production_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    return production_order


@app.post("/production-orders", response_model=ProductionOrder)
def create_production_order(production_order: ProductionOrder, session: SessionDep):
    session.add(production_order)
    session.commit()
    session.refresh(production_order)
    return production_order


@app.put("/production-orders/{production_order_id}", response_model=ProductionOrder)
def update_production_order(production_order_id: int, production_order_data: ProductionOrder, session: SessionDep):
    db_production_order = session.get(ProductionOrder, production_order_id)
    if not db_production_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    production_order_dict = production_order_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in production_order_dict.items():
        setattr(db_production_order, key, value)
    session.add(db_production_order)
    session.commit()
    session.refresh(db_production_order)
    return db_production_order


@app.delete("/production-orders/{production_order_id}")
def delete_production_order(production_order_id: int, session: SessionDep):
    db_production_order = session.get(ProductionOrder, production_order_id)
    if not db_production_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    # Delete work center schedules linked to this production order
    schedules = session.exec(
        select(WorkCenterSchedule).where(WorkCenterSchedule.production_order_id == production_order_id)
    ).all()
    for schedule in schedules:
        session.delete(schedule)
    
    session.delete(db_production_order)
    session.commit()
    return {"message": "Production order deleted successfully"}


@app.post("/production-orders/{production_order_id}/clear-schedule")
def clear_production_schedule(production_order_id: int, session: SessionDep):
    db_production_order = session.get(ProductionOrder, production_order_id)
    if not db_production_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    # 1. Delete associated WorkCenterSchedule records
    schedules = session.exec(
        select(WorkCenterSchedule).where(WorkCenterSchedule.production_order_id == production_order_id)
    ).all()
    count = len(schedules)
    for schedule in schedules:
        session.delete(schedule)
        
    # 2. Update ProductionOrder schedule_status
    db_production_order.schedule_status = "Unschedule"
    session.add(db_production_order)
    
    session.commit()
    return {"message": f"Cleared {count} schedule records and reset status to Unschedule"}


# =====================================================
# WORK CENTER SCHEDULE
# =====================================================

@app.get("/work-center-schedule", response_model=list[WorkCenterSchedule])
def read_work_center_schedule(session: SessionDep):
    return session.exec(select(WorkCenterSchedule)).all()


@app.get("/work-center-schedule/{schedule_id}", response_model=WorkCenterSchedule)
def read_work_center_schedule_entry(schedule_id: int, session: SessionDep):
    schedule = session.get(WorkCenterSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Work center schedule not found")
    return schedule


@app.post("/work-center-schedule", response_model=WorkCenterSchedule)
def create_work_center_schedule(schedule: WorkCenterSchedule, session: SessionDep):
    session.add(schedule)
    session.commit()
    session.refresh(schedule)
    return schedule


@app.put("/work-center-schedule/{schedule_id}", response_model=WorkCenterSchedule)
def update_work_center_schedule(schedule_id: int, schedule_data: WorkCenterSchedule, session: SessionDep):
    db_schedule = session.get(WorkCenterSchedule, schedule_id)
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Work center schedule not found")
    schedule_dict = schedule_data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in schedule_dict.items():
        setattr(db_schedule, key, value)
    session.add(db_schedule)
    session.commit()
    session.refresh(db_schedule)
    return db_schedule


@app.delete("/work-center-schedule/{schedule_id}")
def delete_work_center_schedule(schedule_id: int, session: SessionDep):
    db_schedule = session.get(WorkCenterSchedule, schedule_id)
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Work center schedule not found")
    session.delete(db_schedule)
    session.commit()
    return {"message": "Work center schedule deleted successfully"}


# =====================================================
# GANTT CHART DATA API
# =====================================================

from pydantic import BaseModel
from datetime import date as date_type
from typing import Optional

class GanttScheduleItem(BaseModel):
    id: int
    work_center_id: int
    work_center_code: str
    work_center_name: str
    production_order_id: int
    po_number: str
    product_id: int
    product_code: str
    product_name: str
    operation_id: int
    operation_code: str
    operation_name: str
    scheduled_start: str
    scheduled_end: str
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    status: str
    quantity_planned: float
    quantity_completed: float
    number_of_workers_required: int

class GanttWorkCenter(BaseModel):
    id: int
    code: str
    name: str
    number_of_workers_required: int

class GanttDateRange(BaseModel):
    start: str
    end: str

class GanttData(BaseModel):
    schedules: list[GanttScheduleItem]
    work_centers: list[GanttWorkCenter]
    date_range: GanttDateRange
    holidays: list[str]


@app.get("/gantt-data", response_model=GanttData)
def get_gantt_data(
    session: SessionDep,
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)")
):
    """
    Get comprehensive Gantt chart data with all related information
    """
    from datetime import datetime, timedelta
    
    # Get all schedules with related data
    schedules = session.exec(select(WorkCenterSchedule)).all()
    
    gantt_schedules = []
    min_date = None
    max_date = None
    
    for schedule in schedules:
        # Get related entities
        work_center = session.get(WorkCenter, schedule.work_center_id)
        production_order = session.get(ProductionOrder, schedule.production_order_id)
        product = session.get(Product, schedule.product_id)
        operation = session.get(Operation, schedule.operation_id)
        
        if not all([work_center, production_order, product, operation]):
            continue
        
        # Parse dates for filtering
        sched_start = schedule.scheduled_start
        sched_end = schedule.scheduled_end
        
        # Apply date filters if provided
        if start_date:
            filter_start = datetime.fromisoformat(start_date.replace('Z', '+00:00') if 'T' in start_date else f"{start_date}T00:00:00")
            if sched_end < filter_start:
                continue
        
        if end_date:
            filter_end = datetime.fromisoformat(end_date.replace('Z', '+00:00') if 'T' in end_date else f"{end_date}T23:59:59")
            if sched_start > filter_end:
                continue
        
        # Track date range
        if min_date is None or sched_start < min_date:
            min_date = sched_start
        if max_date is None or sched_end > max_date:
            max_date = sched_end
        
        gantt_schedules.append(GanttScheduleItem(
            id=schedule.id,
            work_center_id=work_center.id,
            work_center_code=work_center.work_center_code,
            work_center_name=work_center.work_center_name,
            production_order_id=production_order.id,
            po_number=production_order.po_number,
            product_id=product.id,
            product_code=product.product_code,
            product_name=product.product_name,
            operation_id=operation.id,
            operation_code=operation.operation_code,
            operation_name=operation.operation_name,
            scheduled_start=schedule.scheduled_start.isoformat(),
            scheduled_end=schedule.scheduled_end.isoformat(),
            actual_start=schedule.actual_start.isoformat() if schedule.actual_start else None,
            actual_end=schedule.actual_end.isoformat() if schedule.actual_end else None,
            status=schedule.status,
            quantity_planned=float(production_order.quantity_planned),
            quantity_completed=float(production_order.quantity_completed),
            number_of_workers_required=work_center.number_of_workers_required
        ))
    
    # Get unique work centers that have schedules
    work_center_ids = list(set(s.work_center_id for s in gantt_schedules))
    gantt_work_centers = []
    for wc_id in work_center_ids:
        wc = session.get(WorkCenter, wc_id)
        if wc:
            gantt_work_centers.append(GanttWorkCenter(
                id=wc.id,
                code=wc.work_center_code,
                name=wc.work_center_name,
                number_of_workers_required=wc.number_of_workers_required
            ))
    
    # Sort work centers by code
    gantt_work_centers.sort(key=lambda x: x.code)
    
    # Determine date range
    if min_date and max_date:
        date_range = GanttDateRange(
            start=min_date.date().isoformat() if hasattr(min_date, 'date') else min_date.isoformat()[:10],
            end=max_date.date().isoformat() if hasattr(max_date, 'date') else max_date.isoformat()[:10]
        )
    else:
        today = datetime.now().date()
        date_range = GanttDateRange(
            start=today.isoformat(),
            end=(today + timedelta(days=30)).isoformat()
        )
    
    # Get holidays within the date range
    holidays = []
    calendar_entries = session.exec(select(CompanyCalendar).where(CompanyCalendar.is_working_day == False)).all()
    for entry in calendar_entries:
        holidays.append(entry.calendar_date.isoformat())
    
    return GanttData(
        schedules=gantt_schedules,
        work_centers=gantt_work_centers,
        date_range=date_range,
        holidays=holidays
    )

# =====================================================
# SCHEDULER API
# =====================================================

class ScheduleRequest(BaseModel):
    production_ids: List[int] = Field(..., description="List of production order IDs to schedule")
    max_shift_duration: int = Field(default=120, description="Max duration per chunk (minutes)")
    max_workers: int = Field(default=600, description="Max workers available")
    time_limit_seconds: int = Field(default=60, description="Solver time limit")
    save_to_db: bool = Field(default=True, description="Save results to database")


class ScheduleSegment(BaseModel):
    job: str
    machine: str
    start: int
    finish: int

class ScheduleResponse(BaseModel):
    status: str
    makespan: Optional[int] = None
    solve_time_seconds: float
    message: str
    segments: Optional[List[ScheduleSegment]] = None
    tasks: Optional[List[ScheduleSegment]] = None



@app.post("/schedule", response_model=ScheduleResponse)
def schedule_production(request: ScheduleRequest):
    """
    Run scheduling optimization for specified production orders.
    
    This endpoint:
    1. Loads the production orders and their routing/BOM
    2. Loads existing schedules to avoid conflicts
    3. Runs the CP-SAT solver to find optimal schedule
    4. Optionally saves results to database
    """
    if not request.production_ids:
        raise HTTPException(status_code=400, detail="No production IDs provided")
    
    # Update status to Optimizing before running scheduler
    if request.save_to_db:
        with Session(engine) as session:
            for po_id in request.production_ids:
                po = session.get(ProductionOrder, po_id)
                if po:
                    po.schedule_status = "Optimizing"
                    session.add(po)
            session.commit()
            
    try:
        result = run_scheduling(
            engine=engine,
            production_ids=request.production_ids,
            max_shift_duration=request.max_shift_duration,
            max_workers=request.max_workers,
            time_limit_seconds=request.time_limit_seconds,
            save_to_db=request.save_to_db
        )
        
        segments = None
        tasks = None
        
        if result.segments:
            segments = [
                ScheduleSegment(
                    job=s['Job'],
                    machine=s['Machine'],
                    start=s['Start'],
                    finish=s['Finish']
                )
                for s in result.segments
            ]
        
        if result.tasks:
            tasks = [
                ScheduleSegment(
                    job=t['Job'],
                    machine=t['Machine'],
                    start=t['Start'],
                    finish=t['Finish']
                )
                for t in result.tasks
            ]
        
        return ScheduleResponse(
            status=result.status,
            makespan=result.makespan,
            solve_time_seconds=result.solve_time_seconds,
            message=result.message,
            segments=segments,
            tasks=tasks
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# SCHEDULER SETTINGS ENDPOINTS
# =====================================================

class SchedulerSettingsResponse(BaseModel):
    max_workers: int = 600
    time_limit_seconds: int = 60
    horizon_days: int = 365

class SchedulerSettingsUpdate(BaseModel):
    max_workers: Optional[int] = None
    time_limit_seconds: Optional[int] = None
    horizon_days: Optional[int] = None

@app.get("/scheduler-settings", response_model=SchedulerSettingsResponse)
def get_scheduler_settings(session: SessionDep):
    """Get all scheduler settings as a single object"""
    settings = session.exec(select(SchedulerSettings)).all()
    
    result = SchedulerSettingsResponse()
    for setting in settings:
        if setting.setting_key == "max_workers":
            result.max_workers = int(setting.setting_value)
        elif setting.setting_key == "time_limit_seconds":
            result.time_limit_seconds = int(setting.setting_value)
        elif setting.setting_key == "horizon_days":
            result.horizon_days = int(setting.setting_value)
    
    return result

@app.put("/scheduler-settings", response_model=SchedulerSettingsResponse)
def update_scheduler_settings(settings_update: SchedulerSettingsUpdate, session: SessionDep):
    """Update scheduler settings"""
    
    if settings_update.max_workers is not None:
        setting = session.exec(
            select(SchedulerSettings).where(SchedulerSettings.setting_key == "max_workers")
        ).first()
        if setting:
            setting.setting_value = str(settings_update.max_workers)
            session.add(setting)
        else:
            new_setting = SchedulerSettings(
                setting_key="max_workers",
                setting_value=str(settings_update.max_workers),
                setting_type="integer",
                description="Maximum number of workers available in the factory"
            )
            session.add(new_setting)
    
    if settings_update.time_limit_seconds is not None:
        setting = session.exec(
            select(SchedulerSettings).where(SchedulerSettings.setting_key == "time_limit_seconds")
        ).first()
        if setting:
            setting.setting_value = str(settings_update.time_limit_seconds)
            session.add(setting)
        else:
            new_setting = SchedulerSettings(
                setting_key="time_limit_seconds",
                setting_value=str(settings_update.time_limit_seconds),
                setting_type="integer",
                description="Time limit for the scheduler optimization in seconds"
            )
            session.add(new_setting)
    
    if settings_update.horizon_days is not None:
        setting = session.exec(
            select(SchedulerSettings).where(SchedulerSettings.setting_key == "horizon_days")
        ).first()
        if setting:
            setting.setting_value = str(settings_update.horizon_days)
            session.add(setting)
        else:
            new_setting = SchedulerSettings(
                setting_key="horizon_days",
                setting_value=str(settings_update.horizon_days),
                setting_type="integer",
                description="Planning horizon in days"
            )
            session.add(new_setting)
    
    session.commit()
    
    # Return updated settings
    return get_scheduler_settings(session)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)