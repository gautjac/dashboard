import { format, subDays } from 'date-fns';
import type {
  Habit,
  HabitCompletion,
  JournalEntry,
  FocusLine,
  CalendarEvent,
  InterestArea,
  DailyBrief,
  JournalPrompt,
} from '../types';

const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

// Sample Habits
export const sampleHabits: Habit[] = [
  {
    id: 'habit-1',
    name: 'Morning meditation',
    description: '10 minutes of mindfulness',
    schedule: 'daily',
    targetType: 'binary',
    tags: ['health', 'mindfulness'],
    createdAt: subDays(new Date(), 30).toISOString(),
    icon: 'brain',
  },
  {
    id: 'habit-2',
    name: 'Read',
    description: 'At least 20 pages',
    schedule: 'daily',
    targetType: 'numeric',
    targetValue: 20,
    targetUnit: 'pages',
    tags: ['learning', 'creative'],
    createdAt: subDays(new Date(), 45).toISOString(),
    icon: 'book',
  },
  {
    id: 'habit-3',
    name: 'Exercise',
    description: '30+ minutes of movement',
    schedule: 'daily',
    targetType: 'binary',
    tags: ['health', 'energy'],
    createdAt: subDays(new Date(), 60).toISOString(),
    icon: 'dumbbell',
  },
  {
    id: 'habit-4',
    name: 'Write',
    description: 'Creative or professional writing',
    schedule: 'daily',
    targetType: 'numeric',
    targetValue: 500,
    targetUnit: 'words',
    tags: ['creative', 'work'],
    createdAt: subDays(new Date(), 20).toISOString(),
    icon: 'pen',
  },
  {
    id: 'habit-5',
    name: 'No screens after 9pm',
    description: 'Digital sunset for better sleep',
    schedule: 'daily',
    targetType: 'binary',
    tags: ['health', 'mindfulness'],
    createdAt: subDays(new Date(), 14).toISOString(),
    icon: 'moon',
  },
];

// Sample Habit Completions (last 14 days)
export const sampleHabitCompletions: HabitCompletion[] = [];
for (let i = 0; i < 14; i++) {
  const date = format(subDays(new Date(), i), 'yyyy-MM-dd');

  // Meditation - completed most days
  if (Math.random() > 0.2) {
    sampleHabitCompletions.push({
      id: `comp-med-${i}`,
      habitId: 'habit-1',
      date,
      completed: true,
      timestamp: subDays(new Date(), i).toISOString(),
    });
  }

  // Reading - completed with varying pages
  if (Math.random() > 0.3) {
    sampleHabitCompletions.push({
      id: `comp-read-${i}`,
      habitId: 'habit-2',
      date,
      completed: true,
      value: Math.floor(Math.random() * 30) + 10,
      timestamp: subDays(new Date(), i).toISOString(),
    });
  }

  // Exercise - completed about half the time
  if (Math.random() > 0.5) {
    sampleHabitCompletions.push({
      id: `comp-ex-${i}`,
      habitId: 'habit-3',
      date,
      completed: true,
      timestamp: subDays(new Date(), i).toISOString(),
    });
  }

  // Writing - completed most days with varying word counts
  if (Math.random() > 0.25) {
    sampleHabitCompletions.push({
      id: `comp-write-${i}`,
      habitId: 'habit-4',
      date,
      completed: true,
      value: Math.floor(Math.random() * 800) + 200,
      timestamp: subDays(new Date(), i).toISOString(),
    });
  }

  // No screens - harder to maintain
  if (Math.random() > 0.4) {
    sampleHabitCompletions.push({
      id: `comp-screens-${i}`,
      habitId: 'habit-5',
      date,
      completed: true,
      timestamp: subDays(new Date(), i).toISOString(),
    });
  }
}

