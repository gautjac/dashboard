import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Generate a unique ID
function generateId(): string {
  return `completion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Map database row to frontend format
function mapCompletionFromDb(row: any) {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    completed: row.completed,
    value: row.value || undefined,
    note: row.note || undefined,
    timestamp: row.timestamp,
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

  try {
    switch (req.method) {
      case 'GET': {
        // Get completions for user (last N days)
        const days = parseInt(url.searchParams.get('days') || '30');
        const habitId = url.searchParams.get('habitId');

        let completions;
        if (habitId) {
          completions = await sql`
            SELECT * FROM habit_completions
            WHERE user_id = ${normalizedUserId}
            AND habit_id = ${habitId}
            AND date >= CURRENT_DATE - ${days}
            ORDER BY date DESC
          `;
        } else {
          completions = await sql`
            SELECT * FROM habit_completions
            WHERE user_id = ${normalizedUserId}
            AND date >= CURRENT_DATE - ${days}
            ORDER BY date DESC
          `;
        }

        return jsonResponse({
          completions: completions.map(mapCompletionFromDb),
        });
      }

      case 'POST': {
        // Toggle or set completion for a habit on a date
        const body = await req.json();
        const { id, habitId, date, completed, value, note, timestamp } = body;

        if (!habitId || !date) {
          return errorResponse('habitId and date are required');
        }

        // Check if completion exists for this habit/date
        const existing = await sql`
          SELECT * FROM habit_completions
          WHERE habit_id = ${habitId} AND date = ${date}
        `;

        if (existing.length > 0) {
          // Update existing completion
          if (completed === false && !value) {
            // Remove completion (toggle off)
            await sql`
              DELETE FROM habit_completions WHERE id = ${existing[0].id}
            `;
            return jsonResponse({ deleted: true, date });
          } else {
            // Update completion
            const result = await sql`
              UPDATE habit_completions
              SET
                completed = COALESCE(${completed}, completed),
                value = COALESCE(${value}, value),
                note = COALESCE(${note}, note),
                timestamp = NOW()
              WHERE id = ${existing[0].id}
              RETURNING *
            `;
            return jsonResponse({
              completion: mapCompletionFromDb(result[0]),
            });
          }
        } else {
          // Create new completion
          const completionId = id || generateId();
          const timestampToUse = timestamp || new Date().toISOString();

          const result = await sql`
            INSERT INTO habit_completions (
              id, habit_id, user_id, date, completed, value, note, timestamp
            )
            VALUES (
              ${completionId},
              ${habitId},
              ${normalizedUserId},
              ${date},
              ${completed !== undefined ? completed : true},
              ${value || null},
              ${note || null},
              ${timestampToUse}
            )
            RETURNING *
          `;

          return jsonResponse({
            completion: mapCompletionFromDb(result[0]),
          }, 201);
        }
      }

      case 'DELETE': {
        const completionId = url.searchParams.get('id');
        const habitId = url.searchParams.get('habitId');
        const date = url.searchParams.get('date');

        if (completionId) {
          // Delete by ID
          await sql`
            DELETE FROM habit_completions
            WHERE id = ${completionId} AND user_id = ${normalizedUserId}
          `;
        } else if (habitId && date) {
          // Delete by habit and date
          await sql`
            DELETE FROM habit_completions
            WHERE habit_id = ${habitId} AND date = ${date} AND user_id = ${normalizedUserId}
          `;
        } else {
          return errorResponse('id or (habitId and date) is required');
        }

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Habit completions API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
