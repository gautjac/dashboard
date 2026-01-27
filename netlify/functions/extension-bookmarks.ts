import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

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

// Extract URLs from tweet text
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.match(urlRegex) || [];
}

// Fetch content from a URL (for external links)
async function fetchPageContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    // Skip t.co links - these are just redirects
    if (url.includes('t.co/')) {
      return null;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 6000);

    return { title, content };
  } catch (err) {
    console.error('Failed to fetch URL:', err);
    return null;
  }
}

// Fetch content using Jina.ai reader API (handles JS-heavy sites)
async function fetchWithJinaReader(url: string): Promise<{ title: string; content: string } | null> {
  try {
    // Jina.ai reader API renders JavaScript and returns markdown
    const jinaUrl = `https://r.jina.ai/${url}`;

    console.log('Fetching with Jina reader:', url);

    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
      },
    });

    if (!response.ok) {
      console.log('Jina reader failed, status:', response.status);
      return null;
    }

    const text = await response.text();

    // Jina returns markdown with a Title: line at the top
    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Remove the metadata header (Title:, URL:, etc.) and get the content
    const contentStart = text.indexOf('\n\n');
    const content = contentStart > 0 ? text.substring(contentStart + 2).trim() : text;

    console.log('Jina reader content fetched:', {
      title,
      contentLength: content.length,
      preview: content.substring(0, 150)
    });

    // Only return if we got meaningful content
    if (content.length > 100) {
      return { title, content: content.substring(0, 8000) };
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch with Jina reader:', err);
    return null;
  }
}

// Fetch content from X/Twitter post URL - tries multiple methods
async function fetchXPostContent(url: string): Promise<{ title: string; content: string } | null> {
  // Method 1: Try oEmbed first (fast, works for regular tweets)
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;

    const response = await fetch(oembedUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const html = data.html || '';
      const authorName = data.author_name || '';

      // Parse the blockquote content
      const tweetTextMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      let tweetText = tweetTextMatch ? tweetTextMatch[1] : '';

      // Clean up HTML entities and tags
      tweetText = tweetText
        .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();

      console.log('oEmbed content fetched:', {
        authorName,
        tweetTextLength: tweetText.length,
        preview: tweetText.substring(0, 100)
      });

      // If oEmbed returned decent content, use it
      if (tweetText.length > 100) {
        return { title: `Post by ${authorName}`, content: tweetText };
      }

      console.log('oEmbed content too short, trying Jina reader...');
    }
  } catch (err) {
    console.log('oEmbed failed, trying Jina reader...', err);
  }

  // Method 2: Use Jina.ai reader as fallback (handles X Articles and JS-heavy content)
  return await fetchWithJinaReader(url);
}

