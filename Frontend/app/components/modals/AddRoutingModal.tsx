"use client";

import { useState, useEffect } from "react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Operation } from "@/app/types/Operation";
import { Routing, RoutingBOM } from "@/app/types/Routing";
import { BOM } from "@/app/types/CoreData";
import { createRouting, createOperationDependency, createRoutingBOM } from "@/app/lib/data";

interface BOMWithProduct extends BOM {
  component?: {
    id: number;
    product_code: string;
    product_name: string;
  };
}

interface AddRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutingAdded: () => void;
  productId: number;
  operations: Operation[];
  existingRoutings: Array<Routing & { operation?: Operation }>;
  availableBomItems?: BOMWithProduct[];
}

interface DependencyInput {
  predecessorRoutingId: number | "";
  dependencyType: "FS" | "SS" | "FF" | "SF";
  lagTimeMinutes: string;
}

interface MaterialInput {
  bomId: number | "";
  consumptionTiming: "at_start" | "at_end" | "proportional";
}

export default function AddRoutingModal({
  isOpen,
  onClose,
  onRoutingAdded,
  productId,
  operations,
  existingRoutings,
  availableBomItems = [],
}: AddRoutingModalProps) {
  const [operationId, setOperationId] = useState<number | "">("");
  const [sequenceNumber, setSequenceNumber] = useState<string>("10");
  const [setupTimeMinutes, setSetupTimeMinutes] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dependencies
  const [dependencies, setDependencies] = useState<DependencyInput[]>([]);

  // Materials (routing_bom)
  const [materials, setMaterials] = useState<MaterialInput[]>([]);

  // Calculate next sequence number
  useEffect(() => {
    if (isOpen) {
      const existingSeqs = existingRoutings.map(r => r.sequence_number);
      if (existingSeqs.length > 0) {
        const maxSeq = Math.max(...existingSeqs);
        setSequenceNumber(String(maxSeq + 10));
      } else {
        setSequenceNumber("10");
      }
    }
  }, [existingRoutings, isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setOperationId("");
      setSetupTimeMinutes("");
      setNotes("");
      setIsActive(true);
      setError(null);
      setDependencies([]);
      setMaterials([]);
    }
  }, [isOpen]);

  const addDependency = () => {
    setDependencies([
      ...dependencies,
      { predecessorRoutingId: "", dependencyType: "FS", lagTimeMinutes: "0" },
    ]);
  };

  const removeDependency = (index: number) => {
    setDependencies(dependencies.filter((_, i) => i !== index));
  };

  const updateDependency = (index: number, field: keyof DependencyInput, value: string | number) => {
    const updated = [...dependencies];
    if (field === "predecessorRoutingId") {
      updated[index].predecessorRoutingId = value === "" ? "" : Number(value);
    } else if (field === "dependencyType") {
      updated[index].dependencyType = value as "FS" | "SS" | "FF" | "SF";
    } else if (field === "lagTimeMinutes") {
      updated[index].lagTimeMinutes = value as string;
    }
    setDependencies(updated);
  };

  // Material handlers
  const addMaterial = () => {
    setMaterials([
      ...materials,
      { bomId: "", consumptionTiming: "at_start" },
    ]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof MaterialInput, value: string | number) => {
    const updated = [...materials];
    if (field === "bomId") {
      updated[index].bomId = value === "" ? "" : Number(value);
    } else if (field === "consumptionTiming") {
      updated[index].consumptionTiming = value as "at_start" | "at_end" | "proportional";
    }
    setMaterials(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!operationId) {
      setError("Please select an operation");
      return;
    }

    const seqNum = parseInt(sequenceNumber) || 0;
    if (seqNum <= 0) {
      setError("Sequence number must be greater than 0");
      return;
    }

    // Validate dependencies
    for (const dep of dependencies) {
      if (!dep.predecessorRoutingId) {
        setError("Please select a predecessor for all dependencies");
        return;
      }
    }

    // Validate materials
    for (const mat of materials) {
      if (!mat.bomId) {
        setError("Please select a material for all material entries");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Create the routing
      const newRouting = await createRouting({
        product_id: productId,
        operation_id: operationId as number,
        sequence_number: seqNum,
        setup_time_minutes: parseFloat(setupTimeMinutes) || 0,
        notes: notes || undefined,
        is_active: isActive,
      });

      // Create dependencies if any
      for (const dep of dependencies) {
        await createOperationDependency({
          routing_id: newRouting.id,
          predecessor_routing_id: dep.predecessorRoutingId as number,
          dependency_type: dep.dependencyType,
          lag_time_minutes: parseFloat(dep.lagTimeMinutes) || 0,
          is_active: true,
        });
      }

      // Create routing_bom links if any
      for (const mat of materials) {
        await createRoutingBOM({
          routing_id: newRouting.id,
          bom_id: mat.bomId as number,
          consumption_timing: mat.consumptionTiming,
          is_active: true,
        });
      }

      onRoutingAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add routing");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter active operations
  const activeOperations = operations.filter((op) => op.is_active);

  // Get BOM items that are not already selected
  const getAvailableBomForSelect = (currentIndex: number) => {
    const selectedBomIds = materials
      .filter((_, i) => i !== currentIndex)
      .map(m => m.bomId)
      .filter(id => id !== "");
    return availableBomItems.filter(bom => !selectedBomIds.includes(bom.id));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Add Routing Step
          </h3>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Operation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operation <span className="text-red-500">*</span>
              </label>
              <select
                value={operationId}
                onChange={(e) => setOperationId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              >
                <option value="">Select an operation</option>
                {activeOperations.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.operation_code} - {op.operation_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Work centers for this operation are managed in the Operations section
              </p>
            </div>

            {/* Sequence Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={sequenceNumber}
                onChange={(e) => setSequenceNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (['-', '+', 'e', 'E'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Determines the order in the production flow
              </p>
            </div>

            {/* Setup Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setup Time (min)
              </label>
              <input
                type="number"
                value={setupTimeMinutes}
                onChange={(e) => setSetupTimeMinutes(e.target.value)}
                onKeyDown={(e) => {
                  if (['-', '+', 'e', 'E'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                min="0"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                One-time setup time before production starts. Processing time is calculated from Work Center capacity.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={2}
                placeholder="Optional notes for this routing step..."
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            {/* Materials Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Materials Used
                </label>
                <button
                  type="button"
                  onClick={addMaterial}
                  disabled={availableBomItems.length === 0}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Material
                </button>
              </div>

              {availableBomItems.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No BOM components available. Add components in the BOM section first.
                </p>
              ) : materials.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No materials selected. Add materials that will be consumed in this step.
                </p>
              ) : (
                <div className="space-y-3">
                  {materials.map((mat, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {/* BOM Selection */}
                        <select
                          value={mat.bomId}
                          onChange={(e) => updateMaterial(index, "bomId", e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                        >
                          <option value="">Select material</option>
                          {getAvailableBomForSelect(index).map((bom) => (
                            <option key={bom.id} value={bom.id}>
                              {bom.component?.product_code} - {bom.component?.product_name} (×{bom.quantity_required})
                            </option>
                          ))}
                        </select>

                        {/* Consumption Timing */}
                        <select
                          value={mat.consumptionTiming}
                          onChange={(e) => updateMaterial(index, "consumptionTiming", e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                        >
                          <option value="at_start">At Start</option>
                          <option value="at_end">At End</option>
                          <option value="proportional">Proportional</option>
                        </select>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dependencies Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Dependencies
                </label>
                <button
                  type="button"
                  onClick={addDependency}
                  disabled={existingRoutings.length === 0}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Dependency
                </button>
              </div>

              {existingRoutings.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No existing routing steps to add as dependency
                </p>
              ) : dependencies.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No dependencies added. This step will run independently.
                </p>
              ) : (
                <div className="space-y-3">
                  {dependencies.map((dep, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        {/* Predecessor */}
                        <select
                          value={dep.predecessorRoutingId}
                          onChange={(e) =>
                            updateDependency(index, "predecessorRoutingId", e.target.value)
                          }
                          className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                        >
                          <option value="">Select predecessor</option>
                          {existingRoutings.map((r) => (
                            <option key={r.id} value={r.id}>
                              #{r.sequence_number} - {r.operation?.operation_code || `Routing ${r.id}`}
                            </option>
                          ))}
                        </select>

                        {/* Type */}
                        <select
                          value={dep.dependencyType}
                          onChange={(e) =>
                            updateDependency(index, "dependencyType", e.target.value)
                          }
                          className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                        >
                          <option value="FS">FS (Finish-Start)</option>
                          <option value="SS">SS (Start-Start)</option>
                          <option value="FF">FF (Finish-Finish)</option>
                          <option value="SF">SF (Start-Finish)</option>
                        </select>

                        {/* Lag Time */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={dep.lagTimeMinutes}
                            onChange={(e) =>
                              updateDependency(index, "lagTimeMinutes", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (['-', '+', 'e', 'E'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            placeholder="0"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                            min="0"
                          />
                          <span className="text-xs text-gray-500 whitespace-nowrap">min lag</span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeDependency(index)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Routing"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
