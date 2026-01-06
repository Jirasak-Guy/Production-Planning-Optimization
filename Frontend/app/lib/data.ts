import { ProductData, Order, OrderItem, BOM } from "@/app/types/CoreData";
import { Shift, CompanyCalendar } from "@/app/types/Shift";
import {
  WorkCenter,
  WorkCenterShift,
  WorkCenterCalendarException,
} from "@/app/types/WorkCenter";
import { Operation, OperationDependency } from "@/app/types/Operation";
import { Routing, RoutingBOM } from "@/app/types/Routing";
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

async function updateData<T>(endpoint: string, data: Partial<T>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update data: ${error}`);
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

export async function updateBOM(bomId: number, data: Partial<BOM>): Promise<BOM> {
  return updateData<BOM>(`/bom/${bomId}`, data);
}

// =====================================================
// SHIFT AND CALENDAR FETCHERS
// =====================================================

export async function fetchShifts(): Promise<Shift[]> {
  return fetchData<Shift>("/shifts");
}

export async function fetchShiftById(shiftId: number): Promise<Shift> {
  const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch shift ${shiftId}`);
  }
  return response.json();
}

export async function fetchCompanyCalendar(): Promise<CompanyCalendar[]> {
  return fetchData<CompanyCalendar>("/company-calendar");
}

export async function fetchCompanyCalendarById(calendarId: number): Promise<CompanyCalendar> {
  const response = await fetch(`${API_BASE_URL}/company-calendar/${calendarId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar entry ${calendarId}`);
  }
  return response.json();
}

// =====================================================
// WORK CENTER FETCHERS
// =====================================================

export async function fetchWorkCenters(): Promise<WorkCenter[]> {
  return fetchData<WorkCenter>("/work-centers");
}

export async function fetchWorkCenterById(
  workCenterId: number
): Promise<WorkCenter> {
  const response = await fetch(`${API_BASE_URL}/work-centers/${workCenterId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch work center ${workCenterId}`);
  }
  return response.json();
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

export async function fetchOperationById(
  operationId: number
): Promise<Operation> {
  const response = await fetch(`${API_BASE_URL}/operations/${operationId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch operation ${operationId}`);
  }
  return response.json();
}

export async function fetchRouting(): Promise<Routing[]> {
  return fetchData<Routing>("/routing");
}

export async function fetchOperationDependencies(): Promise<
  OperationDependency[]
> {
  return fetchData<OperationDependency>("/operation-dependencies");
}

export async function fetchRoutingBOM(): Promise<RoutingBOM[]> {
  return fetchData<RoutingBOM>("/routing-bom");
}

export async function fetchRoutingBOMByRoutingId(routingId: number): Promise<RoutingBOM[]> {
  const response = await fetch(`${API_BASE_URL}/routing/${routingId}/bom-links`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch routing BOM links for routing ${routingId}`);
  }
  return response.json();
}

export async function updateOperation(operationId: number, data: Partial<Operation>): Promise<Operation> {
  return updateData<Operation>(`/operations/${operationId}`, data);
}

export async function fetchWorkCentersByOperation(operationId: number): Promise<WorkCenter[]> {
  const response = await fetch(`${API_BASE_URL}/operations/${operationId}/work-centers`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch work centers for operation ${operationId}`);
  }
  return response.json();
}

