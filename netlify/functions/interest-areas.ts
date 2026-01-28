import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Generate a unique ID
function generateId(): string {
  return `interest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Map database row to frontend format
function mapInterestAreaFromDb(row: any) {
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords || [],
    sources: row.sources || [],
    enabled: row.enabled ?? true,
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

  const areaId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        // Get all interest areas for user
        const areas = await sql`
          SELECT * FROM interest_areas
          WHERE user_id = ${normalizedUserId}
          ORDER BY name ASC
        `;

        return jsonResponse({
          interestAreas: areas.map(mapInterestAreaFromDb),
        });
      }

      case 'POST': {
        const body = await req.json();
        const { id, name, keywords, sources, enabled } = body;

        if (!name) {
          return errorResponse('name is required');
        }

        const areaIdToUse = id || generateId();

        const result = await sql`
          INSERT INTO interest_areas (id, user_id, name, keywords, sources, enabled)
          VALUES (
            ${areaIdToUse},
            ${normalizedUserId},
            ${name},
            ${keywords || []},
            ${sources || []},
            ${enabled !== undefined ? enabled : true}
          )
          RETURNING *
        `;

        return jsonResponse({
          interestArea: mapInterestAreaFromDb(result[0]),
        }, 201);
      }

      case 'PUT': {
        if (!areaId) {
          return errorResponse('Interest area ID is required');
        }

        const body = await req.json();
        const { name, keywords, sources, enabled } = body;

        const result = await sql`
          UPDATE interest_areas
          SET
            name = COALESCE(${name}, name),
            keywords = COALESCE(${keywords}, keywords),
            sources = COALESCE(${sources}, sources),
            enabled = COALESCE(${enabled}, enabled)
          WHERE id = ${areaId} AND user_id = ${normalizedUserId}
          RETURNING *
        `;

        if (result.length === 0) {
          return errorResponse('Interest area not found', 404);
        }

        return jsonResponse({
          interestArea: mapInterestAreaFromDb(result[0]),
        });
      }

      case 'DELETE': {
        if (!areaId) {
          return errorResponse('Interest area ID is required');
        }

        await sql`
          DELETE FROM interest_areas WHERE id = ${areaId} AND user_id = ${normalizedUserId}
        `;

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Interest areas API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
