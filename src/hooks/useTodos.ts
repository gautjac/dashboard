import { useState, useEffect, useCallback } from 'react';
import netlifyIdentity from 'netlify-identity-widget';
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

// Get user info - try localStorage first (for sync), then Netlify Identity
function getUserInfo(): { userId: string; email: string } | null {
  // First check localStorage (sync service)
  const syncUserId = localStorage.getItem('dashboard_user_id');
  const syncEmail = localStorage.getItem('dashboard_user_email');
  if (syncUserId && syncEmail) {
    return { userId: syncUserId, email: syncEmail };
  }

  // Fall back to Netlify Identity user
  const user = netlifyIdentity.currentUser();
  if (user?.id && user?.email) {
    return { userId: user.id, email: user.email };
  }

  return null;
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
    const userInfo = getUserInfo();
    if (!userInfo) {
      // Not authenticated, use local state only
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        userId: userInfo.userId,
        email: userInfo.email,
      });
      const response = await fetch(`/.netlify/functions/todos?${params}`);

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
    const userInfo = getUserInfo();
    if (!userInfo) {
      throw new Error('Not authenticated');
    }

    // Optimistically add locally
    const tempId = `temp-${Date.now()}`;
    addTodoLocal({ title, dueDate });

    try {
      const params = new URLSearchParams({
        userId: userInfo.userId,
        email: userInfo.email,
      });
      const response = await fetch(`/.netlify/functions/todos?${params}`, {
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
    const userInfo = getUserInfo();
    if (!userInfo) return;

    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Optimistically toggle locally
    toggleTodoLocal(id);

    try {
      const params = new URLSearchParams({
        userId: userInfo.userId,
        email: userInfo.email,
        id,
      });
      const response = await fetch(`/.netlify/functions/todos?${params}`, {
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
    const userInfo = getUserInfo();
    if (!userInfo) return;

    // Optimistically delete locally
    deleteTodoLocal(id);

    try {
      const params = new URLSearchParams({
        userId: userInfo.userId,
        email: userInfo.email,
        id,
      });
      const response = await fetch(`/.netlify/functions/todos?${params}`, {
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
