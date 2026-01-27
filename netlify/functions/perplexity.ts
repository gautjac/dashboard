import type { Context } from '@netlify/functions';
import { jsonResponse, errorResponse } from './utils/db';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityRequest {
  interests: { name: string; keywords: string[] }[];
  briefLength: 'short' | 'medium' | 'long';
  apiKey: string;
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    console.log('Perplexity function started');
    const body = await req.json();
    console.log('Request body parsed');
    const { interests, briefLength, apiKey } = body as PerplexityRequest;

    if (!apiKey) {
      return errorResponse('Perplexity API key is required', 400);
    }

    // Sanitize API key - remove any non-ASCII characters that might have been copied
    const sanitizedApiKey = apiKey.replace(/[^\x00-\x7F]/g, '').trim();
    if (sanitizedApiKey.length !== apiKey.length) {
      console.log('API key sanitized - removed', apiKey.length - sanitizedApiKey.length, 'non-ASCII characters');
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
