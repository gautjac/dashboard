import { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  ChevronRight,
  Trash2,
  Calendar,
  RefreshCw,
  List,
  CalendarDays,
  CalendarRange,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { useTodos } from '../hooks/useTodos';
import { useCollapsedState } from '../hooks/useCollapsedState';
import { ProjectSelect, getProjectColor } from './ProjectSelect';
import { WeekCalendar } from './calendar/WeekCalendar';
import { MonthCalendar } from './calendar/MonthCalendar';
import type { Todo } from '../types';

type ViewMode = 'list' | 'week' | 'month';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (updates: { title?: string; dueDate?: string | null; project?: string | null }) => void;
  projects: string[];
}

// Parse date string, handling both 'YYYY-MM-DD' and ISO formats with timezone
function parseDateString(dueDate: string): Date {
  // Extract just the date portion to avoid timezone issues
  const dateOnly = dueDate.substring(0, 10);
  return parseISO(dateOnly);
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '';

  const date = parseDateString(dueDate);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

function getDueDateColor(dueDate: string | null, completed: boolean): string {
  if (completed || !dueDate) return 'text-ink-muted';

  const date = parseDateString(dueDate);
  if (isPast(date) && !isToday(date)) return 'text-red-500';
  if (isToday(date)) return 'text-terracotta';
  return 'text-ink-muted';
}

function TodoItem({ todo, onToggle, onDelete, onEdit, projects }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate || '');
  const [editProject, setEditProject] = useState<string | null>(todo.project);

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onEdit({
      title: editTitle.trim(),
      dueDate: editDueDate || null,
      project: editProject,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setEditDueDate(todo.dueDate || '');
    setEditProject(todo.project);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-3 pb-6 rounded-lg bg-warm-gray/30"
      >
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 rounded-lg border border-warm-gray bg-cream font-ui text-sm text-ink focus:outline-none focus:border-terracotta mb-2"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-warm-gray bg-cream font-ui text-sm text-ink focus:outline-none focus:border-terracotta"
            />
          </div>
          <ProjectSelect
            value={editProject}
            onChange={setEditProject}
            projects={projects}
            className="flex-1"
          />
          <button
            onClick={handleSave}
            disabled={!editTitle.trim()}
            className="p-2 rounded-lg bg-sage text-white hover:bg-sage-dark disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg bg-warm-gray text-ink-muted hover:bg-warm-gray-dark"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

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
        <div className="flex items-center gap-2">
          <p className={`font-ui text-sm ${todo.completed ? 'text-ink-muted line-through' : 'text-ink'}`}>
            {todo.title}
          </p>
          {todo.project && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-ui ${getProjectColor(todo.project)}`}>
              {todo.project}
            </span>
          )}
        </div>
      </div>

      {todo.dueDate && (
        <span className={`flex-shrink-0 font-ui text-xs ${getDueDateColor(todo.dueDate, todo.completed)}`}>
          {formatDueDate(todo.dueDate)}
        </span>
      )}

      <button
        onClick={() => setIsEditing(true)}
        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-ink-faint hover:text-ink transition-all"
      >
        <Pencil className="w-4 h-4" />
      </button>

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
  const { todos, isLoading, addTodo, updateTodo, toggleTodo, deleteTodo, refreshTodos, projects } = useTodos();
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('todos');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newProject, setNewProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Separate completed and incomplete todos
  const incompleteTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const title = newTitle.trim();
    const dueDate = newDueDate || null;
    const project = newProject;

    // Clear form and hide immediately
    setNewTitle('');
    setNewDueDate('');
    setNewProject(null);
    setShowAddForm(false);

    try {
      await addTodo(title, dueDate, project);
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
          {/* View toggle */}
          {!isCollapsed && (
            <div className="flex items-center bg-warm-gray/30 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'week' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                title="Week view"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'month' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                title="Month view"
              >
                <CalendarRange className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={refreshTodos}
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {!isCollapsed && viewMode === 'list' && (
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
              {showAddForm && viewMode === 'list' && (
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleAddTodo}
                  className="mb-4 p-3 pb-6 rounded-lg bg-warm-gray/30"
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
                    <ProjectSelect
                      value={newProject}
                      onChange={setNewProject}
                      projects={projects}
                      className="flex-1"
                    />
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

            {/* View content */}
            {viewMode === 'list' ? (
              /* List view */
              todos.length === 0 ? (
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
                        onEdit={(updates) => updateTodo(todo.id, updates)}
                        projects={projects}
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
                            onEdit={(updates) => updateTodo(todo.id, updates)}
                            projects={projects}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )
            ) : viewMode === 'week' ? (
              /* Week view */
              <WeekCalendar
                todos={todos}
                onToggleTodo={toggleTodo}
                onAddTodo={addTodo}
                projects={projects}
              />
            ) : (
              /* Month view */
              <MonthCalendar
                todos={todos}
                onToggleTodo={toggleTodo}
                onAddTodo={addTodo}
                projects={projects}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
