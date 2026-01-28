import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { format } from 'date-fns';
import { Settings, Sparkles, Bot, LogOut, Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { useDashboardStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { TodayHeader } from './TodayHeader';
import { FocusLineInput } from './FocusLineInput';
import { RandomQuote } from './RandomQuote';
import { CalendarWidget } from './CalendarWidget';
import { HabitsWidget } from './HabitsWidget';
import { JournalWidget } from './JournalWidget';
import { DailyBriefWidget } from './DailyBriefWidget';
import { BookmarksWidget } from './BookmarksWidget';
import { LinksWidget } from './LinksWidget';
import { IdeasWidget } from './IdeasWidget';
import { TodosWidget } from './TodosWidget';
import { SettingsPanel } from './SettingsPanel';
import { JournalEditor } from './JournalEditor';
import { WeeklyReflectionPanel } from './WeeklyReflectionPanel';
import {
  sampleHabits,
  sampleHabitCompletions,
  sampleCalendarEvents,
  sampleJournalEntries,
  sampleFocusLines,
  sampleInterestAreas,
  sampleDailyBrief,
} from '../data/sampleData';

export function Dashboard() {
  const {
    settingsOpen,
    journalEditorOpen,
    setSettingsOpen,
  } = useDashboardStore();

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [reflectionPanelOpen, setReflectionPanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get the appropriate theme icon
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeLabel = theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'Auto';

  // Initialize with sample data if empty
  useEffect(() => {
    const store = useDashboardStore.getState();
    if (store.habits.length === 0) {
      // Add sample habits
      sampleHabits.forEach(habit => {
        useDashboardStore.setState(state => ({
          habits: [...state.habits, habit],
        }));
      });
      // Add sample completions
      useDashboardStore.setState({ habitCompletions: sampleHabitCompletions });
      // Add sample calendar events
      useDashboardStore.setState({ calendarEvents: sampleCalendarEvents });
      // Add sample journal entries
      useDashboardStore.setState({ journalEntries: sampleJournalEntries });
      // Add sample focus lines
      useDashboardStore.setState({ focusLines: sampleFocusLines });
      // Add sample interest areas
      useDashboardStore.setState({ interestAreas: sampleInterestAreas });
      // Add sample daily brief
      useDashboardStore.setState({ dailyBriefs: [sampleDailyBrief] });
    }
  }, []);

  return (
    <div className="min-h-screen bg-parchment paper-texture">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-parchment/80 backdrop-blur-md border-b border-warm-gray-dark/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-parchment" />
              </div>
              <span className="font-display text-xl font-semibold text-ink tracking-tight">
                Daily
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1">
              {user && (
                <span className="font-ui text-sm text-ink-muted mr-2 hidden md:block">
                  {user.email}
                </span>
              )}
              <button
                onClick={toggleTheme}
                className="btn-ghost p-2 rounded-lg relative"
                aria-label={themeLabel}
                title={themeLabel}
              >
                <ThemeIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setReflectionPanelOpen(true)}
                className="btn-ghost p-2 rounded-lg relative"
                aria-label="Weekly Reflection"
                title="Weekly Reflection"
              >
                <Bot className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="btn-ghost p-2 rounded-lg"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="btn-ghost p-2 rounded-lg text-ink-muted hover:text-red-500"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden btn-ghost p-2 rounded-lg"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="sm:hidden py-3 border-t border-warm-gray/50">
              <div className="space-y-1">
                {user && (
                  <p className="px-2 py-1 font-ui text-sm text-ink-muted truncate">
                    {user.email}
                  </p>
                )}
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-warm-gray/50"
                >
                  <ThemeIcon className="w-5 h-5 text-ink-muted" />
                  <span className="font-ui text-sm">{themeLabel}</span>
                </button>
                <button
                  onClick={() => {
                    setReflectionPanelOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-warm-gray/50"
                >
                  <Bot className="w-5 h-5 text-ink-muted" />
                  <span className="font-ui text-sm">Weekly Reflection</span>
                </button>
                <button
                  onClick={() => {
                    setSettingsOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-warm-gray/50"
                >
                  <Settings className="w-5 h-5 text-ink-muted" />
                  <span className="font-ui text-sm">Settings</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-red-50 text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-ui text-sm">Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Today Header */}
          <div className="stagger-children">
            <TodayHeader />
            <FocusLineInput />
            <RandomQuote />
          </div>

          {/* Dashboard Grid */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Primary Content */}
            <div className="lg:col-span-7 space-y-6 stagger-children">
              <JournalWidget />
              <TodosWidget />
              <HabitsWidget />
            </div>

            {/* Right Column - Secondary Content */}
            <div className="lg:col-span-5 space-y-6 stagger-children">
              <CalendarWidget />
              <DailyBriefWidget />
              <IdeasWidget />
              <LinksWidget />
              <BookmarksWidget />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-parchment/80 backdrop-blur-md border-t border-warm-gray-dark/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-10">
            <p className="font-ui text-xs text-ink-muted">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </footer>

      {/* Settings Panel */}
      {settingsOpen && <SettingsPanel />}

      {/* Journal Editor Modal */}
      {journalEditorOpen && <JournalEditor />}

      {/* Weekly Reflection Panel */}
      {reflectionPanelOpen && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
              <div className="bg-cream p-6 rounded-xl max-w-md">
                <h3 className="font-display text-lg font-semibold text-red-600 mb-2">
                  Reflection Panel Error
                </h3>
                <p className="font-ui text-sm text-ink-muted mb-4">
                  Something went wrong loading the reflection. Check the browser console for details.
                </p>
                <button
                  onClick={() => setReflectionPanelOpen(false)}
                  className="btn btn-primary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <WeeklyReflectionPanel onClose={() => setReflectionPanelOpen(false)} />
        </ErrorBoundary>
      )}
    </div>
  );
}
