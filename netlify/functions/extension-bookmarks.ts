import type { Context } from '@netlify/functions';
import { getDb, getUserIdFromContext, getUserEmailFromContext, ensureUser, jsonResponse, errorResponse, unauthorizedResponse } from './utils/db';

// Hash API key using SHA-256 (same as in api-keys.ts)
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

export default async function handler(req: Request, context: Context) {
  const sql = getDb();

  // Check for API key auth (from extension)
  const apiKey = req.headers.get('X-API-Key');

  let userId: string | null = null;

  if (apiKey) {
    // Extension auth via API key
    userId = await validateApiKey(sql, apiKey);
    if (!userId) {
      return errorResponse('Invalid API key', 401);
    }
  } else {
    // Dashboard auth via Netlify Identity
    const netlifyUserId = getUserIdFromContext(context);
    const email = getUserEmailFromContext(context);

    if (!netlifyUserId || !email) {
      return unauthorizedResponse();
    }

    userId = await ensureUser(sql, netlifyUserId, email);
  }

  const url = new URL(req.url);
  const bookmarkId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        // Fetch bookmarks for user
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        const bookmarks = await sql`
          SELECT id, tweet_id, tweet_url, author_handle, author_name, tweet_text, media_urls, bookmarked_at
          FROM extension_bookmarks
          WHERE user_id = ${userId}
          ORDER BY bookmarked_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

        const countResult = await sql`
          SELECT COUNT(*) as total FROM extension_bookmarks WHERE user_id = ${userId}
        `;

        return jsonResponse({
          bookmarks,
          total: parseInt(countResult[0].total, 10),
          limit,
          offset
        });
      }

      case 'POST': {
        // Add bookmark (from extension)
        const body = await req.json();

        // Support both single bookmark and batch
        const bookmarksToAdd = Array.isArray(body) ? body : [body];

        const results = [];

        for (const bookmark of bookmarksToAdd) {
          const { tweetId, tweetUrl, authorHandle, authorName, tweetText, mediaUrls } = bookmark;

          if (!tweetId || !tweetUrl) {
            continue; // Skip invalid bookmarks
          }

          const id = generateId();

          // Upsert - ignore if already exists
          const result = await sql`
            INSERT INTO extension_bookmarks (id, user_id, tweet_id, tweet_url, author_handle, author_name, tweet_text, media_urls)
            VALUES (${id}, ${userId}, ${tweetId}, ${tweetUrl}, ${authorHandle}, ${authorName}, ${tweetText}, ${mediaUrls || []})
            ON CONFLICT (user_id, tweet_id) DO UPDATE SET
              tweet_url = EXCLUDED.tweet_url,
              author_handle = EXCLUDED.author_handle,
              author_name = EXCLUDED.author_name,
              tweet_text = EXCLUDED.tweet_text,
              media_urls = EXCLUDED.media_urls
            RETURNING *
          `;

          results.push(result[0]);
        }

        return jsonResponse({
          success: true,
          added: results.length,
          bookmarks: results
        }, 201);
      }

      case 'DELETE': {
        if (!bookmarkId) {
          return errorResponse('Bookmark ID is required');
        }

        const result = await sql`
          DELETE FROM extension_bookmarks
          WHERE id = ${bookmarkId} AND user_id = ${userId}
          RETURNING id
        `;

        if (result.length === 0) {
          return errorResponse('Bookmark not found', 404);
        }

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Extension bookmarks error:', error);
    return errorResponse('Internal server error', 500);
  }
}
