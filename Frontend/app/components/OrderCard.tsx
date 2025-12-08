import { Order } from "@/app/types/CoreData";
import Link from "next/link";

interface OrderCardProps {
  order: Order;
}

export default function OrderCard({ order }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      confirmed: "bg-blue-100 text-blue-700",
      "in-production": "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      "in-production": "In Production",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  return (
    <Link href={`/orders/${order.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-blue-600">
            {order.order_number}
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="font-medium text-gray-700">
              {order.customer_name || "Unknown Customer"}
            </p>
          </div>

          {order.notes && (
            <div className="text-gray-600">
              <p className="line-clamp-2">{order.notes}</p>
            </div>
          )}

          <div className="text-gray-500">
            <p>Due: {new Date(order.due_date).toLocaleDateString()}</p>
          </div>

          <div className="text-gray-400 text-xs">
            <p>Order Date: {new Date(order.order_date).toLocaleDateString()}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Priority: {order.priority}
            </span>
            <span className="text-xs text-gray-400">ID: {order.id}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
