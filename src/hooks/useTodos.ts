import { useState, useEffect, useCallback } from 'react';
import { useDashboardStore } from '../store';
import type { Todo } from '../types';

interface UseTodosReturn {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  addTodo: (title: string, dueDate: string | null) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
}

// Get sync userId from localStorage (same as extension-bookmarks uses)
function getSyncUserId(): string | null {
  return localStorage.getItem('dashboard_user_id');
}

// Helper to convert snake_case API response to camelCase
function mapTodoFromApi(apiTodo: any): Todo {
  return {
    id: apiTodo.id,
    title: apiTodo.title,
    dueDate: apiTodo.due_date,
    completed: apiTodo.completed,
    completedAt: apiTodo.completed_at,
    createdAt: apiTodo.created_at,
  };
}

export function useTodos(): UseTodosReturn {
  const { todos, setTodos, addTodo: addTodoLocal, toggleTodo: toggleTodoLocal, deleteTodo: deleteTodoLocal } = useDashboardStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      // Not authenticated, use local state only
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/.netlify/functions/todos?userId=${encodeURIComponent(userId)}`);

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, use local state only
          return;
        }
        throw new Error('Failed to fetch todos');
      }

      const data = await response.json();
      const mappedTodos = (data.todos || []).map(mapTodoFromApi);
      setTodos(mappedTodos);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch todos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setTodos]);

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = useCallback(async (title: string, dueDate: string | null) => {
    const userId = getSyncUserId();
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Optimistically add locally
    const tempId = `temp-${Date.now()}`;
    addTodoLocal({ title, dueDate });

    try {
      const response = await fetch(`/.netlify/functions/todos?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dueDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to add todo');
      }

      // Refresh to get the real ID
      await fetchTodos();
    } catch (err) {
      // Remove the optimistic addition on error
      deleteTodoLocal(tempId);
      throw err;
    }
  }, [addTodoLocal, deleteTodoLocal, fetchTodos]);

  const toggleTodo = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Optimistically toggle locally
    toggleTodoLocal(id);

    try {
      const response = await fetch(`/.netlify/functions/todos?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) {
        // Revert on error
        toggleTodoLocal(id);
        throw new Error('Failed to update todo');
      }
    } catch (err) {
      console.error('Toggle todo error:', err);
    }
  }, [todos, toggleTodoLocal]);

  const deleteTodo = useCallback(async (id: string) => {
    const userId = getSyncUserId();
    if (!userId) return;

    // Optimistically delete locally
    deleteTodoLocal(id);

    try {
      const response = await fetch(`/.netlify/functions/todos?userId=${encodeURIComponent(userId)}&id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Restore on error (refetch)
        await fetchTodos();
        throw new Error('Failed to delete todo');
      }
    } catch (err) {
      console.error('Delete todo error:', err);
    }
  }, [deleteTodoLocal, fetchTodos]);

  return {
    todos,
    isLoading,
    error,
    addTodo,
    toggleTodo,
    deleteTodo,
    refreshTodos: fetchTodos,
  };
}
