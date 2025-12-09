"use client";

import { useState, useEffect } from "react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Operation, OperationDependency } from "@/app/types/Operation";
import { WorkCenter } from "@/app/types/WorkCenter";
import { Routing } from "@/app/types/Routing";
import { updateRouting, createOperationDependency, deleteOperationDependency } from "@/app/lib/data";

interface EditRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutingUpdated: () => void;
  routing: (Routing & { operation?: Operation; workCenter?: WorkCenter }) | null;
  operations: Operation[];
  workCenters: WorkCenter[];
  existingRoutings: Array<Routing & { operation?: Operation }>;
  currentDependencies: OperationDependency[];
}

interface DependencyInput {
  id?: number; // If exists, it's an existing dependency
  predecessorRoutingId: number | "";
  dependencyType: "FS" | "SS" | "FF" | "SF";
  lagTimeMinutes: string;
  isNew?: boolean;
  toDelete?: boolean;
}

export default function EditRoutingModal({
  isOpen,
  onClose,
  onRoutingUpdated,
  routing,
  operations,
  workCenters,
  existingRoutings,
  currentDependencies,
}: EditRoutingModalProps) {
  const [operationId, setOperationId] = useState<number | "">("");
  const [workCenterId, setWorkCenterId] = useState<number | "">("");
  const [sequenceNumber, setSequenceNumber] = useState<string>("");
  const [setupTimeMinutes, setSetupTimeMinutes] = useState<string>("");
  const [timePerUnitMinutes, setTimePerUnitMinutes] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dependencies
  const [dependencies, setDependencies] = useState<DependencyInput[]>([]);

  // Populate form when routing changes
  useEffect(() => {
    if (routing && isOpen) {
      setOperationId(routing.operation_id);
      setWorkCenterId(routing.work_center_id);
      setSequenceNumber(String(routing.sequence_number));
      setSetupTimeMinutes(String(routing.setup_time_minutes));
      setTimePerUnitMinutes(String(routing.time_per_unit_minutes));
      setNotes(routing.notes || "");
      setIsActive(routing.is_active);
      setError(null);
      
      // Load existing dependencies for this routing
      const routingDeps = currentDependencies
        .filter(d => d.routing_id === routing.id && d.is_active)
        .map(d => ({
          id: d.id,
          predecessorRoutingId: d.predecessor_routing_id as number,
          dependencyType: d.dependency_type as "FS" | "SS" | "FF" | "SF",
          lagTimeMinutes: String(d.lag_time_minutes),
          isNew: false,
          toDelete: false,
        }));
      setDependencies(routingDeps);
    }
  }, [routing, isOpen, currentDependencies]);

  const addDependency = () => {
    setDependencies([
      ...dependencies,
      { predecessorRoutingId: "", dependencyType: "FS", lagTimeMinutes: "0", isNew: true },
    ]);
  };

  const removeDependency = (index: number) => {
    const dep = dependencies[index];
    if (dep.id) {
      // Mark existing dependency for deletion
      const updated = [...dependencies];
      updated[index].toDelete = true;
      setDependencies(updated);
    } else {
      // Remove new dependency
      setDependencies(dependencies.filter((_, i) => i !== index));
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!routing) return;

    if (!operationId) {
      setError("Please select an operation");
      return;
    }

    if (!workCenterId) {
      setError("Please select a work center");
      return;
    }

    const seqNum = parseInt(sequenceNumber) || 0;
    if (seqNum <= 0) {
      setError("Sequence number must be greater than 0");
      return;
    }

    const timePerUnit = parseInt(timePerUnitMinutes) || 0;
    if (timePerUnit <= 0) {
      setError("Time per Unit must be greater than 0");
      return;
    }

    // Validate new/modified dependencies
    const activeDeps = dependencies.filter(d => !d.toDelete);
    for (const dep of activeDeps) {
      if (!dep.predecessorRoutingId) {
        setError("Please select a predecessor for all dependencies");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Update the routing
      await updateRouting(routing.id, {
        operation_id: operationId as number,
        work_center_id: workCenterId as number,
        sequence_number: seqNum,
        setup_time_minutes: parseInt(setupTimeMinutes) || 0,
        time_per_unit_minutes: timePerUnit,
        notes: notes || undefined,
        is_active: isActive,
      });

      // Handle dependencies
      for (const dep of dependencies) {
        if (dep.toDelete && dep.id) {
          // Delete existing dependency
          await deleteOperationDependency(dep.id);
        } else if (dep.isNew && !dep.toDelete) {
          // Create new dependency
          await createOperationDependency({
            routing_id: routing.id,
            predecessor_routing_id: dep.predecessorRoutingId as number,
            dependency_type: dep.dependencyType,
            lag_time_minutes: parseFloat(dep.lagTimeMinutes) || 0,
            is_active: true,
          });
        }
        // Note: For simplicity, we're not updating existing dependencies
        // If you need to update, you'd need an updateOperationDependency API
      }

      onRoutingUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update routing");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !routing) return null;

  // Filter active operations and work centers
  const activeOperations = operations.filter((op) => op.is_active);
  const activeWorkCenters = workCenters.filter((wc) => wc.status === "active");
  
  // Filter out current routing and only show other routings for dependency selection
  const availableRoutings = existingRoutings.filter(r => r.id !== routing.id);
  
  // Filter out deleted dependencies for display
  const visibleDependencies = dependencies.filter(d => !d.toDelete);

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
            Edit Routing Step
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
            </div>

            {/* Work Center */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Center <span className="text-red-500">*</span>
              </label>
              <select
                value={workCenterId}
                onChange={(e) => setWorkCenterId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              >
                <option value="">Select a work center</option>
                {activeWorkCenters.map((wc) => (
                  <option key={wc.id} value={wc.id}>
                    {wc.work_center_code} - {wc.work_center_name}
                  </option>
                ))}
              </select>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                min="1"
                step="1"
                required
              />
            </div>

            {/* Setup Time & Time Per Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Time (min)
                </label>
                <input
                  type="number"
                  value={setupTimeMinutes}
                  onChange={(e) => setSetupTimeMinutes(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time per Unit (min) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={timePerUnitMinutes}
                  onChange={(e) => setTimePerUnitMinutes(e.target.value)}
                  placeholder="Enter time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  min="1"
                  step="1"
                  required
                />
              </div>
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
                id="editIsActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="editIsActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
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
                  disabled={availableRoutings.length === 0}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Dependency
                </button>
              </div>

              {availableRoutings.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No other routing steps available for dependency
                </p>
              ) : visibleDependencies.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No dependencies. This step will run independently.
                </p>
              ) : (
                <div className="space-y-3">
                  {dependencies.map((dep, index) => {
                    if (dep.toDelete) return null;
                    
                    return (
                      <div
                        key={dep.id || `new-${index}`}
                        className={`flex items-start gap-2 p-3 rounded-lg ${dep.isNew ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                      >
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          {/* Predecessor */}
                          <select
                            value={dep.predecessorRoutingId}
                            onChange={(e) =>
                              updateDependency(index, "predecessorRoutingId", e.target.value)
                            }
                            disabled={!dep.isNew}
                            className={`px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 ${!dep.isNew ? 'bg-gray-100' : ''}`}
                          >
                            <option value="">Select predecessor</option>
                            {availableRoutings.map((r) => (
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
                            disabled={!dep.isNew}
                            className={`px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 ${!dep.isNew ? 'bg-gray-100' : ''}`}
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
                              disabled={!dep.isNew}
                              placeholder="0"
                              className={`w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 ${!dep.isNew ? 'bg-gray-100' : ''}`}
                              min="0"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">min</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeDependency(index)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove dependency"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Show count of deleted dependencies */}
              {dependencies.filter(d => d.toDelete).length > 0 && (
                <p className="text-xs text-red-500 mt-2">
                  {dependencies.filter(d => d.toDelete).length} dependency(ies) will be removed on save
                </p>
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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
