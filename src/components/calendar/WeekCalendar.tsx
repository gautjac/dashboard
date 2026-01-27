import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  Square,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday,
} from 'date-fns';
import { getProjectColor } from '../ProjectSelect';
import type { Todo } from '../../types';

interface WeekCalendarProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (title: string, dueDate: string | null, project?: string | null) => Promise<void>;
  projects: string[];
}

interface DayCellProps {
  date: Date;
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (title: string, dueDate: string) => void;
}

function DayCell({ date, todos, onToggleTodo, onAddTodo }: DayCellProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const today = isToday(date);
  const dateStr = format(date, 'yyyy-MM-dd');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAddTodo(newTitle.trim(), dateStr);
      setNewTitle('');
      setShowAddInput(false);
    }
  };

  // Filter todos for this day - normalize date comparison to handle timezone formats
  const dayTodos = todos.filter(t => t.dueDate?.substring(0, 10) === dateStr);
  const incompleteTodos = dayTodos.filter(t => !t.completed);
  const completedTodos = dayTodos.filter(t => t.completed);

  return (
    <div className={`min-h-[120px] p-2 border-r border-b border-warm-gray/50 ${today ? 'bg-terracotta/5' : ''}`}>
      {/* Day header */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-center ${today ? 'bg-terracotta text-cream rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>
          <span className={`font-ui text-sm font-medium ${today ? '' : 'text-ink'}`}>
            {format(date, 'd')}
          </span>
        </div>
        <button
          onClick={() => setShowAddInput(true)}
          className="p-1 rounded hover:bg-warm-gray/50 text-ink-muted hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Add input */}
      <AnimatePresence>
        {showAddInput && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAddSubmit}
            className="mb-2"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add task..."
              className="w-full px-2 py-1 text-xs font-ui border border-warm-gray rounded bg-paper focus:outline-none focus:border-terracotta"
              autoFocus
              onBlur={() => {
                if (!newTitle.trim()) setShowAddInput(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowAddInput(false);
                  setNewTitle('');
                }
              }}
            />
          </motion.form>
        )}
      </AnimatePresence>

      {/* Todos */}
      <div className="space-y-1">
        {incompleteTodos.map(todo => (
          <button
            key={todo.id}
            onClick={() => onToggleTodo(todo.id)}
            className="w-full flex items-start gap-1.5 text-left group/todo"
          >
            <Square className="w-3 h-3 mt-0.5 flex-shrink-0 text-ink-muted group-hover/todo:text-ink" />
            <span className="font-ui text-xs text-ink leading-tight truncate">
              {todo.title}
            </span>
            {todo.project && (
              <span className={`px-1 py-0.5 rounded text-[10px] flex-shrink-0 ${getProjectColor(todo.project)}`}>
                {todo.project.charAt(0)}
              </span>
            )}
          </button>
        ))}
        {completedTodos.length > 0 && (
          <div className="pt-1 border-t border-warm-gray/30">
            {completedTodos.slice(0, 2).map(todo => (
              <button
                key={todo.id}
                onClick={() => onToggleTodo(todo.id)}
                className="w-full flex items-start gap-1.5 text-left opacity-50"
              >
                <CheckSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-sage" />
                <span className="font-ui text-xs text-ink-muted leading-tight truncate line-through">
                  {todo.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function WeekCalendar({ todos, onToggleTodo, onAddTodo }: WeekCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get the start of the week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Generate days of the week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  const handleAddTodo = async (title: string, dueDate: string) => {
    await onAddTodo(title, dueDate, null);
  };

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-1 rounded hover:bg-warm-gray/50 text-ink-muted hover:text-ink"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs font-ui text-ink-muted hover:text-ink hover:bg-warm-gray/50 rounded"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1 rounded hover:bg-warm-gray/50 text-ink-muted hover:text-ink"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="font-ui text-sm text-ink">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
      </div>

      {/* Week grid */}
      <div className="border-t border-l border-warm-gray/50 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {days.map(day => (
            <div
              key={day.toISOString()}
              className="px-2 py-1 text-center border-r border-b border-warm-gray/50 bg-warm-gray/20"
            >
              <span className="font-ui text-xs text-ink-muted">
                {format(day, 'EEE')}
              </span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 group">
          {days.map(day => (
            <DayCell
              key={day.toISOString()}
              date={day}
              todos={todos}
              onToggleTodo={onToggleTodo}
              onAddTodo={handleAddTodo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
