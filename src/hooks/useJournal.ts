import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { JournalEntry } from '../types';

// Get user ID from localStorage
function getSyncUserId(): string | null {
  const userId = localStorage.getItem('dashboard_user_id');
  return userId ? userId.toLowerCase().trim() : null;
}

interface UseJournalReturn {
  journalEntries: JournalEntry[];
  todayEntry: JournalEntry | null;
  isLoading: boolean;
  error: string | null;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<JournalEntry>;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  getEntryByDate: (date: string) => JournalEntry | undefined;
  refreshJournalEntries: () => Promise<void>;
  syncEnabled: boolean;
}

export function useJournal(): UseJournalReturn {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEnabled = !!getSyncUserId();
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchJournalEntries = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setJournalEntries([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/.netlify/functions/journal?userId=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch journal entries');
      }

      const data = await response.json();
      setJournalEntries(data.entries || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch journal entries';
      setError(message);
      console.error('useJournal fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchJournalEntries();
  }, [fetchJournalEntries]);

  const addJournalEntry = useCallback(async (
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JournalEntry> => {
    const userId = getSyncUserId();
    if (!userId) {
      throw new Error('Sync not enabled');
    }

    try {
      const response = await fetch(
        `/.netlify/functions/journal?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add journal entry');
      }

      const data = await response.json();
      const newEntry = data.entry;

      // Update local state (upsert by date)
      setJournalEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== newEntry.date);
        return [newEntry, ...filtered].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });

      return newEntry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add journal entry';
      setError(message);
      console.error('useJournal add error:', err);
      throw err;
    }
  }, []);

  const updateJournalEntry = useCallback(async (id: string, updates: Partial<JournalEntry>) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    // Optimistic update
    setJournalEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );

    try {
      const response = await fetch(
        `/.netlify/functions/journal?userId=${encodeURIComponent(userId)}&id=${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update journal entry');
      }

      const data = await response.json();
      setJournalEntries((prev) =>
        prev.map((entry) => (entry.id === id ? data.entry : entry))
      );
    } catch (err) {
      // Revert on error
      await fetchJournalEntries();
      const message = err instanceof Error ? err.message : 'Failed to update journal entry';
      setError(message);
      console.error('useJournal update error:', err);
      throw err;
    }
  }, [fetchJournalEntries]);

  const deleteJournalEntry = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    // Optimistic delete
    setJournalEntries((prev) => prev.filter((entry) => entry.id !== id));

    try {
      const response = await fetch(
        `/.netlify/functions/journal?userId=${encodeURIComponent(userId)}&id=${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete journal entry');
      }
    } catch (err) {
      // Revert on error
      await fetchJournalEntries();
      const message = err instanceof Error ? err.message : 'Failed to delete journal entry';
      setError(message);
      console.error('useJournal delete error:', err);
      throw err;
    }
  }, [fetchJournalEntries]);

  const getEntryByDate = useCallback(
    (date: string) => journalEntries.find((e) => e.date === date),
    [journalEntries]
  );

  const todayEntry = journalEntries.find((e) => e.date === today) || null;

  return {
    journalEntries,
    todayEntry,
    isLoading,
    error,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    getEntryByDate,
    refreshJournalEntries: fetchJournalEntries,
    syncEnabled,
  };
}
