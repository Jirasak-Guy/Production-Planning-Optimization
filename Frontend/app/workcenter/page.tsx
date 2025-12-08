"use client";

import { useState, useMemo, useEffect } from "react";
import WorkCenterCard from "@/app/components/WorkCenterCard";
import WorkCenterHeader from "@/app/components/WorkCenterHeader";
import { WorkCenter } from "@/app/types/WorkCenter";
import { fetchWorkCenters } from "@/app/lib/data";

export default function WorkCenterPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWorkCenters = async () => {
      setIsLoading(true);
      try {
        const data = await fetchWorkCenters();
        setWorkCenters(data);
      } catch (error) {
        console.error("Failed to fetch work centers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkCenters();
  }, []);

  const filteredWorkCenters = useMemo(() => {
    return workCenters.filter(
      (wc) =>
        wc.work_center_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wc.work_center_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, workCenters]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilter = () => {
    console.log("Filter clicked");
    // TODO: Implement filter dialog
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWorkCenters();
      setWorkCenters(data);
    } catch (error) {
      console.error("Failed to refresh work centers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    console.log("Add clicked");
    // TODO: Open add work center dialog
  };

  return (
    <div className="flex flex-col h-full">
      <WorkCenterHeader
        onSearch={handleSearch}
        onFilter={handleFilter}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading work centers...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredWorkCenters.map((workCenter) => (
                <WorkCenterCard key={workCenter.id} workCenter={workCenter} />
              ))}
            </div>

            {filteredWorkCenters.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No work centers found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
