import { neon } from '@neondatabase/serverless';

// Get database connection
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
}

// Initialize database schema
export async function initializeSchema() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      schedule TEXT NOT NULL DEFAULT 'daily',
      custom_days INTEGER[],
      target_type TEXT NOT NULL DEFAULT 'binary',
      target_value INTEGER,
      target_unit TEXT,
      tags TEXT[] DEFAULT '{}',
      color TEXT,
      icon TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      value INTEGER,
      note TEXT,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(habit_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      content TEXT NOT NULL,
      mood INTEGER,
      energy INTEGER,
      tags TEXT[] DEFAULT '{}',
      prompt_used TEXT,
      ai_reflection TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS focus_lines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT DEFAULT 'light',
      show_weather BOOLEAN DEFAULT false,
      weather_location TEXT,
      daily_brief_length TEXT DEFAULT 'medium',
      journal_prompt_style TEXT DEFAULT 'mixed',
      computer_access_enabled BOOLEAN DEFAULT false,
      ai_analysis_enabled BOOLEAN DEFAULT true,
      data_export_format TEXT DEFAULT 'json',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS interest_areas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      keywords TEXT[] DEFAULT '{}',
      sources TEXT[] DEFAULT '{}',
      enabled BOOLEAN DEFAULT true
    )
  `;

  // Create indexes for common queries
  await sql`CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_completions_habit ON habit_completions(habit_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_completions_user_date ON habit_completions(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_focus_user_date ON focus_lines(user_id, date)`;

  return { success: true };
}

// Helper to get user ID from Netlify Identity
export function getUserId(event: { headers: { [key: string]: string | undefined } }): string | null {
  // Netlify Identity sends user info in the 'x-nf-client-identity-user' header
  const userHeader = event.headers['x-nf-client-connection-info'];
  if (!userHeader) return null;

  try {
    const userInfo = JSON.parse(userHeader);
    return userInfo.user?.sub || null;
  } catch {
    return null;
  }
}

// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