// Sample Journal Entries
export const sampleJournalEntries: JournalEntry[] = [
  {
    id: 'journal-1',
    date: yesterday,
    content: `Today was a good day for creative work. I finally made progress on the projection mapping project I've been thinking about for weeks. The key insight was to stop overthinking the technical details and just start experimenting.\n\nThe morning meditation really helped set the tone. I felt more focused and less anxious about the outcome. I'm noticing a pattern - when I meditate, I tend to be more creative and less reactive.\n\nOne thing I want to explore: the intersection of generative AI and live performance. There's something there.`,
    mood: 4,
    energy: 4,
    tags: ['creative', 'progress', 'insight'],
    promptUsed: 'What made today meaningful?',
    createdAt: subDays(new Date(), 1).toISOString(),
    updatedAt: subDays(new Date(), 1).toISOString(),
  },
  {
    id: 'journal-2',
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    content: `Felt scattered today. Too many meetings, not enough deep work time. I need to protect my mornings better.\n\nGrateful for: the unexpected call with an old friend, the walk I took at lunch, the sunset.\n\nTomorrow I want to: block off 9-12 for focused work, no exceptions.`,
    mood: 3,
    energy: 2,
    tags: ['reflection', 'planning'],
    promptUsed: 'What drained your energy today, and what restored it?',
    createdAt: subDays(new Date(), 2).toISOString(),
    updatedAt: subDays(new Date(), 2).toISOString(),
  },
];

// Sample Focus Line
export const sampleFocusLines: FocusLine[] = [
  {
    id: 'focus-1',
    date: today,
    text: 'Ship the dashboard MVP',
    createdAt: new Date().toISOString(),
  },
];

// Sample Calendar Events (for today)
const now = new Date();
const todayBase = format(now, 'yyyy-MM-dd');

export const sampleCalendarEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Team standup',
    start: `${todayBase}T09:00:00`,
    end: `${todayBase}T09:30:00`,
    allDay: false,
    calendarId: 'work',
    calendarName: 'Work',
    color: '#4285F4',
  },
  {
    id: 'event-2',
    title: 'Focus time: Dashboard design',
    start: `${todayBase}T10:00:00`,
    end: `${todayBase}T12:00:00`,
    allDay: false,
    calendarId: 'work',
    calendarName: 'Work',
    color: '#34A853',
  },
  {
    id: 'event-3',
    title: 'Lunch with Alex',
    start: `${todayBase}T12:30:00`,
    end: `${todayBase}T13:30:00`,
    allDay: false,
    location: 'Cafe Milano',
    calendarId: 'personal',
    calendarName: 'Personal',
    color: '#EA4335',
  },
  {
    id: 'event-4',
    title: 'Project review',
    start: `${todayBase}T14:00:00`,
    end: `${todayBase}T15:00:00`,
    allDay: false,
    calendarId: 'work',
    calendarName: 'Work',
    color: '#4285F4',
  },
  {
    id: 'event-5',
    title: 'Yoga class',
    start: `${todayBase}T18:00:00`,
    end: `${todayBase}T19:00:00`,
    allDay: false,
    location: 'Mindful Movement Studio',
    calendarId: 'personal',
    calendarName: 'Personal',
    color: '#9C27B0',
  },
];

// Sample Interest Areas
export const sampleInterestAreas: InterestArea[] = [
  {
    id: 'interest-1',
    name: 'AI in Creative Tools',
    keywords: ['generative AI', 'AI music', 'AI art', 'creative coding'],
    sources: ['Hacker News', 'TechCrunch', 'The Verge'],
    enabled: true,
  },
  {
    id: 'interest-2',
    name: 'Projection Mapping',
    keywords: ['projection mapping', 'video mapping', 'immersive art', 'TouchDesigner'],
    sources: ['Creative Applications', 'Prosthetic Knowledge'],
    enabled: true,
  },
  {
    id: 'interest-3',
    name: 'Productivity & Tools',
    keywords: ['note-taking apps', 'personal knowledge management', 'PKM', 'second brain'],
    sources: ['Nesslabs', 'Ness Labs', 'Forte Labs'],
    enabled: true,
  },
];

