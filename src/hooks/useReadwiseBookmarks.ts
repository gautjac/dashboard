import { useState, useEffect, useCallback } from 'react';
import { readwiseService } from '../services/readwise';
import { useDashboardStore } from '../store';
import type { Bookmark } from '../types';

interface UseReadwiseBookmarksReturn {
  // State
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  bookmarks: Bookmark[];

  // Actions
  refreshBookmarks: () => Promise<void>;
  setToken: (token: string) => Promise<boolean>;
  clearToken: () => void;
  clearError: () => void;
}

export function useReadwiseBookmarks(): UseReadwiseBookmarksReturn {
  const { readwiseToken, bookmarks, setReadwiseToken, setBookmarks, clearBookmarks } =
    useDashboardStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync token from store to service on mount and when it changes
  // This ensures the service always has the token from the persisted store
  useEffect(() => {
    if (readwiseToken) {
      // Always sync from store to service - store is the source of truth
      if (readwiseService.getToken() !== readwiseToken) {
        readwiseService.setToken(readwiseToken);
      }
    } else {
      // If store has no token but service does, load from service into store
      // This handles the case where service localStorage has the token but store doesn't
      const serviceToken = readwiseService.getToken();
      if (serviceToken) {
        setReadwiseToken(serviceToken);
      }
    }
  }, [readwiseToken, setReadwiseToken]);

  const isConfigured = Boolean(readwiseToken) || readwiseService.isConfigured();

  // Auto-fetch bookmarks when configured
  useEffect(() => {
    if (isConfigured && bookmarks.length === 0) {
      refreshBookmarks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured]);

  const refreshBookmarks = useCallback(async () => {
    if (!isConfigured) {
      setError('Readwise is not configured. Please add your access token.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedBookmarks = await readwiseService.fetchBookmarks(20);
      setBookmarks(fetchedBookmarks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bookmarks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, setBookmarks]);

  const setToken = useCallback(
    async (token: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // Temporarily set token to validate
        readwiseService.setToken(token);
        const isValid = await readwiseService.validateToken();

        if (isValid) {
          // Save to store for persistence
          setReadwiseToken(token);
          // Fetch bookmarks immediately
          const fetchedBookmarks = await readwiseService.fetchBookmarks(20);
          setBookmarks(fetchedBookmarks);
          return true;
        } else {
          readwiseService.clearToken();
          setError('Invalid access token. Please check and try again.');
          return false;
        }
      } catch (err) {
        readwiseService.clearToken();
        const message = err instanceof Error ? err.message : 'Failed to validate token';
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [setReadwiseToken, setBookmarks]
  );

  const clearToken = useCallback(() => {
    readwiseService.clearToken();
    clearBookmarks();
    setError(null);
  }, [clearBookmarks]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConfigured,
    isLoading,
    error,
    bookmarks,
    refreshBookmarks,
    setToken,
    clearToken,
    clearError,
  };
}
