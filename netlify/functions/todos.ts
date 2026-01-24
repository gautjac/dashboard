import type { Context } from '@netlify/functions';
import { getDb, ensureUser, jsonResponse, errorResponse } from './utils/db';

export default async function handler(req: Request, _context: Context) {
  const sql = getDb();
  const url = new URL(req.url);

  // Get userId and email from query parameters
  const netlifyUserId = url.searchParams.get('userId');
  const email = url.searchParams.get('email');

  if (!netlifyUserId || !email) {
    return errorResponse('userId and email are required', 401);
  }

  // Ensure user exists in database (creates if needed)
  const userId = await ensureUser(sql, netlifyUserId, email);

  const todoId = url.searchParams.get('id');

  try {
    switch (req.method) {
      case 'GET': {
        // Get all todos for user, ordered by due date
        const todos = await sql`
          SELECT * FROM todos
          WHERE user_id = ${userId}
          ORDER BY
            completed ASC,
            CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
            due_date ASC,
            created_at DESC
        `;

        return jsonResponse({ todos });
      }

      case 'POST': {
        const body = await req.json();
        const { id, title, dueDate } = body;

        if (!title) {
          return errorResponse('Title is required');
        }

        // Generate ID if not provided
        const todoIdToUse = id || `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const result = await sql`
          INSERT INTO todos (id, user_id, title, due_date)
          VALUES (${todoIdToUse}, ${userId}, ${title}, ${dueDate || null})
          RETURNING *
        `;

        return jsonResponse(result[0], 201);
      }

      case 'PUT': {
        if (!todoId) {
          return errorResponse('Todo ID is required');
        }

        const body = await req.json();
        const { title, dueDate, completed } = body;

        // Build update based on what's provided
        let result;
        if (completed !== undefined) {
          // Toggle completion
          result = await sql`
            UPDATE todos
            SET
              completed = ${completed},
              completed_at = ${completed ? new Date().toISOString() : null}
            WHERE id = ${todoId} AND user_id = ${userId}
            RETURNING *
          `;
        } else {
          // Update title/dueDate
          result = await sql`
            UPDATE todos
            SET
              title = COALESCE(${title}, title),
              due_date = ${dueDate}
            WHERE id = ${todoId} AND user_id = ${userId}
            RETURNING *
          `;
        }

        if (result.length === 0) {
          return errorResponse('Todo not found', 404);
        }

        return jsonResponse(result[0]);
      }

      case 'DELETE': {
        if (!todoId) {
          return errorResponse('Todo ID is required');
        }

        await sql`
          DELETE FROM todos WHERE id = ${todoId} AND user_id = ${userId}
        `;

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Todos API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
