import { useState, useEffect, useCallback } from 'react';
import type { Bookmark, ExtensionBookmark } from '../types';

interface UseExtensionBookmarksReturn {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  refreshBookmarks: () => Promise<void>;
  total: number;
}

// Convert extension bookmark to standard Bookmark format
function toBookmark(eb: ExtensionBookmark): Bookmark {
  return {
    id: eb.id,
    text: eb.tweet_text || '',
    author: eb.author_handle ? `@${eb.author_handle}` : eb.author_name || 'Unknown',
    url: eb.tweet_url,
    savedAt: eb.bookmarked_at,
    source: 'extension' as const,
  };
}

export function useExtensionBookmarks(): UseExtensionBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchBookmarks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/extension-bookmarks?limit=50');

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, which is fine - user might not be logged in
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

  // Fetch on mount
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    refreshBookmarks: fetchBookmarks,
    total,
  };
}
