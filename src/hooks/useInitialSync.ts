import { useEffect, useRef } from 'react';
import { useDashboardStore } from '../store';

/**
 * Hook that loads data from server on app startup if sync is already enabled.
 * This ensures that when opening the app on a new device (or after clearing cache),
 * the latest data is fetched from the server before any auto-push occurs.
 *
 * Must be used in conjunction with useAutoSync for full sync functionality.
 */
export function useInitialSync() {
  const { syncEnabled, loadFromServer, syncStatus } = useDashboardStore();
  const hasRun = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('[useInitialSync] Effect triggered:', { syncEnabled, hasRun: hasRun.current, syncStatus });

    // Only run once on mount, and only if sync is enabled
    if (hasRun.current) {
      console.log('[useInitialSync] Already ran, skipping');
      return;
    }

    if (!syncEnabled) {
      console.log('[useInitialSync] Sync not enabled, skipping');
      return;
    }

    // Small delay to ensure Zustand has fully hydrated from localStorage
    console.log('[useInitialSync] Scheduling fetch in 500ms...');
    timeoutRef.current = setTimeout(async () => {
      const currentState = useDashboardStore.getState();
      console.log('[useInitialSync] Timeout fired. syncEnabled:', currentState.syncEnabled, 'syncStatus:', currentState.syncStatus);

      if (currentState.syncEnabled && currentState.syncStatus !== 'syncing') {
        hasRun.current = true;
        console.log('[useInitialSync] Calling loadFromServer...');
        await loadFromServer();
        console.log('[useInitialSync] loadFromServer completed');
      }
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [syncEnabled, loadFromServer, syncStatus]);
}
