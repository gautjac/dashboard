import type { Context } from '@netlify/functions';
import { getUserIdFromContext, getUserEmailFromContext, jsonResponse, errorResponse, unauthorizedResponse } from './utils/db';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export default async function handler(req: Request, context: Context) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Verify user is authenticated
  const netlifyUserId = getUserIdFromContext(context);
  const email = getUserEmailFromContext(context);

  if (!netlifyUserId || !email) {
    return unauthorizedResponse();
  }

  // Get API key from environment (securely stored in Netlify)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse('Anthropic API not configured', 500);
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    let messages: any[];
    let system: string | undefined;
    let maxTokens = 4096;

    switch (action) {
      case 'generatePrompt': {
        const { recentEntries, habits, promptStyle } = params;

        const entriesSummary = (recentEntries || [])
          .slice(0, 5)
          .map((e: any) => `${e.date}: ${e.content?.slice(0, 200)}...`)
          .join('\n\n');

        const habitsSummary = (habits || [])
          .map((h: any) => `${h.name}: ${h.currentStreak} day streak, ${h.completionRate7Days}% this week`)
          .join('\n');

        const styleInstructions: Record<string, string> = {
          reflective: 'Ask a deep, introspective question that encourages self-examination.',
          creative: 'Propose a creative or imaginative writing prompt.',
          tactical: 'Ask about specific goals, decisions, or actionable next steps.',
          gratitude: 'Focus on appreciation, positive moments, or silver linings.',
          mixed: 'Choose the most appropriate style based on the context.',
        };

        system = 'You are a thoughtful journaling coach. Generate prompts that are personal, specific, and encourage meaningful reflection. Never be generic.';
        maxTokens = 200;
        messages = [{
          role: 'user',
          content: `Based on this person's recent journal entries and habits, generate a single thoughtful journaling prompt.

Recent entries:
${entriesSummary || 'No recent entries'}

Current habits:
${habitsSummary || 'No habits tracked'}

Style: ${styleInstructions[promptStyle] || styleInstructions.mixed}

Return ONLY the prompt question itself, nothing else. Make it personal and specific to their situation.`
        }];
        break;
      }

      case 'generateReflection': {
        const { entry, recentEntries } = params;

        const contextEntries = (recentEntries || [])
          .filter((e: any) => e.id !== entry?.id)
          .slice(0, 3)
          .map((e: any) => `${e.date}: ${e.content?.slice(0, 150)}...`)
          .join('\n\n');

        system = 'You are a supportive journaling companion. Your reflections are brief, insightful, and respect autonomy. Never diagnose or give medical advice. Focus on patterns and possibilities.';
        maxTokens = 300;
        messages = [{
          role: 'user',
          content: `Reflect on this journal entry and offer a brief, thoughtful observation or insight.

Today's entry:
${entry?.content}

${entry?.mood ? `Mood: ${entry.mood}/5` : ''}
${entry?.energy ? `Energy: ${entry.energy}/5` : ''}

Recent context:
${contextEntries || 'No recent entries for context'}

Provide a 2-3 sentence reflection that:
1. Acknowledges what they wrote
2. Offers a gentle insight or pattern observation
3. Ends with something encouraging or thought-provoking

Be warm but not saccharine. Be insightful but not prescriptive.`
        }];
        break;
      }

      case 'generateBrief': {
        const { interests, briefLength } = params;

        const enabledInterests = (interests || []).filter((i: any) => i.enabled);
        if (enabledInterests.length === 0) {
          return jsonResponse({ items: [], followUpQuestions: [] });
        }

        const itemCounts: Record<string, number> = { short: 3, medium: 5, long: 8 };
        const targetCount = itemCounts[briefLength] || 5;

        const interestsPrompt = enabledInterests
          .map((i: any) => `- ${i.name}: ${(i.keywords || []).join(', ')}`)
          .join('\n');

        const today = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        system = `You are a personal news curator. Today is ${today}. Generate plausible, interesting news items that would appear in tech, creative, and productivity publications. Make them specific and actionable. Return valid JSON only.`;
        maxTokens = 2000;
        messages = [{
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

Make the items feel current and relevant. The "why it matters" should connect to how this might affect someone working in creative/technical fields.`
        }];
        break;
      }

      case 'generateInsights': {
        const { entries, habits, weekStart, weekEnd } = params;

        const weekEntries = (entries || []).filter((e: any) => {
          const date = new Date(e.date);
          return date >= new Date(weekStart) && date <= new Date(weekEnd);
        });

        const entriesContent = weekEntries
          .map((e: any) =>
            `${e.date} (mood: ${e.mood || 'N/A'}, energy: ${e.energy || 'N/A'}):\n${e.content}`
          )
          .join('\n\n---\n\n');

        const habitsContent = (habits || [])
          .map((h: any) =>
            `${h.name}: ${h.completionRate7Days}% completion, ${h.currentStreak} day streak`
          )
          .join('\n');

        system = 'You are an insightful analyst. Identify patterns in journal entries and habits. Be specific, grounded, and avoid generic observations. Return valid JSON only.';
        maxTokens = 1000;
        messages = [{
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

Be specific and grounded in what was actually written. Don't invent themes that aren't there.`
        }];
        break;
      }

      default:
        return errorResponse('Invalid action', 400);
    }

    // Make request to Anthropic
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return errorResponse(error.error?.message || 'API request failed', response.status);
    }

    const data = await response.json();
    const textBlock = data.content?.find((c: any) => c.type === 'text');
    const text = textBlock?.text || '';

    // For JSON responses, try to parse
    if (action === 'generateBrief' || action === 'generateInsights') {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return jsonResponse(JSON.parse(jsonMatch[0]));
        }
      } catch (e) {
        console.error('Failed to parse JSON from response:', e);
      }
    }

    return jsonResponse({ text, usage: data.usage });
  } catch (error) {
    console.error('Anthropic proxy error:', error);
    return errorResponse('Internal server error', 500);
  }
}
