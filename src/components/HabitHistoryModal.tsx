import { useMemo } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { X, Flame, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useDashboardStore } from '../store';

interface HabitHistoryModalProps {
  onClose: () => void;
}

export function HabitHistoryModal({ onClose }: HabitHistoryModalProps) {
  const { habits, habitCompletions } = useDashboardStore();

  // Generate last 30 days
  const days = useMemo(() => {
    const result = [];
    const today = startOfDay(new Date());
    for (let i = 29; i >= 0; i--) {
      result.push(subDays(today, i));
    }
    return result;
  }, []);

  // Create a lookup map for completions
  const completionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    habitCompletions.forEach((completion) => {
      const key = `${completion.habitId}-${completion.date}`;
      map.set(key, completion.completed);
    });
    return map;
  }, [habitCompletions]);

  // Calculate stats for each habit
  const habitStats = useMemo(() => {
    return habits.map((habit) => {
      let completedDays = 0;
      let currentStreak = 0;
      let tempStreak = 0;

      // Check from today backwards
      for (let i = days.length - 1; i >= 0; i--) {
        const dateStr = format(days[i], 'yyyy-MM-dd');
        const key = `${habit.id}-${dateStr}`;
        const isCompleted = completionMap.get(key) || false;

        if (isCompleted) {
          completedDays++;
          tempStreak++;
        } else {
          // Only count streak from today
          if (i === days.length - 1 || tempStreak === 0) {
            tempStreak = 0;
          } else {
            break;
          }
        }
      }

      // Recalculate streak from today
      currentStreak = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        const dateStr = format(days[i], 'yyyy-MM-dd');
        const key = `${habit.id}-${dateStr}`;
        const isCompleted = completionMap.get(key) || false;
        if (isCompleted) {
          currentStreak++;
        } else {
          break;
        }
      }

      return {
        habit,
        completedDays,
        completionRate: Math.round((completedDays / 30) * 100),
        currentStreak,
      };
    });
  }, [habits, days, completionMap]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-cream rounded-2xl shadow-lifted overflow-hidden"
        style={{ width: '95vw', maxWidth: '900px', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-gray/50">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              Habit History
            </h2>
            <p className="font-ui text-sm text-ink-muted">Last 30 days</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-5" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {habits.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-ui text-sm text-ink-muted">
                No habits to display. Add some habits to start tracking!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Date headers */}
              <div className="flex gap-1 pl-40 sm:pl-48">
                {days.map((day, index) => {
                  const isToday = index === days.length - 1;
                  const isSunday = day.getDay() === 0;
                  const isFirstOfMonth = day.getDate() === 1;

                  return (
                    <div
                      key={day.toISOString()}
                      className="w-5 sm:w-6 flex-shrink-0 text-center"
                    >
                      {(isSunday || isFirstOfMonth || isToday) && (
                        <span className={`font-ui text-[9px] sm:text-[10px] ${isToday ? 'text-terracotta font-medium' : 'text-ink-faint'}`}>
                          {isFirstOfMonth ? format(day, 'MMM') : format(day, 'd')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Habit rows */}
              {habitStats.map(({ habit, completionRate, currentStreak }) => (
                <div key={habit.id} className="flex items-center gap-2">
                  {/* Habit name and stats */}
                  <div className="w-40 sm:w-48 flex-shrink-0 pr-3">
                    <h4 className="font-ui text-sm font-medium text-ink truncate">
                      {habit.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-ui text-xs text-ink-muted">
                        {completionRate}%
                      </span>
                      {currentStreak > 0 && (
                        <span className="flex items-center gap-0.5 font-ui text-xs text-terracotta">
                          <Flame className="w-3 h-3" />
                          {currentStreak}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day cells */}
                  <div className="flex gap-1">
                    {days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const key = `${habit.id}-${dateStr}`;
                      const isCompleted = completionMap.get(key) || false;
                      const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                      return (
                        <div
                          key={dateStr}
                          className={`
                            w-5 h-5 sm:w-6 sm:h-6 rounded-sm flex-shrink-0 transition-colors
                            ${isCompleted
                              ? 'bg-sage hover:bg-sage-dark'
                              : 'bg-warm-gray/50 hover:bg-warm-gray'
                            }
                            ${isToday ? 'ring-2 ring-terracotta ring-offset-1' : ''}
                          `}
                          title={`${habit.name} - ${format(day, 'MMM d, yyyy')}${isCompleted ? ' ✓' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-warm-gray/50">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-warm-gray/50" />
                  <span className="font-ui text-xs text-ink-muted">Not completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-sage" />
                  <span className="font-ui text-xs text-ink-muted">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-warm-gray/50 ring-2 ring-terracotta ring-offset-1" />
                  <span className="font-ui text-xs text-ink-muted">Today</span>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                {habitStats.length > 0 && (
                  <>
                    <div className="bg-warm-gray/30 rounded-lg p-4 text-center">
                      <div className="font-display text-2xl font-semibold text-ink">
                        {Math.round(habitStats.reduce((sum, h) => sum + h.completionRate, 0) / habitStats.length)}%
                      </div>
                      <p className="font-ui text-xs text-ink-muted mt-1">Average completion</p>
                    </div>
                    <div className="bg-warm-gray/30 rounded-lg p-4 text-center">
                      <div className="font-display text-2xl font-semibold text-terracotta flex items-center justify-center gap-1">
                        <Flame className="w-5 h-5" />
                        {Math.max(...habitStats.map(h => h.currentStreak))}
                      </div>
                      <p className="font-ui text-xs text-ink-muted mt-1">Best current streak</p>
                    </div>
                    <div className="bg-warm-gray/30 rounded-lg p-4 text-center">
                      <div className="font-display text-2xl font-semibold text-ink">
                        {habitStats.reduce((sum, h) => sum + h.completedDays, 0)}
                      </div>
                      <p className="font-ui text-xs text-ink-muted mt-1">Total completions</p>
                    </div>
                    <div className="bg-warm-gray/30 rounded-lg p-4 text-center">
                      <div className="font-display text-2xl font-semibold text-sage-dark flex items-center justify-center gap-1">
                        <TrendingUp className="w-5 h-5" />
                        {habitStats.filter(h => h.completionRate >= 80).length}
                      </div>
                      <p className="font-ui text-xs text-ink-muted mt-1">Habits at 80%+</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
