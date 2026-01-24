import { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  ChevronRight,
  Trash2,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { useTodos } from '../hooks/useTodos';
import { useCollapsedState } from '../hooks/useCollapsedState';
import type { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '';

  const date = parseISO(dueDate);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

function getDueDateColor(dueDate: string | null, completed: boolean): string {
  if (completed || !dueDate) return 'text-ink-muted';

  const date = parseISO(dueDate);
  if (isPast(date) && !isToday(date)) return 'text-red-500';
  if (isToday(date)) return 'text-terracotta';
  return 'text-ink-muted';
}

function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-warm-gray/30 transition-colors"
    >
      <button
        onClick={onToggle}
        className="flex-shrink-0 focus:outline-none"
      >
        {todo.completed ? (
          <CheckSquare className="w-5 h-5 text-sage" />
        ) : (
          <Square className="w-5 h-5 text-ink-muted hover:text-ink transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-ui text-sm ${todo.completed ? 'text-ink-muted line-through' : 'text-ink'}`}>
          {todo.title}
        </p>
      </div>

      {todo.dueDate && (
        <span className={`flex-shrink-0 font-ui text-xs ${getDueDateColor(todo.dueDate, todo.completed)}`}>
          {formatDueDate(todo.dueDate)}
        </span>
      )}

      <button
        onClick={onDelete}
        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function TodosWidget() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo, refreshTodos } = useTodos();
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('todos');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // Separate completed and incomplete todos
  const incompleteTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const title = newTitle.trim();
    const dueDate = newDueDate || null;

    // Clear form and hide immediately
    setNewTitle('');
    setNewDueDate('');
    setShowAddForm(false);

    try {
      await addTodo(title, dueDate);
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
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
          <CheckSquare className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            To-Do
          </h3>
          {isCollapsed && incompleteTodos.length > 0 && (
            <span className="font-ui text-sm text-ink-muted">
              ({incompleteTodos.length})
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={refreshTodos}
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {!isCollapsed && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
              title="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
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
            {/* Add form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleAddTodo}
                  className="mb-4 p-3 rounded-lg bg-warm-gray/30 overflow-hidden"
                >
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-3 py-2 rounded-lg border border-warm-gray bg-cream font-ui text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-terracotta"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-warm-gray bg-cream font-ui text-sm text-ink focus:outline-none focus:border-terracotta"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Todo list */}
            {todos.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warm-gray flex items-center justify-center">
                  <CheckSquare className="w-6 h-6 text-ink-muted" />
                </div>
                <p className="font-display text-lg text-ink">
                  No tasks yet
                </p>
                <p className="font-ui text-sm text-ink-muted mt-1">
                  Add a task to get started
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Incomplete todos */}
                <AnimatePresence>
                  {incompleteTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => toggleTodo(todo.id)}
                      onDelete={() => deleteTodo(todo.id)}
                    />
                  ))}
                </AnimatePresence>

                {/* Completed section */}
                {completedTodos.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-warm-gray/50">
                    <p className="font-ui text-xs text-ink-muted mb-2">
                      Completed ({completedTodos.length})
                    </p>
                    <AnimatePresence>
                      {completedTodos.slice(0, 3).map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          onToggle={() => toggleTodo(todo.id)}
                          onDelete={() => deleteTodo(todo.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
