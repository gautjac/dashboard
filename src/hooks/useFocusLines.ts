import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { FocusLine } from '../types';

// Get user ID from localStorage
function getSyncUserId(): string | null {
  const userId = localStorage.getItem('dashboard_user_id');
  return userId ? userId.toLowerCase().trim() : null;
}

interface UseFocusLinesReturn {
  focusLines: FocusLine[];
  todayFocusLine: FocusLine | null;
  isLoading: boolean;
  error: string | null;
  setFocusLine: (text: string, date?: string) => Promise<void>;
  getFocusLineByDate: (date: string) => FocusLine | undefined;
  refreshFocusLines: () => Promise<void>;
  syncEnabled: boolean;
}

export function useFocusLines(): UseFocusLinesReturn {
  const [focusLines, setFocusLines] = useState<FocusLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEnabled = !!getSyncUserId();
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchFocusLines = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setFocusLines([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/.netlify/functions/focus-lines?userId=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch focus lines');
      }

      const data = await response.json();
      setFocusLines(data.focusLines || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch focus lines';
      setError(message);
      console.error('useFocusLines fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchFocusLines();
  }, [fetchFocusLines]);

  const setFocusLine = useCallback(async (text: string, date?: string) => {
    const userId = getSyncUserId();
    const targetDate = date || today;

    // Optimistically update local state
    const newFocusLine: FocusLine = {
      id: `focus-temp-${Date.now()}`,
      date: targetDate,
      text,
      createdAt: new Date().toISOString(),
    };

    setFocusLines((prev) => {
      const filtered = prev.filter((f) => f.date !== targetDate);
      return [newFocusLine, ...filtered].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });

    if (!userId) {
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/focus-lines?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: targetDate, text }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save focus line');
      }

      const data = await response.json();
      // Update with server response
      setFocusLines((prev) => {
        const filtered = prev.filter((f) => f.date !== targetDate);
        return [data.focusLine, ...filtered].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });
    } catch (err) {
      // Revert on error
      await fetchFocusLines();
      const message = err instanceof Error ? err.message : 'Failed to save focus line';
      setError(message);
      console.error('useFocusLines save error:', err);
      throw err;
    }
  }, [today, fetchFocusLines]);

  const getFocusLineByDate = useCallback(
    (date: string) => focusLines.find((f) => f.date === date),
    [focusLines]
  );

  const todayFocusLine = focusLines.find((f) => f.date === today) || null;

  return {
    focusLines,
    todayFocusLine,
    isLoading,
    error,
    setFocusLine,
    getFocusLineByDate,
    refreshFocusLines: fetchFocusLines,
    syncEnabled,
  };
}
