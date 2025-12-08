"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductData, BOM } from "@/app/types/CoreData";
import { fetchProductById, fetchBOM, fetchProducts } from "@/app/lib/data";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface ProductDetailPageProps {
  params: Promise<{
    product_id: string;
  }>;
}

interface BOMWithProduct extends BOM {
  component?: ProductData;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const router = useRouter();
  const { product_id } = use(params);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [bomItems, setBomItems] = useState<BOMWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProductData = async () => {
      setIsLoading(true);
      try {
        const productId = parseInt(product_id);
        const [productData, bomData, productsData] = await Promise.all([
          fetchProductById(productId),
          fetchBOM(),
          fetchProducts(),
        ]);

        setProduct(productData);

        // Filter BOM items for this product and map component details
        const productBom = bomData
          .filter((bom) => bom.parent_product_id === productId)
          .map((bom) => ({
            ...bom,
            component: productsData.find(
              (p) => p.id === bom.component_product_id
            ),
          }));

        setBomItems(productBom);
      } catch (error) {
        console.error("Failed to fetch product details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductData();
  }, [product_id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Product not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {product.product_code}
              </h1>
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                  product.is_active
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {product.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            <p className="text-gray-600 text-lg">{product.product_name}</p>
          </div>
        </div>

        {/* Product Info Grid */}
        <div className="grid grid-cols-4 gap-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Type:</p>
            <p className="text-base font-medium text-gray-900 capitalize">
              {product.type.replace("-", " ")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Unit:</p>
            <p className="text-base font-medium text-gray-900">
              {product.unit}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Standard Cost:</p>
            <p className="text-base font-medium text-gray-900">
              {product.standard_cost != null
                ? `$${Number(product.standard_cost).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Lead Time:</p>
            <p className="text-base font-medium text-gray-900">
              {product.lead_time_days != null
                ? `${product.lead_time_days} days`
                : "-"}
            </p>
          </div>
        </div>

        {product.description && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Description:</p>
            <p className="text-gray-700">{product.description}</p>
          </div>
        )}
      </div>

      {/* BOM Section */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Bill of Materials (BOM)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Component Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Component Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantity Required
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Scrap %
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Effective From
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bomItems.map((bom) => (
                  <tr
                    key={bom.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bom.component ? (
                        <Link
                          href={`/products/${bom.component_product_id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {bom.component.product_code}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {bom.component?.product_name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {bom.component?.type.replace("-", " ") || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {bom.quantity_required.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bom.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {bom.scrap_percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(bom.effective_from).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                          bom.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {bom.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bomItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No BOM items found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
