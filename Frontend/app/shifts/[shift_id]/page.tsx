"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Shift } from "@/app/types/Shift";
import { fetchShiftById } from "@/app/lib/data";
import { ArrowLeftIcon, ClockIcon } from "@heroicons/react/24/outline";

interface ShiftDetailPageProps {
    params: Promise<{
        shift_id: string;
    }>;
}

export default function ShiftDetailPage({ params }: ShiftDetailPageProps) {
    const router = useRouter();
    const { shift_id } = use(params);
    const [shift, setShift] = useState<Shift | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadShift = async () => {
            setIsLoading(true);
            try {
                const shiftId = parseInt(shift_id);
                const data = await fetchShiftById(shiftId);
                setShift(data);
            } catch (error) {
                console.error("Failed to fetch shift:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadShift();
    }, [shift_id]);

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
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

    if (!shift) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-lg">Shift not found</p>
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
                                {shift.shift_code}
                            </h1>
                            <span
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${shift.is_active
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : "bg-gray-100 text-gray-600 border-gray-200"
                                    }`}
                            >
                                {shift.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                        </div>
                        <p className="text-gray-600 text-lg">{shift.shift_name}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50 p-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        Shift Details
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <ClockIcon className="w-5 h-5 text-blue-600" />
                                <p className="text-sm text-blue-600 font-medium">Start Time</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatTime(shift.start_time)}
                            </p>
                        </div>

                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                                <ClockIcon className="w-5 h-5 text-purple-600" />
                                <p className="text-sm text-purple-600 font-medium">End Time</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatTime(shift.end_time)}
                            </p>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm text-orange-600 font-medium mb-2">
                                Break Duration
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {shift.break_duration_minutes} min
                            </p>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-600 font-medium mb-2">
                                Effective Working Time
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {shift.effective_working_minutes} min
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                ({(shift.effective_working_minutes / 60).toFixed(1)} hours)
                            </p>
                        </div>
                    </div>

                    {shift.description && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">Description:</p>
                            <p className="text-gray-700">{shift.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
