import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';
import type {
  Habit,
  HabitCompletion,
  HabitWithStats,
  JournalEntry,
  FocusLine,
  Todo,
  CalendarEvent,
  CalendarAccount,
  InterestArea,
  DailyBrief,
  DailyImage,
  UserSettings,
  WeeklyInsight,
  WeeklyReflection,
} from '../types';
import { syncService } from '../services/syncService';

interface DashboardStore {
  // Data
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  journalEntries: JournalEntry[];
  focusLines: FocusLine[];
  todos: Todo[];
  calendarAccounts: CalendarAccount[];
  calendarEvents: CalendarEvent[];
  interestAreas: InterestArea[];
  dailyBriefs: DailyBrief[];
  weeklyInsights: WeeklyInsight[];
  weeklyReflections: WeeklyReflection[];
  settings: UserSettings;

  // UI State
  currentView: 'dashboard' | 'journal' | 'habits' | 'insights' | 'settings';
  selectedDate: string;
  journalEditorOpen: boolean;
  settingsOpen: boolean;

  // Habit Actions
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCompletion: (habitId: string, date?: string) => void;
  setHabitValue: (habitId: string, value: number, date?: string) => void;
  getHabitWithStats: (habitId: string) => HabitWithStats | null;
  getHabitsWithStats: () => HabitWithStats[];

  // Journal Actions
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  getTodayEntry: () => JournalEntry | null;
  getEntryByDate: (date: string) => JournalEntry | null;

  // Focus Line Actions
  setFocusLine: (text: string, date?: string) => void;
  getTodayFocusLine: () => FocusLine | null;

  // Todo Actions
  addTodo: (todo: Omit<Todo, 'id' | 'completed' | 'completedAt' | 'createdAt'>) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  setTodos: (todos: Todo[]) => void;

  // Calendar Actions
  addCalendarAccount: (account: Omit<CalendarAccount, 'id'>) => void;
  removeCalendarAccount: (id: string) => void;
  setCalendarEvents: (events: CalendarEvent[]) => void;
  getTodayEvents: () => CalendarEvent[];

  // Daily Brief Actions
  addInterestArea: (area: Omit<InterestArea, 'id'>) => void;
  updateInterestArea: (id: string, updates: Partial<InterestArea>) => void;
  deleteInterestArea: (id: string) => void;
  setDailyBrief: (brief: DailyBrief) => void;
  getTodayBrief: () => DailyBrief | null;
  updateBriefItemInsight: (itemId: string, whyItMatters: string) => void;

  // Settings Actions
  updateSettings: (updates: Partial<UserSettings>) => void;

  // Weekly Reflection Actions
  addWeeklyReflection: (reflection: Omit<WeeklyReflection, 'id'>) => void;
  getWeeklyReflection: (weekStart: string) => WeeklyReflection | null;
  getAllWeeklyReflections: () => WeeklyReflection[];

  // Daily Image Actions
  dailyImage: DailyImage | null;
  setDailyImage: (image: DailyImage) => void;
  getTodayImage: () => DailyImage | null;

  // UI Actions
  setCurrentView: (view: DashboardStore['currentView']) => void;
  setSelectedDate: (date: string) => void;
  setJournalEditorOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  // Sync State & Actions
  syncEnabled: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  setSyncEnabled: (enabled: boolean, userId?: string) => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;

