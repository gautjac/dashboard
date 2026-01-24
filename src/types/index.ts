// Core Data Types for Daily Personal Dashboard

export interface Habit {
  id: string;
  name: string;
  description?: string;
  schedule: 'daily' | 'weekly' | 'custom';
  customDays?: number[]; // 0-6 for Sunday-Saturday
  targetType: 'binary' | 'numeric';
  targetValue?: number; // For numeric habits (e.g., "drink 8 glasses")
  targetUnit?: string; // e.g., "glasses", "minutes", "pages"
  tags: string[];
  createdAt: string;
  color?: string;
  icon?: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number; // For numeric habits
  note?: string;
  timestamp: string;
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  bestStreak: number;
  completionRate7Days: number;
  completionRate30Days: number;
  todayCompleted: boolean;
  todayValue?: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  mood?: number; // 1-5 scale
  energy?: number; // 1-5 scale
  tags: string[];
  promptUsed?: string;
  aiReflection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO datetime
  end: string;
  allDay: boolean;
  location?: string;
  calendarId: string;
  calendarName: string;
  color?: string;
}

export interface CalendarAccount {
  id: string;
  email: string;
  provider: 'google';
  connected: boolean;
  calendars: CalendarInfo[];
  lastSync?: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  color: string;
  selected: boolean;
}

export interface DailyBriefItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  whyItMatters?: string;
  topic: string;
  publishedAt?: string;
  fetchedAt: string;
}

export interface InterestArea {
  id: string;
  name: string;
  keywords: string[];
  sources: string[];
  enabled: boolean;
}

export interface DailyBrief {
  date: string;
  items: DailyBriefItem[];
  followUpQuestions: string[];
  generatedAt: string;
}

export interface FocusLine {
  id: string;
  date: string;
  text: string;
  createdAt: string;
}

export type JournalPromptStyleType = 'reflective' | 'creative' | 'tactical' | 'gratitude' | 'mixed';

export interface JournalPromptStyleInstructions {
  reflective?: string;
  creative?: string;
  tactical?: string;
  gratitude?: string;
  mixed?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  showWeather: boolean;
  weatherLocation?: string;
  dailyBriefLength: 'short' | 'medium' | 'long';
  journalPromptStyle: JournalPromptStyleType;
  journalPromptInstructions?: JournalPromptStyleInstructions; // Per-style custom instructions
  computerAccessEnabled: boolean;
  aiAnalysisEnabled: boolean;
  dataExportFormat: 'json' | 'csv';
}

export interface WeeklyInsight {
  id: string;
  weekStart: string;
  themes: string[];
  sentimentTrend: 'improving' | 'stable' | 'declining';
  topStressors: string[];
  topEnergizers: string[];
  habitCorrelations: HabitCorrelation[];
  summary: string;
  generatedAt: string;
}

export interface HabitCorrelation {
  habitId: string;
  habitName: string;
  correlationType: 'positive' | 'negative';
  metricAffected: 'mood' | 'energy';
  strength: number; // 0-1
  description: string;
}

// Journal Prompts
export interface JournalPrompt {
  id: string;
  text: string;
  category: 'reflective' | 'creative' | 'tactical' | 'gratitude' | 'conflict' | 'artist';
  contextual?: boolean; // Uses habits/calendar data
}

// X Bookmarks (via browser extension)
export interface Bookmark {
  id: string;
  text: string;
  author: string;
  url: string;
  savedAt: string;
  source?: 'readwise' | 'extension';
}

export interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export interface ExtensionBookmark {
  id: string;
  tweet_id: string;
  tweet_url: string;
  author_handle: string;
  author_name: string;
  tweet_text: string;
  media_urls: string[];
  bookmarked_at: string;
}

// Weekly Reflection (AI-generated)
export interface WeeklyReflection {
  id: string;
  weekStart: string; // YYYY-MM-DD (Monday of the week)
  weekEnd: string; // YYYY-MM-DD (Sunday of the week)
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
}

// App State
export interface DashboardState {
  // Core data
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  journalEntries: JournalEntry[];
  focusLines: FocusLine[];

  // Calendar
  calendarAccounts: CalendarAccount[];
  calendarEvents: CalendarEvent[];

  // Daily Brief
  interestAreas: InterestArea[];
  dailyBriefs: DailyBrief[];

  // Insights
  weeklyInsights: WeeklyInsight[];
  weeklyReflections: WeeklyReflection[];


  // Settings
  settings: UserSettings;

  // UI State
  currentView: 'dashboard' | 'journal' | 'habits' | 'insights' | 'settings';
  selectedDate: string;
  journalEditorOpen: boolean;
  settingsOpen: boolean;
}
