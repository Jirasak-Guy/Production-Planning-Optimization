"use client";

import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

export type ViewMode = "card" | "table";
export type OrdersSortKey =
  | "id"
  | "order_number"
  | "customer_name"
  | "order_date"
  | "due_date"
  | "priority"
  | "status";
export type SortDirection = "asc" | "desc";

interface OrdersHeaderProps {
  onSearch: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
}

export default function OrdersHeader({
  onSearch,
  onRefresh,
  onAdd,
}: OrdersHeaderProps) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Orders</h2>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-400"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-6 h-6" />
          </button>

          {/* Add Button */}
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>Add Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}
