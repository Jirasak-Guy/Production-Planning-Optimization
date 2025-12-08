"use client";

import { useState, useMemo, useEffect } from "react";
import ProductCard from "@/app/components/ProductCard";
import ProductsHeader from "@/app/components/ProductsHeader";
import { ProductData } from "@/app/types/CoreData";
import { fetchProducts } from "@/app/lib/data";

export default function Products() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    return products.filter(
      (product) =>
        product.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, products]);

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
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to refresh products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    console.log("Add clicked");
    // TODO: Open add product dialog
  };

  return (
    <div className="flex flex-col h-full">
      <ProductsHeader
        onSearch={handleSearch}
        onFilter={handleFilter}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {filteredProducts.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
