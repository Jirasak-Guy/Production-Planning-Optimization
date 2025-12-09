"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Routing } from "@/app/types/Routing";
import { ProductData } from "@/app/types/CoreData";
import { Operation } from "@/app/types/Operation";
import { WorkCenter } from "@/app/types/WorkCenter";
import {
  fetchRouting,
  fetchProducts,
  fetchOperations,
  fetchWorkCenters,
} from "@/app/lib/data";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface RoutingWithDetails extends Routing {
  product?: ProductData;
  operation?: Operation;
  workCenter?: WorkCenter;
}

export default function RoutingPage() {
  const [routings, setRoutings] = useState<RoutingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterWorkCenter, setFilterWorkCenter] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);

  useEffect(() => {
    loadRoutings();
  }, []);

  const loadRoutings = async () => {
    setIsLoading(true);
    try {
      const [routingsData, productsData, operationsData, workCentersData] =
        await Promise.all([
          fetchRouting(),
          fetchProducts(),
          fetchOperations(),
          fetchWorkCenters(),
        ]);

      setProducts(productsData);
      setWorkCenters(workCentersData);

      const routingsWithDetails = routingsData.map((routing) => ({
        ...routing,
        product: productsData.find((p) => p.id === routing.product_id),
        operation: operationsData.find((o) => o.id === routing.operation_id),
        workCenter: workCentersData.find((w) => w.id === routing.work_center_id),
      }));

      setRoutings(routingsWithDetails);
    } catch (error) {
      console.error("Failed to fetch routings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRoutings = routings.filter((routing) => {
    const matchesSearch =
      routing.product?.product_code
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      routing.product?.product_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      routing.operation?.operation_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      routing.workCenter?.work_center_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesProduct =
      !filterProduct || routing.product_id.toString() === filterProduct;
    const matchesWorkCenter =
      !filterWorkCenter || routing.work_center_id.toString() === filterWorkCenter;

    return matchesSearch && matchesProduct && matchesWorkCenter;
  });

  // Group routings by product
  const routingsByProduct = filteredRoutings.reduce((acc, routing) => {
    const productId = routing.product_id;
    if (!acc[productId]) {
      acc[productId] = {
        product: routing.product,
        routings: [],
      };
    }
    acc[productId].routings.push(routing);
    return acc;
  }, {} as Record<number, { product?: ProductData; routings: RoutingWithDetails[] }>);

  // Sort routings within each product by sequence number
  Object.values(routingsByProduct).forEach((group) => {
    group.routings.sort((a, b) => a.sequence_number - b.sequence_number);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading routings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Routing</h2>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search routings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {/* Product Filter */}
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {products
                .filter((p) => p.is_active)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_code}
                  </option>
                ))}
            </select>

            {/* Work Center Filter */}
            <select
              value={filterWorkCenter}
              onChange={(e) => setFilterWorkCenter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Work Centers</option>
              {workCenters
                .filter((w) => w.status === "active")
                .map((wc) => (
                  <option key={wc.id} value={wc.id}>
                    {wc.work_center_code}
                  </option>
                ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={loadRoutings}
              className="p-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-6 h-6" />
            </button>

            {/* Add Button - placeholder for future */}
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Add Routing"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>Add Routing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {Object.keys(routingsByProduct).length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-lg">No routings found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(routingsByProduct).map(([productId, group]) => (
              <div
                key={productId}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Product Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/products/${productId}`}
                        className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {group.product?.product_code || `Product #${productId}`}
                      </Link>
                      <p className="text-sm text-gray-600">
                        {group.product?.product_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {group.routings.length} step{group.routings.length !== 1 ? "s" : ""}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          group.product?.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {group.product?.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Routing Steps */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Seq
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Operation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Work Center
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Setup Time
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Time/Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Notes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {group.routings.map((routing) => (
                        <tr
                          key={routing.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                              {routing.sequence_number}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {routing.operation ? (
                              <Link
                                href={`/operations/${routing.operation_id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {routing.operation.operation_code}
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1 text-sm text-gray-900">
                              <ClockIcon className="w-4 h-4 text-gray-400" />
                              {routing.setup_time_minutes} min
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1 text-sm text-gray-900">
                              <ClockIcon className="w-4 h-4 text-gray-400" />
                              {routing.time_per_unit_minutes} min
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 line-clamp-2">
                              {routing.notes || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                                routing.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {routing.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredRoutings.length} of {routings.length} routings
          </span>
          <span>
            {Object.keys(routingsByProduct).length} product{Object.keys(routingsByProduct).length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
