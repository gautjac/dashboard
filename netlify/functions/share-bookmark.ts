import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Hash API key using SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Validate API key and return user ID
async function validateApiKey(sql: ReturnType<typeof getDb>, apiKey: string): Promise<string | null> {
  const keyHash = await hashApiKey(apiKey);

  const result = await sql`
    SELECT user_id, id FROM api_keys WHERE key_hash = ${keyHash}
  `;

  if (result.length === 0) {
    return null;
  }

  // Update last_used_at
  await sql`
    UPDATE api_keys SET last_used_at = NOW() WHERE id = ${result[0].id}
  `;

  return result[0].user_id;
}

// Fetch tweet details from X's syndication API (free, no auth required)
async function fetchTweetDetails(tweetId: string): Promise<{ authorName: string; tweetText: string } | null> {
  try {
    // Use the syndication endpoint which returns JSON data
    const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=1`;
    const response = await fetch(syndicationUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyDashboard/1.0)' }
    });

    if (!response.ok) {
      console.log('Syndication fetch failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Extract tweet text (remove t.co URLs for cleaner display)
    let tweetText = data.text || '';
    tweetText = tweetText.replace(/https:\/\/t\.co\/\w+/g, '').trim();

    return {
      authorName: data.user?.name || '',
      tweetText
    };
  } catch (error) {
    console.error('Error fetching tweet details:', error);
    return null;
  }
}

// Extract tweet info from URL or shared text
function extractTweetInfo(input: string): { tweetId: string; authorHandle: string; tweetUrl: string } | null {
  // Handle various formats:
  // - https://x.com/username/status/123456789
  // - https://twitter.com/username/status/123456789
  // - Shared text that contains a URL

  const patterns = [
    /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/i,
    /(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const authorHandle = match[1];
      const tweetId = match[2];
      return {
        tweetId,
        authorHandle,
        tweetUrl: `https://x.com/${authorHandle}/status/${tweetId}`
      };
    }
  }

  return null;
}

export default async function handler(req: Request, _context: Context) {
  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const sql = getDb();

  // Get API key from header or query param (for easier shortcut setup)
  const url = new URL(req.url);
  const apiKey = req.headers.get('X-API-Key') || url.searchParams.get('key');

  if (!apiKey) {
    return errorResponse('API key required', 401);
  }

  const userId = await validateApiKey(sql, apiKey);
  if (!userId) {
    return errorResponse('Invalid API key', 401);
  }

  try {
    // Accept various input formats
    let input: string;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      // Handle various key names and case variations
      input = body.url || body.URL || body.text || body.Text || body.content || body.Content || '';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      input = (formData.get('url') || formData.get('text') || formData.get('content') || '').toString();
    } else {
      // Plain text
      input = await req.text();
    }

    if (!input) {
      return errorResponse('No URL or text provided', 400);
    }

    // Log the input for debugging
    console.log('Share bookmark input:', JSON.stringify(input));

    // Extract tweet info
    const tweetInfo = extractTweetInfo(input);
    if (!tweetInfo) {
      return errorResponse(`Could not find a valid X/Twitter URL. Received: "${input.substring(0, 200)}"`, 400);
    }

    const { tweetId, authorHandle, tweetUrl } = tweetInfo;
    const id = generateId();

    // Fetch additional tweet details from syndication API
    const details = await fetchTweetDetails(tweetId);
    const authorName = details?.authorName || null;
    const tweetText = details?.tweetText || null;

    // Upsert bookmark with full details
    const result = await sql`
      INSERT INTO extension_bookmarks (id, user_id, tweet_id, tweet_url, author_handle, author_name, tweet_text, bookmarked_at)
      VALUES (${id}, ${userId}, ${tweetId}, ${tweetUrl}, ${authorHandle}, ${authorName}, ${tweetText}, NOW())
      ON CONFLICT (user_id, tweet_id) DO UPDATE SET
        tweet_url = EXCLUDED.tweet_url,
        author_handle = EXCLUDED.author_handle,
        author_name = COALESCE(EXCLUDED.author_name, extension_bookmarks.author_name),
        tweet_text = COALESCE(EXCLUDED.tweet_text, extension_bookmarks.tweet_text)
      RETURNING *
    `;

    return jsonResponse({
      success: true,
      message: `Bookmark saved: @${authorHandle}`,
      bookmark: result[0]
    }, 201);

  } catch (error) {
    console.error('Share bookmark error:', error);
    return errorResponse('Internal server error', 500);
  }
}
