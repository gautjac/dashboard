import type { Handler } from '@netlify/functions';
import { getDb, corsHeaders } from './db';

interface SyncPayload {
  userId: string;
  habits?: Array<{
    id: string;
    name: string;
    description?: string;
    schedule: string;
    customDays?: number[];
    targetType: string;
    targetValue?: number;
    targetUnit?: string;
    tags: string[];
    color?: string;
    icon?: string;
    createdAt: string;
  }>;
  habitCompletions?: Array<{
    id: string;
    habitId: string;
    date: string;
    completed: boolean;
    value?: number;
    note?: string;
    timestamp: string;
  }>;
  journalEntries?: Array<{
    id: string;
    date: string;
    content: string;
    mood?: number;
    energy?: number;
    tags: string[];
    promptUsed?: string;
    aiReflection?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  focusLines?: Array<{
    id: string;
    date: string;
    text: string;
    createdAt: string;
  }>;
  settings?: {
    theme: string;
    showWeather: boolean;
    weatherLocation?: string;
    dailyBriefLength: string;
    journalPromptStyle: string;
    computerAccessEnabled: boolean;
    aiAnalysisEnabled: boolean;
    dataExportFormat: string;
  };
  interestAreas?: Array<{
    id: string;
    name: string;
    keywords: string[];
    sources: string[];
    enabled: boolean;
  }>;
  weeklyInsights?: Array<{
    id: string;
    weekStart: string;
    themes: string[];
    sentimentTrend: string;
    topStressors: string[];
    topEnergizers: string[];
    habitCorrelations: unknown[];
    summary: string;
    generatedAt: string;
  }>;
  weeklyReflections?: Array<{
    id: string;
    weekStart: string;
    weekEnd: string;
    reflection: string;
    stats: {
      journalEntryCount: number;
      totalWords: number;
      avgMood: number | null;
      avgEnergy: number | null;
      avgHabitCompletion: number | null;
      topStreaks: { habitName: string; streak: number }[];
    };
    generatedAt: string;
  }>;
  lastSyncedAt?: string;
}

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const sql = getDb();

