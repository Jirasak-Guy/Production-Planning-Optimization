import { ProductData, Order, OrderItem, BOM } from "@/app/types/CoreData";
import { Shift, CompanyCalendar } from "@/app/types/Shift";
import {
  WorkCenter,
  WorkCenterShift,
  WorkCenterCalendarException,
} from "@/app/types/WorkCenter";
import { Operation, OperationDependency } from "@/app/types/Operation";
import { Routing } from "@/app/types/Routing";
import { ProductionOrder, WorkCenterSchedule } from "@/app/types/Production";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function fetchData<T>(endpoint: string): Promise<T[]> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  return response.json();
}

async function createData<T>(endpoint: string, data: Partial<T>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create data: ${error}`);
  }
  return response.json();
}

// =====================================================
// CORE DATA FETCHERS
// =====================================================

export async function fetchOrders(): Promise<Order[]> {
  return fetchData<Order>("/orders");
}

export async function fetchOrderById(orderId: number): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch order ${orderId}`);
  }
  return response.json();
}

export async function fetchProducts(): Promise<ProductData[]> {
  return fetchData<ProductData>("/products");
}

export async function fetchProductById(
  productId: number
): Promise<ProductData> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch product ${productId}`);
  }
  return response.json();
}

export async function fetchOrderItems(): Promise<OrderItem[]> {
  return fetchData<OrderItem>("/order-items");
}

export async function fetchOrderItemsByOrderId(
  orderId: number
): Promise<OrderItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/orders/${orderId}/order-items`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch order items for order ${orderId}`);
  }
  return response.json();
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

export async function fetchWorkCenterCalendarExceptions(): Promise<
  WorkCenterCalendarException[]
> {
  return fetchData<WorkCenterCalendarException>(
    "/work-center-calendar-exceptions"
  );
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

export async function fetchOperationDependencies(): Promise<
  OperationDependency[]
> {
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

// =====================================================
// CREATE FUNCTIONS
// =====================================================

export async function createOrder(data: Partial<Order>): Promise<Order> {
  return createData<Order>("/orders", data);
}

export async function createProduct(data: Partial<ProductData>): Promise<ProductData> {
  return createData<ProductData>("/products", data);
}

export async function createOrderItem(data: Partial<OrderItem>): Promise<OrderItem> {
  return createData<OrderItem>("/order-items", data);
}

export async function createBOM(data: Partial<BOM>): Promise<BOM> {
  return createData<BOM>("/bom", data);
}

export async function createShift(data: Partial<Shift>): Promise<Shift> {
  return createData<Shift>("/shifts", data);
}

export async function createCompanyCalendar(data: Partial<CompanyCalendar>): Promise<CompanyCalendar> {
  return createData<CompanyCalendar>("/company-calendar", data);
}

export async function createWorkCenter(data: Partial<WorkCenter>): Promise<WorkCenter> {
  return createData<WorkCenter>("/work-centers", data);
}

export async function createOperation(data: Partial<Operation>): Promise<Operation> {
  return createData<Operation>("/operations", data);
}

export async function createProductionOrder(data: Partial<ProductionOrder>): Promise<ProductionOrder> {
  return createData<ProductionOrder>("/production-orders", data);
}

