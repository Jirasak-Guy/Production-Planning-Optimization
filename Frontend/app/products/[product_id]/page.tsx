"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductData, BOM } from "@/app/types/CoreData";
import { fetchProductById, fetchBOM, fetchProducts, updateProduct, deleteProduct, deleteBOM } from "@/app/lib/data";
import { ArrowLeftIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import AddBOMItemModal from "@/app/components/modals/AddBOMItemModal";

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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(true);
  const [isAddBOMModalOpen, setIsAddBOMModalOpen] = useState(false);
  const [bomItemToDelete, setBomItemToDelete] = useState<BOMWithProduct | null>(null);
  const [showDeleteBOMConfirm, setShowDeleteBOMConfirm] = useState(false);
  const [isDeletingBOM, setIsDeletingBOM] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);

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
        setAllProducts(productsData);

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

  const reloadBOMItems = async () => {
    try {
      const productId = parseInt(product_id);
      const bomData = await fetchBOM();
      const productBom = bomData
        .filter((bom) => bom.parent_product_id === productId)
        .map((bom) => ({
          ...bom,
          component: allProducts.find(
            (p) => p.id === bom.component_product_id
          ),
        }));
      setBomItems(productBom);
    } catch (error) {
      console.error("Failed to reload BOM items:", error);
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveField = async (field: string) => {
    if (!product) return;
    
    setIsSaving(true);
    try {
      const updateData: Partial<ProductData> = {};
      
      if (field === "product_code") {
        updateData.product_code = editValue;
      } else if (field === "product_name") {
        updateData.product_name = editValue;
      } else if (field === "type") {
        updateData.type = editValue;
      } else if (field === "unit") {
        updateData.unit = editValue;
      } else if (field === "standard_cost") {
        updateData.standard_cost = parseFloat(editValue);
      } else if (field === "lead_time_days") {
        updateData.lead_time_days = parseInt(editValue);
      } else if (field === "is_active") {
        updateData.is_active = editValue === "true";
      } else if (field === "description") {
        updateData.description = editValue;
      }

      const updatedProduct = await updateProduct(product.id, updateData);
      setProduct(updatedProduct);
      setEditingField(null);
      setEditValue("");
    } catch (error) {
      console.error("Failed to update product:", error);
      alert("Failed to update product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!product) return;
    
    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      router.push("/products");
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product. Please try again.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteBOMItem = (item: BOMWithProduct) => {
    setBomItemToDelete(item);
    setShowDeleteBOMConfirm(true);
  };

  const confirmDeleteBOM = async () => {
    if (!bomItemToDelete) return;
    
    setIsDeletingBOM(true);
    try {
      await deleteBOM(bomItemToDelete.id);
      await reloadBOMItems();
      setShowDeleteBOMConfirm(false);
      setBomItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete BOM item:", error);
      alert("Failed to delete component. Please try again.");
    } finally {
      setIsDeletingBOM(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

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
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                {/* Product Code - Editable */}
                {editingField === "product_code" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-3xl font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("product_code")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {product.product_code}
                    </h1>
                    <button
                      onClick={() => handleEditField("product_code", product.product_code)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit product code"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Status - Editable */}
                {editingField === "is_active" ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-3 py-1.5 rounded-md text-sm font-semibold border-2 border-blue-500 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      autoFocus
                    >
                      <option value="true" className="text-gray-900">ACTIVE</option>
                      <option value="false" className="text-gray-900">INACTIVE</option>
                    </select>
                    <button
                      onClick={() => handleSaveField("is_active")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                        product.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {product.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <button
                      onClick={() => handleEditField("is_active", product.is_active.toString())}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit status"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Product Name - Editable */}
              <div className="flex items-center gap-2">
                {editingField === "product_name" ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-gray-900 text-lg border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-80"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("product_name")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 text-lg">{product.product_name}</p>
                    <button
                      onClick={() => handleEditField("product_name", product.product_name)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit product name"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDeleteProduct}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors border border-red-200"
            title="Delete this product"
          >
            <TrashIcon className="w-5 h-5" />
            <span className="font-medium">Delete</span>
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          {isDetailsCollapsed ? (
            <>
              <ChevronDownIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Show Product Details</span>
            </>
          ) : (
            <>
              <ChevronUpIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Hide Product Details</span>
            </>
          )}
        </button>

        {/* Collapsible Product Info */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isDetailsCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
          {/* Product Info Grid */}
          <div className="grid grid-cols-4 gap-8">
            {/* Type */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Type:</p>
              <div className="flex items-center gap-2">
                {editingField === "type" ? (
                  <>
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoFocus
                    >
                      <option value="finished-good">Finished Good</option>
                      <option value="semi-finished">Semi Finished</option>
                      <option value="raw-material">Raw Material</option>
                      <option value="component">Component</option>
                    </select>
                    <button
                      onClick={() => handleSaveField("type")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-gray-900 capitalize">
                      {product.type.replace("-", " ")}
                    </p>
                    <button
                      onClick={() => handleEditField("type", product.type)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit type"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Unit */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Unit:</p>
              <div className="flex items-center gap-2">
                {editingField === "unit" ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-24"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("unit")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-gray-900">
                      {product.unit}
                    </p>
                    <button
                      onClick={() => handleEditField("unit", product.unit)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit unit"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Standard Cost */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Standard Cost:</p>
              <div className="flex items-center gap-2">
                {editingField === "standard_cost" ? (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField("standard_cost")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-gray-900">
                      {product.standard_cost != null
                        ? `$${Number(product.standard_cost).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                    </p>
                    <button
                      onClick={() => handleEditField("standard_cost", product.standard_cost?.toString() || "")}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit standard cost"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Lead Time */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Lead Time:</p>
              <div className="flex items-center gap-2">
                {editingField === "lead_time_days" ? (
                  <>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-base font-medium text-gray-900 border-2 border-blue-500 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-24"
                      autoFocus
                    />
                    <span className="text-gray-600">days</span>
                    <button
                      onClick={() => handleSaveField("lead_time_days")}
                      disabled={isSaving}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-gray-900">
                      {product.lead_time_days != null
                        ? `${product.lead_time_days} days`
                        : "-"}
                    </p>
                    <button
                      onClick={() => handleEditField("lead_time_days", product.lead_time_days?.toString() || "")}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit lead time"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm text-gray-500">Description:</p>
              {editingField !== "description" && (
                <button
                  onClick={() => handleEditField("description", product.description || "")}
                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit description"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            {editingField === "description" ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-gray-900 border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] bg-white"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveField("description")}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    <XCircleIcon className="w-5 h-5" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">{product.description || "No description"}</p>
            )}
          </div>
        </div>
      </div>

      {/* BOM Section */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Bill of Materials (BOM)
            </h2>
            <button
              onClick={() => setIsAddBOMModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>Add Component</span>
            </button>
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
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
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
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDeleteBOMItem(bom)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete component"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              {/* Warning Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Product
              </h3>
              
              {/* Message */}
              <p className="text-gray-600 text-center mb-2">
                Are you sure you want to delete product
              </p>
              <p className="text-lg font-semibold text-gray-900 text-center mb-4">
                "{product.product_code}"?
              </p>
              
              {/* Warning Text */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-700 text-center">
                  ⚠️ This action cannot be undone. All product data will be permanently deleted.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-5 h-5" />
                      <span>Delete Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add BOM Item Modal */}
      <AddBOMItemModal
        isOpen={isAddBOMModalOpen}
        onClose={() => setIsAddBOMModalOpen(false)}
        onSuccess={reloadBOMItems}
        parentProductId={parseInt(product_id)}
        parentProductCode={product.product_code}
      />

      {/* Delete BOM Item Confirmation Modal */}
      {showDeleteBOMConfirm && bomItemToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeletingBOM && setShowDeleteBOMConfirm(false)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              {/* Warning Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
                <TrashIcon className="h-8 w-8 text-orange-600" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Remove Component
              </h3>
              
              {/* Message */}
              <p className="text-gray-600 text-center mb-2">
                Are you sure you want to remove
              </p>
              <p className="text-lg font-semibold text-gray-900 text-center mb-4">
                "{bomItemToDelete.component?.product_name || `Component #${bomItemToDelete.id}`}"
              </p>
              <p className="text-gray-500 text-center text-sm mb-4">
                Quantity: {bomItemToDelete.quantity_required.toLocaleString()} {bomItemToDelete.unit}
              </p>
              
              {/* Warning Text */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-orange-700 text-center">
                  This component will be removed from the BOM.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteBOMConfirm(false);
                    setBomItemToDelete(null);
                  }}
                  disabled={isDeletingBOM}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBOM}
                  disabled={isDeletingBOM}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingBOM ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-5 h-5" />
                      <span>Remove</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
