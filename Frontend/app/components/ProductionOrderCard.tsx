import { ProductionOrder } from "@/app/types/Production";
import Link from "next/link";

interface ProductionOrderCardProps {
  productionOrder: ProductionOrder;
}

export default function ProductionOrderCard({
  productionOrder: po,
}: ProductionOrderCardProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: "bg-gray-100 text-gray-700",
      released: "bg-blue-100 text-blue-700",
      "in-progress": "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
      "on-hold": "bg-orange-100 text-orange-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const progress = (po.quantity_completed / po.quantity_planned) * 100;

  return (
    <Link href={`/production/${po.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-blue-600">
            {po.po_number}
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
              po.status
            )}`}
          >
            {po.status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Quantity:</span>
            <span className="font-medium text-gray-900">
              {po.quantity_completed} / {po.quantity_planned}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {po.scheduled_start_date && (
            <div className="text-sm">
              <span className="text-gray-500">Scheduled: </span>
              <span className="text-gray-900">
                {new Date(po.scheduled_start_date).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">Priority: {po.priority}</span>
            <span className="text-gray-500">
              Scrapped: {po.quantity_scrapped}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