  try {
    // GET: Fetch all data for a user
    if (event.httpMethod === 'GET') {
      const userId = event.queryStringParameters?.userId;
      if (!userId) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'userId is required' }),
        };
      }

      // Ensure user exists
      await sql`INSERT INTO users (id, email) VALUES (${userId}, ${userId}) ON CONFLICT (id) DO NOTHING`;

      // Fetch all data
      const [habits, completions, journals, focusLines, settings, interests, weeklyInsights, weeklyReflections] = await Promise.all([
        sql`SELECT * FROM habits WHERE user_id = ${userId} ORDER BY created_at`,
        sql`SELECT * FROM habit_completions WHERE user_id = ${userId} ORDER BY date DESC LIMIT 1000`,
        sql`SELECT * FROM journal_entries WHERE user_id = ${userId} ORDER BY date DESC LIMIT 365`,
        sql`SELECT * FROM focus_lines WHERE user_id = ${userId} ORDER BY date DESC LIMIT 30`,
        sql`SELECT * FROM user_settings WHERE user_id = ${userId}`,
        sql`SELECT * FROM interest_areas WHERE user_id = ${userId}`,
        sql`SELECT * FROM weekly_insights WHERE user_id = ${userId} ORDER BY week_start DESC LIMIT 52`,
        sql`SELECT * FROM weekly_reflections WHERE user_id = ${userId} ORDER BY week_start DESC LIMIT 52`,
      ]);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habits: habits.map(h => ({
            id: h.id,
            name: h.name,
            description: h.description,
            schedule: h.schedule,
            customDays: h.custom_days,
            targetType: h.target_type,
            targetValue: h.target_value,
            targetUnit: h.target_unit,
            tags: h.tags || [],
            color: h.color,
            icon: h.icon,
            createdAt: h.created_at,
          })),
          habitCompletions: completions.map(c => ({
            id: c.id,
            habitId: c.habit_id,
            date: c.date,
            completed: c.completed,
            value: c.value,
            note: c.note,
            timestamp: c.timestamp,
          })),
          journalEntries: journals.map(j => ({
            id: j.id,
            date: j.date,
            content: j.content,
            mood: j.mood,
            energy: j.energy,
            tags: j.tags || [],
            promptUsed: j.prompt_used,
            aiReflection: j.ai_reflection,
            createdAt: j.created_at,
            updatedAt: j.updated_at,
          })),
          focusLines: focusLines.map(f => ({
            id: f.id,
            date: f.date,
            text: f.text,
            createdAt: f.created_at,
          })),
          settings: settings[0] ? {
            theme: settings[0].theme,
            showWeather: settings[0].show_weather,
            weatherLocation: settings[0].weather_location,
            dailyBriefLength: settings[0].daily_brief_length,
            journalPromptStyle: settings[0].journal_prompt_style,
            computerAccessEnabled: settings[0].computer_access_enabled,
            aiAnalysisEnabled: settings[0].ai_analysis_enabled,
            dataExportFormat: settings[0].data_export_format,
          } : null,
          interestAreas: interests.map(i => ({
            id: i.id,
            name: i.name,
            keywords: i.keywords || [],
            sources: i.sources || [],
            enabled: i.enabled,
          })),
          weeklyInsights: weeklyInsights.map(w => ({
            id: w.id,
            weekStart: w.week_start,
            themes: w.themes || [],
            sentimentTrend: w.sentiment_trend,
            topStressors: w.top_stressors || [],
            topEnergizers: w.top_energizers || [],
            habitCorrelations: w.habit_correlations || [],
            summary: w.summary,
            generatedAt: w.generated_at,
          })),
          weeklyReflections: weeklyReflections.map(r => ({
            id: r.id,
            weekStart: r.week_start,
            weekEnd: r.week_end,
            reflection: r.reflection,
            stats: r.stats || {},
            generatedAt: r.generated_at,
          })),
          syncedAt: new Date().toISOString(),
        }),
      };
    }

    // POST: Sync data from client to server
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Request body is required' }),
        };
      }

      const data: SyncPayload = JSON.parse(event.body);
      const { userId } = data;

      if (!userId) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'userId is required' }),
        };
      }

      // Ensure user exists
      await sql`INSERT INTO users (id, email) VALUES (${userId}, ${userId}) ON CONFLICT (id) DO NOTHING`;

      // Sync habits
      if (data.habits) {
        for (const habit of data.habits) {
          await sql`
            INSERT INTO habits (id, user_id, name, description, schedule, custom_days, target_type, target_value, target_unit, tags, color, icon, created_at)
            VALUES (${habit.id}, ${userId}, ${habit.name}, ${habit.description || null}, ${habit.schedule}, ${habit.customDays || null}, ${habit.targetType}, ${habit.targetValue || null}, ${habit.targetUnit || null}, ${habit.tags}, ${habit.color || null}, ${habit.icon || null}, ${habit.createdAt})
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              schedule = EXCLUDED.schedule,
              custom_days = EXCLUDED.custom_days,
              target_type = EXCLUDED.target_type,
              target_value = EXCLUDED.target_value,
              target_unit = EXCLUDED.target_unit,
              tags = EXCLUDED.tags,
              color = EXCLUDED.color,
              icon = EXCLUDED.icon,
              updated_at = NOW()
          `;
        }
      }

      // Sync habit completions
      if (data.habitCompletions) {
        for (const completion of data.habitCompletions) {
          await sql`
            INSERT INTO habit_completions (id, habit_id, user_id, date, completed, value, note, timestamp)
            VALUES (${completion.id}, ${completion.habitId}, ${userId}, ${completion.date}, ${completion.completed}, ${completion.value || null}, ${completion.note || null}, ${completion.timestamp})
            ON CONFLICT (habit_id, date) DO UPDATE SET
              completed = EXCLUDED.completed,
              value = EXCLUDED.value,
              note = EXCLUDED.note,
              timestamp = EXCLUDED.timestamp
          `;
        }
      }

      // Sync journal entries
      if (data.journalEntries) {
        for (const entry of data.journalEntries) {
          await sql`
            INSERT INTO journal_entries (id, user_id, date, content, mood, energy, tags, prompt_used, ai_reflection, created_at, updated_at)
            VALUES (${entry.id}, ${userId}, ${entry.date}, ${entry.content}, ${entry.mood || null}, ${entry.energy || null}, ${entry.tags}, ${entry.promptUsed || null}, ${entry.aiReflection || null}, ${entry.createdAt}, ${entry.updatedAt})
            ON CONFLICT (user_id, date) DO UPDATE SET
              content = EXCLUDED.content,
              mood = EXCLUDED.mood,
              energy = EXCLUDED.energy,
              tags = EXCLUDED.tags,
              prompt_used = EXCLUDED.prompt_used,
              ai_reflection = EXCLUDED.ai_reflection,
              updated_at = EXCLUDED.updated_at
          `;
        }
      }

      // Sync focus lines
      if (data.focusLines) {
        for (const focus of data.focusLines) {
          await sql`
            INSERT INTO focus_lines (id, user_id, date, text, created_at)
            VALUES (${focus.id}, ${userId}, ${focus.date}, ${focus.text}, ${focus.createdAt})
            ON CONFLICT (user_id, date) DO UPDATE SET
              text = EXCLUDED.text
          `;
        }
      }

      // Sync settings
      if (data.settings) {
        const s = data.settings;
        await sql`
          INSERT INTO user_settings (user_id, theme, show_weather, weather_location, daily_brief_length, journal_prompt_style, computer_access_enabled, ai_analysis_enabled, data_export_format)
          VALUES (${userId}, ${s.theme}, ${s.showWeather}, ${s.weatherLocation || null}, ${s.dailyBriefLength}, ${s.journalPromptStyle}, ${s.computerAccessEnabled}, ${s.aiAnalysisEnabled}, ${s.dataExportFormat})
          ON CONFLICT (user_id) DO UPDATE SET
            theme = EXCLUDED.theme,
            show_weather = EXCLUDED.show_weather,
            weather_location = EXCLUDED.weather_location,
            daily_brief_length = EXCLUDED.daily_brief_length,
            journal_prompt_style = EXCLUDED.journal_prompt_style,
            computer_access_enabled = EXCLUDED.computer_access_enabled,
            ai_analysis_enabled = EXCLUDED.ai_analysis_enabled,
            data_export_format = EXCLUDED.data_export_format,
            updated_at = NOW()
        `;
      }

      // Sync interest areas
      if (data.interestAreas) {
        for (const area of data.interestAreas) {
          await sql`
            INSERT INTO interest_areas (id, user_id, name, keywords, sources, enabled)
            VALUES (${area.id}, ${userId}, ${area.name}, ${area.keywords}, ${area.sources}, ${area.enabled})
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              keywords = EXCLUDED.keywords,
              sources = EXCLUDED.sources,
              enabled = EXCLUDED.enabled
          `;
        }
      }

      // Sync weekly insights
      if (data.weeklyInsights) {
        for (const insight of data.weeklyInsights) {
          await sql`
            INSERT INTO weekly_insights (id, user_id, week_start, themes, sentiment_trend, top_stressors, top_energizers, habit_correlations, summary, generated_at)
            VALUES (${insight.id}, ${userId}, ${insight.weekStart}, ${insight.themes}, ${insight.sentimentTrend}, ${insight.topStressors}, ${insight.topEnergizers}, ${JSON.stringify(insight.habitCorrelations)}, ${insight.summary}, ${insight.generatedAt})
            ON CONFLICT (user_id, week_start) DO UPDATE SET
              themes = EXCLUDED.themes,
              sentiment_trend = EXCLUDED.sentiment_trend,
              top_stressors = EXCLUDED.top_stressors,
              top_energizers = EXCLUDED.top_energizers,
              habit_correlations = EXCLUDED.habit_correlations,
              summary = EXCLUDED.summary,
              generated_at = EXCLUDED.generated_at
          `;
        }
      }

      // Sync weekly reflections
      if (data.weeklyReflections) {
        for (const reflection of data.weeklyReflections) {
          await sql`
            INSERT INTO weekly_reflections (id, user_id, week_start, week_end, reflection, stats, generated_at)
            VALUES (${reflection.id}, ${userId}, ${reflection.weekStart}, ${reflection.weekEnd}, ${reflection.reflection}, ${JSON.stringify(reflection.stats)}, ${reflection.generatedAt})
            ON CONFLICT (user_id, week_start) DO UPDATE SET
              week_end = EXCLUDED.week_end,
              reflection = EXCLUDED.reflection,
              stats = EXCLUDED.stats,
              generated_at = EXCLUDED.generated_at
          `;
        }
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          syncedAt: new Date().toISOString(),
        }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
