"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Operation } from "@/app/types/Operation";
import { Routing } from "@/app/types/Routing";
import { ProductData } from "@/app/types/CoreData";
import { WorkCenter } from "@/app/types/WorkCenter";
import {
  fetchOperationById,
  fetchRouting,
  fetchProducts,
  fetchWorkCenters,
} from "@/app/lib/data";
import { ArrowLeftIcon, ClockIcon } from "@heroicons/react/24/outline";

interface OperationDetailPageProps {
  params: Promise<{
    operation_id: string;
  }>;
}

interface RoutingWithDetails extends Routing {
  product?: ProductData;
  workCenter?: WorkCenter;
}

export default function OperationDetailPage({
  params,
}: OperationDetailPageProps) {
  const router = useRouter();
  const { operation_id } = use(params);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [routings, setRoutings] = useState<RoutingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const operationId = parseInt(operation_id);
        const [operationData, routingsData, productsData, workCentersData] =
          await Promise.all([
            fetchOperationById(operationId),
            fetchRouting(),
            fetchProducts(),
            fetchWorkCenters(),
          ]);

        setOperation(operationData);

        const opRoutings = routingsData
          .filter((r) => r.operation_id === operationId && r.is_active)
          .map((r) => ({
            ...r,
            product: productsData.find((p) => p.id === r.product_id),
            workCenter: workCentersData.find((w) => w.id === r.work_center_id),
          }));

        setRoutings(opRoutings);
      } catch (error) {
        console.error("Failed to fetch operation details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [operation_id]);

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

  if (!operation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Operation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
                {operation.operation_code}
              </h1>
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${operation.is_active
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
              >
                {operation.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            <p className="text-gray-600 text-lg">{operation.operation_name}</p>
          </div>
        </div>

        {operation.description && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Description:</p>
            <p className="text-gray-700">{operation.description}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Routing Information
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Work Center
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                    Sequence
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Setup Time
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                    Time/Unit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {routings.map((routing) => (
                  <tr key={routing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {routing.product ? (
                        <Link
                          href={`/products/${routing.product_id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {routing.product.product_code}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {routing.workCenter ? (
                        <Link
                          href={`/workcenter/${routing.work_center_id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {routing.workCenter.work_center_code}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                        {routing.sequence_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-gray-900">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <span>{routing.setup_time_minutes} min</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {routing.time_per_unit_minutes} min
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {routing.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {routings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No routing information found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
