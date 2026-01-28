import { useState, useEffect, useCallback } from 'react';
import type { InterestArea } from '../types';

// Get user ID from localStorage
function getSyncUserId(): string | null {
  const userId = localStorage.getItem('dashboard_user_id');
  return userId ? userId.toLowerCase().trim() : null;
}

interface UseInterestAreasReturn {
  interestAreas: InterestArea[];
  isLoading: boolean;
  error: string | null;
  addInterestArea: (area: Omit<InterestArea, 'id'>) => Promise<void>;
  updateInterestArea: (id: string, updates: Partial<InterestArea>) => Promise<void>;
  deleteInterestArea: (id: string) => Promise<void>;
  refreshInterestAreas: () => Promise<void>;
  syncEnabled: boolean;
}

export function useInterestAreas(): UseInterestAreasReturn {
  const [interestAreas, setInterestAreas] = useState<InterestArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEnabled = !!getSyncUserId();

  const fetchInterestAreas = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setInterestAreas([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/.netlify/functions/interest-areas?userId=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch interest areas');
      }

      const data = await response.json();
      setInterestAreas(data.interestAreas || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch interest areas';
      setError(message);
      console.error('useInterestAreas fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchInterestAreas();
  }, [fetchInterestAreas]);

  const addInterestArea = useCallback(async (area: Omit<InterestArea, 'id'>) => {
    const userId = getSyncUserId();
    if (!userId) {
      throw new Error('Sync not enabled');
    }

    try {
      const response = await fetch(
        `/.netlify/functions/interest-areas?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(area),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add interest area');
      }

      const data = await response.json();
      setInterestAreas((prev) => [...prev, data.interestArea]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add interest area';
      setError(message);
      console.error('useInterestAreas add error:', err);
      throw err;
    }
  }, []);

  const updateInterestArea = useCallback(async (id: string, updates: Partial<InterestArea>) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    // Optimistic update
    setInterestAreas((prev) =>
      prev.map((area) => (area.id === id ? { ...area, ...updates } : area))
    );

    try {
      const response = await fetch(
        `/.netlify/functions/interest-areas?userId=${encodeURIComponent(userId)}&id=${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update interest area');
      }

      const data = await response.json();
      setInterestAreas((prev) =>
        prev.map((area) => (area.id === id ? data.interestArea : area))
      );
    } catch (err) {
      // Revert on error
      await fetchInterestAreas();
      const message = err instanceof Error ? err.message : 'Failed to update interest area';
      setError(message);
      console.error('useInterestAreas update error:', err);
      throw err;
    }
  }, [fetchInterestAreas]);

  const deleteInterestArea = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    // Optimistic delete
    setInterestAreas((prev) => prev.filter((area) => area.id !== id));

    try {
      const response = await fetch(
        `/.netlify/functions/interest-areas?userId=${encodeURIComponent(userId)}&id=${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete interest area');
      }
    } catch (err) {
      // Revert on error
      await fetchInterestAreas();
      const message = err instanceof Error ? err.message : 'Failed to delete interest area';
      setError(message);
      console.error('useInterestAreas delete error:', err);
      throw err;
    }
  }, [fetchInterestAreas]);

  return {
    interestAreas,
    isLoading,
    error,
    addInterestArea,
    updateInterestArea,
    deleteInterestArea,
    refreshInterestAreas: fetchInterestAreas,
    syncEnabled,
  };
}