  // Data Management
  clearAllData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const today = () => format(new Date(), 'yyyy-MM-dd');

// Helper to calculate streak
const calculateStreak = (
  habitId: string,
  completions: HabitCompletion[]
): { current: number; best: number } => {
  const habitCompletions = completions
    .filter(c => c.habitId === habitId && c.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (habitCompletions.length === 0) return { current: 0, best: 0 };

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  for (const completion of habitCompletions) {
    const completionDate = parseISO(completion.date);

    if (lastDate === null) {
      // Check if it's today or yesterday for current streak
      const daysDiff = differenceInDays(new Date(), completionDate);
      if (daysDiff <= 1) {
        tempStreak = 1;
        currentStreak = 1;
      } else {
        tempStreak = 1;
      }
    } else {
      const daysDiff = differenceInDays(lastDate, completionDate);
      if (daysDiff === 1) {
        tempStreak++;
        if (currentStreak > 0) currentStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
        if (currentStreak > 0) currentStreak = 0;
      }
    }

    lastDate = completionDate;
  }

  bestStreak = Math.max(bestStreak, tempStreak);
  if (currentStreak > bestStreak) currentStreak = bestStreak;

  return { current: currentStreak, best: Math.max(bestStreak, currentStreak) };
};

// Helper to calculate completion rate
const calculateCompletionRate = (
  habitId: string,
  completions: HabitCompletion[],
  days: number
): number => {
  const startDate = subDays(new Date(), days);
  const relevantCompletions = completions.filter(c => {
    const completionDate = parseISO(c.date);
    return c.habitId === habitId && completionDate >= startDate;
  });

  const completedDays = relevantCompletions.filter(c => c.completed).length;
  return Math.round((completedDays / days) * 100);
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // Initial State
      habits: [],
      habitCompletions: [],
      journalEntries: [],
      focusLines: [],
      todos: [],
      calendarAccounts: [],
      calendarEvents: [],
      interestAreas: [],
      dailyBriefs: [],
      weeklyInsights: [],
      weeklyReflections: [],
      dailyImage: null,
      settings: {
        theme: 'light',
        showWeather: false,
        dailyBriefLength: 'medium',
        journalPromptStyle: 'mixed',
        computerAccessEnabled: false,
        aiAnalysisEnabled: true,
        dataExportFormat: 'json',
      },

      // UI State
      currentView: 'dashboard',
      selectedDate: today(),
      journalEditorOpen: false,
      settingsOpen: false,

      // Habit Actions
      addHabit: (habit) => {
        const newHabit: Habit = {
          ...habit,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set(state => ({ habits: [...state.habits, newHabit] }));
      },

      updateHabit: (id, updates) => {
        set(state => ({
          habits: state.habits.map(h =>
            h.id === id ? { ...h, ...updates } : h
          ),
        }));
      },

      deleteHabit: (id) => {
        set(state => ({
          habits: state.habits.filter(h => h.id !== id),
          habitCompletions: state.habitCompletions.filter(c => c.habitId !== id),
        }));
      },

      toggleHabitCompletion: (habitId, date = today()) => {
        const state = get();
        const existing = state.habitCompletions.find(
          c => c.habitId === habitId && c.date === date
        );

        if (existing) {
          set({
            habitCompletions: state.habitCompletions.map(c =>
              c.id === existing.id ? { ...c, completed: !c.completed } : c
            ),
          });
        } else {
          const newCompletion: HabitCompletion = {
            id: generateId(),
            habitId,
            date,
            completed: true,
            timestamp: new Date().toISOString(),
          };
          set({
            habitCompletions: [...state.habitCompletions, newCompletion],
          });
        }
      },

      setHabitValue: (habitId, value, date = today()) => {
        const state = get();
        const existing = state.habitCompletions.find(
          c => c.habitId === habitId && c.date === date
        );

        if (existing) {
          set({
            habitCompletions: state.habitCompletions.map(c =>
              c.id === existing.id
                ? { ...c, value, completed: value > 0 }
                : c
            ),
          });
        } else {
          const newCompletion: HabitCompletion = {
            id: generateId(),
            habitId,
            date,
            completed: value > 0,
            value,
            timestamp: new Date().toISOString(),
          };
          set({
            habitCompletions: [...state.habitCompletions, newCompletion],
          });
        }
      },

      getHabitWithStats: (habitId) => {
        const state = get();
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit) return null;

        const streaks = calculateStreak(habitId, state.habitCompletions);
        const todayCompletion = state.habitCompletions.find(
          c => c.habitId === habitId && c.date === today()
        );

        return {
          ...habit,
          currentStreak: streaks.current,
          bestStreak: streaks.best,
          completionRate7Days: calculateCompletionRate(habitId, state.habitCompletions, 7),
          completionRate30Days: calculateCompletionRate(habitId, state.habitCompletions, 30),
          todayCompleted: todayCompletion?.completed ?? false,
          todayValue: todayCompletion?.value,
        };
      },

      getHabitsWithStats: () => {
        const state = get();
        return state.habits
          .map(habit => {
            const stats = get().getHabitWithStats(habit.id);
            return stats!;
          })
          .filter(Boolean);
      },

      // Journal Actions
      addJournalEntry: (entry) => {
        const now = new Date().toISOString();
        const newEntry: JournalEntry = {
          ...entry,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set(state => ({ journalEntries: [...state.journalEntries, newEntry] }));
      },

      updateJournalEntry: (id, updates) => {
        set(state => ({
          journalEntries: state.journalEntries.map(e =>
            e.id === id
              ? { ...e, ...updates, updatedAt: new Date().toISOString() }
              : e
          ),
        }));
      },

      deleteJournalEntry: (id) => {
        set(state => ({
          journalEntries: state.journalEntries.filter(e => e.id !== id),
        }));
      },

      getTodayEntry: () => {
        return get().journalEntries.find(e => e.date === today()) ?? null;
      },

      getEntryByDate: (date) => {
        return get().journalEntries.find(e => e.date === date) ?? null;
      },

      // Focus Line Actions
      setFocusLine: (text, date = today()) => {
        const state = get();
        const existing = state.focusLines.find(f => f.date === date);

        if (existing) {
          set({
            focusLines: state.focusLines.map(f =>
              f.id === existing.id ? { ...f, text } : f
            ),
          });
        } else {
          const newFocusLine: FocusLine = {
            id: generateId(),
            date,
            text,
            createdAt: new Date().toISOString(),
          };
          set({ focusLines: [...state.focusLines, newFocusLine] });
        }
      },

      getTodayFocusLine: () => {
        return get().focusLines.find(f => f.date === today()) ?? null;
      },

      // Todo Actions
      addTodo: (todo) => {
        const newTodo: Todo = {
          id: generateId(),
          title: todo.title,
          dueDate: todo.dueDate,
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
          project: todo.project || null,
        };
        set(state => ({
          todos: [...state.todos, newTodo],
        }));
      },

      updateTodo: (id, updates) => {
        set(state => ({
          todos: state.todos.map(t =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      toggleTodo: (id) => {
        set(state => ({
          todos: state.todos.map(t =>
            t.id === id
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? new Date().toISOString() : null,
                }
              : t
          ),
        }));
      },

      deleteTodo: (id) => {
        set(state => ({
          todos: state.todos.filter(t => t.id !== id),
        }));
      },

      setTodos: (todos) => {
        set({ todos });
      },

      // Calendar Actions
      addCalendarAccount: (account) => {
        const newAccount: CalendarAccount = {
          ...account,
          id: generateId(),
        };
        set(state => ({
          calendarAccounts: [...state.calendarAccounts, newAccount],
        }));
      },

      removeCalendarAccount: (id) => {
        set(state => ({
          calendarAccounts: state.calendarAccounts.filter(a => a.id !== id),
        }));
      },

      setCalendarEvents: (events) => {
        set({ calendarEvents: events });
      },

      getTodayEvents: () => {
        const todayStr = today();
        return get().calendarEvents.filter(e => {
          const eventDate = e.start.split('T')[0];
          return eventDate === todayStr;
        });
      },

      // Daily Brief Actions
      addInterestArea: (area) => {
        const newArea: InterestArea = {
          ...area,
          id: generateId(),
        };
        set(state => ({
          interestAreas: [...state.interestAreas, newArea],
        }));
      },

      updateInterestArea: (id, updates) => {
        set(state => ({
          interestAreas: state.interestAreas.map(a =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
      },

      deleteInterestArea: (id) => {
        set(state => ({
          interestAreas: state.interestAreas.filter(a => a.id !== id),
        }));
      },

      setDailyBrief: (brief) => {
        set(state => {
          const existingIndex = state.dailyBriefs.findIndex(
            b => b.date === brief.date
          );
          if (existingIndex >= 0) {
            const newBriefs = [...state.dailyBriefs];
            newBriefs[existingIndex] = brief;
            return { dailyBriefs: newBriefs };
          }
          return { dailyBriefs: [...state.dailyBriefs, brief] };
        });
      },

      getTodayBrief: () => {
        return get().dailyBriefs.find(b => b.date === today()) ?? null;
      },

      updateBriefItemInsight: (itemId, whyItMatters) => {
        set(state => {
          const todayDate = today();
          const briefIndex = state.dailyBriefs.findIndex(b => b.date === todayDate);
          if (briefIndex < 0) return state;

          const brief = state.dailyBriefs[briefIndex];
          const updatedItems = brief.items.map(item =>
            item.id === itemId ? { ...item, whyItMatters } : item
          );

          // Also update itemsByTopic if it exists
          let updatedItemsByTopic = brief.itemsByTopic;
          if (updatedItemsByTopic) {
            updatedItemsByTopic = { ...updatedItemsByTopic };
            for (const topic of Object.keys(updatedItemsByTopic)) {
              updatedItemsByTopic[topic] = updatedItemsByTopic[topic].map(item =>
                item.id === itemId ? { ...item, whyItMatters } : item
              );
            }
          }

          const newBriefs = [...state.dailyBriefs];
          newBriefs[briefIndex] = {
            ...brief,
            items: updatedItems,
            itemsByTopic: updatedItemsByTopic
          };

          return { dailyBriefs: newBriefs };
        });
      },

      // Settings Actions
      updateSettings: (updates) => {
        set(state => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      // Weekly Reflection Actions
      addWeeklyReflection: (reflection) => {
        const id = generateId();
        set(state => {
          // Check if we already have a reflection for this week - update it if so
          const existingIndex = state.weeklyReflections.findIndex(
            r => r.weekStart === reflection.weekStart
          );
          if (existingIndex >= 0) {
            const updated = [...state.weeklyReflections];
            updated[existingIndex] = { ...reflection, id: state.weeklyReflections[existingIndex].id };
            return { weeklyReflections: updated };
          }
          return {
            weeklyReflections: [...state.weeklyReflections, { ...reflection, id }],
          };
        });
      },

      getWeeklyReflection: (weekStart) => {
        return get().weeklyReflections.find(r => r.weekStart === weekStart) || null;
      },

      getAllWeeklyReflections: () => {
        return get().weeklyReflections.sort(
          (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
        );
      },

      // Daily Image Actions
      setDailyImage: (image) => set({ dailyImage: image }),

      getTodayImage: () => {
        const image = get().dailyImage;
        if (!image) return null;
        // Return image only if it's from today
        return image.date === today() ? image : null;
      },

      // UI Actions
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setJournalEditorOpen: (open) => set({ journalEditorOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),

      // Sync State & Actions
      syncEnabled: false,
      syncStatus: 'idle',
      lastSyncedAt: null,

      setSyncEnabled: (enabled, userId) => {
        if (enabled && userId) {
          syncService.setUserId(userId);
        } else if (!enabled) {
          syncService.setUserId(null);
        }
        set({ syncEnabled: enabled });
      },

      syncToServer: async () => {
        const state = get();
        if (!state.syncEnabled) return;

        set({ syncStatus: 'syncing' });
        try {
          const success = await syncService.pushToServer({
            habits: state.habits,
            habitCompletions: state.habitCompletions,
            journalEntries: state.journalEntries,
            focusLines: state.focusLines,
            settings: state.settings,
            interestAreas: state.interestAreas,
            weeklyInsights: state.weeklyInsights,
            weeklyReflections: state.weeklyReflections,
          });

          if (success) {
            set({
              syncStatus: 'idle',
              lastSyncedAt: new Date().toISOString(),
            });
          } else {
            set({ syncStatus: 'error' });
          }
        } catch {
          set({ syncStatus: 'error' });
        }
      },

      loadFromServer: async () => {
        const state = get();
        if (!state.syncEnabled) {
          console.log('[loadFromServer] Sync not enabled, skipping');
          return;
        }

        const userId = syncService.getUserId();
        console.log('[loadFromServer] Starting fetch for userId:', userId);

        set({ syncStatus: 'syncing' });
        try {
          const data = await syncService.fetchFromServer();
          console.log('[loadFromServer] Server response:', {
            hasData: !!data,
            habits: data?.habits?.length ?? 0,
            habitCompletions: data?.habitCompletions?.length ?? 0,
            journalEntries: data?.journalEntries?.length ?? 0,
            settings: data?.settings ? 'present' : 'missing',
            settingsKeys: data?.settings ? Object.keys(data.settings) : [],
          });

          if (data) {
            console.log('[loadFromServer] Setting state with fetched data');
            set({
              habits: data.habits as Habit[],
              habitCompletions: data.habitCompletions as HabitCompletion[],
              journalEntries: data.journalEntries as JournalEntry[],
              focusLines: data.focusLines as FocusLine[],
              interestAreas: data.interestAreas as InterestArea[],
              weeklyInsights: (data.weeklyInsights as WeeklyInsight[]) || state.weeklyInsights,
              weeklyReflections: (data.weeklyReflections as WeeklyReflection[]) || state.weeklyReflections,
              settings: data.settings as UserSettings || state.settings,
              syncStatus: 'idle',
              lastSyncedAt: data.syncedAt,
            });
            console.log('[loadFromServer] State updated successfully');
          } else {
            console.log('[loadFromServer] No data returned from server');
            set({ syncStatus: 'error' });
          }
        } catch (error) {
          console.error('[loadFromServer] Error:', error);
          set({ syncStatus: 'error' });
        }
      },

      // Data Management
      clearAllData: () => {
        set({
          habits: [],
          habitCompletions: [],
          journalEntries: [],
          focusLines: [],
          todos: [],
          calendarAccounts: [],
          calendarEvents: [],
          interestAreas: [],
          dailyBriefs: [],
          weeklyInsights: [],
          weeklyReflections: [],
          dailyImage: null,
          settings: {
            theme: 'light',
            showWeather: false,
            dailyBriefLength: 'medium',
            journalPromptStyle: 'mixed',
            computerAccessEnabled: false,
            aiAnalysisEnabled: true,
            dataExportFormat: 'json',
          },
          syncEnabled: false,
          lastSyncedAt: null,
        });
        // Clear localStorage items for external services
        localStorage.removeItem('gcal_access_token');
        localStorage.removeItem('gcal_token_expiry');
        localStorage.removeItem('gcal_user_email');
      },
    }),
    {
      name: 'daily-dashboard-storage',
      partialize: (state) => ({
        habits: state.habits,
        habitCompletions: state.habitCompletions,
        journalEntries: state.journalEntries,
        focusLines: state.focusLines,
        calendarAccounts: state.calendarAccounts,
        interestAreas: state.interestAreas,
        dailyBriefs: state.dailyBriefs,
        weeklyInsights: state.weeklyInsights,
        weeklyReflections: state.weeklyReflections,
        settings: state.settings,
        syncEnabled: state.syncEnabled,
      }),
    }
  )
);
