import type { Context } from '@netlify/functions';
import { getDb, jsonResponse, errorResponse } from './utils/db';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Fetch page content and generate summary using Claude
async function generateSummary(url: string): Promise<{ title: string; summary: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API not configured');
  }

  // Fetch the page content
  let pageContent = '';
  let pageTitle = '';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyDashboard/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Extract title from HTML
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : '';

      // Strip HTML tags and get text content (simple approach)
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000); // Limit content length
    }
  } catch (err) {
    console.error('Failed to fetch page:', err);
  }

  // Generate summary with Claude
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: 'You are a helpful assistant that summarizes web pages. Provide concise, informative summaries.',
      messages: [{
        role: 'user',
        content: `Summarize this web page in 2-3 sentences. Focus on the main topic and key takeaways.

URL: ${url}
${pageTitle ? `Page Title: ${pageTitle}` : ''}
${pageContent ? `\nContent excerpt:\n${pageContent}` : '\n(Unable to fetch page content - provide a general summary based on the URL if possible)'}

Return JSON with this structure:
{
  "title": "A concise, descriptive title for this page",
  "summary": "2-3 sentence summary of the content"
}

If you can't determine the content, use the URL to make an educated guess about what the page might contain.`
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Anthropic API error:', error);
    throw new Error('Failed to generate summary');
  }

  const data = await response.json();
  const textBlock = data.content?.find((c: any) => c.type === 'text');
  const text = textBlock?.text || '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || pageTitle || url,
        summary: parsed.summary || 'Unable to generate summary',
      };
    }
  } catch (e) {
    console.error('Failed to parse summary JSON:', e);
  }

  return {
    title: pageTitle || url,
    summary: 'Unable to generate summary',
  };
}

export default async function handler(req: Request, _context: Context) {
  const sql = getDb();
  const url = new URL(req.url);

  // Get user ID from query params (for sync service compatibility)
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return errorResponse('User ID required', 401);
  }

  // GET - List links
  if (req.method === 'GET') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const archived = url.searchParams.get('archived') === 'true';

      const links = archived
        ? await sql`
            SELECT id, url, title, summary, saved_at, archived_at
            FROM links
            WHERE user_id = ${userId} AND archived_at IS NOT NULL
            ORDER BY archived_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await sql`
            SELECT id, url, title, summary, saved_at, archived_at
            FROM links
            WHERE user_id = ${userId} AND archived_at IS NULL
            ORDER BY saved_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

      const countResult = archived
        ? await sql`
            SELECT COUNT(*) as total FROM links
            WHERE user_id = ${userId} AND archived_at IS NOT NULL
          `
        : await sql`
            SELECT COUNT(*) as total FROM links
            WHERE user_id = ${userId} AND archived_at IS NULL
          `;

      return jsonResponse({
        links: links.map((l: any) => ({
          id: l.id,
          url: l.url,
          title: l.title,
          summary: l.summary,
          savedAt: l.saved_at,
          archivedAt: l.archived_at,
        })),
        total: parseInt(countResult[0].total),
      });
    } catch (error) {
      console.error('Links fetch error:', error);
      return errorResponse('Failed to fetch links', 500);
    }
  }

  // POST - Create link
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { url: linkUrl } = body;

      if (!linkUrl) {
        return errorResponse('URL is required', 400);
      }

      const id = generateId();

      // Insert link without summary first
      await sql`
        INSERT INTO links (id, user_id, url, saved_at)
        VALUES (${id}, ${userId}, ${linkUrl}, NOW())
        ON CONFLICT (user_id, url) DO UPDATE SET
          saved_at = NOW()
        RETURNING id
      `;

      // Fetch the link to return
      const result = await sql`
        SELECT id, url, title, summary, saved_at
        FROM links
        WHERE user_id = ${userId} AND url = ${linkUrl}
      `;

      return jsonResponse({
        link: {
          id: result[0].id,
          url: result[0].url,
          title: result[0].title,
          summary: result[0].summary,
          savedAt: result[0].saved_at,
        },
      }, 201);
    } catch (error) {
      console.error('Link create error:', error);
      return errorResponse('Failed to create link', 500);
    }
  }

  // PUT - Update link (generate summary)
  if (req.method === 'PUT') {
    try {
      const linkId = url.searchParams.get('id');
      if (!linkId) {
        return errorResponse('Link ID required', 400);
      }

      const body = await req.json();
      const { action } = body;

      if (action === 'summarize') {
        // Get the link
        const links = await sql`
          SELECT url FROM links WHERE id = ${linkId} AND user_id = ${userId}
        `;

        if (links.length === 0) {
          return errorResponse('Link not found', 404);
        }

        // Generate summary
        const { title, summary } = await generateSummary(links[0].url);

        // Update link with summary
        await sql`
          UPDATE links
          SET title = ${title}, summary = ${summary}
          WHERE id = ${linkId} AND user_id = ${userId}
        `;

        const result = await sql`
          SELECT id, url, title, summary, saved_at, archived_at
          FROM links
          WHERE id = ${linkId} AND user_id = ${userId}
        `;

        return jsonResponse({
          link: {
            id: result[0].id,
            url: result[0].url,
            title: result[0].title,
            summary: result[0].summary,
            savedAt: result[0].saved_at,
            archivedAt: result[0].archived_at,
          },
        });
      }

      if (action === 'archive') {
        await sql`
          UPDATE links
          SET archived_at = NOW()
          WHERE id = ${linkId} AND user_id = ${userId}
        `;
        return jsonResponse({ success: true });
      }

      if (action === 'restore') {
        await sql`
          UPDATE links
          SET archived_at = NULL
          WHERE id = ${linkId} AND user_id = ${userId}
        `;
        return jsonResponse({ success: true });
      }

      return errorResponse('Invalid action', 400);
    } catch (error) {
      console.error('Link update error:', error);
      return errorResponse('Failed to update link', 500);
    }
  }

  // DELETE - Remove link
  if (req.method === 'DELETE') {
    try {
      const linkId = url.searchParams.get('id');
      if (!linkId) {
        return errorResponse('Link ID required', 400);
      }

      await sql`
        DELETE FROM links WHERE id = ${linkId} AND user_id = ${userId}
      `;

      return jsonResponse({ success: true });
    } catch (error) {
      console.error('Link delete error:', error);
      return errorResponse('Failed to delete link', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
