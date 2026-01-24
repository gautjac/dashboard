import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import { useDashboardStore } from '../store';
import { anthropicService } from '../services/anthropic';

interface WeeklyReflectionPanelProps {
  onClose: () => void;
}

type ViewMode = 'current' | 'history';

export function WeeklyReflectionPanel({ onClose }: WeeklyReflectionPanelProps) {
  const {
    journalEntries,
    getHabitsWithStats,
    addWeeklyReflection,
    getWeeklyReflection,
    getAllWeeklyReflections,
  } = useDashboardStore();

  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [reflection, setReflection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = anthropicService.isConfigured();
  const isCurrentWeek = isSameWeek(selectedWeek, new Date(), { weekStartsOn: 1 });

  // Get the week's date range
  const weekStart = format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Get data for selected week
  const weekEntries = journalEntries.filter((e) => e.date >= weekStart && e.date <= weekEnd);
  const habits = getHabitsWithStats();

  // Calculate stats for selected week
  const entryCount = weekEntries.length;
  const avgMood =
    weekEntries.length > 0
      ? weekEntries.filter((e) => e.mood).reduce((sum, e) => sum + (e.mood || 0), 0) /
          weekEntries.filter((e) => e.mood).length || null
      : null;
  const avgEnergy =
    weekEntries.length > 0
      ? weekEntries.filter((e) => e.energy).reduce((sum, e) => sum + (e.energy || 0), 0) /
          weekEntries.filter((e) => e.energy).length || null
      : null;
  const totalWords = weekEntries.reduce((sum, e) => sum + (e.content?.split(/\s+/).length || 0), 0);
  const avgCompletion =
    habits.length > 0 ? habits.reduce((sum, h) => sum + h.completionRate7Days, 0) / habits.length : null;

  // Check if we have a saved reflection for this week
  const savedReflection = getWeeklyReflection(weekStart);

  // Load saved reflection when week changes
  useEffect(() => {
    if (savedReflection) {
      setReflection(savedReflection.reflection);
    } else {
      setReflection(null);
    }
  }, [weekStart, savedReflection]);

  const generateReflection = async () => {
    if (!isConfigured) {
      setError('Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await anthropicService.generateWeeklyReflection(weekEntries, habits);
      setReflection(result);

      // Save the reflection
      const topStreaks = habits
        .filter((h) => h.currentStreak > 0)
        .sort((a, b) => b.currentStreak - a.currentStreak)
        .slice(0, 5)
        .map((h) => ({ habitName: h.name, streak: h.currentStreak }));

      addWeeklyReflection({
        weekStart,
        weekEnd,
        reflection: result,
        stats: {
          journalEntryCount: entryCount,
          totalWords,
          avgMood,
          avgEnergy,
          avgHabitCompletion: avgCompletion,
          topStreaks,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate reflection');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on first open for current week if no saved reflection
  useEffect(() => {
    if (!reflection && !savedReflection && isConfigured && isCurrentWeek) {
      generateReflection();
    }
  }, []);

  const getMoodTrend = () => {
    if (!avgMood) return null;
    if (avgMood >= 4) return { icon: TrendingUp, label: 'Great', color: 'text-emerald-500' };
    if (avgMood >= 3) return { icon: Minus, label: 'Steady', color: 'text-yellow-500' };
    return { icon: TrendingDown, label: 'Challenging', color: 'text-orange-500' };
  };

  const moodTrend = getMoodTrend();
  const allReflections = getAllWeeklyReflections();

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeek(subWeeks(selectedWeek, 1));
    } else {
      setSelectedWeek(addWeeks(selectedWeek, 1));
    }
  };

  const selectWeekFromHistory = (weekStartDate: string) => {
    setSelectedWeek(new Date(weekStartDate));
    setViewMode('current');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(28, 25, 23, 0.4)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '32rem',
          height: '100%',
          backgroundColor: '#FFFEF9',
          boxShadow: '0 4px 16px rgba(28, 25, 23, 0.08), 0 12px 32px rgba(28, 25, 23, 0.06)',
          overflowY: 'auto',
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta to-terracotta-dark flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-parchment" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">Weekly Reflection</h2>
                <p className="font-ui text-xs text-ink-muted">
                  {viewMode === 'current' ? 'Your week at a glance' : 'Past reflections'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 p-1 bg-warm-gray/50 rounded-lg mb-4">
            <button
              onClick={() => {
                setViewMode('current');
                setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-ui text-sm transition-colors ${
                viewMode === 'current' ? 'bg-cream shadow-sm text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              This Week
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-ui text-sm transition-colors ${
                viewMode === 'history' ? 'bg-cream shadow-sm text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Calendar className="w-4 h-4" />
              History
            </button>
          </div>

          {viewMode === 'current' ? (
            <>
              {/* Week Navigator */}
              <div className="flex items-center justify-between mb-4 p-2 bg-parchment rounded-lg border border-warm-gray-dark">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-1.5 rounded-md hover:bg-warm-gray transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-ink-muted" />
                </button>
                <div className="text-center">
                  <p className="font-ui text-sm font-medium text-ink">
                    {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM d')} -{' '}
                    {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                  </p>
                  {isCurrentWeek && (
                    <span className="font-ui text-xs text-terracotta">This week</span>
                  )}
                </div>
                <button
                  onClick={() => navigateWeek('next')}
                  disabled={isCurrentWeek}
                  className="p-1.5 rounded-md hover:bg-warm-gray transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-parchment border border-warm-gray-dark">
                  <p className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-1">
                    Journal Entries
                  </p>
                  <p className="font-display text-2xl font-semibold text-ink">{entryCount}</p>
                  <p className="font-ui text-xs text-ink-muted">{totalWords.toLocaleString()} words</p>
                </div>

                <div className="p-3 rounded-xl bg-parchment border border-warm-gray-dark">
                  <p className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-1">
                    Habit Completion
                  </p>
                  <p className="font-display text-2xl font-semibold text-ink">
                    {avgCompletion !== null ? `${Math.round(avgCompletion)}%` : '—'}
                  </p>
                  <p className="font-ui text-xs text-ink-muted">average</p>
                </div>

                {avgMood !== null && (
                  <div className="p-3 rounded-xl bg-parchment border border-warm-gray-dark">
                    <p className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-1">
                      Avg Mood
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-2xl font-semibold text-ink">
                        {avgMood.toFixed(1)}
                      </p>
                      {moodTrend && (
                        <span className={`flex items-center gap-1 font-ui text-xs ${moodTrend.color}`}>
                          <moodTrend.icon className="w-3 h-3" />
                          {moodTrend.label}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {avgEnergy !== null && (
                  <div className="p-3 rounded-xl bg-parchment border border-warm-gray-dark">
                    <p className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-1">
                      Avg Energy
                    </p>
                    <p className="font-display text-2xl font-semibold text-ink">
                      {avgEnergy.toFixed(1)}
                    </p>
                    <p className="font-ui text-xs text-ink-muted">out of 5</p>
                  </div>
                )}
              </div>

              {/* Habit Streaks */}
              {habits.length > 0 && isCurrentWeek && (
                <div className="mb-6">
                  <h3 className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-3">
                    Current Streaks
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {habits
                      .filter((h) => h.currentStreak > 0)
                      .sort((a, b) => b.currentStreak - a.currentStreak)
                      .slice(0, 6)
                      .map((habit) => (
                        <div
                          key={habit.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-light/50 border border-sage/30"
                        >
                          <span className="font-ui text-sm text-ink">{habit.name}</span>
                          <span className="font-display text-sm font-semibold text-sage-dark">
                            {habit.currentStreak}d
                          </span>
                        </div>
                      ))}
                    {habits.filter((h) => h.currentStreak > 0).length === 0 && (
                      <p className="font-ui text-sm text-ink-muted">No active streaks</p>
                    )}
                  </div>
                </div>
              )}

              {/* Saved streaks for past weeks */}
              {savedReflection && !isCurrentWeek && savedReflection.stats.topStreaks.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-3">
                    Top Streaks That Week
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {savedReflection.stats.topStreaks.map((streak, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-light/50 border border-sage/30"
                      >
                        <span className="font-ui text-sm text-ink">{streak.habitName}</span>
                        <span className="font-display text-sm font-semibold text-sage-dark">
                          {streak.streak}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reflection */}
              <div className="rounded-xl bg-gradient-to-br from-terracotta-light/20 to-transparent border border-terracotta-light/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-terracotta" />
                    <h3 className="font-ui text-sm font-medium text-terracotta-dark">AI Reflection</h3>
                  </div>
                  <button
                    onClick={generateReflection}
                    disabled={isLoading || !isConfigured}
                    className="btn-ghost p-1.5 rounded-lg text-terracotta hover:bg-terracotta-light/30 disabled:opacity-50"
                    title={savedReflection ? 'Regenerate reflection' : 'Generate reflection'}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {!isConfigured && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="font-ui text-sm text-yellow-800">
                      Add your Anthropic API key in the .env file to enable AI reflections.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="font-ui text-sm text-red-700">{error}</p>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-terracotta animate-spin" />
                      <span className="font-ui text-sm text-ink-muted">Reflecting on your week...</span>
                    </div>
                  </div>
                )}

                {reflection && !isLoading && (
                  <div className="prose prose-sm max-w-none">
                    <p className="font-body text-ink leading-relaxed whitespace-pre-wrap">{reflection}</p>
                  </div>
                )}

                {!reflection && !isLoading && !error && isConfigured && (
                  <div className="text-center py-6">
                    <p className="font-ui text-sm text-ink-muted mb-3">
                      {entryCount === 0
                        ? 'No journal entries this week to reflect on'
                        : 'Ready to reflect on this week'}
                    </p>
                    {entryCount > 0 && (
                      <button onClick={generateReflection} className="btn btn-primary text-sm">
                        <Sparkles className="w-4 h-4" />
                        Generate Reflection
                      </button>
                    )}
                  </div>
                )}

                {savedReflection && (
                  <p className="font-ui text-xs text-ink-muted mt-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Generated {format(new Date(savedReflection.generatedAt), "MMM d 'at' h:mm a")}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* History View */
            <div className="space-y-3">
              {allReflections.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-ink-muted mx-auto mb-3" />
                  <p className="font-display text-lg text-ink mb-1">No reflections yet</p>
                  <p className="font-ui text-sm text-ink-muted">
                    Generate your first weekly reflection to start building your history.
                  </p>
                </div>
              ) : (
                allReflections.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectWeekFromHistory(r.weekStart)}
                    className="w-full text-left p-4 rounded-xl border border-warm-gray-dark bg-parchment hover:bg-warm-gray/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-ui text-sm font-medium text-ink">
                          {format(new Date(r.weekStart), 'MMM d')} -{' '}
                          {format(new Date(r.weekEnd), 'MMM d, yyyy')}
                        </p>
                        {isSameWeek(new Date(r.weekStart), new Date(), { weekStartsOn: 1 }) && (
                          <span className="font-ui text-xs text-terracotta">This week</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <span>{r.stats.journalEntryCount} entries</span>
                        {r.stats.avgMood && (
                          <span className="flex items-center gap-1">
                            {r.stats.avgMood >= 4 ? (
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : r.stats.avgMood >= 3 ? (
                              <Minus className="w-3 h-3 text-yellow-500" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-orange-500" />
                            )}
                            {r.stats.avgMood.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="font-body text-sm text-ink-light line-clamp-2">{r.reflection}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
