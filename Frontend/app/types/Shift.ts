// =====================================================
// SHIFT AND CALENDAR TYPES
// =====================================================

export interface Shift {
    id: number;
    shift_code: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    effective_working_minutes: number;
    is_active: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface CompanyCalendar {
    id: number;
    calendar_date: string;
    day_type: string; // working-day, weekend, holiday, special-working-day
    description?: string;
    is_working_day: boolean;
    created_at: string;
    updated_at: string;
}
