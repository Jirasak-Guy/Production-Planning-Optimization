"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CompanyCalendar } from "@/app/types/Shift";
import { fetchCompanyCalendarById } from "@/app/lib/data";
import { ArrowLeftIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

interface CalendarDetailPageProps {
    params: Promise<{
        calendar_id: string;
    }>;
}

export default function CalendarDetailPage({ params }: CalendarDetailPageProps) {
    const router = useRouter();
    const { calendar_id } = use(params);
    const [calendar, setCalendar] = useState<CompanyCalendar | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCalendar = async () => {
            setIsLoading(true);
            try {
                const calendarId = parseInt(calendar_id);
                const data = await fetchCompanyCalendarById(calendarId);
                setCalendar(data);
            } catch (error) {
                console.error("Failed to fetch calendar:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCalendar();
    }, [calendar_id]);

    const getDayTypeBadge = (dayType: string) => {
        const styles: Record<string, string> = {
            "working-day": "bg-green-100 text-green-700 border-green-200",
            "weekend": "bg-gray-100 text-gray-700 border-gray-200",
            "holiday": "bg-red-100 text-red-700 border-red-200",
            "special": "bg-purple-100 text-purple-700 border-purple-200",
        };
        return styles[dayType] || "bg-gray-100 text-gray-700 border-gray-200";
    };

    const getDayTypeLabel = (dayType: string) => {
        const labels: Record<string, string> = {
            "working-day": "Working Day",
            "weekend": "Weekend",
            "holiday": "Holiday",
            "special": "Special Day",
        };
        return labels[dayType] || dayType;
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

    if (!calendar) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-lg">Calendar entry not found</p>
            </div>
        );
    }

    const date = new Date(calendar.calendar_date);
    const formattedDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

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
                                {formattedDate}
                            </h1>
                            <span
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getDayTypeBadge(
                                    calendar.day_type
                                )}`}
                            >
                                {getDayTypeLabel(calendar.day_type).toUpperCase()}
                            </span>
                        </div>
                        <p className="text-gray-600 text-lg">Calendar Entry Details</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50 p-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        Calendar Information
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                                <p className="text-sm text-blue-600 font-medium">Date</p>
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                                {calendar.calendar_date}
                            </p>
                        </div>

                        <div className={`p-4 rounded-lg border ${getDayTypeBadge(calendar.day_type)}`}>
                            <p className="text-sm font-medium mb-2">Day Type</p>
                            <p className="text-xl font-bold">
                                {getDayTypeLabel(calendar.day_type)}
                            </p>
                        </div>

                        <div className={`p-4 rounded-lg border ${calendar.is_working_day
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                            }`}>
                            <p className={`text-sm font-medium mb-2 ${calendar.is_working_day ? "text-green-600" : "text-red-600"
                                }`}>
                                Working Day Status
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                {calendar.is_working_day ? "Yes - Working Day" : "No - Non-Working Day"}
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 font-medium mb-2">Day of Week</p>
                            <p className="text-xl font-bold text-gray-900">
                                {date.toLocaleDateString("en-US", { weekday: "long" })}
                            </p>
                        </div>
                    </div>

                    {calendar.description && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">Description:</p>
                            <p className="text-gray-700">{calendar.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
