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

// Extract URL from shared text
function extractUrl(input: string): string | null {
  // Handle various formats:
  // - Direct URL: https://example.com/page
  // - Shared text that contains a URL
  // - URL with title: "Title - https://example.com"

  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/i;
  const match = input.match(urlPattern);

  if (match) {
    // Clean up the URL (remove trailing punctuation that might have been captured)
    let url = match[0];
    url = url.replace(/[.,;:!?)]+$/, '');
    return url;
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
    // Accept various input formats - iOS Shortcuts can be unpredictable
    let input = '';
    const contentType = req.headers.get('content-type') || '';
    const rawBody = await req.text();

    console.log('Share link - Content-Type:', contentType);
    console.log('Share link - Raw body:', rawBody.substring(0, 500));

    // Try to parse as JSON first (most common from Shortcuts)
    if (rawBody.trim().startsWith('{')) {
      try {
        const body = JSON.parse(rawBody);
        // Handle various key names, arrays, and nested values
        const getValue = (val: any): string => {
          if (typeof val === 'string') return val;
          if (Array.isArray(val)) return val[0] || '';
          return '';
        };
        input = getValue(body.url) || getValue(body.URL) ||
                getValue(body.text) || getValue(body.Text) ||
                getValue(body.content) || getValue(body.Content) ||
                getValue(body.key) || getValue(body.Key) || '';
      } catch (e) {
        console.log('JSON parse failed, using raw body');
        input = rawBody;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data manually from raw body
      const params = new URLSearchParams(rawBody);
      input = params.get('url') || params.get('text') || params.get('content') || rawBody;
    } else {
      // Plain text - the URL might be directly in the body
      input = rawBody;
    }

    if (!input || !input.trim()) {
      return errorResponse(`No URL or text provided. Content-Type: ${contentType}, Body length: ${rawBody.length}`, 400);
    }

    // Log the input for debugging
    console.log('Share link input:', JSON.stringify(input));

    // Extract URL from input
    const linkUrl = extractUrl(input);
    if (!linkUrl) {
      return errorResponse(`Could not find a valid URL. Received: "${input.substring(0, 200)}"`, 400);
    }

    const id = generateId();

    // Upsert link
    const result = await sql`
      INSERT INTO links (id, user_id, url, saved_at)
      VALUES (${id}, ${userId}, ${linkUrl}, NOW())
      ON CONFLICT (user_id, url) DO UPDATE SET
        saved_at = NOW()
      RETURNING *
    `;

    return jsonResponse({
      success: true,
      message: `Link saved`,
      link: {
        id: result[0].id,
        url: result[0].url,
        title: result[0].title,
        summary: result[0].summary,
        savedAt: result[0].saved_at,
      }
    }, 201);

  } catch (error) {
    console.error('Share link error:', error);
    return errorResponse('Internal server error', 500);
  }
}
