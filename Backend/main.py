import os
from typing import Annotated

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
    OperationDependency,
    ProductionOrder,
    WorkCenterSchedule,
)

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
# CORE ENDPOINTS
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


@app.get("/products", response_model=list[Product])
def read_products(session: SessionDep):
    return session.exec(select(Product)).all()


@app.get("/products/{product_id}", response_model=Product)
def read_product(product_id: int, session: SessionDep):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/order-items", response_model=list[OrderItem])
def read_order_items(session: SessionDep):
    return session.exec(select(OrderItem)).all()


@app.get("/orders/{order_id}/order-items", response_model=list[OrderItem])
def read_order_items_by_order_id(order_id: int, session: SessionDep):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()


@app.get("/bom", response_model=list[BOM])
def read_bom(session: SessionDep):
    return session.exec(select(BOM)).all()


# =====================================================
# WORK CENTER AND SHIFT ENDPOINTS
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


@app.get("/company-calendar", response_model=list[CompanyCalendar])
def read_company_calendar(session: SessionDep):
    return session.exec(select(CompanyCalendar)).all()


@app.get("/company-calendar/{calendar_id}", response_model=CompanyCalendar)
def read_company_calendar_entry(calendar_id: int, session: SessionDep):
    calendar = session.get(CompanyCalendar, calendar_id)
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar entry not found")
    return calendar


@app.get("/work-centers", response_model=list[WorkCenter])
def read_work_centers(session: SessionDep):
    return session.exec(select(WorkCenter)).all()


@app.get("/work-centers/{work_center_id}", response_model=WorkCenter)
def read_work_center(work_center_id: int, session: SessionDep):
    work_center = session.get(WorkCenter, work_center_id)
    if not work_center:
        raise HTTPException(status_code=404, detail="Work center not found")
    return work_center


@app.get("/work-center-shifts", response_model=list[WorkCenterShift])
def read_work_center_shifts(session: SessionDep):
    return session.exec(select(WorkCenterShift)).all()


@app.get("/work-center-calendar-exceptions", response_model=list[WorkCenterCalendarException])
def read_work_center_calendar_exceptions(session: SessionDep):
    return session.exec(select(WorkCenterCalendarException)).all()


# =====================================================
# OPERATIONS AND ROUTING ENDPOINTS
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


@app.get("/routing", response_model=list[Routing])
def read_routing(session: SessionDep):
    return session.exec(select(Routing)).all()


@app.get("/operation-dependencies", response_model=list[OperationDependency])
def read_operation_dependencies(session: SessionDep):
    return session.exec(select(OperationDependency)).all()


# =====================================================
# PRODUCTION TRACKING ENDPOINTS
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


@app.get("/work-center-schedule", response_model=list[WorkCenterSchedule])
def read_work_center_schedule(session: SessionDep):
    return session.exec(select(WorkCenterSchedule)).all()


# =====================================================
# CRUD OPERATIONS - ORDERS
# =====================================================

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
    
    # Delete related order items first
    order_items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    for item in order_items:
        session.delete(item)
    
    session.delete(db_order)
    session.commit()
    return {"message": "Order deleted successfully"}


# =====================================================
# CRUD OPERATIONS - PRODUCTS
# =====================================================

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
# CRUD OPERATIONS - ORDER ITEMS
# =====================================================

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
    session.delete(db_order_item)
    session.commit()
    return {"message": "Order item deleted successfully"}


# =====================================================
# CRUD OPERATIONS - BOM
# =====================================================

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
    session.delete(db_bom)
    session.commit()
    return {"message": "BOM deleted successfully"}


# =====================================================
# CRUD OPERATIONS - SHIFTS
# =====================================================

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
# CRUD OPERATIONS - COMPANY CALENDAR
# =====================================================

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
    
    # Delete related work center calendar exceptions first
    exceptions = session.exec(select(WorkCenterCalendarException).where(
        WorkCenterCalendarException.calendar_id == calendar_id
    )).all()
    for exception in exceptions:
        session.delete(exception)
    
    session.delete(db_calendar)
    session.commit()
    return {"message": "Company calendar deleted successfully"}


# =====================================================
# CRUD OPERATIONS - WORK CENTERS
# =====================================================

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
    session.delete(db_work_center)
    session.commit()
    return {"message": "Work center deleted successfully"}


# =====================================================
# CRUD OPERATIONS - WORK CENTER SHIFTS
# =====================================================

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
# CRUD OPERATIONS - WORK CENTER CALENDAR EXCEPTIONS
# =====================================================

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
# CRUD OPERATIONS - OPERATIONS
# =====================================================

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
    session.delete(db_operation)
    session.commit()
    return {"message": "Operation deleted successfully"}


# =====================================================
# CRUD OPERATIONS - ROUTING
# =====================================================

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


# =====================================================
# CRUD OPERATIONS - OPERATION DEPENDENCIES
# =====================================================

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
# CRUD OPERATIONS - PRODUCTION ORDERS
# =====================================================

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
    session.delete(db_production_order)
    session.commit()
    return {"message": "Production order deleted successfully"}


# =====================================================
# CRUD OPERATIONS - WORK CENTER SCHEDULE
# =====================================================

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)