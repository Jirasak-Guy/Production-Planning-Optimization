import { WorkCenter } from "@/app/types/WorkCenter";
import Link from "next/link";
import { UsersIcon, ClockIcon } from "@heroicons/react/24/outline";

interface WorkCenterCardProps {
  workCenter: WorkCenter;
}

export default function WorkCenterCard({ workCenter }: WorkCenterCardProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
      retired: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Active",
      inactive: "Inactive",
      maintenance: "Maintenance",
      retired: "Retired",
    };
    return labels[status] || status;
  };

  return (
    <Link href={`/workcenter/${workCenter.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-blue-600">
            {workCenter.work_center_code}
          </h3>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(
              workCenter.status
            )}`}
          >
            {getStatusLabel(workCenter.status)}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <p className="font-medium text-gray-900 line-clamp-2">
              {workCenter.work_center_name}
            </p>
          </div>

          {workCenter.description && (
            <div className="text-gray-600 text-sm">
              <p className="line-clamp-2">{workCenter.description}</p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Capacity:</span>
              <span className="font-medium text-gray-800">
                {workCenter.capacity_per_hour} units/hr
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-500">
                <UsersIcon className="w-4 h-4" />
                <span>Workers:</span>
              </div>
              <span className="font-medium text-gray-800">
                {workCenter.number_of_workers_required}
              </span>
            </div>

            {workCenter.cost_per_hour != null && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-500">
                  <ClockIcon className="w-4 h-4" />
                  <span>Cost:</span>
                </div>
                <span className="font-medium text-gray-800">
                  ${Number(workCenter.cost_per_hour).toFixed(2)}/hr
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
