import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Generate a unique ID
function generateId(): string {
  return `habit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to ensure user exists
async function ensureUserExists(sql: ReturnType<typeof getDb>, userId: string) {
  const existing = await sql`SELECT id FROM users WHERE id = ${userId}`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO users (id, email)
      VALUES (${userId}, ${userId})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  return userId;
}

// Map database row to frontend format
function mapHabitFromDb(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    schedule: row.schedule,
    customDays: row.custom_days || undefined,
    targetType: row.target_type,
    targetValue: row.target_value || undefined,
    targetUnit: row.target_unit || undefined,
    tags: row.tags || [],
    color: row.color || undefined,
    icon: row.icon || undefined,
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

  // Ensure user exists
  await ensureUserExists(sql, normalizedUserId);

  const habitId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        // Get all habits for user
        const habits = await sql`
          SELECT * FROM habits
          WHERE user_id = ${normalizedUserId}
          ORDER BY created_at ASC
        `;

        return jsonResponse({
          habits: habits.map(mapHabitFromDb),
        });
      }

      case 'POST': {
        const body = await req.json();
        const {
          id,
          name,
          description,
          schedule,
          customDays,
          targetType,
          targetValue,
          targetUnit,
          tags,
          color,
          icon,
          createdAt,
        } = body;

        if (!name) {
          return errorResponse('name is required');
        }

        const habitIdToUse = id || generateId();
        const createdAtToUse = createdAt || new Date().toISOString();

        const result = await sql`
          INSERT INTO habits (
            id, user_id, name, description, schedule, custom_days,
            target_type, target_value, target_unit, tags, color, icon, created_at
          )
          VALUES (
            ${habitIdToUse},
            ${normalizedUserId},
            ${name},
            ${description || null},
            ${schedule || 'daily'},
            ${customDays || null},
            ${targetType || 'binary'},
            ${targetValue || null},
            ${targetUnit || null},
            ${tags || []},
            ${color || null},
            ${icon || null},
            ${createdAtToUse}
          )
          RETURNING *
        `;

        return jsonResponse({
          habit: mapHabitFromDb(result[0]),
        }, 201);
      }

      case 'PUT': {
        if (!habitId) {
          return errorResponse('Habit ID is required');
        }

        const body = await req.json();
        const {
          name,
          description,
          schedule,
          customDays,
          targetType,
          targetValue,
          targetUnit,
          tags,
          color,
          icon,
        } = body;

        const result = await sql`
          UPDATE habits
          SET
            name = COALESCE(${name}, name),
            description = COALESCE(${description}, description),
            schedule = COALESCE(${schedule}, schedule),
            custom_days = COALESCE(${customDays}, custom_days),
            target_type = COALESCE(${targetType}, target_type),
            target_value = COALESCE(${targetValue}, target_value),
            target_unit = COALESCE(${targetUnit}, target_unit),
            tags = COALESCE(${tags}, tags),
            color = COALESCE(${color}, color),
            icon = COALESCE(${icon}, icon),
            updated_at = NOW()
          WHERE id = ${habitId} AND user_id = ${normalizedUserId}
          RETURNING *
        `;

        if (result.length === 0) {
          return errorResponse('Habit not found', 404);
        }

        return jsonResponse({
          habit: mapHabitFromDb(result[0]),
        });
      }

      case 'DELETE': {
        if (!habitId) {
          return errorResponse('Habit ID is required');
        }

        await sql`
          DELETE FROM habits WHERE id = ${habitId} AND user_id = ${normalizedUserId}
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