// Generate summary using Claude
async function generateBookmarkSummary(
  tweetText: string,
  authorHandle: string,
  tweetUrl: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API not configured');
  }

  let contentToAnalyze = tweetText || '';
  let linkedContent = '';
  let postTitle = '';

  // If tweet text is empty or very short, try to fetch the X post directly
  if (!tweetText || tweetText.trim().length < 50) {
    console.log('Tweet text is empty/short, fetching X post content...');
    const xPostData = await fetchXPostContent(tweetUrl);
    if (xPostData) {
      postTitle = xPostData.title;
      contentToAnalyze = xPostData.content;
      console.log('Fetched X post content:', { title: postTitle, contentLength: contentToAnalyze.length });
    }
  }

  // Extract URLs from content and try to fetch linked articles
  const urls = extractUrls(contentToAnalyze);
  for (const url of urls.slice(0, 2)) {
    // Skip X/Twitter URLs since we already have that content
    if (url.includes('twitter.com') || url.includes('x.com') || url.includes('t.co')) {
      continue;
    }
    const pageData = await fetchPageContent(url);
    if (pageData) {
      linkedContent += `\n\nLinked article "${pageData.title}":\n${pageData.content.substring(0, 3000)}`;
    }
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: 'You are a helpful assistant that analyzes social media posts and linked content. Provide insightful summaries that explain both what the content is about and why it might be valuable or interesting.',
      messages: [{
        role: 'user',
        content: `Analyze this X/Twitter post and any linked content. Provide:
1. A brief summary of what the post/content is about (2-3 sentences)
2. Why this might be important or interesting (1-2 sentences)

Post by @${authorHandle}:
${postTitle ? `Title: "${postTitle}"\n` : ''}
Content:
${contentToAnalyze.substring(0, 5000)}

Post URL: ${tweetUrl}
${linkedContent ? linkedContent : ''}

Write your analysis in a conversational, helpful tone. Focus on the substance and value of the content. If this appears to be an X Article (long-form content), summarize the key points.`
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Anthropic API error:', error);
    throw new Error('Failed to generate summary');
  }

  const data = await response.json();
  const textBlock = data.content?.find((c: any) => c.type === 'text');
  return textBlock?.text || 'Unable to generate summary';
}

// Validate API key and return user ID
async function validateApiKey(sql: ReturnType<typeof getDb>, apiKey: string): Promise<string | null> {
  const keyHash = await hashApiKey(apiKey);

  console.log('Validating API key:', {
    keyPrefix: apiKey.substring(0, 10) + '...',
    hashPrefix: keyHash.substring(0, 16) + '...'
  });

  const result = await sql`
    SELECT user_id, id FROM api_keys WHERE key_hash = ${keyHash}
  `;

  console.log('API key lookup result:', { found: result.length > 0 });

  if (result.length === 0) {
    // Log all stored hashes for debugging
    const allKeys = await sql`SELECT id, key_hash, user_id FROM api_keys LIMIT 5`;
    console.log('Stored keys:', allKeys.map((k: any) => ({
      id: k.id,
      hashPrefix: k.key_hash?.substring(0, 16) + '...',
      userId: k.user_id
    })));
    return null;
  }

  // Update last_used_at
  await sql`
    UPDATE api_keys SET last_used_at = NOW() WHERE id = ${result[0].id}
  `;

  return result[0].user_id;
}

export default async function handler(req: Request, _context: Context) {
  const sql = getDb();
  const url = new URL(req.url);

  // Check for API key auth (from extension)
  const apiKey = req.headers.get('X-API-Key');
  // Check for userId query param (from dashboard)
  const queryUserId = url.searchParams.get('userId');

  let userId: string | null = null;

  if (apiKey) {
    // Extension auth via API key
    userId = await validateApiKey(sql, apiKey);
    if (!userId) {
      return errorResponse('Invalid API key', 401);
    }
  } else if (queryUserId) {
    // Dashboard auth via userId (same as sync)
    userId = queryUserId;
  } else {
    return errorResponse('API key or userId required', 401);
  }

  const bookmarkId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        // Fetch bookmarks for user
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const archived = url.searchParams.get('archived') === 'true';

        const bookmarks = archived
          ? await sql`
              SELECT id, tweet_id, tweet_url, author_handle, author_name, tweet_text, media_urls, bookmarked_at, archived_at, summary
              FROM extension_bookmarks
              WHERE user_id = ${userId} AND archived_at IS NOT NULL
              ORDER BY archived_at DESC
              LIMIT ${limit}
              OFFSET ${offset}
            `
          : await sql`
              SELECT id, tweet_id, tweet_url, author_handle, author_name, tweet_text, media_urls, bookmarked_at, archived_at, summary
              FROM extension_bookmarks
              WHERE user_id = ${userId} AND archived_at IS NULL
              ORDER BY bookmarked_at DESC
              LIMIT ${limit}
              OFFSET ${offset}
            `;

        const countResult = archived
          ? await sql`
              SELECT COUNT(*) as total FROM extension_bookmarks
              WHERE user_id = ${userId} AND archived_at IS NOT NULL
            `
          : await sql`
              SELECT COUNT(*) as total FROM extension_bookmarks
              WHERE user_id = ${userId} AND archived_at IS NULL
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

      case 'PUT': {
        if (!bookmarkId) {
          return errorResponse('Bookmark ID is required');
        }

        const body = await req.json();
        const { action } = body;

        if (action === 'summarize') {
          // Get the bookmark
          const bookmarks = await sql`
            SELECT tweet_text, author_handle, tweet_url
            FROM extension_bookmarks
            WHERE id = ${bookmarkId} AND user_id = ${userId}
          `;

          if (bookmarks.length === 0) {
            return errorResponse('Bookmark not found', 404);
          }

          const bookmark = bookmarks[0];

          // Generate summary
          const summary = await generateBookmarkSummary(
            bookmark.tweet_text || '',
            bookmark.author_handle || 'unknown',
            bookmark.tweet_url
          );

          // Update bookmark with summary
          await sql`
            UPDATE extension_bookmarks
            SET summary = ${summary}
            WHERE id = ${bookmarkId} AND user_id = ${userId}
          `;

          // Return updated bookmark
          const result = await sql`
            SELECT id, tweet_id, tweet_url, author_handle, author_name, tweet_text, media_urls, bookmarked_at, archived_at, summary
            FROM extension_bookmarks
            WHERE id = ${bookmarkId} AND user_id = ${userId}
          `;

          return jsonResponse({ bookmark: result[0] });
        }

        if (action === 'archive') {
          await sql`
            UPDATE extension_bookmarks
            SET archived_at = NOW()
            WHERE id = ${bookmarkId} AND user_id = ${userId}
          `;
          return jsonResponse({ success: true });
        }

        if (action === 'restore') {
          await sql`
            UPDATE extension_bookmarks
            SET archived_at = NULL
            WHERE id = ${bookmarkId} AND user_id = ${userId}
          `;
          return jsonResponse({ success: true });
        }

        return errorResponse('Invalid action', 400);
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
