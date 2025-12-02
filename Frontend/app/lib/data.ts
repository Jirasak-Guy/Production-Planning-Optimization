import { ProductData, Order, OrderItem, BOM } from "@/app/types/CoreData";
import { Shift, CompanyCalendar } from "@/app/types/Shift";
import { WorkCenter, WorkCenterShift, WorkCenterCalendarException } from "@/app/types/WorkCenter";
import { Operation, OperationDependency } from "@/app/types/Operation";
import { Routing } from "@/app/types/Routing";
import { ProductionOrder, WorkCenterSchedule } from "@/app/types/Production";

const API_BASE_URL = "http://localhost:8000";

// =====================================================
// HELPER FUNCTION
// =====================================================

async function fetchData<T>(endpoint: string): Promise<T[]> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  return response.json();
}

// =====================================================
// CORE DATA FETCHERS
// =====================================================

export async function fetchOrders(): Promise<Order[]> {
  return fetchData<Order>("/orders");
}

export async function fetchProducts(): Promise<ProductData[]> {
  return fetchData<ProductData>("/products");
}

export async function fetchOrderItems(): Promise<OrderItem[]> {
  return fetchData<OrderItem>("/order-items");
}

export async function fetchBOM(): Promise<BOM[]> {
  return fetchData<BOM>("/bom");
}

// =====================================================
// SHIFT AND CALENDAR FETCHERS
// =====================================================

export async function fetchShifts(): Promise<Shift[]> {
  return fetchData<Shift>("/shifts");
}

export async function fetchCompanyCalendar(): Promise<CompanyCalendar[]> {
  return fetchData<CompanyCalendar>("/company-calendar");
}

// =====================================================
// WORK CENTER FETCHERS
// =====================================================

export async function fetchWorkCenters(): Promise<WorkCenter[]> {
  return fetchData<WorkCenter>("/work-centers");
}

export async function fetchWorkCenterShifts(): Promise<WorkCenterShift[]> {
  return fetchData<WorkCenterShift>("/work-center-shifts");
}

export async function fetchWorkCenterCalendarExceptions(): Promise<WorkCenterCalendarException[]> {
  return fetchData<WorkCenterCalendarException>("/work-center-calendar-exceptions");
}

// =====================================================
// OPERATION AND ROUTING FETCHERS
// =====================================================

export async function fetchOperations(): Promise<Operation[]> {
  return fetchData<Operation>("/operations");
}

export async function fetchRouting(): Promise<Routing[]> {
  return fetchData<Routing>("/routing");
}

export async function fetchOperationDependencies(): Promise<OperationDependency[]> {
  return fetchData<OperationDependency>("/operation-dependencies");
}

// =====================================================
// PRODUCTION TRACKING FETCHERS
// =====================================================

export async function fetchProductionOrders(): Promise<ProductionOrder[]> {
  return fetchData<ProductionOrder>("/production-orders");
}

export async function fetchWorkCenterSchedule(): Promise<WorkCenterSchedule[]> {
  return fetchData<WorkCenterSchedule>("/work-center-schedule");
}