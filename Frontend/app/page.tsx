"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchOrders,
  fetchProducts,
  fetchProductionOrders,
  fetchWorkCenters,
} from "@/app/lib/data";
import { Order, ProductData } from "@/app/types/CoreData";
import { ProductionOrder } from "@/app/types/Production";
import { WorkCenter } from "@/app/types/WorkCenter";
import {
  DocumentTextIcon,
  CubeIcon,
  RectangleStackIcon,
  CogIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
} from "@heroicons/react/24/outline";

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    []
  );
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [ordersData, productsData, productionData, workCentersData] =
          await Promise.all([
            fetchOrders(),
            fetchProducts(),
            fetchProductionOrders(),
            fetchWorkCenters(),
          ]);

        setOrders(ordersData);
        setProducts(productsData);
        setProductionOrders(productionData);
        setWorkCenters(workCentersData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    inProductionOrders: orders.filter((o) => o.status === "in-production")
      .length,
    completedOrders: orders.filter((o) => o.status === "completed").length,
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.is_active).length,
    totalProduction: productionOrders.length,
    inProgressProduction: productionOrders.filter(
      (po) => po.status === "in-progress"
    ).length,
    totalWorkCenters: workCenters.length,
    activeWorkCenters: workCenters.filter((wc) => wc.status === "active")
      .length,
  };

  // Get recent orders
  const recentOrders = orders
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  // Get urgent production orders
  const urgentProduction = productionOrders
    .filter((po) => po.status === "in-progress" && po.priority <= 2)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Welcome to Scheduling Optimization System
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Orders Card */}
          <Link href="/orders">
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalOrders}
              </h3>
              <p className="text-sm text-gray-600">Orders</p>
              <div className="mt-4 flex gap-3 text-xs">
                <span className="text-yellow-600">
                  {stats.pendingOrders} Pending
                </span>
                <span className="text-blue-600">
                  {stats.inProductionOrders} In Prod
                </span>
                <span className="text-green-600">
                  {stats.completedOrders} Done
                </span>
              </div>
            </div>
          </Link>

          {/* Products Card */}
          <Link href="/products">
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CubeIcon className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalProducts}
              </h3>
              <p className="text-sm text-gray-600">Products</p>
              <div className="mt-4 text-xs">
                <span className="text-green-600">
                  {stats.activeProducts} Active
                </span>
              </div>
            </div>
          </Link>

          {/* Production Card */}
          <Link href="/production">
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <RectangleStackIcon className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalProduction}
              </h3>
              <p className="text-sm text-gray-600">Production Orders</p>
              <div className="mt-4 text-xs">
                <span className="text-yellow-600">
                  {stats.inProgressProduction} In Progress
                </span>
              </div>
            </div>
          </Link>

          {/* Work Centers Card */}
          <Link href="/workcenter">
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CogIcon className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalWorkCenters}
              </h3>
              <p className="text-sm text-gray-600">Work Centers</p>
              <div className="mt-4 text-xs">
                <span className="text-green-600">
                  {stats.activeWorkCenters} Active
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Orders
                </h2>
                <Link
                  href="/orders"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-blue-600">
                          {order.order_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : order.status === "in-production"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.customer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Due Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(order.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {recentOrders.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No recent orders
                </div>
              )}
            </div>
          </div>

          {/* Urgent Production */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Urgent Production
                </h2>
                <Link
                  href="/production"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {urgentProduction.map((po) => {
                const progress =
                  (po.quantity_completed / po.quantity_planned) * 100;
                return (
                  <Link
                    key={po.id}
                    href={`/production/${po.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-blue-600">
                            {po.po_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Priority {po.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {po.quantity_completed} / {po.quantity_planned} units
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
              {urgentProduction.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No urgent production orders
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/orders"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
            >
              <DocumentTextIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">New Order</p>
            </Link>
            <Link
              href="/production"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
            >
              <RectangleStackIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                Production Order
              </p>
            </Link>
            <Link
              href="/products"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
            >
              <CubeIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Add Product</p>
            </Link>
            <Link
              href="/company-calendar"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
            >
              <ClockIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">View Calendar</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
