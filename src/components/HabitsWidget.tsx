import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Flame,
  TrendingUp,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  BookOpen,
  Dumbbell,
  Pencil,
  Moon,
  Brain,
  CalendarDays,
  Settings2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHabits } from '../hooks';
import { useCollapsedState } from '../hooks/useCollapsedState';
import { HabitHistoryModal } from './HabitHistoryModal';
import { AddHabitModal } from './AddHabitModal';
import { EditHabitModal } from './EditHabitModal';
import type { HabitWithStats } from '../types';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  brain: <Brain className="w-4 h-4" />,
  book: <BookOpen className="w-4 h-4" />,
  dumbbell: <Dumbbell className="w-4 h-4" />,
  pen: <Pencil className="w-4 h-4" />,
  moon: <Moon className="w-4 h-4" />,
  default: <Sparkles className="w-4 h-4" />,
};

interface HabitItemProps {
  habit: HabitWithStats;
  onToggle: () => void;
  onSetValue?: (value: number) => void;
  onEdit: () => void;
}

function HabitItem({ habit, onToggle, onSetValue, onEdit }: HabitItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [inputValue, setInputValue] = useState(
    habit.todayValue?.toString() || ''
  );

  const handleNumericSubmit = () => {
    const value = parseInt(inputValue, 10);
    if (!isNaN(value) && value >= 0 && onSetValue) {
      onSetValue(value);
    }
  };

  const icon = iconMap[habit.icon || 'default'] || iconMap.default;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border transition-all duration-200
        ${
          habit.todayCompleted
            ? 'bg-sage-light/30 border-sage/30'
            : 'bg-cream border-warm-gray/50 hover:border-warm-gray-dark'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {habit.targetType === 'binary' ? (
            <button
              onClick={onToggle}
              className="mt-0.5 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 rounded-full"
            >
              <AnimatePresence mode="wait">
                {habit.todayCompleted ? (
                  <motion.div
                    key="checked"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CheckCircle2 className="w-6 h-6 text-sage-dark" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="unchecked"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Circle className="w-6 h-6 text-ink-faint hover:text-ink-muted transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          ) : (
            <div
              className={`
                mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                ${habit.todayCompleted ? 'bg-sage-dark text-white' : 'bg-warm-gray text-ink-muted'}
              `}
            >
              {icon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4
                className={`
                  font-ui font-medium text-sm
                  ${habit.todayCompleted ? 'text-ink-light' : 'text-ink'}
                `}
              >
                {habit.name}
              </h4>

              {/* Streak badge */}
              {habit.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-ui font-medium text-terracotta-dark bg-terracotta-light/50 px-1.5 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" />
                  {habit.currentStreak}
                </span>
              )}
            </div>

            {/* Description or numeric input */}
            {habit.targetType === 'numeric' ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handleNumericSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleNumericSubmit()}
                  placeholder="0"
                  className="w-16 px-2 py-1 text-sm font-ui bg-cream text-ink border border-warm-gray-dark rounded-md focus:outline-none focus:border-terracotta placeholder:text-ink-faint"
                />
                <span className="text-xs text-ink-muted font-ui">
                  / {habit.targetValue} {habit.targetUnit}
                </span>

                {/* Progress indicator */}
                {habit.todayValue && habit.targetValue && (
                  <div className="flex-1 max-w-24">
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            (habit.todayValue / habit.targetValue) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : habit.description ? (
              <p className="font-ui text-xs text-ink-muted mt-0.5">
                {habit.description}
              </p>
            ) : null}
          </div>

          {/* Expand button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 rounded-md text-ink-faint hover:text-ink-muted hover:bg-warm-gray transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="pt-3 border-t border-warm-gray-dark/30">
                <div className="grid grid-cols-3 gap-4">
                  {/* Current streak */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-terracotta">
                      <Flame className="w-4 h-4" />
                      <span className="font-display text-xl font-semibold">
                        {habit.currentStreak}
                      </span>
                    </div>
                    <p className="font-ui text-[10px] text-ink-muted uppercase tracking-wide mt-0.5">
                      Current streak
                    </p>
                  </div>

                  {/* Best streak */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-ink-light">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-display text-xl font-semibold">
                        {habit.bestStreak}
                      </span>
                    </div>
                    <p className="font-ui text-[10px] text-ink-muted uppercase tracking-wide mt-0.5">
                      Best streak
                    </p>
                  </div>

                  {/* 7-day rate */}
                  <div className="text-center">
                    <span className="font-display text-xl font-semibold text-ink-light">
                      {habit.completionRate7Days}%
                    </span>
                    <p className="font-ui text-[10px] text-ink-muted uppercase tracking-wide mt-0.5">
                      Last 7 days
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {habit.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {habit.tags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-neutral text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Edit button */}
                <button
                  onClick={onEdit}
                  className="mt-3 flex items-center gap-1.5 font-ui text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Edit habit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HabitsWidget() {
  const {
    habitsWithStats,
    toggleHabitCompletion,
    setHabitValue,
  } = useHabits();

  const [showHistory, setShowHistory] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStats | null>(null);
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('habits');
  const completedCount = habitsWithStats.filter((h) => h.todayCompleted).length;
  const totalCount = habitsWithStats.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="card p-5"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${!isCollapsed ? 'mb-4' : ''}`}>
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-ink-muted" />
          </motion.div>
          <CheckCircle2 className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            Today's Habits
          </h3>
          {isCollapsed && habitsWithStats.length > 0 && (
            <span className="font-ui text-sm text-ink-muted">
              ({completedCount}/{totalCount})
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(true)}
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-terracotta"
            title="View 30-day history"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddHabit(true)}
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="Add habit"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Progress overview */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-ui text-sm text-ink-muted">
                  {completedCount} of {totalCount} completed
                </span>
                <span className="font-ui text-sm font-medium text-ink">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="progress-bar h-2">
                <motion.div
                  className="progress-bar-fill h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>

            {/* Habits list */}
            {habitsWithStats.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warm-gray flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-ink-muted" />
                </div>
                <p className="font-ui text-sm text-ink-muted mb-4">
                  Start building positive routines
                </p>
                <button
                  onClick={() => setShowAddHabit(true)}
                  className="btn btn-secondary text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add your first habit
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {habitsWithStats.map((habit) => (
                  <HabitItem
                    key={habit.id}
                    habit={habit}
                    onToggle={() => toggleHabitCompletion(habit.id)}
                    onSetValue={
                      habit.targetType === 'numeric'
                        ? (value) => setHabitValue(habit.id, value)
                        : undefined
                    }
                    onEdit={() => setEditingHabit(habit)}
                  />
                ))}
              </div>
            )}

            {/* Encouragement message */}
            {completedCount === totalCount && totalCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 p-3 rounded-lg bg-sage-light/40 border border-sage/30 text-center"
              >
                <p className="font-display text-sm text-sage-dark">
                  All habits completed today! You're on fire.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && <HabitHistoryModal onClose={() => setShowHistory(false)} />}
      </AnimatePresence>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {showAddHabit && <AddHabitModal onClose={() => setShowAddHabit(false)} />}
      </AnimatePresence>

      {/* Edit Habit Modal */}
      <AnimatePresence>
        {editingHabit && (
          <EditHabitModal
            habit={editingHabit}
            onClose={() => setEditingHabit(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
