import type { Context } from '@netlify/functions';
import { getDb, getUserIdFromContext, getUserEmailFromContext, ensureUser, jsonResponse, errorResponse, unauthorizedResponse } from './utils/db';

export default async function handler(req: Request, context: Context) {
  const sql = getDb();

  const netlifyUserId = getUserIdFromContext(context);
  const email = getUserEmailFromContext(context);

  if (!netlifyUserId || !email) {
    return unauthorizedResponse();
  }

  const userId = await ensureUser(sql, netlifyUserId, email);
  const url = new URL(req.url);
  const entryId = url.searchParams.get('id');
  const date = url.searchParams.get('date');

  try {
    switch (req.method) {
      case 'GET': {
        if (entryId) {
          // Get single entry
          const result = await sql`
            SELECT * FROM journal_entries WHERE id = ${entryId} AND user_id = ${userId}
          `;
          if (result.length === 0) {
            return errorResponse('Entry not found', 404);
          }
          return jsonResponse(result[0]);
        } else if (date) {
          // Get entry for specific date
          const result = await sql`
            SELECT * FROM journal_entries WHERE date = ${date} AND user_id = ${userId}
          `;
          return jsonResponse(result[0] || null);
        } else {
          // Get all entries (paginated)
          const limit = parseInt(url.searchParams.get('limit') || '30');
          const offset = parseInt(url.searchParams.get('offset') || '0');

          const entries = await sql`
            SELECT * FROM journal_entries
            WHERE user_id = ${userId}
            ORDER BY date DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
          return jsonResponse(entries);
        }
      }

      case 'POST': {
        const body = await req.json();
        const { date: entryDate, content, mood, energy, tags, promptUsed } = body;

        if (!entryDate || !content) {
          return errorResponse('date and content are required');
        }

        // Upsert - insert or update if exists for this date
        const result = await sql`
          INSERT INTO journal_entries (user_id, date, content, mood, energy, tags, prompt_used)
          VALUES (${userId}, ${entryDate}, ${content}, ${mood}, ${energy}, ${tags || []}, ${promptUsed})
          ON CONFLICT (user_id, date) DO UPDATE SET
            content = ${content},
            mood = ${mood},
            energy = ${energy},
            tags = ${tags || []},
            prompt_used = ${promptUsed}
          RETURNING *
        `;

        return jsonResponse(result[0], 201);
      }

      case 'PUT': {
        if (!entryId) {
          return errorResponse('Entry ID is required');
        }

        const body = await req.json();
        const { content, mood, energy, tags, promptUsed, aiReflection } = body;

        const result = await sql`
          UPDATE journal_entries
          SET
            content = COALESCE(${content}, content),
            mood = COALESCE(${mood}, mood),
            energy = COALESCE(${energy}, energy),
            tags = COALESCE(${tags}, tags),
            prompt_used = COALESCE(${promptUsed}, prompt_used),
            ai_reflection = COALESCE(${aiReflection}, ai_reflection)
          WHERE id = ${entryId} AND user_id = ${userId}
          RETURNING *
        `;

        if (result.length === 0) {
          return errorResponse('Entry not found', 404);
        }

        return jsonResponse(result[0]);
      }

      case 'DELETE': {
        if (!entryId) {
          return errorResponse('Entry ID is required');
        }

        await sql`
          DELETE FROM journal_entries WHERE id = ${entryId} AND user_id = ${userId}
        `;

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Journal API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
