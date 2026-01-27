"use client";

import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

export type ViewMode = "card" | "table";
export type ProductionSortKey =
  | "id"
  | "po_number"
  | "priority"
  | "quantity_planned"
  | "quantity_completed"
  | "scheduled_start_date"
  | "status"
  | "schedule_status";
export type SortDirection = "asc" | "desc";

interface SchedulerSettings {
  max_workers: number;
  time_limit_seconds: number;
  horizon_days: number;
}

interface ProductionHeaderProps {
  onSearch: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  // Scheduler Settings Props
  schedulerSettings?: SchedulerSettings;
  onOpenSettings?: () => void;
}

export default function ProductionHeader({
  onSearch,
  onRefresh,
  onAdd,
  schedulerSettings,
  onOpenSettings,
}: ProductionHeaderProps) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Production Orders</h2>

        <div className="flex items-center gap-3">
          {/* Scheduler Settings Info */}
          {schedulerSettings && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="text-sm text-purple-700 font-medium">{schedulerSettings.max_workers}</span>
              <span className="text-purple-300">|</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-purple-700 font-medium">{schedulerSettings.time_limit_seconds}s</span>
            </div>
          )}

          {/* Settings Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors shadow-sm"
              title="Scheduler Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="Search production orders..."
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-400"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={onRefresh}
            className="p-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-6 h-6" />
          </button>

          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>Create Production Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}
