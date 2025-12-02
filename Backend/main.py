import os
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Session, create_engine, select

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


# =====================================================
# CORE ENDPOINTS
# =====================================================

@app.get("/orders", response_model=list[Order])
def read_orders(session: SessionDep):
    return session.exec(select(Order)).all()


@app.get("/products", response_model=list[Product])
def read_products(session: SessionDep):
    return session.exec(select(Product)).all()


@app.get("/order-items", response_model=list[OrderItem])
def read_order_items(session: SessionDep):
    return session.exec(select(OrderItem)).all()


@app.get("/bom", response_model=list[BOM])
def read_bom(session: SessionDep):
    return session.exec(select(BOM)).all()


# =====================================================
# WORK CENTER AND SHIFT ENDPOINTS
# =====================================================

@app.get("/shifts", response_model=list[Shift])
def read_shifts(session: SessionDep):
    return session.exec(select(Shift)).all()


@app.get("/company-calendar", response_model=list[CompanyCalendar])
def read_company_calendar(session: SessionDep):
    return session.exec(select(CompanyCalendar)).all()


@app.get("/work-centers", response_model=list[WorkCenter])
def read_work_centers(session: SessionDep):
    return session.exec(select(WorkCenter)).all()


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


@app.get("/work-center-schedule", response_model=list[WorkCenterSchedule])
def read_work_center_schedule(session: SessionDep):
    return session.exec(select(WorkCenterSchedule)).all()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)