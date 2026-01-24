/**
 * Anthropic Claude API Service
 *
 * Handles all Claude API interactions for:
 * - Journal analysis and weekly insights
 * - Daily brief generation
 * - Computer use agent features
 *
 * Note: In production, API calls should go through a backend server
 * to protect the API key. This implementation is for demonstration.
 */

import { format, startOfWeek, endOfWeek } from 'date-fns';
import type {
  JournalEntry,
  HabitWithStats,
  WeeklyInsight,
  HabitCorrelation,
  DailyBrief,
  DailyBriefItem,
  InterestArea,
  JournalPromptStyleInstructions,
} from '../types';

// API Configuration
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

interface ClaudeContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'image';
  text?: string;
  tool_use_id?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

class AnthropicService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Make a request to the Claude API
   */
  private async makeRequest(
    messages: ClaudeMessage[],
    options: {
      system?: string;
      maxTokens?: number;
      tools?: unknown[];
    } = {}
  ): Promise<ClaudeResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: options.maxTokens || 4096,
        system: options.system,
        messages,
        tools: options.tools,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  }

  /**
   * Generate a journal reflection/prompt based on recent entries
   */
  async generateContextualPrompt(
    recentEntries: JournalEntry[],
    habits: HabitWithStats[],
    promptStyle: 'reflective' | 'creative' | 'tactical' | 'gratitude' | 'mixed',
    styleInstructionsMap?: JournalPromptStyleInstructions
  ): Promise<string> {
    const entriesSummary = recentEntries
      .slice(0, 5)
      .map((e) => `${e.date}: ${e.content.slice(0, 200)}...`)
      .join('\n\n');

    const habitsSummary = habits
      .map((h) => `${h.name}: ${h.currentStreak} day streak, ${h.completionRate7Days}% this week`)
      .join('\n');

    const styleInstructions = {
      reflective: 'Ask a deep, introspective question that encourages self-examination.',
      creative: 'Propose a creative or imaginative writing prompt.',
      tactical: 'Ask about specific goals, decisions, or actionable next steps.',
      gratitude: 'Focus on appreciation, positive moments, or silver linings.',
      mixed: 'Choose the most appropriate style based on the context.',
    };

    // Get custom instructions for this specific style
    const customInstructions = styleInstructionsMap?.[promptStyle];
    const customInstructionsSection = customInstructions
      ? `\n\nAdditional instructions from the user for ${promptStyle} prompts:\n${customInstructions}`
      : '';

    const response = await this.makeRequest(
      [
        {
          role: 'user',
          content: `Based on this person's recent journal entries and habits, generate a single thoughtful journaling prompt.

Recent entries:
${entriesSummary || 'No recent entries'}

Current habits:
${habitsSummary || 'No habits tracked'}

Style: ${styleInstructions[promptStyle]}${customInstructionsSection}

Return ONLY the prompt question itself, nothing else. Make it personal and specific to their situation.`,
        },
      ],
      {
        system:
          'You are a thoughtful journaling coach. Generate prompts that are personal, specific, and encourage meaningful reflection. Never be generic.',
        maxTokens: 200,
      }
    );

    const textBlock = response.content.find((c) => c.type === 'text');
    return textBlock?.text || 'What is on your mind today?';
  }

  /**
   * Generate an AI reflection on a journal entry
   */
  async generateEntryReflection(
    entry: JournalEntry,
    recentEntries: JournalEntry[]
  ): Promise<string> {
    const context = recentEntries
      .filter((e) => e.id !== entry.id)
      .slice(0, 3)
      .map((e) => `${e.date}: ${e.content.slice(0, 150)}...`)
      .join('\n\n');

    const response = await this.makeRequest(
      [
        {
          role: 'user',
          content: `Reflect on this journal entry and offer a brief, thoughtful observation or insight.

Today's entry:
${entry.content}

${entry.mood ? `Mood: ${entry.mood}/5` : ''}
${entry.energy ? `Energy: ${entry.energy}/5` : ''}

Recent context:
${context || 'No recent entries for context'}

Provide a 2-3 sentence reflection that:
1. Acknowledges what they wrote
2. Offers a gentle insight or pattern observation
3. Ends with something encouraging or thought-provoking

Be warm but not saccharine. Be insightful but not prescriptive.`,
        },
      ],
      {
        system:
          'You are a supportive journaling companion. Your reflections are brief, insightful, and respect autonomy. Never diagnose or give medical advice. Focus on patterns and possibilities.',
        maxTokens: 300,
      }
    );

    const textBlock = response.content.find((c) => c.type === 'text');
    return textBlock?.text || '';
  }

  /**
   * Generate weekly insights from journal entries
   */
  async generateWeeklyInsights(
    entries: JournalEntry[],
    habits: HabitWithStats[]
  ): Promise<WeeklyInsight> {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    const weekEntries = entries.filter((e) => {
      const date = new Date(e.date);
      return date >= weekStart && date <= weekEnd;
    });

    const entriesContent = weekEntries
      .map(
        (e) =>
          `${e.date} (mood: ${e.mood || 'N/A'}, energy: ${e.energy || 'N/A'}):
${e.content}`
      )
      .join('\n\n---\n\n');

    const habitsContent = habits
      .map(
        (h) =>
          `${h.name}: ${h.completionRate7Days}% completion, ${h.currentStreak} day streak`
      )
      .join('\n');

    const response = await this.makeRequest(
      [
        {
          role: 'user',
          content: `Analyze these journal entries from this week and provide insights.

JOURNAL ENTRIES:
${entriesContent || 'No entries this week'}

HABIT PERFORMANCE:
${habitsContent || 'No habits tracked'}

Provide a JSON response with this exact structure:
{
  "themes": ["theme1", "theme2", "theme3"],
  "sentimentTrend": "improving" | "stable" | "declining",
  "topStressors": ["stressor1", "stressor2"],
  "topEnergizers": ["energizer1", "energizer2"],
  "habitCorrelations": [
    {
      "habitName": "habit name",
      "correlationType": "positive" | "negative",
      "metricAffected": "mood" | "energy",
      "strength": 0.0-1.0,
      "description": "brief description"
    }
  ],
  "summary": "2-3 sentence overall summary of the week"
}

Be specific and grounded in what was actually written. Don't invent themes that aren't there.`,
        },
      ],
      {
        system:
          'You are an insightful analyst. Identify patterns in journal entries and habits. Be specific, grounded, and avoid generic observations. Return valid JSON only.',
        maxTokens: 1000,
      }
    );

    const textBlock = response.content.find((c) => c.type === 'text');

    try {
      // Extract JSON from the response
      const jsonMatch = textBlock?.text?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const data = JSON.parse(jsonMatch[0]);

      const insight: WeeklyInsight = {
        id: `insight-${Date.now()}`,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        themes: data.themes || [],
        sentimentTrend: data.sentimentTrend || 'stable',
        topStressors: data.topStressors || [],
        topEnergizers: data.topEnergizers || [],
        habitCorrelations: (data.habitCorrelations || []).map(
          (c: Partial<HabitCorrelation> & { habitName: string }) => ({
            habitId: habits.find((h) => h.name === c.habitName)?.id || '',
            habitName: c.habitName,
            correlationType: c.correlationType || 'positive',
            metricAffected: c.metricAffected || 'mood',
            strength: c.strength || 0.5,
            description: c.description || '',
          })
        ),
        summary: data.summary || 'No summary available.',
        generatedAt: new Date().toISOString(),
      };

      return insight;
    } catch (error) {
      console.error('Failed to parse insights:', error);
      return {
        id: `insight-${Date.now()}`,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        themes: [],
        sentimentTrend: 'stable',
        topStressors: [],
        topEnergizers: [],
        habitCorrelations: [],
        summary: 'Unable to generate insights. Please try again.',
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate daily brief based on user interests
   */
  async generateDailyBrief(
    interests: InterestArea[],
    briefLength: 'short' | 'medium' | 'long'
  ): Promise<DailyBrief> {
    const enabledInterests = interests.filter((i) => i.enabled);

    if (enabledInterests.length === 0) {
      return {
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        followUpQuestions: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const itemCounts = {
      short: 3,
      medium: 5,
      long: 8,
    };

    const targetCount = itemCounts[briefLength];

    const interestsPrompt = enabledInterests
      .map((i) => `- ${i.name}: ${i.keywords.join(', ')}`)
      .join('\n');

    const response = await this.makeRequest(
      [
        {
          role: 'user',
          content: `Generate a daily brief with ${targetCount} items across these interest areas:

${interestsPrompt}

For each item, include:
1. A compelling title
2. A 1-2 sentence summary
3. The source (make it realistic - e.g., "TechCrunch", "Hacker News", "The Verge")
4. A "why it matters" insight personalized to someone interested in these topics
5. Which topic it relates to

Return JSON with this structure:
{
  "items": [
    {
      "title": "headline",
      "summary": "1-2 sentence summary",
      "source": "source name",
      "whyItMatters": "personalized relevance",
      "topic": "which interest area"
    }
  ],
  "followUpQuestions": [
    "thought-provoking question 1",
    "thought-provoking question 2",
    "thought-provoking question 3"
  ]
}

Make the items feel current and relevant. The "why it matters" should connect to how this might affect someone working in creative/technical fields.`,
        },
      ],
      {
        system: `You are a personal news curator. Today is ${format(
          new Date(),
          'MMMM d, yyyy'
        )}. Generate plausible, interesting news items that would appear in tech, creative, and productivity publications. Make them specific and actionable. Return valid JSON only.`,
        maxTokens: 2000,
      }
    );

    const textBlock = response.content.find((c) => c.type === 'text');

    try {
      const jsonMatch = textBlock?.text?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const data = JSON.parse(jsonMatch[0]);

      const brief: DailyBrief = {
        date: format(new Date(), 'yyyy-MM-dd'),
        items: (data.items || []).map(
          (item: Partial<DailyBriefItem>, index: number) => ({
            id: `brief-${Date.now()}-${index}`,
            title: item.title || 'Untitled',
            summary: item.summary || '',
            source: item.source || 'Unknown',
            whyItMatters: item.whyItMatters,
            topic: item.topic || enabledInterests[0]?.name || 'General',
            fetchedAt: new Date().toISOString(),
          })
        ),
        followUpQuestions: data.followUpQuestions || [],
        generatedAt: new Date().toISOString(),
      };

      return brief;
    } catch (error) {
      console.error('Failed to parse daily brief:', error);
      return {
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        followUpQuestions: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate a creative weekly reflection based on journal entries and habits
   */
  async generateWeeklyReflection(
    recentEntries: JournalEntry[],
    habits: HabitWithStats[]
  ): Promise<string> {
    const entriesContent = recentEntries
      .map(
        (e) =>
          `${e.date} (mood: ${e.mood || 'N/A'}/5, energy: ${e.energy || 'N/A'}/5):
${e.content}`
      )
      .join('\n\n---\n\n');

    const habitsContent = habits
      .map(
        (h) =>
          `${h.name}: ${h.currentStreak} day streak, ${h.completionRate7Days}% completion this week${
            h.todayCompleted ? ' (done today)' : ''
          }`
      )
      .join('\n');

    const response = await this.makeRequest(
      [
        {
          role: 'user',
          content: `You are reviewing someone's week. Based on their journal entries and habit tracking, write a warm, creative, and insightful reflection on how their week has been going.

JOURNAL ENTRIES (last 7 days):
${entriesContent || 'No journal entries this week.'}

HABIT TRACKING:
${habitsContent || 'No habits tracked.'}

Write a reflection that:
1. Opens with a creative metaphor or image that captures the essence of their week
2. Acknowledges specific things they wrote about or accomplished
3. Notes patterns you observe (mood trends, recurring themes, habit momentum)
4. Offers a gentle observation or reframe if they seem to be struggling
5. Ends with an encouraging thought or question to carry into the next week

Keep it personal, warm, and around 200-300 words. Write in second person ("you"). Be specific - reference actual things from their entries. Avoid generic self-help platitudes.`,
        },
      ],
      {
        system:
          'You are a wise, warm friend who has known this person for years. You speak with genuine care, wit, and insight. You notice patterns and offer perspective without being preachy. Your tone is encouraging but never saccharine.',
        maxTokens: 600,
      }
    );

    const textBlock = response.content.find((c) => c.type === 'text');
    return textBlock?.text || 'Unable to generate reflection. Please try again.';
  }
}

// Export singleton
export const anthropicService = new AnthropicService();
