import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import type { Habit, HabitCompletion, HabitWithStats } from '../types';

// Get user ID from localStorage
function getSyncUserId(): string | null {
  const userId = localStorage.getItem('dashboard_user_id');
  return userId ? userId.toLowerCase().trim() : null;
}

// Helper to calculate streak
function calculateStreak(
  habitId: string,
  completions: HabitCompletion[]
): { current: number; best: number } {
  const habitCompletions = completions
    .filter((c) => c.habitId === habitId && c.completed)
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
}

// Helper to calculate completion rate
function calculateCompletionRate(
  habitId: string,
  completions: HabitCompletion[],
  days: number
): number {
  const startDate = subDays(new Date(), days);
  const relevantCompletions = completions.filter((c) => {
    const completionDate = parseISO(c.date);
    return c.habitId === habitId && completionDate >= startDate;
  });

  const completedDays = relevantCompletions.filter((c) => c.completed).length;
  return Math.round((completedDays / days) * 100);
}

interface UseHabitsReturn {
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  habitsWithStats: HabitWithStats[];
  isLoading: boolean;
  error: string | null;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabitCompletion: (habitId: string, date?: string) => Promise<void>;
  setHabitValue: (habitId: string, value: number, date?: string) => Promise<void>;
  getHabitWithStats: (habitId: string) => HabitWithStats | null;
  refreshHabits: () => Promise<void>;
  syncEnabled: boolean;
}

