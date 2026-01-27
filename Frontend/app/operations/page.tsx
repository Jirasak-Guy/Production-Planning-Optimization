"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import OperationCard from "@/app/components/OperationCard";
import OperationsHeader, {
  OperationsSortKey,
  SortDirection,
  ViewMode,
} from "@/app/components/OperationsHeader";
import AddOperationModal from "@/app/components/modals/AddOperationModal";
import { Operation } from "@/app/types/Operation";
import { fetchOperations } from "@/app/lib/data";

export default function OperationsPage() {
  const router = useRouter();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<OperationsSortKey>("operation_code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const loadOperations = async () => {
      setIsLoading(true);
      try {
        const data = await fetchOperations();
        setOperations(data);
      } catch (error) {
        console.error("Failed to fetch operations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOperations();
  }, []);

  const filteredOperations = useMemo(() => {
    const filtered = operations.filter(
      (op) =>
        op.operation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.operation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const compare = (a: Operation, b: Operation) => {
      switch (sortKey) {
        case "id":
          return a.id - b.id;
        case "operation_code":
          return a.operation_code.localeCompare(b.operation_code);
        case "operation_name":
          return a.operation_name.localeCompare(b.operation_name);
        case "description":
          return (a.description ?? "").localeCompare(b.description ?? "");
        case "operation_type":
          return (a.operation_type ?? "").localeCompare(b.operation_type ?? "");
        case "is_active":
          return Number(a.is_active) - Number(b.is_active);
        default:
          return 0;
      }
    };

    return filtered.sort((a, b) => {
      const result = compare(a, b);
      return sortDirection === "asc" ? result : -result;
    });
  }, [searchTerm, operations, sortKey, sortDirection]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSort = (key: OperationsSortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOperations();
      setOperations(data);
    } catch (error) {
      console.error("Failed to refresh operations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleAddSuccess = () => {
    handleRefresh();
  };

  const handleRowClick = (operationId: number) => {
    router.push(`/operations/${operationId}`);
  };

  const getSortIndicator = (key: OperationsSortKey) => {
    if (sortKey !== key) {
      return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const getHeaderButtonClass = (key: OperationsSortKey) =>
    [
      "flex items-center gap-1 uppercase tracking-wider",
      sortKey === key ? "text-blue-600" : "text-gray-500 hover:text-gray-700",
    ].join(" ");

  return (
    <div className="flex flex-col h-full">
      <OperationsHeader
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading operations...</p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOperations.map((operation) => (
                  <OperationCard key={operation.id} operation={operation} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("operation_code")}
                          onClick={() => handleSort("operation_code")}
                        >
                          <span>Code</span>
                          {getSortIndicator("operation_code")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("operation_name")}
                          onClick={() => handleSort("operation_name")}
                        >
                          <span>Name</span>
                          {getSortIndicator("operation_name")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("description")}
                          onClick={() => handleSort("description")}
                        >
                          <span>Description</span>
                          {getSortIndicator("description")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("operation_type")}
                          onClick={() => handleSort("operation_type")}
                        >
                          <span>Type</span>
                          {getSortIndicator("operation_type")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("is_active")}
                          onClick={() => handleSort("is_active")}
                        >
                          <span>Status</span>
                          {getSortIndicator("is_active")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOperations.map((op) => (
                      <tr
                        key={op.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(op.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {op.operation_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {op.operation_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {op.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {op.operation_type || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${op.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                              }`}
                          >
                            {op.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredOperations.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No operations found</p>
              </div>
            )}
          </>
        )}
      </div>

      <AddOperationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
