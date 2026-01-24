/**
 * Readwise API Service
 *
 * Fetches bookmarked tweets from Readwise.
 * Individual tweets are stored as highlights in Readwise Classic (v2 API).
 * Twitter threads are stored as documents in Reader (v3 API).
 *
 * Requires a Readwise access token from https://readwise.io/access_token
 */

import type { Bookmark } from '../types';

const STORAGE_KEY = 'readwise_access_token';

// v2 API response types (highlights)
interface ReadwiseHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  highlighted_at: string;
  url: string | null;
  color: string;
  updated: string;
  book_id: number;
  tags: { id: number; name: string }[];
}

interface ReadwiseBook {
  id: number;
  title: string;
  author: string;
  category: string;
  source: string;
  num_highlights: number;
  last_highlight_at: string;
  updated: string;
  cover_image_url: string;
  highlights_url: string;
  source_url: string | null;
  asin: string;
  highlights: ReadwiseHighlight[];
}

interface ReadwiseExportResponse {
  count: number;
  nextPageCursor: number | null;
  results: ReadwiseBook[];
}

class ReadwiseService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
    try {
      this.token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    } catch {
      this.token = null;
    }
  }

  /**
   * Check if Readwise is configured with an access token
   */
  isConfigured(): boolean {
    return Boolean(this.token);
  }

  /**
   * Set the Readwise access token
   */
  setToken(token: string | null): void {
    this.token = token;
    try {
      if (typeof window !== 'undefined') {
        if (token) {
          localStorage.setItem(STORAGE_KEY, token);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Get the current access token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Validate the token by making a test API call
   */
  async validateToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await fetch('https://readwise.io/api/v2/auth/', {
        headers: {
          Authorization: `Token ${this.token}`,
        },
      });
      return response.status === 204;
    } catch {
      return false;
    }
  }

  /**
   * Fetch bookmarked tweets from Readwise (v2 API - highlights)
   * Individual tweets are saved as highlights with category "tweets"
   */
  async fetchBookmarks(
    limit: number = 20,
    updatedAfter?: string
  ): Promise<Bookmark[]> {
    if (!this.token) {
      throw new Error('Readwise not configured. Please add your access token.');
    }

    const params = new URLSearchParams();
    if (updatedAfter) {
      params.set('updatedAfter', updatedAfter);
    }

    try {
      // Fetch from v2 export API which contains highlights
      const url = `https://readwise.io/api/v2/export/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Token ${this.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Readwise access token');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`Readwise API error: ${response.status}`);
      }

      const data: ReadwiseExportResponse = await response.json();

      // Filter for tweets only and convert to our Bookmark format
      const bookmarks: Bookmark[] = [];

      // Defensive check for results array
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      for (const book of data.results) {
        // Check if this is a tweet (category is "tweets")
        if (book.category === 'tweets') {
          // Defensive check for highlights array
          if (!book.highlights || !Array.isArray(book.highlights)) {
            continue;
          }
          // Each "book" with category tweets is actually a tweet
          // The highlights within it are the tweet text
          for (const highlight of book.highlights) {
            // Ensure we have a valid date - empty strings are falsy but would fail Date parsing
            const savedAt = (highlight.highlighted_at && highlight.highlighted_at.trim())
              || (book.updated && book.updated.trim())
              || new Date().toISOString();

            bookmarks.push({
              id: String(highlight.id),
              text: highlight.text || '',
              author: this.extractAuthor(book.author || '', book.title || ''),
              url: book.source_url || highlight.url || '',
              savedAt,
            });
          }
        }
      }

      // Sort by savedAt descending (newest first) and take the limit
      return bookmarks
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        .slice(0, limit);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch bookmarks from Readwise');
    }
  }

  /**
   * Extract author name from Readwise data
   */
  private extractAuthor(author: string, title: string): string {
    if (author && author !== 'None') return author;

    // Try to extract from title like "Tweet by @username" or just "@username"
    const match = title.match(/@(\w+)/);
    if (match) return `@${match[1]}`;

    return 'Unknown';
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.token = null;
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }
}

// Export singleton instance
export const readwiseService = new ReadwiseService();