export function useHabits(): UseHabitsReturn {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEnabled = !!getSyncUserId();
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchHabits = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      setHabits([]);
      setHabitCompletions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch habits and completions in parallel
      const [habitsRes, completionsRes] = await Promise.all([
        fetch(`/.netlify/functions/habits?userId=${encodeURIComponent(userId)}`),
        fetch(`/.netlify/functions/habit-completions?userId=${encodeURIComponent(userId)}&days=365`),
      ]);

      if (!habitsRes.ok) throw new Error('Failed to fetch habits');
      if (!completionsRes.ok) throw new Error('Failed to fetch completions');

      const habitsData = await habitsRes.json();
      const completionsData = await completionsRes.json();

      setHabits(habitsData.habits || []);
      setHabitCompletions(completionsData.completions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch habits';
      setError(message);
      console.error('useHabits fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // Calculate stats for a single habit
  const getHabitWithStats = useCallback(
    (habitId: string): HabitWithStats | null => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return null;

      const streaks = calculateStreak(habitId, habitCompletions);
      const todayCompletion = habitCompletions.find(
        (c) => c.habitId === habitId && c.date === today
      );

      return {
        ...habit,
        currentStreak: streaks.current,
        bestStreak: streaks.best,
        completionRate7Days: calculateCompletionRate(habitId, habitCompletions, 7),
        completionRate30Days: calculateCompletionRate(habitId, habitCompletions, 30),
        todayCompleted: todayCompletion?.completed ?? false,
        todayValue: todayCompletion?.value,
      };
    },
    [habits, habitCompletions, today]
  );

  // Calculate stats for all habits
  const habitsWithStats = useMemo(
    () => habits.map((habit) => getHabitWithStats(habit.id)!).filter(Boolean),
    [habits, getHabitWithStats]
  );

  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'createdAt'>): Promise<Habit> => {
    const userId = getSyncUserId();
    if (!userId) {
      throw new Error('Sync not enabled');
    }

    try {
      const response = await fetch(
        `/.netlify/functions/habits?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habit),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add habit');
      }

      const data = await response.json();
      setHabits((prev) => [...prev, data.habit]);
      return data.habit;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add habit';
      setError(message);
      console.error('useHabits add error:', err);
      throw err;
    }
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    // Optimistic update
    setHabits((prev) =>
      prev.map((habit) => (habit.id === id ? { ...habit, ...updates } : habit))
    );

    try {
      const response = await fetch(
        `/.netlify/functions/habits?userId=${encodeURIComponent(userId)}&id=${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update habit');
      }

      const data = await response.json();
      setHabits((prev) =>
        prev.map((habit) => (habit.id === id ? data.habit : habit))
      );
    } catch (err) {
      // Revert on error
      await fetchHabits();
      const message = err instanceof Error ? err.message : 'Failed to update habit';
      setError(message);
      console.error('useHabits update error:', err);
      throw err;
    }
  }, [fetchHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    // Optimistic delete
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
    setHabitCompletions((prev) => prev.filter((c) => c.habitId !== id));

    try {
      const response = await fetch(
        `/.netlify/functions/habits?userId=${encodeURIComponent(userId)}&id=${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete habit');
      }
    } catch (err) {
      // Revert on error
      await fetchHabits();
      const message = err instanceof Error ? err.message : 'Failed to delete habit';
      setError(message);
      console.error('useHabits delete error:', err);
      throw err;
    }
  }, [fetchHabits]);

  const toggleHabitCompletion = useCallback(async (habitId: string, date?: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    const targetDate = date || today;
    const existingCompletion = habitCompletions.find(
      (c) => c.habitId === habitId && c.date === targetDate
    );

    // Optimistic update
    if (existingCompletion?.completed) {
      // Toggle off - remove completion
      setHabitCompletions((prev) =>
        prev.filter((c) => !(c.habitId === habitId && c.date === targetDate))
      );
    } else {
      // Toggle on - add or update completion
      const newCompletion: HabitCompletion = {
        id: existingCompletion?.id || `completion-temp-${Date.now()}`,
        habitId,
        date: targetDate,
        completed: true,
        timestamp: new Date().toISOString(),
      };
      setHabitCompletions((prev) => {
        const filtered = prev.filter(
          (c) => !(c.habitId === habitId && c.date === targetDate)
        );
        return [newCompletion, ...filtered];
      });
    }

    try {
      const response = await fetch(
        `/.netlify/functions/habit-completions?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitId,
            date: targetDate,
            completed: !existingCompletion?.completed,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to toggle completion');
      }

      // Refresh completions to get accurate state
      const completionsRes = await fetch(
        `/.netlify/functions/habit-completions?userId=${encodeURIComponent(userId)}&days=365`
      );
      if (completionsRes.ok) {
        const data = await completionsRes.json();
        setHabitCompletions(data.completions || []);
      }
    } catch (err) {
      // Revert on error
      await fetchHabits();
      const message = err instanceof Error ? err.message : 'Failed to toggle completion';
      setError(message);
      console.error('useHabits toggle error:', err);
    }
  }, [habitCompletions, today, fetchHabits]);

  const setHabitValue = useCallback(async (habitId: string, value: number, date?: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      return;
    }

    const targetDate = date || today;

    // Optimistic update
    const newCompletion: HabitCompletion = {
      id: `completion-temp-${Date.now()}`,
      habitId,
      date: targetDate,
      completed: value > 0,
      value,
      timestamp: new Date().toISOString(),
    };
    setHabitCompletions((prev) => {
      const filtered = prev.filter(
        (c) => !(c.habitId === habitId && c.date === targetDate)
      );
      return [newCompletion, ...filtered];
    });

    try {
      const response = await fetch(
        `/.netlify/functions/habit-completions?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitId,
            date: targetDate,
            completed: value > 0,
            value,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to set habit value');
      }

      // Refresh completions
      const completionsRes = await fetch(
        `/.netlify/functions/habit-completions?userId=${encodeURIComponent(userId)}&days=365`
      );
      if (completionsRes.ok) {
        const data = await completionsRes.json();
        setHabitCompletions(data.completions || []);
      }
    } catch (err) {
      // Revert on error
      await fetchHabits();
      const message = err instanceof Error ? err.message : 'Failed to set habit value';
      setError(message);
      console.error('useHabits setValue error:', err);
    }
  }, [today, fetchHabits]);

  return {
    habits,
    habitCompletions,
    habitsWithStats,
    isLoading,
    error,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitCompletion,
    setHabitValue,
    getHabitWithStats,
    refreshHabits: fetchHabits,
    syncEnabled,
  };
}
