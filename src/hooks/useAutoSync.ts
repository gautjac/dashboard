import { useEffect, useRef } from 'react';
import { useDashboardStore } from '../store';

/**
 * Hook that automatically syncs data to the server when changes occur
 * Uses debouncing to prevent excessive API calls
 */
export function useAutoSync(debounceMs = 2000) {
  const {
    syncEnabled,
    syncToServer,
    habits,
    habitCompletions,
    journalEntries,
    focusLines,
    settings,
    interestAreas,
  } = useDashboardStore();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Track data changes and trigger sync
  useEffect(() => {
    // Skip first render (initial load from localStorage)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!syncEnabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the sync
    timeoutRef.current = setTimeout(() => {
      syncToServer();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    syncEnabled,
    syncToServer,
    habits,
    habitCompletions,
    journalEntries,
    focusLines,
    settings,
    interestAreas,
    debounceMs,
  ]);
}
