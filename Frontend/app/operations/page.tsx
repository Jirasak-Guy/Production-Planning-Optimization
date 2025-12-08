"use client";

import { useState, useMemo, useEffect } from "react";
import OperationCard from "@/app/components/OperationCard";
import OperationsHeader from "@/app/components/OperationsHeader";
import { Operation } from "@/app/types/Operation";
import { fetchOperations } from "@/app/lib/data";

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    return operations.filter(
      (op) =>
        op.operation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.operation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, operations]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilter = () => {
    console.log("Filter clicked");
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
    console.log("Add clicked");
  };

  return (
    <div className="flex flex-col h-full">
      <OperationsHeader
        onSearch={handleSearch}
        onFilter={handleFilter}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOperations.map((operation) => (
                <OperationCard key={operation.id} operation={operation} />
              ))}
            </div>

            {filteredOperations.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No operations found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
