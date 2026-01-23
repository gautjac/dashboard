import type { Context } from '@netlify/functions';
import { getDb, getUserIdFromContext, getUserEmailFromContext, ensureUser, jsonResponse, errorResponse, unauthorizedResponse } from './utils/db';

export default async function handler(req: Request, context: Context) {
  const sql = getDb();

  // Get user from Netlify Identity
  const netlifyUserId = getUserIdFromContext(context);
  const email = getUserEmailFromContext(context);

  if (!netlifyUserId || !email) {
    return unauthorizedResponse();
  }

  // Ensure user exists in database
  const userId = await ensureUser(sql, netlifyUserId, email);

  const url = new URL(req.url);
  const habitId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        // Get all habits for user (with completion stats)
        const habits = await sql`
          SELECT
            h.*,
            (
              SELECT COUNT(*) FROM habit_completions hc
              WHERE hc.habit_id = h.id
              AND hc.completed_at >= CURRENT_DATE - INTERVAL '7 days'
            ) as completions_last_7_days,
            (
              SELECT completed_at FROM habit_completions hc
              WHERE hc.habit_id = h.id
              ORDER BY completed_at DESC LIMIT 1
            ) as last_completed
          FROM habits h
          WHERE h.user_id = ${userId} AND h.is_archived = false
          ORDER BY h.created_at ASC
        `;

        // Get completions for the last 30 days
        const completions = await sql`
          SELECT hc.* FROM habit_completions hc
          JOIN habits h ON h.id = hc.habit_id
          WHERE h.user_id = ${userId}
          AND hc.completed_at >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY hc.completed_at DESC
        `;

        return jsonResponse({ habits, completions });
      }

      case 'POST': {
        const body = await req.json();
        const { name, description, icon, color, frequency, targetDays, reminderTime } = body;

        if (!name) {
          return errorResponse('Name is required');
        }

        const result = await sql`
          INSERT INTO habits (user_id, name, description, icon, color, frequency, target_days, reminder_time)
          VALUES (${userId}, ${name}, ${description}, ${icon}, ${color}, ${frequency || 'daily'}, ${targetDays}, ${reminderTime})
          RETURNING *
        `;

        return jsonResponse(result[0], 201);
      }

      case 'PUT': {
        if (!habitId) {
          return errorResponse('Habit ID is required');
        }

        const body = await req.json();
        const { name, description, icon, color, frequency, targetDays, reminderTime, isArchived } = body;

        const result = await sql`
          UPDATE habits
          SET
            name = COALESCE(${name}, name),
            description = COALESCE(${description}, description),
            icon = COALESCE(${icon}, icon),
            color = COALESCE(${color}, color),
            frequency = COALESCE(${frequency}, frequency),
            target_days = COALESCE(${targetDays}, target_days),
            reminder_time = COALESCE(${reminderTime}, reminder_time),
            is_archived = COALESCE(${isArchived}, is_archived)
          WHERE id = ${habitId} AND user_id = ${userId}
          RETURNING *
        `;

        if (result.length === 0) {
          return errorResponse('Habit not found', 404);
        }

        return jsonResponse(result[0]);
      }

      case 'DELETE': {
        if (!habitId) {
          return errorResponse('Habit ID is required');
        }

        await sql`
          DELETE FROM habits WHERE id = ${habitId} AND user_id = ${userId}
        `;

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Habits API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
