"use client";

import { useState, useEffect } from "react";
import { BOM, ProductData } from "@/app/types/CoreData";
import { updateBOM } from "@/app/lib/data";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface EditBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  bomItem: BOM | null;
  componentProduct: ProductData | null;
  onSuccess: () => void;
}

export default function EditBOMModal({
  isOpen,
  onClose,
  bomItem,
  componentProduct,
  onSuccess,
}: EditBOMModalProps) {
  const [quantityRequired, setQuantityRequired] = useState("");
  const [unit, setUnit] = useState("");
  const [scrapPercentage, setScrapPercentage] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bomItem && isOpen) {
      setQuantityRequired(String(bomItem.quantity_required));
      setUnit(bomItem.unit);
      setScrapPercentage(String(bomItem.scrap_percentage));
      setEffectiveFrom(bomItem.effective_from.split("T")[0]);
      setEffectiveTo(bomItem.effective_to?.split("T")[0] || "");
      setIsActive(bomItem.is_active);
      setNotes(bomItem.notes || "");
      setError(null);
    }
  }, [bomItem, isOpen]);

  if (!isOpen || !bomItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const qty = parseFloat(quantityRequired);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Quantity Required must be greater than 0");
      }

      const scrap = parseFloat(scrapPercentage);
      if (isNaN(scrap) || scrap < 0 || scrap > 100) {
        throw new Error("Scrap Percentage must be between 0 and 100");
      }

      await updateBOM(bomItem.id, {
        quantity_required: qty,
        unit: unit.trim(),
        scrap_percentage: scrap,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || undefined,
        is_active: isActive,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update BOM item");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit BOM Item</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {componentProduct?.product_code} - {componentProduct?.product_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Required <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantityRequired}
                  onChange={(e) => setQuantityRequired(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="e.g., pcs, kg, liter"
                  required
                />
              </div>

              {/* Scrap Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scrap Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={scrapPercentage}
                  onChange={(e) => setScrapPercentage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={isActive ? "true" : "false"}
                  onChange={(e) => setIsActive(e.target.value === "true")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 cursor-pointer"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 cursor-pointer"
                  required
                />
              </div>

              {/* Effective To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective To
                </label>
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                  min={effectiveFrom}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                placeholder="Optional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
