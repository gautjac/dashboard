import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Generate a unique ID
function generateId(): string {
  return `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Map database row to frontend format
function mapFocusLineFromDb(row: any) {
  return {
    id: row.id,
    date: row.date,
    text: row.text,
    createdAt: row.created_at,
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

  const date = url.searchParams.get('date');

  try {
    switch (req.method) {
      case 'GET': {
        if (date) {
          // Get focus line for specific date
          const result = await sql`
            SELECT * FROM focus_lines WHERE date = ${date} AND user_id = ${normalizedUserId}
          `;
          return jsonResponse({
            focusLine: result.length > 0 ? mapFocusLineFromDb(result[0]) : null,
          });
        } else {
          // Get recent focus lines
          const limit = parseInt(url.searchParams.get('limit') || '30');
          const result = await sql`
            SELECT * FROM focus_lines
            WHERE user_id = ${normalizedUserId}
            ORDER BY date DESC
            LIMIT ${limit}
          `;
          return jsonResponse({
            focusLines: result.map(mapFocusLineFromDb),
          });
        }
      }

      case 'POST': {
        const body = await req.json();
        const { id, date: lineDate, text, createdAt } = body;

        if (!lineDate || !text) {
          return errorResponse('date and text are required');
        }

        const focusIdToUse = id || generateId();
        const createdAtToUse = createdAt || new Date().toISOString();

        // Upsert - one focus line per day
        const result = await sql`
          INSERT INTO focus_lines (id, user_id, date, text, created_at)
          VALUES (${focusIdToUse}, ${normalizedUserId}, ${lineDate}, ${text}, ${createdAtToUse})
          ON CONFLICT (user_id, date) DO UPDATE SET text = ${text}
          RETURNING *
        `;

        return jsonResponse({
          focusLine: mapFocusLineFromDb(result[0]),
        }, 201);
      }

      case 'DELETE': {
        if (!date) {
          return errorResponse('date is required');
        }

        await sql`
          DELETE FROM focus_lines WHERE date = ${date} AND user_id = ${normalizedUserId}
        `;

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Focus lines API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