export async function deleteOperation(operationId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/operations/${operationId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete operation: ${error}`);
  }
}

// =====================================================
// PRODUCTION TRACKING FETCHERS
// =====================================================

export async function fetchProductionOrders(): Promise<ProductionOrder[]> {
  return fetchData<ProductionOrder>("/production-orders");
}

export async function fetchProductionOrderById(
  productionOrderId: number
): Promise<ProductionOrder> {
  const response = await fetch(`${API_BASE_URL}/production-orders/${productionOrderId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch production order ${productionOrderId}`);
  }
  return response.json();
}

export async function fetchWorkCenterSchedule(): Promise<WorkCenterSchedule[]> {
  return fetchData<WorkCenterSchedule>("/work-center-schedule");
}

export async function updateProductionOrder(productionOrderId: number, data: Partial<ProductionOrder>): Promise<ProductionOrder> {
  return updateData<ProductionOrder>(`/production-orders/${productionOrderId}`, data);
}

export async function deleteProductionOrder(productionOrderId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/production-orders/${productionOrderId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete production order ${productionOrderId}`);
  }
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

export async function createRouting(data: Partial<Routing>): Promise<Routing> {
  return createData<Routing>("/routing", data);
}

export async function createOperationDependency(data: Partial<OperationDependency>): Promise<OperationDependency> {
  return createData<OperationDependency>("/operation-dependencies", data);
}

export async function createRoutingBOM(data: Partial<RoutingBOM>): Promise<RoutingBOM> {
  return createData<RoutingBOM>("/routing-bom", data);
}

export async function createProductionOrder(data: Partial<ProductionOrder>): Promise<ProductionOrder> {
  return createData<ProductionOrder>("/production-orders", data);
}

// =====================================================
// UPDATE FUNCTIONS
// =====================================================

export async function updateOrder(orderId: number, data: Partial<Order>): Promise<Order> {
  return updateData<Order>(`/orders/${orderId}`, data);
}

export async function updateProduct(productId: number, data: Partial<ProductData>): Promise<ProductData> {
  return updateData<ProductData>(`/products/${productId}`, data);
}

export async function updateOrderItem(orderItemId: number, data: Partial<OrderItem>): Promise<OrderItem> {
  return updateData<OrderItem>(`/order-items/${orderItemId}`, data);
}

export async function updateRouting(routingId: number, data: Partial<Routing>): Promise<Routing> {
  return updateData<Routing>(`/routing/${routingId}`, data);
}

export async function updateRoutingBOM(routingBOMId: number, data: Partial<RoutingBOM>): Promise<RoutingBOM> {
  return updateData<RoutingBOM>(`/routing-bom/${routingBOMId}`, data);
}

export async function updateShift(shiftId: number, data: Partial<Shift>): Promise<Shift> {
  return updateData<Shift>(`/shifts/${shiftId}`, data);
}

export async function updateCompanyCalendar(calendarId: number, data: Partial<CompanyCalendar>): Promise<CompanyCalendar> {
  return updateData<CompanyCalendar>(`/company-calendar/${calendarId}`, data);
}

// =====================================================
// DELETE FUNCTIONS
// =====================================================

export async function deleteOrder(orderId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete order: ${error}`);
  }
}

export async function deleteRouting(routingId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/routing/${routingId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete routing: ${error}`);
  }
}

export async function deleteRoutingBOM(routingBOMId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/routing-bom/${routingBOMId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete routing BOM: ${error}`);
  }
}

export async function deleteOperationDependency(dependencyId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/operation-dependencies/${dependencyId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete operation dependency: ${error}`);
  }
}

export async function deleteOrderItem(orderItemId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/order-items/${orderItemId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete order item: ${error}`);
  }
}

export async function deleteProduct(productId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete product: ${error}`);
  }
}

export async function deleteBOM(bomId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bom/${bomId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete BOM item: ${error}`);
  }
}

export async function deleteShift(shiftId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete shift: ${error}`);
  }
}

export async function deleteCompanyCalendar(calendarId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/company-calendar/${calendarId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete calendar entry: ${error}`);
  }
}

// =====================================================
// WORK CENTER CRUD
// =====================================================

export async function updateWorkCenter(workCenterId: number, data: Partial<WorkCenter>): Promise<WorkCenter> {
  return updateData<WorkCenter>(`/work-centers/${workCenterId}`, data);
}

export async function deleteWorkCenter(workCenterId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/work-centers/${workCenterId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete work center: ${error}`);
  }
}

// =====================================================
// WORK CENTER SHIFT CRUD
// =====================================================

export async function createWorkCenterShift(data: Partial<WorkCenterShift>): Promise<WorkCenterShift> {
  return createData<WorkCenterShift>("/work-center-shifts", data);
}

export async function updateWorkCenterShift(shiftId: number, data: Partial<WorkCenterShift>): Promise<WorkCenterShift> {
  return updateData<WorkCenterShift>(`/work-center-shifts/${shiftId}`, data);
}

export async function deleteWorkCenterShift(shiftId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/work-center-shifts/${shiftId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete work center shift: ${error}`);
  }
}

// =====================================================
// WORK CENTER CALENDAR EXCEPTION CRUD
// =====================================================

export async function createWorkCenterCalendarException(data: Partial<WorkCenterCalendarException>): Promise<WorkCenterCalendarException> {
  return createData<WorkCenterCalendarException>("/work-center-calendar-exceptions", data);
}

export async function updateWorkCenterCalendarException(exceptionId: number, data: Partial<WorkCenterCalendarException>): Promise<WorkCenterCalendarException> {
  return updateData<WorkCenterCalendarException>(`/work-center-calendar-exceptions/${exceptionId}`, data);
}

export async function deleteWorkCenterCalendarException(exceptionId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/work-center-calendar-exceptions/${exceptionId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete calendar exception: ${error}`);
  }
}
