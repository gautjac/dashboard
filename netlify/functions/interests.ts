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
  const interestId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        const result = await sql`
          SELECT * FROM interest_areas
          WHERE user_id = ${userId}
          ORDER BY created_at ASC
        `;
        return jsonResponse(result);
      }

      case 'POST': {
        const body = await req.json();
        const { name, keywords, enabled } = body;

        if (!name) {
          return errorResponse('name is required');
        }

        const result = await sql`
          INSERT INTO interest_areas (user_id, name, keywords, enabled)
          VALUES (${userId}, ${name}, ${keywords || []}, ${enabled !== false})
          RETURNING *
        `;

        return jsonResponse(result[0], 201);
      }

      case 'PUT': {
        if (!interestId) {
          return errorResponse('Interest ID is required');
        }

        const body = await req.json();
        const { name, keywords, enabled } = body;

        const result = await sql`
          UPDATE interest_areas
          SET
            name = COALESCE(${name}, name),
            keywords = COALESCE(${keywords}, keywords),
            enabled = COALESCE(${enabled}, enabled)
          WHERE id = ${interestId} AND user_id = ${userId}
          RETURNING *
        `;

        if (result.length === 0) {
          return errorResponse('Interest not found', 404);
        }

        return jsonResponse(result[0]);
      }

      case 'DELETE': {
        if (!interestId) {
          return errorResponse('Interest ID is required');
        }

        await sql`
          DELETE FROM interest_areas WHERE id = ${interestId} AND user_id = ${userId}
        `;

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Interests API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
