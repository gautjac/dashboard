import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

// Helper to get or create user and settings
async function ensureUserAndSettings(sql: ReturnType<typeof getDb>, userId: string) {
  // First check if user exists
  const existing = await sql`SELECT id FROM users WHERE id = ${userId}`;

  if (existing.length === 0) {
    // Create user with userId as both id and email
    await sql`
      INSERT INTO users (id, email)
      VALUES (${userId}, ${userId})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Ensure settings row exists
  await sql`
    INSERT INTO user_settings (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;

  return userId;
}

// Map database row to frontend format
function mapSettingsFromDb(row: any) {
  return {
    theme: row.theme || 'light',
    showWeather: row.show_weather ?? false,
    weatherLocation: row.weather_location || undefined,
    dailyBriefLength: row.daily_brief_length || 'medium',
    journalPromptStyle: row.journal_prompt_style || 'mixed',
    journalPromptInstructions: row.journal_prompt_instructions || undefined,
    customJournalPrompts: row.custom_journal_prompts || undefined,
    computerAccessEnabled: row.computer_access_enabled ?? false,
    aiAnalysisEnabled: row.ai_analysis_enabled ?? true,
    dataExportFormat: row.data_export_format || 'json',
    userName: row.user_name || undefined,
    perplexityApiKey: row.perplexity_api_key || undefined,
    falApiKey: row.fal_api_key || undefined,
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
    // Ensure user and settings exist
    await ensureUserAndSettings(sql, normalizedUserId);

    switch (req.method) {
      case 'GET': {
        const settings = await sql`
          SELECT * FROM user_settings WHERE user_id = ${normalizedUserId}
        `;

        if (settings.length === 0) {
          // Return defaults
          return jsonResponse({
            settings: {
              theme: 'light',
              showWeather: false,
              dailyBriefLength: 'medium',
              journalPromptStyle: 'mixed',
              computerAccessEnabled: false,
              aiAnalysisEnabled: true,
              dataExportFormat: 'json',
            },
          });
        }

        return jsonResponse({
          settings: mapSettingsFromDb(settings[0]),
        });
      }

      case 'PUT': {
        const body = await req.json();
        const {
          theme,
          showWeather,
          weatherLocation,
          dailyBriefLength,
          journalPromptStyle,
          journalPromptInstructions,
          customJournalPrompts,
          computerAccessEnabled,
          aiAnalysisEnabled,
          dataExportFormat,
          userName,
          perplexityApiKey,
          falApiKey,
        } = body;

        // Update settings with COALESCE to preserve unset values
        const result = await sql`
          UPDATE user_settings
          SET
            theme = COALESCE(${theme}, theme),
            show_weather = COALESCE(${showWeather}, show_weather),
            weather_location = COALESCE(${weatherLocation}, weather_location),
            daily_brief_length = COALESCE(${dailyBriefLength}, daily_brief_length),
            journal_prompt_style = COALESCE(${journalPromptStyle}, journal_prompt_style),
            journal_prompt_instructions = COALESCE(${journalPromptInstructions ? JSON.stringify(journalPromptInstructions) : null}, journal_prompt_instructions),
            custom_journal_prompts = COALESCE(${customJournalPrompts}, custom_journal_prompts),
            computer_access_enabled = COALESCE(${computerAccessEnabled}, computer_access_enabled),
            ai_analysis_enabled = COALESCE(${aiAnalysisEnabled}, ai_analysis_enabled),
            data_export_format = COALESCE(${dataExportFormat}, data_export_format),
            user_name = COALESCE(${userName}, user_name),
            perplexity_api_key = COALESCE(${perplexityApiKey}, perplexity_api_key),
            fal_api_key = COALESCE(${falApiKey}, fal_api_key),
            updated_at = NOW()
          WHERE user_id = ${normalizedUserId}
          RETURNING *
        `;

        if (result.length === 0) {
          return errorResponse('Settings not found', 404);
        }

        return jsonResponse({
          settings: mapSettingsFromDb(result[0]),
        });
      }

      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return errorResponse('Internal server error', 500);
  }
}
