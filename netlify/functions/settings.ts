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
      case 'GET': {
        const result = await sql`
          SELECT * FROM user_settings WHERE user_id = ${userId}
        `;

        if (result.length === 0) {
          // Create default settings
          const newSettings = await sql`
            INSERT INTO user_settings (user_id)
            VALUES (${userId})
            RETURNING *
          `;
          return jsonResponse(newSettings[0]);
        }

        return jsonResponse(result[0]);
      }

      case 'PUT': {
        const body = await req.json();
        const { theme, dailyBriefLength, journalPromptStyle, computerAccessEnabled } = body;

        const result = await sql`
          UPDATE user_settings
          SET
            theme = COALESCE(${theme}, theme),
            daily_brief_length = COALESCE(${dailyBriefLength}, daily_brief_length),
            journal_prompt_style = COALESCE(${journalPromptStyle}, journal_prompt_style),
            computer_access_enabled = COALESCE(${computerAccessEnabled}, computer_access_enabled)
          WHERE user_id = ${userId}
          RETURNING *
        `;

        return jsonResponse(result[0]);
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
