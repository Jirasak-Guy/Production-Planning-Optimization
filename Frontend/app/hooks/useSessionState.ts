"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * A hook that works like useState but persists the value in sessionStorage.
 * The value survives page navigations within the same tab but is cleared
 * when the tab/browser is closed.
 */
export function useSessionState<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    // Initialize state: try to read from sessionStorage first
    const [state, setStateInternal] = useState<T>(() => {
        if (typeof window === "undefined") return initialValue;
        try {
            const stored = sessionStorage.getItem(key);
            if (stored !== null) {
                return JSON.parse(stored) as T;
            }
        } catch {
            // Ignore parse errors
        }
        return initialValue;
    });

    // Sync to sessionStorage whenever state changes
    useEffect(() => {
        try {
            if (state === null || state === undefined) {
                sessionStorage.removeItem(key);
            } else {
                sessionStorage.setItem(key, JSON.stringify(state));
            }
        } catch {
            // Ignore storage errors (e.g. quota exceeded)
        }
    }, [key, state]);

    // Wrap setter to also handle functional updates
    const setState = useCallback(
        (value: T | ((prev: T) => T)) => {
            setStateInternal(value);
        },
        []
    );

    return [state, setState];
}
