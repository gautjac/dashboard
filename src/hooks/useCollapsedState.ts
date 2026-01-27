import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'dashboard-collapsed-sections';

function getStoredState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function useCollapsedState(sectionId: string, defaultCollapsed = false) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = getStoredState();
    return stored[sectionId] ?? defaultCollapsed;
  });

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      const stored = getStoredState();
      stored[sectionId] = newValue;
      setStoredState(stored);
      return newValue;
    });
  }, [sectionId]);

  // Sync with storage on mount (in case another tab changed it)
  useEffect(() => {
    const stored = getStoredState();
    if (stored[sectionId] !== undefined && stored[sectionId] !== isCollapsed) {
      setIsCollapsed(stored[sectionId]);
    }
  }, [sectionId]);

  return { isCollapsed, toggle };
}
