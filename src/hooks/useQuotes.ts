import { useState, useEffect, useCallback } from 'react';

// Get sync userId from localStorage
function getSyncUserId(): string | null {
  return localStorage.getItem('dashboard_user_id');
}

export interface Quote {
  id: string;
  text: string;
  author: string | null;
  createdAt: string;
}

interface UseQuotesReturn {
  quotes: Quote[];
  randomQuote: Quote | null;
  isLoading: boolean;
  isLoadingRandom: boolean;
  error: string | null;
  syncEnabled: boolean;
  fetchQuotes: () => Promise<void>;
  fetchRandomQuote: () => Promise<void>;
  addQuote: (text: string, author?: string) => Promise<void>;
  updateQuote: (id: string, text: string, author?: string) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  total: number;
}

export function useQuotes(): UseQuotesReturn {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [randomQuote, setRandomQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchQuotes = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setQuotes([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/quotes?userId=${encodeURIComponent(userId)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch quotes: ${response.status}`);
      }

      const data = await response.json();
      setQuotes(data.quotes || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quotes';
      setError(message);
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRandomQuote = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setRandomQuote(null);
      return;
    }

    setIsLoadingRandom(true);

    try {
      const response = await fetch(`/.netlify/functions/quotes?userId=${encodeURIComponent(userId)}&random=true`);

      if (!response.ok) {
        throw new Error(`Failed to fetch random quote: ${response.status}`);
      }

      const data = await response.json();
      setRandomQuote(data.quote || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch random quote';
      setError(message);
    } finally {
      setIsLoadingRandom(false);
    }
  }, []);

  const addQuote = useCallback(async (text: string, author?: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      const err = new Error('Please enable Sync first (Settings > Sync) to save quotes');
      setError(err.message);
      throw err;
    }

    try {
      const response = await fetch(`/.netlify/functions/quotes?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author }),
      });

      if (!response.ok) {
        throw new Error('Failed to add quote');
      }

      const data = await response.json();
      setQuotes(prev => [data.quote, ...prev]);
      setTotal(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add quote';
      setError(message);
      throw err;
    }
  }, []);

  const updateQuote = useCallback(async (id: string, text: string, author?: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/quotes?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quote');
      }

      const data = await response.json();
      setQuotes(prev => prev.map(q => q.id === id ? data.quote : q));

      // Update random quote if it's the one being edited
      if (randomQuote?.id === id) {
        setRandomQuote(data.quote);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update quote';
      setError(message);
      throw err;
    }
  }, [randomQuote]);

  const deleteQuote = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    try {
      const response = await fetch(`/.netlify/functions/quotes?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quote');
      }

      setQuotes(prev => prev.filter(q => q.id !== id));
      setTotal(prev => Math.max(0, prev - 1));

      // Clear random quote if it was deleted
      if (randomQuote?.id === id) {
        setRandomQuote(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete quote';
      setError(message);
      throw err;
    }
  }, [randomQuote]);

  // Fetch random quote on mount
  useEffect(() => {
    fetchRandomQuote();
  }, [fetchRandomQuote]);

  return {
    quotes,
    randomQuote,
    isLoading,
    isLoadingRandom,
    error,
    syncEnabled: !!getSyncUserId(),
    fetchQuotes,
    fetchRandomQuote,
    addQuote,
    updateQuote,
    deleteQuote,
    total,
  };
}
