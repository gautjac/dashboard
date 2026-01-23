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

  try {
    switch (req.method) {
      case 'POST': {
        // Toggle completion for a habit on a date
        const body = await req.json();
        const { habitId, date, notes } = body;

        if (!habitId || !date) {
          return errorResponse('habitId and date are required');
        }

        // Check if completion exists
        const existing = await sql`
          SELECT id FROM habit_completions
          WHERE habit_id = ${habitId} AND completed_at = ${date}
        `;

        if (existing.length > 0) {
          // Remove completion (toggle off)
          await sql`
            DELETE FROM habit_completions WHERE id = ${existing[0].id}
          `;
          return jsonResponse({ completed: false, date });
        } else {
          // Add completion (toggle on)
          const result = await sql`
            INSERT INTO habit_completions (habit_id, user_id, completed_at, notes)
            VALUES (${habitId}, ${userId}, ${date}, ${notes})
            RETURNING *
          `;
          return jsonResponse({ completed: true, ...result[0] });
        }
      }

      case 'DELETE': {
        const url = new URL(req.url);
        const completionId = url.searchParams.get('id');

        if (!completionId) {
          return errorResponse('Completion ID is required');
        }

        await sql`
          DELETE FROM habit_completions
          WHERE id = ${completionId} AND user_id = ${userId}
        `;

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
