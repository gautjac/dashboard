import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { getProjectColor } from '../ProjectSelect';
import type { Todo } from '../../types';

interface MonthCalendarProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (title: string, dueDate: string | null, project?: string | null) => Promise<void>;
  projects: string[];
}

interface DayPopoverProps {
  date: Date;
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (title: string, dueDate: string) => void;
  onClose: () => void;
}

function DayPopover({ date, todos, onToggleTodo, onAddTodo, onClose }: DayPopoverProps) {
  const [newTitle, setNewTitle] = useState('');
  const dateStr = format(date, 'yyyy-MM-dd');

  const dayTodos = todos.filter(t => t.dueDate?.substring(0, 10) === dateStr);
  const incompleteTodos = dayTodos.filter(t => !t.completed);
  const completedTodos = dayTodos.filter(t => t.completed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAddTodo(newTitle.trim(), dateStr);
      setNewTitle('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute z-50 w-64 p-3 bg-paper rounded-lg shadow-lg border border-warm-gray"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-ui text-sm font-medium text-ink">
          {format(date, 'EEEE, MMM d')}
        </span>
        <button onClick={onClose} className="p-1 hover:bg-warm-gray/50 rounded">
          <X className="w-4 h-4 text-ink-muted" />
        </button>
      </div>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="mb-3">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add task..."
          className="w-full px-3 py-2 text-sm font-ui border border-warm-gray rounded-lg bg-cream focus:outline-none focus:border-terracotta"
          autoFocus
        />
      </form>

      {/* Todos */}
      {dayTodos.length === 0 ? (
        <p className="text-center text-sm text-ink-muted py-4">
          No tasks for this day
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {incompleteTodos.map(todo => (
            <button
              key={todo.id}
              onClick={() => onToggleTodo(todo.id)}
              className="w-full flex items-start gap-2 text-left p-2 rounded hover:bg-warm-gray/30"
            >
              <Square className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink-muted" />
              <div className="flex-1 min-w-0">
                <span className="font-ui text-sm text-ink block truncate">
                  {todo.title}
                </span>
                {todo.project && (
                  <span className={`inline-block px-1.5 py-0.5 mt-1 rounded text-xs ${getProjectColor(todo.project)}`}>
                    {todo.project}
                  </span>
                )}
              </div>
            </button>
          ))}
          {completedTodos.length > 0 && (
            <div className="pt-2 border-t border-warm-gray/30">
              {completedTodos.map(todo => (
                <button
                  key={todo.id}
                  onClick={() => onToggleTodo(todo.id)}
                  className="w-full flex items-start gap-2 text-left p-2 rounded hover:bg-warm-gray/30 opacity-60"
                >
                  <CheckSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-sage" />
                  <span className="font-ui text-sm text-ink-muted line-through truncate">
                    {todo.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function MonthCalendar({ todos, onToggleTodo, onAddTodo }: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Generate all days to display
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleAddTodo = async (title: string, dueDate: string) => {
    await onAddTodo(title, dueDate, null);
  };

  // Get todos for a specific date - normalize comparison to handle timezone formats
  const getTodosForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return todos.filter(t => t.dueDate?.substring(0, 10) === dateStr);
  };

  // Get unique projects for a date (for color dots)
  const getProjectsForDate = (date: Date) => {
    const dayTodos = getTodosForDate(date);
    const projectSet = new Set<string>();
    dayTodos.forEach(t => {
      if (t.project && !t.completed) projectSet.add(t.project);
    });
    return Array.from(projectSet).slice(0, 3);
  };

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
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
            onClick={goToNextMonth}
            className="p-1 rounded hover:bg-warm-gray/50 text-ink-muted hover:text-ink"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="font-ui text-sm font-medium text-ink">
          {format(currentDate, 'MMMM yyyy')}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="border border-warm-gray/50 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-warm-gray/20">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
            <div
              key={dayName}
              className="px-1 py-2 text-center border-r border-warm-gray/50 last:border-r-0"
            >
              <span className="font-ui text-xs text-ink-muted">
                {dayName}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {days.map((dayDate) => {
            const isCurrentMonth = isSameMonth(dayDate, currentDate);
            const today = isToday(dayDate);
            const dayTodos = getTodosForDate(dayDate);
            const incompleteTodos = dayTodos.filter(t => !t.completed);
            const dayProjects = getProjectsForDate(dayDate);
            const isSelected = selectedDate && isSameDay(dayDate, selectedDate);

            return (
              <div
                key={dayDate.toISOString()}
                className={`
                  relative min-h-[60px] p-1 border-r border-b border-warm-gray/50
                  last:border-r-0 cursor-pointer hover:bg-warm-gray/20 transition-colors
                  ${!isCurrentMonth ? 'bg-warm-gray/10' : ''}
                  ${today ? 'bg-terracotta/5' : ''}
                `}
                onClick={() => setSelectedDate(isSelected ? null : dayDate)}
              >
                {/* Date number */}
                <div className="flex items-center justify-center mb-1">
                  <span
                    className={`
                      w-6 h-6 flex items-center justify-center font-ui text-xs
                      ${today ? 'bg-terracotta text-cream rounded-full font-medium' : ''}
                      ${!isCurrentMonth ? 'text-ink-muted' : 'text-ink'}
                    `}
                  >
                    {format(dayDate, 'd')}
                  </span>
                </div>

                {/* Todo indicators */}
                {incompleteTodos.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {dayProjects.length > 0 ? (
                      // Show project color dots
                      dayProjects.map(project => (
                        <div
                          key={project}
                          className={`w-2 h-2 rounded-full ${getProjectColor(project).replace('text-', 'bg-').replace('-700', '-500')}`}
                          title={project}
                        />
                      ))
                    ) : (
                      // Show generic dots for todos without projects
                      incompleteTodos.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-terracotta/60"
                        />
                      ))
                    )}
                    {incompleteTodos.length > 3 && (
                      <span className="text-[10px] text-ink-muted">
                        +{incompleteTodos.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Popover */}
                <AnimatePresence>
                  {isSelected && (
                    <DayPopover
                      date={dayDate}
                      todos={todos}
                      onToggleTodo={onToggleTodo}
                      onAddTodo={handleAddTodo}
                      onClose={() => setSelectedDate(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
