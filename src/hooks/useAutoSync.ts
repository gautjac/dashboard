import { useEffect, useRef } from 'react';
import { useDashboardStore } from '../store';

/**
 * Hook that automatically syncs data to the server when changes occur
 * Uses debouncing to prevent excessive API calls
 *
 * Important: This hook only PUSHES data to server. Use useInitialSync
 * to PULL data from server on app startup.
 */
export function useAutoSync(debounceMs = 2000) {
  const {
    syncEnabled,
    syncStatus,
    lastSyncedAt,
    syncToServer,
    habits,
    habitCompletions,
    journalEntries,
    focusLines,
    settings,
    interestAreas,
  } = useDashboardStore();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPullTimeRef = useRef<number>(0);
  const initializedRef = useRef(false);

  // Track when we pull from server (lastSyncedAt changes indicate a pull)
  useEffect(() => {
    if (lastSyncedAt) {
      lastPullTimeRef.current = Date.now();
      console.log('[useAutoSync] Pull detected, setting cooldown');
    }
  }, [lastSyncedAt]);

  // Track data changes and trigger sync
  useEffect(() => {
    // Wait for initial mount to complete
    if (!initializedRef.current) {
      // Set initialized after a delay to skip initial hydration
      const initTimeout = setTimeout(() => {
        initializedRef.current = true;
        console.log('[useAutoSync] Initialized, now watching for changes');
      }, 3000); // Wait 3 seconds after mount before allowing pushes
      return () => clearTimeout(initTimeout);
    }

    if (!syncEnabled) return;

    // Don't push while we're already syncing (e.g., during initial pull)
    if (syncStatus === 'syncing') {
      console.log('[useAutoSync] Skipping push - sync in progress');
      return;
    }

    // Don't push within 5 seconds of a pull to avoid overwriting fetched data
    const timeSincePull = Date.now() - lastPullTimeRef.current;
    if (timeSincePull < 5000) {
      console.log('[useAutoSync] Skipping push - too soon after pull:', timeSincePull, 'ms');
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the sync
    timeoutRef.current = setTimeout(() => {
      // Double-check conditions when timeout fires
      const state = useDashboardStore.getState();
      const currentTimeSincePull = Date.now() - lastPullTimeRef.current;

      if (state.syncStatus !== 'syncing' && currentTimeSincePull >= 5000) {
        console.log('[useAutoSync] Pushing to server');
        syncToServer();
      } else {
        console.log('[useAutoSync] Push cancelled - conditions changed');
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    syncEnabled,
    syncStatus,
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
