import { useState, useEffect, useCallback } from 'react';
import type { UserSettings } from '../types';

// Get user ID from localStorage (same as other DB-first hooks)
function getSyncUserId(): string | null {
  const userId = localStorage.getItem('dashboard_user_id');
  return userId ? userId.toLowerCase().trim() : null;
}

// Default settings
const defaultSettings: UserSettings = {
  theme: 'light',
  showWeather: false,
  dailyBriefLength: 'medium',
  journalPromptStyle: 'mixed',
  computerAccessEnabled: false,
  aiAnalysisEnabled: true,
  dataExportFormat: 'json',
};

interface UseSettingsReturn {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  syncEnabled: boolean;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEnabled = !!getSyncUserId();

  const fetchSettings = useCallback(async () => {
    const userId = getSyncUserId();
    if (!userId) {
      // No user ID, use defaults (or load from localStorage for backward compat)
      const stored = localStorage.getItem('daily-dashboard-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state?.settings) {
            setSettings({ ...defaultSettings, ...parsed.state.settings });
          }
        } catch {
          // Ignore parse errors
        }
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/.netlify/functions/settings?userId=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings({ ...defaultSettings, ...data.settings });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
      console.error('useSettings fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const userId = getSyncUserId();

    // Optimistically update local state
    setSettings((prev) => ({ ...prev, ...updates }));

    if (!userId) {
      // No sync enabled - just keep in local state
      // Also update localStorage for backward compat
      const stored = localStorage.getItem('daily-dashboard-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.state = parsed.state || {};
          parsed.state.settings = { ...parsed.state.settings, ...updates };
          localStorage.setItem('daily-dashboard-storage', JSON.stringify(parsed));
        } catch {
          // Ignore
        }
      }
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/settings?userId=${encodeURIComponent(userId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      setSettings({ ...defaultSettings, ...data.settings });
    } catch (err) {
      // Revert on error
      await fetchSettings();
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setError(message);
      console.error('useSettings update error:', err);
      throw err;
    }
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refreshSettings: fetchSettings,
    syncEnabled,
  };
}
