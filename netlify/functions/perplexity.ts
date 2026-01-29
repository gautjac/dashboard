import type { Context } from '@netlify/functions';
import { jsonResponse, errorResponse } from './utils/db';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityRequest {
  action?: 'generateBrief' | 'enhanceArticle' | 'generateJournalPrompt' | 'generateFollowUpPrompt' | 'generateWeeklyInsights' | 'generateEntryReflection';
  interests: { name: string; keywords: string[] }[];
  briefLength: 'short' | 'medium' | 'long';
  apiKey: string;
  article?: {
    title: string;
    summary: string;
    source: string;
    topic: string;
  };
  // Journal prompt fields
  recentEntries?: { content: string; date: string; mood?: number; energy?: number; tags?: string[] }[];
  habits?: { name: string; currentStreak: number; completionRate7Days: number; bestStreak?: number }[];
  promptStyle?: string;
  styleInstructions?: Record<string, string>;
  currentContent?: string;
  customPrompts?: string[];
  // Entry reflection fields
  entry?: { content: string; date: string; mood?: number; energy?: number; tags?: string[] };
  otherEntries?: { content: string; date: string }[];
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    console.log('Perplexity function started');
    const body = await req.json();
    console.log('Request body parsed');
    const { action, interests, briefLength, apiKey, article } = body as PerplexityRequest;

    if (!apiKey) {
      return errorResponse('Perplexity API key is required', 400);
    }

    // Sanitize API key - remove any non-ASCII characters that might have been copied
    const sanitizedApiKey = apiKey.replace(/[^\x00-\x7F]/g, '').trim();
    if (sanitizedApiKey.length !== apiKey.length) {
      console.log('API key sanitized - removed', apiKey.length - sanitizedApiKey.length, 'non-ASCII characters');
    }

    // Handle article enhancement action
    if (action === 'enhanceArticle' && article) {
      console.log('Enhancing article:', article.title);

      const enabledInterests = interests?.filter(i => i.keywords && i.keywords.length > 0) || [];
      const interestContext = enabledInterests.length > 0
        ? `The user is interested in: ${enabledInterests.map(i => i.name).join(', ')}.`
        : '';

      const enhanceResponse = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sanitizedApiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are a helpful analyst who explains why news articles matter to readers. ${interestContext} Be concise and insightful.`
            },
            {
              role: 'user',
              content: `For this article, explain in 2-3 sentences why it matters and what the implications are:

Title: ${article.title}
Summary: ${article.summary}
Source: ${article.source}
Topic: ${article.topic}

Focus on practical implications, broader trends, or why someone interested in ${article.topic} should care about this.`
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        }),
      });

      if (!enhanceResponse.ok) {
        const errorText = await enhanceResponse.text();
        console.error('Perplexity enhance error:', enhanceResponse.status, errorText);
        return errorResponse('Failed to generate insight', enhanceResponse.status);
      }

      const enhanceData = await enhanceResponse.json();
      const insight = enhanceData.choices?.[0]?.message?.content || '';

      return jsonResponse({ text: insight.trim() });
    }

    // Handle journal prompt generation
    if (action === 'generateJournalPrompt') {
      const { recentEntries, habits, promptStyle, styleInstructions } = body as PerplexityRequest;
      console.log('Generating contextual journal prompt');

      // Build context from recent entries
      let entriesContext = '';
      if (recentEntries && recentEntries.length > 0) {
        entriesContext = recentEntries
          .slice(0, 3)
          .map(e => `[${e.date}]: ${e.content.slice(0, 300)}...`)
          .join('\n\n');
      }

      // Build habits context
      let habitsContext = '';
      if (habits && habits.length > 0) {
        habitsContext = habits
          .map(h => `${h.name}: ${h.currentStreak} day streak, ${h.completionRate7Days}% this week`)
          .join(', ');
      }

      // Get style-specific instructions
      const styleInstruction = styleInstructions?.[promptStyle || 'mixed'] || '';

      const promptResponse = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sanitizedApiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are a thoughtful journaling coach who creates personalized writing prompts. ${styleInstruction ? `Style guidance: ${styleInstruction}` : ''}`
            },
            {
              role: 'user',
              content: `Generate a single, thoughtful journaling prompt for someone based on this context:

${entriesContext ? `Recent journal entries:\n${entriesContext}\n\n` : ''}${habitsContext ? `Current habits: ${habitsContext}\n\n` : ''}Prompt style: ${promptStyle || 'mixed'}

Create a prompt that:
- Is personal and specific to their recent reflections (if available)
- Encourages deeper self-reflection
- Is open-ended but focused
- Is 1-2 sentences maximum

Return ONLY the prompt text, nothing else.`
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        console.error('Perplexity prompt error:', promptResponse.status, errorText);
        return errorResponse('Failed to generate prompt', promptResponse.status);
      }

      const promptData = await promptResponse.json();
      const prompt = promptData.choices?.[0]?.message?.content || '';

      return jsonResponse({ prompt: prompt.trim() });
    }

    // Handle follow-up prompt generation (analyzes current content)
    if (action === 'generateFollowUpPrompt') {
      const { currentContent, customPrompts, styleInstructions } = body as PerplexityRequest;
      console.log('Generating follow-up journal prompt');

      if (!currentContent || currentContent.trim().length < 20) {
        return errorResponse('Content too short for analysis', 400);
      }

      // Build list of available styles
      const availableStyles = Object.keys(styleInstructions || {});
      const stylesDescription = availableStyles.length > 0
        ? availableStyles.map(s => `- ${s}: ${styleInstructions?.[s]?.slice(0, 100) || 'General prompts'}`).join('\n')
        : '- reflective: Deep self-examination\n- creative: Imaginative exploration\n- analytical: Logical analysis\n- growth: Personal development';

      const followUpResponse = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sanitizedApiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are a thoughtful journaling coach. Analyze what someone has written and choose the best prompt style to deepen their reflection, then generate a follow-up prompt.`
            },
            {
              role: 'user',
              content: `Here's what someone has written in their journal:

---
${currentContent.slice(0, 1500)}
---

Available prompt styles:
${stylesDescription}

Based on what they've written:
1. Choose the most appropriate style to deepen their reflection
2. Generate a follow-up prompt that responds to their specific content

Return your response as JSON:
{
  "chosenStyle": "style_name",
  "prompt": "Your follow-up prompt here"
}

Return ONLY valid JSON, nothing else.`
            }
          ],
          temperature: 0.6,
          max_tokens: 200
        }),
      });

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error('Perplexity follow-up error:', followUpResponse.status, errorText);
        return errorResponse('Failed to generate follow-up prompt', followUpResponse.status);
      }

      const followUpData = await followUpResponse.json();
      const responseText = followUpData.choices?.[0]?.message?.content || '';

      // Parse the JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return jsonResponse({
            prompt: parsed.prompt?.trim() || '',
            chosenStyle: parsed.chosenStyle || 'reflective'
          });
        }
      } catch (e) {
        console.error('Failed to parse follow-up response:', e);
      }

      // Fallback: return the raw text as a prompt
      return jsonResponse({
        prompt: responseText.trim(),
        chosenStyle: 'mixed'
      });
    }

    // Handle weekly insights generation
    if (action === 'generateWeeklyInsights') {
      const { recentEntries, habits } = body as PerplexityRequest;
      console.log('Generating weekly insights');

      // Build journal context
      let journalContext = '';
      if (recentEntries && recentEntries.length > 0) {
        journalContext = recentEntries
          .slice(0, 7)
          .map(e => {
            let entry = `[${e.date}]`;
            if (e.mood) entry += ` Mood: ${e.mood}/5`;
            if (e.energy) entry += ` Energy: ${e.energy}/5`;
            if (e.tags && e.tags.length > 0) entry += ` Tags: ${e.tags.join(', ')}`;
            entry += `\n${e.content.slice(0, 400)}...`;
            return entry;
          })
          .join('\n\n');
      }

      // Build habits context
      let habitsContext = '';
      if (habits && habits.length > 0) {
        habitsContext = habits
          .map(h => `- ${h.name}: ${h.currentStreak} day streak, ${h.completionRate7Days}% completion this week${h.bestStreak ? `, best: ${h.bestStreak} days` : ''}`)
          .join('\n');
      }

      const insightsResponse = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sanitizedApiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are a thoughtful life coach and wellness advisor. Analyze journal entries and habit data to provide meaningful weekly insights. Be supportive, specific, and actionable.`
            },
            {
              role: 'user',
              content: `Analyze this week's journal entries and habits to generate insights:

${journalContext ? `JOURNAL ENTRIES:\n${journalContext}\n\n` : 'No journal entries this week.\n\n'}${habitsContext ? `HABITS:\n${habitsContext}\n\n` : 'No habit data available.\n\n'}
Generate a weekly reflection with:
1. A brief summary of the week (2-3 sentences)
2. Key themes or patterns you noticed (2-3 themes)
3. Wins or positive moments to celebrate (1-2 items)
4. Areas for growth or attention (1-2 items)
5. One actionable suggestion for next week

Return as JSON:
{
  "summary": "Brief week summary",
  "themes": ["theme1", "theme2"],
  "wins": ["win1", "win2"],
  "growthAreas": ["area1"],
  "suggestion": "Actionable suggestion",
  "moodTrend": "improving|stable|declining|mixed",
  "energyTrend": "improving|stable|declining|mixed"
}

Return ONLY valid JSON.`
            }
          ],
          temperature: 0.5,
          max_tokens: 800
        }),
      });

      if (!insightsResponse.ok) {
        const errorText = await insightsResponse.text();
        console.error('Perplexity insights error:', insightsResponse.status, errorText);
        return errorResponse('Failed to generate insights', insightsResponse.status);
      }

      const insightsData = await insightsResponse.json();
      const insightsText = insightsData.choices?.[0]?.message?.content || '';

      // Parse the JSON response
      try {
        const jsonMatch = insightsText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return jsonResponse({
            id: `insight-${Date.now()}`,
            weekStart: new Date().toISOString().split('T')[0],
            ...parsed,
            generatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Failed to parse insights response:', e);
      }

      // Fallback
      return jsonResponse({
        id: `insight-${Date.now()}`,
        weekStart: new Date().toISOString().split('T')[0],
        summary: insightsText.trim(),
        themes: [],
        wins: [],
        growthAreas: [],
        suggestion: '',
        generatedAt: new Date().toISOString()
      });
    }

    // Handle entry reflection generation
    if (action === 'generateEntryReflection') {
      const { entry, otherEntries, styleInstructions } = body as PerplexityRequest;
      console.log('Generating entry reflection');

      if (!entry || !entry.content) {
        return errorResponse('Entry content is required', 400);
      }

      // Build context from other entries
      let contextEntries = '';
      if (otherEntries && otherEntries.length > 0) {
        contextEntries = otherEntries
          .slice(0, 3)
          .map(e => `[${e.date}]: ${e.content.slice(0, 200)}...`)
          .join('\n\n');
      }

      const reflectionResponse = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sanitizedApiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are a thoughtful journaling companion. Provide brief, meaningful reflections on journal entries. Be supportive, insightful, and help the person see patterns or new perspectives.`
            },
            {
              role: 'user',
              content: `Reflect on this journal entry:

Date: ${entry.date}
${entry.mood ? `Mood: ${entry.mood}/5` : ''}
${entry.energy ? `Energy: ${entry.energy}/5` : ''}
${entry.tags && entry.tags.length > 0 ? `Tags: ${entry.tags.join(', ')}` : ''}

Entry:
${entry.content}

${contextEntries ? `\nFor context, here are some recent entries:\n${contextEntries}\n` : ''}
Write a brief reflection (2-3 sentences) that:
- Acknowledges what they've shared
- Offers a new perspective or insight
- Connects to patterns if visible in other entries
- Is warm and supportive

Return ONLY the reflection text, nothing else.`
            }
          ],
          temperature: 0.6,
          max_tokens: 250
        }),
      });

      if (!reflectionResponse.ok) {
        const errorText = await reflectionResponse.text();
        console.error('Perplexity reflection error:', reflectionResponse.status, errorText);
        return errorResponse('Failed to generate reflection', reflectionResponse.status);
      }

      const reflectionData = await reflectionResponse.json();
      const reflection = reflectionData.choices?.[0]?.message?.content || '';

      return jsonResponse({ reflection: reflection.trim() });
    }

    const enabledInterests = interests.filter(i => i.keywords && i.keywords.length > 0);
    if (enabledInterests.length === 0) {
      return jsonResponse({ articles: [] });
    }

    // Articles per interest based on brief length
    const articlesPerInterest: Record<string, number> = { short: 4, medium: 8, long: 12 };
    const targetPerInterest = articlesPerInterest[briefLength] || 8;

    // Build interest descriptions for the prompt
    const interestDescriptions = enabledInterests
      .map(i => `- ${i.name}: Focus on ${i.keywords.slice(0, 4).join(', ')}`)
      .join('\n');

    // Just the names for topic tagging
    const topicNames = enabledInterests.map(i => i.name);

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const totalArticles = targetPerInterest * enabledInterests.length;

    // Use Perplexity to search for recent news
    // Using sonar-pro for better online search results
    console.log('Calling Perplexity API for', targetPerInterest, 'articles per interest');
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sanitizedApiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a news researcher. Today is ${today}. Find recent news articles from the past week for each topic category. Always include the source URL for each article.`
          },
          {
            role: 'user',
            content: `Find ${targetPerInterest} recent news articles for EACH of these interest areas (${totalArticles} articles total):

${interestDescriptions}

For each article, provide:
1. The exact headline/title
2. The publication/source name
3. The full URL to the article
4. A 1-2 sentence summary
5. The topic category (use EXACTLY one of: ${topicNames.join(', ')})

Return as JSON array with ${targetPerInterest} articles per topic:
[
  {
    "title": "exact headline",
    "source": "publication name",
    "sourceUrl": "https://full-url-to-article",
    "summary": "1-2 sentence summary",
    "topic": "exact topic name"
  }
]

IMPORTANT: Include exactly ${targetPerInterest} articles for each topic. Only include articles with real, verifiable URLs. Return valid JSON only.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      }),
    });

    console.log('Perplexity API responded with status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      let errorMessage = 'Perplexity API request failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.detail || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return errorResponse(`Perplexity: ${errorMessage}`, response.status);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Try to parse JSON from response
    let articles = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        articles = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse Perplexity response:', e);
    }

    // Add any citations from Perplexity's built-in citation system
    // These are more reliable URLs
    if (citations.length > 0 && articles.length > 0) {
      // Try to match citations to articles or enhance with citation URLs
      articles = articles.map((article: any, index: number) => {
        if (!article.sourceUrl && citations[index]) {
          article.sourceUrl = citations[index];
        }
        return article;
      });
    }

    // Group articles by topic
    const articlesByTopic: Record<string, any[]> = {};
    for (const topicName of topicNames) {
      articlesByTopic[topicName] = articles.filter((a: any) => a.topic === topicName);
    }

    console.log('Articles by topic:', Object.entries(articlesByTopic).map(([t, a]) => `${t}: ${a.length}`).join(', '));

    return jsonResponse({
      articles,
      articlesByTopic,
      topics: topicNames,
      citations // Include raw citations for debugging/fallback
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Perplexity proxy error:', errorMessage, errorStack);
    return errorResponse(`Perplexity error: ${errorMessage}`, 500);
  }
}