// Sample Daily Brief
export const sampleDailyBrief: DailyBrief = {
  date: today,
  items: [
    {
      id: 'brief-1',
      title: 'Anthropic releases new Claude model with enhanced reasoning',
      summary: 'The latest Claude update focuses on improved logical reasoning and code generation capabilities.',
      source: 'Hacker News',
      sourceUrl: 'https://news.ycombinator.com',
      whyItMatters: 'Could improve the AI analysis features you\'re building.',
      topic: 'AI in Creative Tools',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'brief-2',
      title: 'New TouchDesigner integration with Stable Diffusion',
      summary: 'A community developer has created a seamless bridge between TouchDesigner and SD models for real-time generative visuals.',
      source: 'Creative Applications',
      whyItMatters: 'Directly relevant to your projection mapping experiments.',
      topic: 'Projection Mapping',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'brief-3',
      title: 'The rise of "slow productivity" in knowledge work',
      summary: 'Cal Newport\'s new book argues for doing fewer things, but doing them well, with obsession.',
      source: 'Ness Labs',
      whyItMatters: 'Aligns with your focus on reducing cognitive load in this dashboard.',
      topic: 'Productivity & Tools',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'brief-4',
      title: 'Open source alternative to Notion gains traction',
      summary: 'AppFlowy reaches 50k GitHub stars as privacy-conscious users seek alternatives.',
      source: 'Hacker News',
      whyItMatters: 'Worth watching for personal knowledge management trends.',
      topic: 'Productivity & Tools',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'brief-5',
      title: 'Udio launches AI music generation with improved vocals',
      summary: 'The latest update addresses previous criticism about vocal quality in AI-generated music.',
      source: 'TechCrunch',
      whyItMatters: 'Could be useful for your multimedia projects.',
      topic: 'AI in Creative Tools',
      fetchedAt: new Date().toISOString(),
    },
  ],
  followUpQuestions: [
    'How might you combine TouchDesigner\'s new SD integration with your existing projection work?',
    'What aspects of "slow productivity" could you apply to your current projects?',
    'Is there a way to use AI music tools in your live performance concepts?',
  ],
  generatedAt: new Date().toISOString(),
};

// Journal Prompts by Category
export const journalPrompts: JournalPrompt[] = [
  // Reflective
  { id: 'p1', text: 'What made today meaningful?', category: 'reflective' },
  { id: 'p2', text: 'What drained your energy today, and what restored it?', category: 'reflective' },
  { id: 'p3', text: 'What would you tell your morning self right now?', category: 'reflective' },
  { id: 'p4', text: 'What surprised you today?', category: 'reflective' },
  { id: 'p5', text: 'What are you avoiding, and why?', category: 'reflective' },

  // Creative
  { id: 'p6', text: 'If you could design your ideal tomorrow, what would it look like?', category: 'creative' },
  { id: 'p7', text: 'What idea has been quietly growing in the back of your mind?', category: 'creative' },
  { id: 'p8', text: 'Describe a moment from today as if it were a scene in a film.', category: 'creative' },
  { id: 'p9', text: 'What would you create if you knew it couldn\'t fail?', category: 'creative' },

  // Tactical
  { id: 'p10', text: 'What\'s the one thing that would make tomorrow successful?', category: 'tactical' },
  { id: 'p11', text: 'What can you simplify or eliminate this week?', category: 'tactical' },
  { id: 'p12', text: 'What decision have you been putting off?', category: 'tactical' },

  // Gratitude
  { id: 'p13', text: 'Name three small moments of beauty from today.', category: 'gratitude' },
  { id: 'p14', text: 'Who made a difference in your day, even in a tiny way?', category: 'gratitude' },
  { id: 'p15', text: 'What challenge are you grateful for?', category: 'gratitude' },

  // Conflict Resolution
  { id: 'p16', text: 'Is there a tension you\'re carrying? What would resolution look like?', category: 'conflict' },
  { id: 'p17', text: 'What would compassion toward yourself look like right now?', category: 'conflict' },

  // Artist/Creator
  { id: 'p18', text: 'What creative risk feels worth taking?', category: 'artist' },
  { id: 'p19', text: 'What would you make if no one would ever see it?', category: 'artist' },
  { id: 'p20', text: 'Where do you sense creative energy waiting to be released?', category: 'artist' },
];

// Get a random prompt
export const getRandomPrompt = (category?: JournalPrompt['category']): JournalPrompt => {
  const filtered = category
    ? journalPrompts.filter(p => p.category === category)
    : journalPrompts;
  return filtered[Math.floor(Math.random() * filtered.length)];
};

// Get today's prompt (consistent for the day)
export const getTodayPrompt = (): JournalPrompt => {
  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return journalPrompts[dayOfYear % journalPrompts.length];
};
