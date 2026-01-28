import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Generate a unique ID
function generateId(): string {
  return `journal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Map database row to frontend format
function mapEntryFromDb(row: any) {
  return {
    id: row.id,
    date: row.date,
    content: row.content,
    mood: row.mood || undefined,
    energy: row.energy || undefined,
    tags: row.tags || [],
    promptUsed: row.prompt_used || undefined,
    aiReflection: row.ai_reflection || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function handler(req: Request, _context: Context) {
  const sql = getDb();
  const url = new URL(req.url);

  // Get userId from query parameters
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return errorResponse('userId is required', 401);
  }

  // Normalize userId to lowercase
  const normalizedUserId = userId.toLowerCase().trim();

  const entryId = url.searchParams.get('id');
  const date = url.searchParams.get('date');

  try {
    switch (req.method) {
      case 'GET': {
        if (entryId) {
          // Get single entry by ID
          const result = await sql`
            SELECT * FROM journal_entries WHERE id = ${entryId} AND user_id = ${normalizedUserId}
          `;
          if (result.length === 0) {
            return errorResponse('Entry not found', 404);
          }
          return jsonResponse({
            entry: mapEntryFromDb(result[0]),
          });
        } else if (date) {
          // Get entry for specific date
          const result = await sql`
            SELECT * FROM journal_entries WHERE date = ${date} AND user_id = ${normalizedUserId}
          `;
          return jsonResponse({
            entry: result.length > 0 ? mapEntryFromDb(result[0]) : null,
          });
        } else {
          // Get all entries (paginated)
          const limit = parseInt(url.searchParams.get('limit') || '365');
          const offset = parseInt(url.searchParams.get('offset') || '0');

          const entries = await sql`
            SELECT * FROM journal_entries
            WHERE user_id = ${normalizedUserId}
            ORDER BY date DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

          return jsonResponse({
            entries: entries.map(mapEntryFromDb),
          });
        }
      }

      case 'POST': {
        const body = await req.json();
        const { id, date: entryDate, content, mood, energy, tags, promptUsed, createdAt, updatedAt } = body;

        if (!entryDate || !content) {
          return errorResponse('date and content are required');
        }

        const entryIdToUse = id || generateId();
        const now = new Date().toISOString();
        const createdAtToUse = createdAt || now;
        const updatedAtToUse = updatedAt || now;

        // Upsert - insert or update if exists for this date
        const result = await sql`
          INSERT INTO journal_entries (
            id, user_id, date, content, mood, energy, tags, prompt_used, created_at, updated_at
          )
          VALUES (
            ${entryIdToUse},
            ${normalizedUserId},
            ${entryDate},
            ${content},
            ${mood || null},
            ${energy || null},
            ${tags || []},
            ${promptUsed || null},
            ${createdAtToUse},
            ${updatedAtToUse}
          )
          ON CONFLICT (user_id, date) DO UPDATE SET
            content = ${content},
            mood = ${mood || null},
            energy = ${energy || null},
            tags = ${tags || []},
            prompt_used = ${promptUsed || null},
            updated_at = NOW()
          RETURNING *
        `;

        return jsonResponse({
          entry: mapEntryFromDb(result[0]),
        }, 201);
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
            ai_reflection = COALESCE(${aiReflection}, ai_reflection),
            updated_at = NOW()
          WHERE id = ${entryId} AND user_id = ${normalizedUserId}
          RETURNING *
        `;

        if (result.length === 0) {
          return errorResponse('Entry not found', 404);
        }

        return jsonResponse({
          entry: mapEntryFromDb(result[0]),
        });
      }

      case 'DELETE': {
        if (!entryId) {
          return errorResponse('Entry ID is required');
        }

        await sql`
          DELETE FROM journal_entries WHERE id = ${entryId} AND user_id = ${normalizedUserId}
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
