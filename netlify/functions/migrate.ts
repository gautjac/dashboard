import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

export default async function handler(req: Request, _context: Context) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const sql = getDb();

  try {
    // Add missing columns to user_settings
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS show_weather BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS weather_location VARCHAR(255)`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS journal_prompt_instructions JSONB`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_journal_prompts TEXT[]`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_analysis_enabled BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS data_export_format VARCHAR(20) DEFAULT 'json'`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS perplexity_api_key TEXT`;
    await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS fal_api_key TEXT`;

    return jsonResponse({
      success: true,
      message: 'Migration completed successfully',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return errorResponse(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}
