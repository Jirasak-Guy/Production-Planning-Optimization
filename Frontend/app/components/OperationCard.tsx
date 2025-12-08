import { Operation } from "@/app/types/Operation";
import Link from "next/link";

interface OperationCardProps {
  operation: Operation;
}

export default function OperationCard({ operation }: OperationCardProps) {
  return (
    <Link href={`/operations/${operation.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-blue-600">
            {operation.operation_code}
          </h3>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
              operation.is_active
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {operation.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-gray-900">
            {operation.operation_name}
          </p>

          {operation.description && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {operation.description}
            </p>
          )}

          {operation.operation_type && (
            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">Type:</span>
              <p className="text-sm font-medium text-gray-800 capitalize">
                {operation.operation_type}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
