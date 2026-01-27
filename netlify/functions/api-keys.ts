import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Generate a random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'dd_'; // daily-dashboard prefix
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

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

export default async function handler(req: Request, _context: Context) {
  const sql = getDb();
  const url = new URL(req.url);

  // Get userId from query parameter (same as sync endpoint)
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return errorResponse('userId parameter is required. Enable sync in Settings first.', 401);
  }

  // Verify user exists in database
  const userCheck = await sql`SELECT id FROM users WHERE id = ${userId} OR email = ${userId}`;
  if (userCheck.length === 0) {
    // Create user if not exists (using userId as both id and email placeholder)
    await sql`
      INSERT INTO users (id, email, name)
      VALUES (${userId}, ${userId}, ${userId.split('@')[0]})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Use the userId directly (it could be an email or custom ID)
  const effectiveUserId = userCheck.length > 0 ? userCheck[0].id : userId;

  const keyId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        // List all API keys for user (without the actual key hash)
        const keys = await sql`
          SELECT id, name, created_at, last_used_at
          FROM api_keys
          WHERE user_id = ${effectiveUserId}
          ORDER BY created_at DESC
        `;

        return jsonResponse({ keys });
      }

      case 'POST': {
        // Generate new API key
        const body = await req.json().catch(() => ({}));
        const { name } = body as { name?: string };

        const plainKey = generateApiKey();
        const keyHash = await hashApiKey(plainKey);
        const id = generateId();

        await sql`
          INSERT INTO api_keys (id, user_id, key_hash, name)
          VALUES (${id}, ${effectiveUserId}, ${keyHash}, ${name || 'Browser Extension'})
        `;

        // Return the plain key ONCE - it won't be retrievable again
        return jsonResponse({
          id,
          key: plainKey,
          name: name || 'Browser Extension',
          message: 'Save this key securely - it will not be shown again'
        }, 201);
      }

      case 'DELETE': {
        if (!keyId) {
          return errorResponse('Key ID is required');
        }

        const result = await sql`
          DELETE FROM api_keys
          WHERE id = ${keyId} AND user_id = ${effectiveUserId}
          RETURNING id
        `;

        if (result.length === 0) {
          return errorResponse('API key not found', 404);
        }

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('API Keys error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Export the hash function for use by bookmarks endpoint
export { hashApiKey };
