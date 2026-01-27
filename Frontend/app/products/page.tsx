"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import ProductCard from "@/app/components/ProductCard";
import ProductsHeader, {
  ProductsSortKey,
  SortDirection,
  ViewMode,
} from "@/app/components/ProductsHeader";
import AddProductModal from "@/app/components/modals/AddProductModal";
import { ProductData } from "@/app/types/CoreData";
import { fetchProducts } from "@/app/lib/data";

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode] = useState<ViewMode>("table");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ProductsSortKey>("product_code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter(
      (product) =>
        product.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const compare = (a: ProductData, b: ProductData) => {
      switch (sortKey) {
        case "id":
          return a.id - b.id;
        case "product_code":
          return a.product_code.localeCompare(b.product_code);
        case "product_name":
          return a.product_name.localeCompare(b.product_name);
        case "type":
          return a.type.localeCompare(b.type);
        case "unit":
          return a.unit.localeCompare(b.unit);
        case "standard_cost": {
          const aValue = a.standard_cost ?? Number.MAX_SAFE_INTEGER;
          const bValue = b.standard_cost ?? Number.MAX_SAFE_INTEGER;
          return aValue - bValue;
        }
        case "lead_time_days": {
          const aValue = a.lead_time_days ?? Number.MAX_SAFE_INTEGER;
          const bValue = b.lead_time_days ?? Number.MAX_SAFE_INTEGER;
          return aValue - bValue;
        }
        case "description":
          return (a.description ?? "").localeCompare(b.description ?? "");
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
  }, [searchTerm, products, sortKey, sortDirection]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSort = (key: ProductsSortKey) => {
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
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to refresh products:", error);
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

  const handleRowClick = (productId: number) => {
    router.push(`/products/${productId}`);
  };

  const getSortIndicator = (key: ProductsSortKey) => {
    if (sortKey !== key) {
      return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const getHeaderButtonClass = (
    key: ProductsSortKey,
    align: "left" | "right" = "left"
  ) =>
    [
      "flex items-center gap-1 uppercase tracking-wider",
      align === "right" ? "ml-auto" : "",
      sortKey === key ? "text-blue-600" : "text-gray-500 hover:text-gray-700",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="flex flex-col h-full">
      <ProductsHeader
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading products...</p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
                          className={getHeaderButtonClass("product_code")}
                          onClick={() => handleSort("product_code")}
                        >
                          <span>Product Code</span>
                          {getSortIndicator("product_code")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("product_name")}
                          onClick={() => handleSort("product_name")}
                        >
                          <span>Product Name</span>
                          {getSortIndicator("product_name")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("type")}
                          onClick={() => handleSort("type")}
                        >
                          <span>Type</span>
                          {getSortIndicator("type")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("unit")}
                          onClick={() => handleSort("unit")}
                        >
                          <span>Unit</span>
                          {getSortIndicator("unit")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("standard_cost", "right")}
                          onClick={() => handleSort("standard_cost")}
                        >
                          <span>Standard Cost</span>
                          {getSortIndicator("standard_cost")}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          className={getHeaderButtonClass("lead_time_days", "right")}
                          onClick={() => handleSort("lead_time_days")}
                        >
                          <span>Lead Time (Days)</span>
                          {getSortIndicator("lead_time_days")}
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
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(product.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {product.product_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {product.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.type === 'finished-product'
                            ? 'bg-purple-100 text-purple-800'
                            : product.type === 'semi-product'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {product.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {product.standard_cost !== undefined && product.standard_cost !== null
                            ? `$${product.standard_cost.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {product.lead_time_days ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {product.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                              }`}
                          >
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredProducts.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            )}
          </>
        )}
      </div>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
