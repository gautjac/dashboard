import { useState, useEffect, useCallback } from 'react';
import type { Bookmark, ExtensionBookmark } from '../types';

// Get sync userId from localStorage (same as syncService uses)
function getSyncUserId(): string | null {
  return localStorage.getItem('dashboard_user_id');
}

interface UseExtensionBookmarksReturn {
  bookmarks: Bookmark[];
  archivedBookmarks: Bookmark[];
  isLoading: boolean;
  isLoadingArchived: boolean;
  error: string | null;
  refreshBookmarks: () => Promise<void>;
  fetchArchivedBookmarks: () => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  archiveBookmark: (id: string) => Promise<void>;
  restoreBookmark: (id: string) => Promise<void>;
  summarizeBookmark: (id: string) => Promise<void>;
  summarizingId: string | null;
  total: number;
  archivedTotal: number;
}

// Convert extension bookmark to standard Bookmark format
function toBookmark(eb: ExtensionBookmark & { archived_at?: string; summary?: string }): Bookmark & { archivedAt?: string; summary?: string } {
  return {
    id: eb.id,
    text: eb.tweet_text || '',
    author: eb.author_handle ? `@${eb.author_handle}` : eb.author_name || 'Unknown',
    url: eb.tweet_url,
    savedAt: eb.bookmarked_at,
    source: 'extension' as const,
    archivedAt: eb.archived_at,
    summary: eb.summary,
  };
}

export function useExtensionBookmarks(): UseExtensionBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [archivedBookmarks, setArchivedBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setBookmarks([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/extension-bookmarks?userId=${encodeURIComponent(userId)}&limit=50`);

      if (!response.ok) {
        if (response.status === 401) {
          setBookmarks([]);
          setTotal(0);
          return;
        }
        throw new Error(`Failed to fetch bookmarks: ${response.status}`);
      }

      const data = await response.json();
      const extensionBookmarks: ExtensionBookmark[] = data.bookmarks || [];

      setBookmarks(extensionBookmarks.map(toBookmark));
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch extension bookmarks';
      setError(message);
      setBookmarks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchArchivedBookmarks = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setArchivedBookmarks([]);
      setArchivedTotal(0);
      return;
    }

    setIsLoadingArchived(true);

    try {
      const response = await fetch(`/.netlify/functions/extension-bookmarks?userId=${encodeURIComponent(userId)}&limit=50&archived=true`);

      if (!response.ok) {
        throw new Error(`Failed to fetch archived bookmarks: ${response.status}`);
      }

      const data = await response.json();
      const extensionBookmarks: ExtensionBookmark[] = data.bookmarks || [];

      setArchivedBookmarks(extensionBookmarks.map(toBookmark));
      setArchivedTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch archived bookmarks';
      setError(message);
    } finally {
      setIsLoadingArchived(false);
    }
  }, []);

  const deleteBookmark = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/extension-bookmarks?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bookmark');
      }

      // Remove from local state (both active and archived)
      setBookmarks(prev => prev.filter(b => b.id !== id));
      setArchivedBookmarks(prev => prev.filter(b => b.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      setArchivedTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete bookmark';
      setError(message);
    }
  }, []);

  const archiveBookmark = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/extension-bookmarks?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive bookmark');
      }

      // Move from active to archived in local state
      const bookmark = bookmarks.find(b => b.id === id);
      if (bookmark) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
        setTotal(prev => prev - 1);
        setArchivedBookmarks(prev => [{ ...bookmark, archivedAt: new Date().toISOString() } as any, ...prev]);
        setArchivedTotal(prev => prev + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive bookmark';
      setError(message);
    }
  }, [bookmarks]);

  const restoreBookmark = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/extension-bookmarks?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore bookmark');
      }

      // Move from archived to active in local state
      const bookmark = archivedBookmarks.find(b => b.id === id);
      if (bookmark) {
        setArchivedBookmarks(prev => prev.filter(b => b.id !== id));
        setArchivedTotal(prev => prev - 1);
        const { archivedAt, ...rest } = bookmark as any;
        setBookmarks(prev => [rest, ...prev]);
        setTotal(prev => prev + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore bookmark';
      setError(message);
    }
  }, [archivedBookmarks]);

  const summarizeBookmark = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    setSummarizingId(id);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/extension-bookmarks?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize' }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      const updatedBookmark = toBookmark(data.bookmark);

      // Update bookmark in local state
      setBookmarks(prev => prev.map(b =>
        b.id === id ? updatedBookmark : b
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
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    archivedBookmarks,
    isLoading,
    isLoadingArchived,
    error,
    refreshBookmarks: fetchBookmarks,
    fetchArchivedBookmarks,
    deleteBookmark,
    archiveBookmark,
    restoreBookmark,
    summarizeBookmark,
    summarizingId,
    total,
    archivedTotal,
  };
}
