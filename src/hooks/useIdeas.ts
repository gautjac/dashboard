import { useState, useEffect, useCallback } from 'react';
import type { Idea } from '../types';

// Get sync userId from localStorage
function getSyncUserId(): string | null {
  return localStorage.getItem('dashboard_user_id');
}

interface UseIdeasReturn {
  ideas: Idea[];
  archivedIdeas: Idea[];
  isLoading: boolean;
  isLoadingArchived: boolean;
  error: string | null;
  syncEnabled: boolean;
  refreshIdeas: () => Promise<void>;
  fetchArchivedIdeas: () => Promise<void>;
  addIdea: (text: string, category?: string) => Promise<void>;
  updateIdea: (id: string, text: string, category?: string) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  archiveIdea: (id: string) => Promise<void>;
  restoreIdea: (id: string) => Promise<void>;
  total: number;
  archivedTotal: number;
}

export function useIdeas(): UseIdeasReturn {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [archivedIdeas, setArchivedIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);

  const fetchIdeas = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setIdeas([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/ideas?userId=${encodeURIComponent(userId)}&limit=50`);

      if (!response.ok) {
        if (response.status === 401) {
          setIdeas([]);
          setTotal(0);
          return;
        }
        throw new Error(`Failed to fetch ideas: ${response.status}`);
      }

      const data = await response.json();
      setIdeas(data.ideas || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch ideas';
      setError(message);
      setIdeas([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchArchivedIdeas = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setArchivedIdeas([]);
      setArchivedTotal(0);
      return;
    }

    setIsLoadingArchived(true);

    try {
      const response = await fetch(`/.netlify/functions/ideas?userId=${encodeURIComponent(userId)}&limit=50&archived=true`);

      if (!response.ok) {
        throw new Error(`Failed to fetch archived ideas: ${response.status}`);
      }

      const data = await response.json();
      setArchivedIdeas(data.ideas || []);
      setArchivedTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch archived ideas';
      setError(message);
    } finally {
      setIsLoadingArchived(false);
    }
  }, []);

  const addIdea = useCallback(async (text: string, category?: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      const err = new Error('Please enable Sync first (Settings > Sync) to save ideas');
      setError(err.message);
      throw err;
    }

    try {
      const response = await fetch(`/.netlify/functions/ideas?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category }),
      });

      if (!response.ok) {
        throw new Error('Failed to add idea');
      }

      const data = await response.json();
      setIdeas(prev => [data.idea, ...prev]);
      setTotal(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add idea';
      setError(message);
      throw err;
    }
  }, []);

  const updateIdea = useCallback(async (id: string, text: string, category?: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/ideas?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category }),
      });

      if (!response.ok) {
        throw new Error('Failed to update idea');
      }

      const data = await response.json();
      setIdeas(prev => prev.map(i => i.id === id ? data.idea : i));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update idea';
      setError(message);
      throw err;
    }
  }, []);

  const deleteIdea = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/ideas?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete idea');
      }

      setIdeas(prev => prev.filter(i => i.id !== id));
      setArchivedIdeas(prev => prev.filter(i => i.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete idea';
      setError(message);
    }
  }, []);

  const archiveIdea = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/ideas?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive idea');
      }

      // Move from active to archived in local state
      const idea = ideas.find(i => i.id === id);
      if (idea) {
        setIdeas(prev => prev.filter(i => i.id !== id));
        setTotal(prev => prev - 1);
        setArchivedIdeas(prev => [{ ...idea, archivedAt: new Date().toISOString() }, ...prev]);
        setArchivedTotal(prev => prev + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive idea';
      setError(message);
    }
  }, [ideas]);

  const restoreIdea = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/ideas?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore idea');
      }

      // Move from archived to active in local state
      const idea = archivedIdeas.find(i => i.id === id);
      if (idea) {
        setArchivedIdeas(prev => prev.filter(i => i.id !== id));
        setArchivedTotal(prev => prev - 1);
        const { archivedAt, ...rest } = idea;
        setIdeas(prev => [{ ...rest, archivedAt: null }, ...prev]);
        setTotal(prev => prev + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore idea';
      setError(message);
    }
  }, [archivedIdeas]);

  // Fetch on mount
  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return {
    ideas,
    archivedIdeas,
    isLoading,
    isLoadingArchived,
    error,
    syncEnabled: !!getSyncUserId(),
    refreshIdeas: fetchIdeas,
    fetchArchivedIdeas,
    addIdea,
    updateIdea,
    deleteIdea,
    archiveIdea,
    restoreIdea,
    total,
    archivedTotal,
  };
}
