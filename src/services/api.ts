/**
 * API Client for Daily Dashboard
 *
 * Communicates with Netlify Functions backend.
 * Automatically includes auth token from Netlify Identity.
 */

import netlifyIdentity from 'netlify-identity-widget';

const API_BASE = '/.netlify/functions';

// Get current auth token
function getAuthToken(): string | null {
  const user = netlifyIdentity.currentUser();
  return user?.token?.access_token || null;
}

// Make authenticated API request
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ============= Habits API =============

export interface HabitData {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency?: 'daily' | 'weekly' | 'custom';
  targetDays?: number[];
  reminderTime?: string;
  isArchived?: boolean;
}

export const habitsApi = {
  getAll: () => apiRequest<{ habits: any[]; completions: any[] }>('habits'),

  create: (data: HabitData) =>
    apiRequest<any>('habits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<HabitData>) =>
    apiRequest<any>(`habits?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`habits?id=${id}`, {
      method: 'DELETE',
    }),

  toggleCompletion: (habitId: string, date: string, notes?: string) =>
    apiRequest<any>('habit-completions', {
      method: 'POST',
      body: JSON.stringify({ habitId, date, notes }),
    }),
};

// ============= Journal API =============

export interface JournalEntryData {
  date: string;
  content: string;
  mood?: number;
  energy?: number;
  tags?: string[];
  promptUsed?: string;
  aiReflection?: string;
}

export const journalApi = {
  getAll: (limit = 30, offset = 0) =>
    apiRequest<any[]>(`journal?limit=${limit}&offset=${offset}`),

  getByDate: (date: string) =>
    apiRequest<any | null>(`journal?date=${date}`),

  getById: (id: string) =>
    apiRequest<any>(`journal?id=${id}`),

  save: (data: JournalEntryData) =>
    apiRequest<any>('journal', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<JournalEntryData>) =>
    apiRequest<any>(`journal?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`journal?id=${id}`, {
      method: 'DELETE',
    }),
};

// ============= Focus Lines API =============

export const focusLinesApi = {
  getByDate: (date: string) =>
    apiRequest<any | null>(`focus-lines?date=${date}`),

  getRecent: (limit = 7) =>
    apiRequest<any[]>(`focus-lines?limit=${limit}`),

  save: (date: string, content: string) =>
    apiRequest<any>('focus-lines', {
      method: 'POST',
      body: JSON.stringify({ date, content }),
    }),

  delete: (date: string) =>
    apiRequest<{ success: boolean }>(`focus-lines?date=${date}`, {
      method: 'DELETE',
    }),
};

// ============= Settings API =============

export interface SettingsData {
  theme?: 'light' | 'dark';
  dailyBriefLength?: 'short' | 'medium' | 'long';
  journalPromptStyle?: 'reflective' | 'creative' | 'tactical' | 'gratitude' | 'mixed';
  computerAccessEnabled?: boolean;
}

export const settingsApi = {
  get: () => apiRequest<any>('settings'),

  update: (data: SettingsData) =>
    apiRequest<any>('settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============= Interests API =============

export interface InterestData {
  name: string;
  keywords?: string[];
  enabled?: boolean;
}

export const interestsApi = {
  getAll: () => apiRequest<any[]>('interests'),

  create: (data: InterestData) =>
    apiRequest<any>('interests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<InterestData>) =>
    apiRequest<any>(`interests?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`interests?id=${id}`, {
      method: 'DELETE',
    }),
};

// ============= AI/Anthropic API =============

export const aiApi = {
  generatePrompt: (recentEntries: any[], habits: any[], promptStyle: string) =>
    apiRequest<{ text: string }>('anthropic', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generatePrompt',
        recentEntries,
        habits,
        promptStyle,
      }),
    }),

  generateReflection: (entry: any, recentEntries: any[]) =>
    apiRequest<{ text: string }>('anthropic', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generateReflection',
        entry,
        recentEntries,
      }),
    }),

  generateBrief: (interests: any[], briefLength: string) =>
    apiRequest<{ items: any[]; followUpQuestions: string[] }>('anthropic', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generateBrief',
        interests,
        briefLength,
      }),
    }),

  generateInsights: (entries: any[], habits: any[], weekStart: string, weekEnd: string) =>
    apiRequest<any>('anthropic', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generateInsights',
        entries,
        habits,
        weekStart,
        weekEnd,
      }),
    }),
};
