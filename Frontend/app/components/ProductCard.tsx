import { ProductData } from "@/app/types/CoreData";
import Link from "next/link";

interface ProductCardProps {
  product: ProductData;
}

export default function ProductCard({ product }: ProductCardProps) {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "finished-product": "bg-blue-100 text-blue-700",
      "semi-product": "bg-purple-100 text-purple-700",
      "raw-material": "bg-green-100 text-green-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "finished-product": "Finished",
      "semi-product": "Semi",
      "raw-material": "Raw Material",
    };
    return labels[type] || type;
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-blue-600">
            {product.product_code}
          </h3>
          <div className="flex gap-2">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${getTypeColor(
                product.type
              )}`}
            >
              {getTypeLabel(product.type)}
            </span>
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                product.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {product.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="font-medium text-gray-900 line-clamp-2">
              {product.product_name}
            </p>
          </div>

          {product.description && (
            <div className="text-gray-600">
              <p className="line-clamp-2">{product.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div>
              <span className="text-gray-500 text-xs">Unit:</span>
              <p className="font-medium text-gray-800">{product.unit}</p>
            </div>
            {product.standard_cost != null && (
              <div>
                <span className="text-gray-500 text-xs">Cost:</span>
                <p className="font-medium text-gray-800">
                  ${Number(product.standard_cost).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {product.lead_time_days != null && (
            <div className="text-xs text-gray-500 pt-1">
              Lead Time: {product.lead_time_days} days
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
