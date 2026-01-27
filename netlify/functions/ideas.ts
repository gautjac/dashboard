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

  // GET - List ideas
  if (req.method === 'GET') {
    try {
      const archived = url.searchParams.get('archived') === 'true';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);

      let ideas;
      if (archived) {
        ideas = await sql`
          SELECT id, text, category, archived_at, created_at
          FROM ideas
          WHERE user_id = ${userId} AND archived_at IS NOT NULL
          ORDER BY archived_at DESC
          LIMIT ${limit}
        `;
      } else {
        ideas = await sql`
          SELECT id, text, category, created_at
          FROM ideas
          WHERE user_id = ${userId} AND archived_at IS NULL
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      }

      return jsonResponse({
        ideas: ideas.map((i: any) => ({
          id: i.id,
          text: i.text,
          category: i.category,
          archivedAt: i.archived_at,
          createdAt: i.created_at,
        })),
        total: ideas.length,
      });
    } catch (error) {
      console.error('Ideas fetch error:', error);
      return errorResponse('Failed to fetch ideas', 500);
    }
  }

  // POST - Create idea
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { text, category } = body;

      if (!text || !text.trim()) {
        return errorResponse('Idea text is required', 400);
      }

      const id = generateId();

      await sql`
        INSERT INTO ideas (id, user_id, text, category, created_at)
        VALUES (${id}, ${userId}, ${text.trim()}, ${category?.trim() || null}, NOW())
      `;

      const result = await sql`
        SELECT id, text, category, created_at
        FROM ideas
        WHERE id = ${id}
      `;

      return jsonResponse({
        idea: {
          id: result[0].id,
          text: result[0].text,
          category: result[0].category,
          createdAt: result[0].created_at,
        },
      }, 201);
    } catch (error) {
      console.error('Idea create error:', error);
      return errorResponse('Failed to create idea', 500);
    }
  }

  // PUT - Update idea (archive/restore/edit)
  if (req.method === 'PUT') {
    try {
      const ideaId = url.searchParams.get('id');
      if (!ideaId) {
        return errorResponse('Idea ID required', 400);
      }

      const body = await req.json();
      const { text, category, action } = body;

      if (action === 'archive') {
        await sql`
          UPDATE ideas
          SET archived_at = NOW()
          WHERE id = ${ideaId} AND user_id = ${userId}
        `;
      } else if (action === 'restore') {
        await sql`
          UPDATE ideas
          SET archived_at = NULL
          WHERE id = ${ideaId} AND user_id = ${userId}
        `;
      } else {
        // Regular update
        if (!text || !text.trim()) {
          return errorResponse('Idea text is required', 400);
        }

        await sql`
          UPDATE ideas
          SET text = ${text.trim()}, category = ${category?.trim() || null}
          WHERE id = ${ideaId} AND user_id = ${userId}
        `;
      }

      const result = await sql`
        SELECT id, text, category, archived_at, created_at
        FROM ideas
        WHERE id = ${ideaId} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        return errorResponse('Idea not found', 404);
      }

      return jsonResponse({
        idea: {
          id: result[0].id,
          text: result[0].text,
          category: result[0].category,
          archivedAt: result[0].archived_at,
          createdAt: result[0].created_at,
        },
      });
    } catch (error) {
      console.error('Idea update error:', error);
      return errorResponse('Failed to update idea', 500);
    }
  }

  // DELETE - Remove idea
  if (req.method === 'DELETE') {
    try {
      const ideaId = url.searchParams.get('id');
      if (!ideaId) {
        return errorResponse('Idea ID required', 400);
      }

      await sql`
        DELETE FROM ideas WHERE id = ${ideaId} AND user_id = ${userId}
      `;

      return jsonResponse({ success: true });
    } catch (error) {
      console.error('Idea delete error:', error);
      return errorResponse('Failed to delete idea', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
