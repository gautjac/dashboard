import { neon } from '@neondatabase/serverless';

// Create a SQL query function using the connection string from environment
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return neon(databaseUrl);
}

// Helper to get user ID from Netlify Identity
export function getUserIdFromContext(context: any): string | null {
  const user = context.clientContext?.user;
  if (!user?.sub) {
    return null;
  }
  return user.sub;
}

// Helper to get user email from context
export function getUserEmailFromContext(context: any): string | null {
  const user = context.clientContext?.user;
  return user?.email || null;
}

// Ensure user exists in database (create if not)
export async function ensureUser(sql: any, netlifyUserId: string, email: string, name?: string) {
  // Try to find existing user by email
  const existing = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new user
  const result = await sql`
    INSERT INTO users (id, email, name)
    VALUES (${netlifyUserId}, ${email}, ${name || email.split('@')[0]})
    ON CONFLICT (email) DO UPDATE SET email = ${email}
    RETURNING id
  `;

  // Also create default settings
  await sql`
    INSERT INTO user_settings (user_id)
    VALUES (${result[0].id})
    ON CONFLICT (user_id) DO NOTHING
  `;

  return result[0].id;
}

// Standard response helpers
export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function unauthorizedResponse() {
  return errorResponse('Unauthorized', 401);
}
