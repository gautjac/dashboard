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
  const date = url.searchParams.get('date');

  try {
    switch (req.method) {
      case 'GET': {
        if (date) {
          const result = await sql`
            SELECT * FROM focus_lines WHERE date = ${date} AND user_id = ${userId}
          `;
          return jsonResponse(result[0] || null);
        } else {
          // Get recent focus lines
          const limit = parseInt(url.searchParams.get('limit') || '7');
          const result = await sql`
            SELECT * FROM focus_lines
            WHERE user_id = ${userId}
            ORDER BY date DESC
            LIMIT ${limit}
          `;
          return jsonResponse(result);
        }
      }

      case 'POST': {
        const body = await req.json();
        const { date: lineDate, content } = body;

        if (!lineDate || !content) {
          return errorResponse('date and content are required');
        }

        // Upsert - one focus line per day
        const result = await sql`
          INSERT INTO focus_lines (user_id, date, content)
          VALUES (${userId}, ${lineDate}, ${content})
          ON CONFLICT (user_id, date) DO UPDATE SET content = ${content}
          RETURNING *
        `;

        return jsonResponse(result[0], 201);
      }

      case 'DELETE': {
        if (!date) {
          return errorResponse('date is required');
        }

        await sql`
          DELETE FROM focus_lines WHERE date = ${date} AND user_id = ${userId}
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
