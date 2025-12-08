"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductionOrder, WorkCenterSchedule } from "@/app/types/Production";
import { ProductData } from "@/app/types/CoreData";
import { WorkCenter } from "@/app/types/WorkCenter";
import { Operation } from "@/app/types/Operation";
import {
  fetchProductionOrders,
  fetchProducts,
  fetchWorkCenterSchedule,
  fetchWorkCenters,
  fetchOperations,
} from "@/app/lib/data";
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface ProductionDetailPageProps {
  params: Promise<{
    production_id: string;
  }>;
}

interface ScheduleWithDetails extends WorkCenterSchedule {
  workCenter?: WorkCenter;
  operation?: Operation;
}

export default function ProductionDetailPage({
  params,
}: ProductionDetailPageProps) {
  const router = useRouter();
  const { production_id } = use(params);
  const [productionOrder, setProductionOrder] =
    useState<ProductionOrder | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const poId = parseInt(production_id);
        const [
          productionOrdersData,
          productsData,
          schedulesData,
          workCentersData,
          operationsData,
        ] = await Promise.all([
          fetchProductionOrders(),
          fetchProducts(),
          fetchWorkCenterSchedule(),
          fetchWorkCenters(),
          fetchOperations(),
        ]);

        const po = productionOrdersData.find((p) => p.id === poId);
        setProductionOrder(po || null);

        if (po) {
          const prod = productsData.find((p) => p.id === po.product_id);
          setProduct(prod || null);

          const poSchedules = schedulesData
            .filter((s) => s.production_order_id === poId)
            .map((s) => ({
              ...s,
              workCenter: workCentersData.find(
                (w) => w.id === s.work_center_id
              ),
              operation: operationsData.find((o) => o.id === s.operation_id),
            }))
            .sort(
              (a, b) =>
                new Date(a.scheduled_start).getTime() -
                new Date(b.scheduled_start).getTime()
            );

          setSchedules(poSchedules);
        }
      } catch (error) {
        console.error("Failed to fetch production order details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [production_id]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: "bg-gray-100 text-gray-700 border-gray-200",
      released: "bg-blue-100 text-blue-700 border-blue-200",
      "in-progress": "bg-yellow-100 text-yellow-700 border-yellow-200",
      completed: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
      "on-hold": "bg-orange-100 text-orange-700 border-orange-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getScheduleStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-gray-100 text-gray-700",
      "in-progress": "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!productionOrder) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Production Order not found</p>
      </div>
    );
  }

  const progress =
    (productionOrder.quantity_completed / productionOrder.quantity_planned) *
    100;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {productionOrder.po_number}
              </h1>
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getStatusColor(
                  productionOrder.status
                )}`}
              >
                {productionOrder.status.toUpperCase()}
              </span>
            </div>
            {product && (
              <Link
                href={`/products/${product.id}`}
                className="text-gray-600 text-lg hover:text-blue-600 hover:underline"
              >
                {product.product_code} - {product.product_name}
              </Link>
            )}
          </div>
        </div>

        {/* Production Info Grid */}
        <div className="grid grid-cols-4 gap-8 mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Quantity Planned:</p>
            <p className="text-base font-medium text-gray-900">
              {productionOrder.quantity_planned.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Quantity Completed:</p>
            <p className="text-base font-medium text-gray-900">
              {productionOrder.quantity_completed.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Quantity Scrapped:</p>
            <p className="text-base font-medium text-gray-900">
              {productionOrder.quantity_scrapped.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Priority:</p>
            <p className="text-base font-medium text-gray-900">
              {productionOrder.priority}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Progress:</span>
            <span className="font-medium text-gray-900">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-4 gap-8">
          {productionOrder.scheduled_start_date && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Scheduled Start:</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(
                  productionOrder.scheduled_start_date
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
          {productionOrder.scheduled_end_date && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Scheduled End:</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(
                  productionOrder.scheduled_end_date
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
          {productionOrder.actual_start_date && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Actual Start:</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(productionOrder.actual_start_date).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </p>
            </div>
          )}
          {productionOrder.actual_end_date && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Actual End:</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(productionOrder.actual_end_date).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </p>
            </div>
          )}
        </div>

        {productionOrder.notes && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Notes:</p>
            <p className="text-gray-700">{productionOrder.notes}</p>
          </div>
        )}
      </div>

      {/* Work Center Schedule Section */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Work Center Schedule
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Work Center
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Operation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Scheduled Start
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Scheduled End
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Planned Qty
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Completed Qty
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schedules.map((schedule) => {
                  const scheduleProgress =
                    (schedule.quantity_completed / schedule.quantity_planned) *
                    100;
                  return (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {schedule.workCenter ? (
                          <Link
                            href={`/workcenter/${schedule.work_center_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {schedule.workCenter.work_center_code}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {schedule.operation ? (
                          <Link
                            href={`/operations/${schedule.operation_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {schedule.operation.operation_code}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getScheduleStatusColor(
                            schedule.status
                          )}`}
                        >
                          {schedule.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(schedule.scheduled_start).toLocaleString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(schedule.scheduled_end).toLocaleString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                        {schedule.quantity_planned.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                        {schedule.quantity_completed.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(scheduleProgress, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-10 text-right">
                            {Math.round(scheduleProgress)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {schedules.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No work center schedule found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
