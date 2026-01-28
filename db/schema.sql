-- Daily Dashboard Database Schema for Neon
-- Run this in your Neon SQL Editor to set up the database

-- Users table (for future multi-user support, but primarily for your auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  daily_brief_length VARCHAR(20) DEFAULT 'medium',
  journal_prompt_style VARCHAR(20) DEFAULT 'mixed',
  computer_access_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly, custom
  target_days INTEGER[], -- for custom: [0,1,2,3,4,5,6] = Mon-Sun
  reminder_time TIME,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habit completions
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  completed_at DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, completed_at)
);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  tags TEXT[], -- stored as array
  prompt_used TEXT,
  ai_reflection TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Focus lines (daily intentions)
CREATE TABLE IF NOT EXISTS focus_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Interest areas for daily brief
CREATE TABLE IF NOT EXISTS interest_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  keywords TEXT[],
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily briefs (cached)
CREATE TABLE IF NOT EXISTS daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  items JSONB NOT NULL, -- array of brief items
  follow_up_questions TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Weekly insights (cached)
CREATE TABLE IF NOT EXISTS weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  themes TEXT[],
  sentiment_trend VARCHAR(20),
  top_stressors TEXT[],
  top_energizers TEXT[],
  habit_correlations JSONB,
  summary TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Weekly reflections (AI-generated summaries)
CREATE TABLE IF NOT EXISTS weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  reflection TEXT NOT NULL,
  stats JSONB NOT NULL, -- {journalEntryCount, totalWords, avgMood, avgEnergy, avgHabitCompletion, topStreaks}
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Calendar events (synced from Google, cached locally)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255),
  calendar_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  color VARCHAR(50),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, google_event_id)
);

-- Google calendar accounts
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  google_email VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  selected_calendars TEXT[], -- IDs of calendars to sync
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, google_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_focus_lines_user_date ON focus_lines(user_id, date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_weekly_insights_user_week ON weekly_insights(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_user_week ON weekly_reflections(user_id, week_start);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interest_areas_updated_at ON interest_areas;
CREATE TRIGGER update_interest_areas_updated_at BEFORE UPDATE ON interest_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_accounts_updated_at ON calendar_accounts;
CREATE TRIGGER update_calendar_accounts_updated_at BEFORE UPDATE ON calendar_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
