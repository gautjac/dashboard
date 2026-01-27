import { useEffect } from 'react';
import { useDashboardStore } from '../store';

export function useTheme() {
  const { settings, updateSettings } = useDashboardStore();
  const theme = settings.theme;

  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark', 'auto');

    // Apply the appropriate class
    root.classList.add(theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (theme === 'dark') {
        metaThemeColor.setAttribute('content', '#1a1816');
      } else if (theme === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        metaThemeColor.setAttribute('content', prefersDark ? '#1a1816' : '#FAF8F5');
      } else {
        metaThemeColor.setAttribute('content', '#FAF8F5');
      }
    }
  }, [theme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', e.matches ? '#1a1816' : '#FAF8F5');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    updateSettings({ theme: newTheme });
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
    setTheme(nextTheme);
  };

  // Get the effective theme (resolved auto to actual)
  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    effectiveTheme: getEffectiveTheme(),
    isDark: getEffectiveTheme() === 'dark',
  };
}
