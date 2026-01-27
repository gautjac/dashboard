import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default async function handler(req: Request, _context: Context) {
  const sql = getDb();
  const url = new URL(req.url);

  // Get user ID from query params (for sync service compatibility)
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return errorResponse('User ID required', 401);
  }

  // GET - List quotes or get random quote
  if (req.method === 'GET') {
    try {
      const random = url.searchParams.get('random') === 'true';

      if (random) {
        // Get a random quote
        const quotes = await sql`
          SELECT id, text, author, created_at
          FROM quotes
          WHERE user_id = ${userId}
          ORDER BY RANDOM()
          LIMIT 1
        `;

        if (quotes.length === 0) {
          return jsonResponse({ quote: null });
        }

        return jsonResponse({
          quote: {
            id: quotes[0].id,
            text: quotes[0].text,
            author: quotes[0].author,
            createdAt: quotes[0].created_at,
          },
        });
      }

      // Get all quotes
      const quotes = await sql`
        SELECT id, text, author, created_at
        FROM quotes
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      return jsonResponse({
        quotes: quotes.map((q: any) => ({
          id: q.id,
          text: q.text,
          author: q.author,
          createdAt: q.created_at,
        })),
        total: quotes.length,
      });
    } catch (error) {
      console.error('Quotes fetch error:', error);
      return errorResponse('Failed to fetch quotes', 500);
    }
  }

  // POST - Create quote
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { text, author } = body;

      if (!text || !text.trim()) {
        return errorResponse('Quote text is required', 400);
      }

      const id = generateId();

      await sql`
        INSERT INTO quotes (id, user_id, text, author, created_at)
        VALUES (${id}, ${userId}, ${text.trim()}, ${author?.trim() || null}, NOW())
      `;

      const result = await sql`
        SELECT id, text, author, created_at
        FROM quotes
        WHERE id = ${id}
      `;

      return jsonResponse({
        quote: {
          id: result[0].id,
          text: result[0].text,
          author: result[0].author,
          createdAt: result[0].created_at,
        },
      }, 201);
    } catch (error) {
      console.error('Quote create error:', error);
      return errorResponse('Failed to create quote', 500);
    }
  }

  // PUT - Update quote
  if (req.method === 'PUT') {
    try {
      const quoteId = url.searchParams.get('id');
      if (!quoteId) {
        return errorResponse('Quote ID required', 400);
      }

      const body = await req.json();
      const { text, author } = body;

      if (!text || !text.trim()) {
        return errorResponse('Quote text is required', 400);
      }

      await sql`
        UPDATE quotes
        SET text = ${text.trim()}, author = ${author?.trim() || null}
        WHERE id = ${quoteId} AND user_id = ${userId}
      `;

      const result = await sql`
        SELECT id, text, author, created_at
        FROM quotes
        WHERE id = ${quoteId} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        return errorResponse('Quote not found', 404);
      }

      return jsonResponse({
        quote: {
          id: result[0].id,
          text: result[0].text,
          author: result[0].author,
          createdAt: result[0].created_at,
        },
      });
    } catch (error) {
      console.error('Quote update error:', error);
      return errorResponse('Failed to update quote', 500);
    }
  }

  // DELETE - Remove quote
  if (req.method === 'DELETE') {
    try {
      const quoteId = url.searchParams.get('id');
      if (!quoteId) {
        return errorResponse('Quote ID required', 400);
      }

      await sql`
        DELETE FROM quotes WHERE id = ${quoteId} AND user_id = ${userId}
      `;

      return jsonResponse({ success: true });
    } catch (error) {
      console.error('Quote delete error:', error);
      return errorResponse('Failed to delete quote', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
