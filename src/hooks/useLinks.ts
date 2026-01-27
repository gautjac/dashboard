import { useState, useEffect, useCallback } from 'react';
import type { Link } from '../types';

// Get sync userId from localStorage (same as syncService uses)
function getSyncUserId(): string | null {
  return localStorage.getItem('dashboard_user_id');
}

interface UseLinksReturn {
  links: Link[];
  archivedLinks: Link[];
  isLoading: boolean;
  isLoadingArchived: boolean;
  error: string | null;
  refreshLinks: () => Promise<void>;
  fetchArchivedLinks: () => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  archiveLink: (id: string) => Promise<void>;
  restoreLink: (id: string) => Promise<void>;
  summarizeLink: (id: string) => Promise<void>;
  summarizingId: string | null;
  total: number;
  archivedTotal: number;
}

export function useLinks(): UseLinksReturn {
  const [links, setLinks] = useState<Link[]>([]);
  const [archivedLinks, setArchivedLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setLinks([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/links?userId=${encodeURIComponent(userId)}&limit=50`);

      if (!response.ok) {
        if (response.status === 401) {
          setLinks([]);
          setTotal(0);
          return;
        }
        throw new Error(`Failed to fetch links: ${response.status}`);
      }

      const data = await response.json();
      setLinks(data.links || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch links';
      setError(message);
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchArchivedLinks = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setArchivedLinks([]);
      setArchivedTotal(0);
      return;
    }

    setIsLoadingArchived(true);

    try {
      const response = await fetch(`/.netlify/functions/links?userId=${encodeURIComponent(userId)}&limit=50&archived=true`);

      if (!response.ok) {
        throw new Error(`Failed to fetch archived links: ${response.status}`);
      }

      const data = await response.json();
      setArchivedLinks(data.links || []);
      setArchivedTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch archived links';
      setError(message);
    } finally {
      setIsLoadingArchived(false);
    }
  }, []);

  const deleteLink = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/links?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      // Remove from local state (both active and archived)
      setLinks(prev => prev.filter(l => l.id !== id));
      setArchivedLinks(prev => prev.filter(l => l.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      setArchivedTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete link';
      setError(message);
    }
  }, []);

  const archiveLink = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/links?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive link');
      }

      // Move from active to archived in local state
      const link = links.find(l => l.id === id);
      if (link) {
        setLinks(prev => prev.filter(l => l.id !== id));
        setTotal(prev => prev - 1);
        setArchivedLinks(prev => [{ ...link, archivedAt: new Date().toISOString() }, ...prev]);
        setArchivedTotal(prev => prev + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive link';
      setError(message);
    }
  }, [links]);

  const restoreLink = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/links?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore link');
      }

      // Move from archived to active in local state
      const link = archivedLinks.find(l => l.id === id);
      if (link) {
        setArchivedLinks(prev => prev.filter(l => l.id !== id));
        setArchivedTotal(prev => prev - 1);
        setLinks(prev => [{ ...link, archivedAt: null }, ...prev]);
        setTotal(prev => prev + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore link';
      setError(message);
    }
  }, [archivedLinks]);

  const summarizeLink = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    setSummarizingId(id);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/links?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize' }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();

      // Update link in local state
      setLinks(prev => prev.map(l =>
        l.id === id ? data.link : l
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(message);
    } finally {
      setSummarizingId(null);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return {
    links,
    archivedLinks,
    isLoading,
    isLoadingArchived,
    error,
    refreshLinks: fetchLinks,
    fetchArchivedLinks,
    deleteLink,
    archiveLink,
    restoreLink,
    summarizeLink,
    summarizingId,
    total,
    archivedTotal,
  };
}
