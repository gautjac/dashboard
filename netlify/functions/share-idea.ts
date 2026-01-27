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
    let ideaText = '';
    let category = '';
    const contentType = req.headers.get('content-type') || '';
    const rawBody = await req.text();

    console.log('Share idea - Content-Type:', contentType);
    console.log('Share idea - Raw body:', rawBody.substring(0, 500));

    // Try to parse as JSON first (most common from Shortcuts)
    if (rawBody.trim().startsWith('{')) {
      try {
        const body = JSON.parse(rawBody);
        // Handle various key names
        const getValue = (val: any): string => {
          if (typeof val === 'string') return val;
          if (Array.isArray(val)) return val[0] || '';
          return '';
        };
        ideaText = getValue(body.idea) || getValue(body.Idea) ||
                   getValue(body.text) || getValue(body.Text) ||
                   getValue(body.content) || getValue(body.Content) || '';
        category = getValue(body.category) || getValue(body.Category) || '';
      } catch (e) {
        console.log('JSON parse failed, using raw body');
        ideaText = rawBody;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data manually from raw body
      const params = new URLSearchParams(rawBody);
      ideaText = params.get('idea') || params.get('text') || params.get('content') || rawBody;
      category = params.get('category') || '';
    } else {
      // Plain text - the idea is directly in the body
      ideaText = rawBody;
    }

    if (!ideaText || !ideaText.trim()) {
      return errorResponse(`No idea text provided. Content-Type: ${contentType}, Body length: ${rawBody.length}`, 400);
    }

    // Log the input for debugging
    console.log('Share idea text:', JSON.stringify(ideaText));

    const id = generateId();

    // Insert idea
    const result = await sql`
      INSERT INTO ideas (id, user_id, text, category, created_at)
      VALUES (${id}, ${userId}, ${ideaText.trim()}, ${category.trim() || null}, NOW())
      RETURNING *
    `;

    return jsonResponse({
      success: true,
      message: 'Idea captured!',
      idea: {
        id: result[0].id,
        text: result[0].text,
        category: result[0].category,
        createdAt: result[0].created_at,
      }
    }, 201);

  } catch (error) {
    console.error('Share idea error:', error);
    return errorResponse('Internal server error', 500);
  }
}
