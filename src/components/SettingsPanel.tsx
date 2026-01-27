import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Calendar,
  Brain,
  Newspaper,
  Shield,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Monitor,
  RefreshCw,
  LogOut,
  Loader2,
  ExternalLink,
  Cloud,
  CloudOff,
  ChevronDown,
  Bookmark,
  Puzzle,
  Key,
  Copy,
  Quote,
  Plus,
  Pencil,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDashboardStore } from '../store';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useQuotes, type Quote as QuoteType } from '../hooks/useQuotes';
import type { JournalPromptStyleType, ApiKey } from '../types';

type SettingsTab = 'general' | 'calendar' | 'bookmarks' | 'quotes' | 'ai' | 'interests' | 'sync' | 'privacy';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
  { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark className="w-4 h-4" /> },
  { id: 'quotes', label: 'Quotes', icon: <Quote className="w-4 h-4" /> },
  { id: 'ai', label: 'AI & Analysis', icon: <Brain className="w-4 h-4" /> },
  { id: 'interests', label: 'Interests', icon: <Newspaper className="w-4 h-4" /> },
  { id: 'sync', label: 'Sync', icon: <Cloud className="w-4 h-4" /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" /> },
];

export function SettingsPanel() {
  const {
    settings,
    updateSettings,
    setSettingsOpen,
    interestAreas,
    habits,
    habitCompletions,
    journalEntries,
    focusLines,
    weeklyReflections,
    updateHabit,
    syncEnabled,
    syncStatus,
    lastSyncedAt,
    setSyncEnabled,
    syncToServer,
    loadFromServer,
    clearAllData,
  } = useDashboardStore();

  const [syncUserId, setSyncUserId] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  // API Key state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Quotes state
  const {
    quotes,
    isLoading: isLoadingQuotes,
    error: quotesError,
    syncEnabled: quotesSyncEnabled,
    fetchQuotes,
    addQuote,
    updateQuote,
    deleteQuote,
  } = useQuotes();
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');
  const [editingQuote, setEditingQuote] = useState<QuoteType | null>(null);
  const [editQuoteText, setEditQuoteText] = useState('');
  const [editQuoteAuthor, setEditQuoteAuthor] = useState('');

  // Get sync userId from localStorage (same as syncService uses)
  const getSyncUserId = (): string | null => {
    return localStorage.getItem('dashboard_user_id');
  };

  const {
    isConfigured,
    isInitialized,
    isAuthenticated,
    isLoading,
    error,
    userEmail,
    calendars,
    signIn,
    signOut,
    refreshEvents,
    toggleCalendarSelection,
  } = useGoogleCalendar();


  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [expandedPromptStyle, setExpandedPromptStyle] = useState<JournalPromptStyleType | null>(null);

  const promptStyleLabels: Record<JournalPromptStyleType, { label: string; description: string }> = {
    mixed: { label: 'Mixed', description: 'Rotating between all styles based on context' },
    reflective: { label: 'Reflective', description: 'Deep, introspective questions for self-examination' },
    creative: { label: 'Creative', description: 'Imaginative prompts for creative writing' },
    tactical: { label: 'Tactical', description: 'Goal-oriented questions about decisions and next steps' },
    gratitude: { label: 'Gratitude', description: 'Prompts focused on appreciation and positive moments' },
  };

  const handleClose = () => {
    setSettingsOpen(false);
  };

  const handleSignIn = async () => {
    await signIn();
  };

  const handleSignOut = () => {
    signOut();
  };

  const handleExportMarkdown = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    let markdown = `# Daily Dashboard Export\n\n`;
    markdown += `**Exported:** ${now.toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    // Journal Entries
    markdown += `## Journal Entries\n\n`;
    if (journalEntries.length === 0) {
      markdown += `_No journal entries_\n\n`;
    } else {
      const sortedEntries = [...journalEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      for (const entry of sortedEntries) {
        markdown += `### ${entry.date}\n\n`;
        if (entry.mood || entry.energy) {
          markdown += `**Mood:** ${entry.mood || '-'}/5 | **Energy:** ${entry.energy || '-'}/5\n\n`;
        }
        if (entry.promptUsed) {
          markdown += `> _Prompt: ${entry.promptUsed}_\n\n`;
        }
        markdown += `${entry.content}\n\n`;
        if (entry.tags.length > 0) {
          markdown += `**Tags:** ${entry.tags.join(', ')}\n\n`;
        }
        markdown += `---\n\n`;
      }
    }

    // Focus Lines
    markdown += `## Focus Lines\n\n`;
    if (focusLines.length === 0) {
      markdown += `_No focus lines_\n\n`;
    } else {
      const sortedFocusLines = [...focusLines].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      for (const focus of sortedFocusLines) {
        markdown += `- **${focus.date}:** ${focus.text}\n`;
      }
      markdown += `\n`;
    }

    // Habits
    markdown += `## Habits\n\n`;
    if (habits.length === 0) {
      markdown += `_No habits_\n\n`;
    } else {
      for (const habit of habits) {
        markdown += `### ${habit.name}\n\n`;
        if (habit.description) {
          markdown += `${habit.description}\n\n`;
        }
        markdown += `- **Schedule:** ${habit.schedule}\n`;
        markdown += `- **Type:** ${habit.targetType}\n`;
        if (habit.targetValue) {
          markdown += `- **Target:** ${habit.targetValue} ${habit.targetUnit || ''}\n`;
        }

        // Get completions for this habit
        const completions = habitCompletions
          .filter(c => c.habitId === habit.id && c.completed)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 30);

        if (completions.length > 0) {
          markdown += `- **Recent completions:** ${completions.map(c => c.date).join(', ')}\n`;
        }
        markdown += `\n`;
      }
    }

    // Weekly Reflections
    markdown += `## Weekly Reflections\n\n`;
    if (weeklyReflections.length === 0) {
      markdown += `_No weekly reflections_\n\n`;
    } else {
      const sortedReflections = [...weeklyReflections].sort(
        (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      );
      for (const reflection of sortedReflections) {
        markdown += `### Week of ${reflection.weekStart}\n\n`;
        markdown += `${reflection.reflection}\n\n`;
        markdown += `**Stats:**\n`;
        markdown += `- Journal entries: ${reflection.stats.journalEntryCount}\n`;
        markdown += `- Total words: ${reflection.stats.totalWords}\n`;
        if (reflection.stats.avgMood !== null) {
          markdown += `- Avg mood: ${reflection.stats.avgMood.toFixed(1)}/5\n`;
        }
        if (reflection.stats.avgEnergy !== null) {
          markdown += `- Avg energy: ${reflection.stats.avgEnergy.toFixed(1)}/5\n`;
        }
        markdown += `\n---\n\n`;
      }
    }

    // Interest Areas
    markdown += `## Interest Areas\n\n`;
    if (interestAreas.length === 0) {
      markdown += `_No interest areas_\n\n`;
    } else {
      for (const area of interestAreas) {
        markdown += `- **${area.name}** ${area.enabled ? '(enabled)' : '(disabled)'}\n`;
        markdown += `  - Keywords: ${area.keywords.join(', ')}\n`;
      }
      markdown += `\n`;
    }

    // Download the file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-dashboard-export-${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearAllData = () => {
    clearAllData();
    setShowClearConfirm(false);
    setClearConfirmText('');
    setSettingsOpen(false);
  };

  // Fetch API keys on mount
  const fetchApiKeys = async () => {
    const userId = getSyncUserId();
    if (!userId) {
      return; // Sync not enabled, no user ID
    }

    try {
      const response = await fetch(`/.netlify/functions/api-keys?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  // Generate new API key
  const handleGenerateApiKey = async () => {
    setApiKeyError(null);

    const userId = getSyncUserId();
    if (!userId) {
      setApiKeyError('Please enable Sync first (Settings > Sync) to generate API keys');
      return;
    }

    setIsGeneratingKey(true);
    try {
      const response = await fetch(`/.netlify/functions/api-keys?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Browser Extension' }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.key);
        fetchApiKeys(); // Refresh the list
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiKeyError(errorData.error || `Failed to generate API key (${response.status})`);
      }
    } catch (error) {
      setApiKeyError('Network error - please try again');
      console.error('Failed to generate API key:', error);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Revoke API key
  const handleRevokeApiKey = async (keyId: string) => {
    const userId = getSyncUserId();
    if (!userId) {
      console.error('No sync user ID, cannot revoke API key');
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/api-keys?userId=${encodeURIComponent(userId)}&id=${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(k => k.id !== keyId));
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  // Fetch API keys when bookmarks tab is active
  useEffect(() => {
    if (activeTab === 'bookmarks') {
      fetchApiKeys();
    }
  }, [activeTab]);

  // Fetch quotes when quotes tab is active
  useEffect(() => {
    if (activeTab === 'quotes') {
      fetchQuotes();
    }
  }, [activeTab, fetchQuotes]);

  // Handle add quote
  const handleAddQuote = async () => {
    if (!newQuoteText.trim()) return;
    try {
      await addQuote(newQuoteText.trim(), newQuoteAuthor.trim() || undefined);
      setNewQuoteText('');
      setNewQuoteAuthor('');
    } catch {
      // Error is handled by the hook
    }
  };

  // Handle update quote
  const handleUpdateQuote = async () => {
    if (!editingQuote || !editQuoteText.trim()) return;
    try {
      await updateQuote(editingQuote.id, editQuoteText.trim(), editQuoteAuthor.trim() || undefined);
      setEditingQuote(null);
      setEditQuoteText('');
      setEditQuoteAuthor('');
    } catch {
      // Error is handled by the hook
    }
  };

  // Start editing a quote
  const startEditingQuote = (quote: QuoteType) => {
    setEditingQuote(quote);
    setEditQuoteText(quote.text);
    setEditQuoteAuthor(quote.author || '');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Settings Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-cream rounded-2xl shadow-lifted overflow-hidden w-[95vw] sm:w-[90vw] max-w-[768px] h-[90vh] sm:h-auto sm:max-h-[85vh]"
      >
        <div className="flex flex-col sm:flex-row h-full">
          {/* Mobile Header */}
          <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-warm-gray/50">
            <h2 className="font-display text-lg font-semibold text-ink">Settings</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Tabs - Horizontal scrollable */}
          <div className="sm:hidden overflow-x-auto border-b border-warm-gray/50 flex-shrink-0">
            <nav className="flex px-2 py-2 gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-lg font-ui text-xs whitespace-nowrap transition-colors
                    ${activeTab === tab.id
                      ? 'bg-ink text-parchment'
                      : 'text-ink-light hover:bg-warm-gray'
                    }
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden sm:flex w-48 flex-shrink-0 bg-parchment-dark/50 border-r border-warm-gray/50 p-4 flex-col">
            <h2 className="font-display text-xl font-semibold text-ink mb-4 px-2">
              Settings
            </h2>
            <nav className="space-y-1 flex-1 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-ui text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'bg-ink text-parchment'
                      : 'text-ink-light hover:bg-warm-gray'
                    }
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Desktop Header - Hidden on mobile */}
            <div className="hidden sm:flex items-center justify-between px-6 py-4 border-b border-warm-gray/50">
              <h3 className="font-display text-lg font-semibold text-ink">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h3>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={settings.userName || ''}
                    onChange={(e) => updateSettings({ userName: e.target.value })}
                    placeholder="Enter your name"
                    className="input w-full text-sm"
                  />
                  <p className="font-ui text-xs text-ink-muted mt-2">
                    Used for personalized greetings
                  </p>
                </div>

                {/* Theme */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Appearance
                  </label>
                  <div className="flex gap-2">
                    {(['light', 'dark', 'auto'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updateSettings({ theme })}
                        className={`
                          flex-1 p-3 rounded-lg border transition-colors capitalize font-ui text-sm
                          ${settings.theme === theme
                            ? 'border-terracotta bg-terracotta-light/20 text-ink'
                            : 'border-warm-gray-dark hover:border-ink-faint text-ink-light'
                          }
                        `}
                      >
                        {theme === 'auto' && <Monitor className="w-4 h-4 mx-auto mb-1" />}
                        {theme}
                      </button>
                    ))}
                  </div>
                  <p className="font-ui text-xs text-ink-muted mt-2">
                    Note: Dark mode coming in a future update
                  </p>
                </div>

                {/* Weather */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-ui text-sm font-medium text-ink block">
                      Show weather
                    </label>
                    <p className="font-ui text-xs text-ink-muted mt-0.5">
                      Display local weather in the header
                    </p>
                  </div>
                  <button
                    onClick={() => updateSettings({ showWeather: !settings.showWeather })}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors
                      ${settings.showWeather ? 'bg-terracotta' : 'bg-warm-gray-dark'}
                    `}
                  >
                    <span
                      className={`
                        absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${settings.showWeather ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>

                {/* Journal prompt style */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Default journal prompt style
                  </label>
                  <select
                    value={settings.journalPromptStyle}
                    onChange={(e) =>
                      updateSettings({
                        journalPromptStyle: e.target.value as typeof settings.journalPromptStyle,
                      })
                    }
                    className="input w-full"
                  >
                    <option value="mixed">Mixed (rotating)</option>
                    <option value="reflective">Reflective</option>
                    <option value="creative">Creative</option>
                    <option value="tactical">Tactical</option>
                    <option value="gratitude">Gratitude</option>
                  </select>
                </div>

                {/* Custom prompt instructions per style */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Custom AI prompt instructions
                  </label>
                  <p className="font-ui text-xs text-ink-muted mb-3">
                    Give Claude specific guidance for each prompt style. Click a style to add custom instructions.
                  </p>
                  <div className="space-y-2">
                    {(Object.keys(promptStyleLabels) as JournalPromptStyleType[]).map((style) => {
                      const isExpanded = expandedPromptStyle === style;
                      const hasInstructions = settings.journalPromptInstructions?.[style];
                      return (
                        <div
                          key={style}
                          className="border border-warm-gray-dark rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedPromptStyle(isExpanded ? null : style)}
                            className={`
                              w-full flex items-center justify-between p-3 text-left transition-colors
                              ${isExpanded ? 'bg-warm-gray/50' : 'hover:bg-warm-gray/30'}
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-ui text-sm font-medium text-ink">
                                {promptStyleLabels[style].label}
                              </span>
                              {hasInstructions && (
                                <span className="font-ui text-[10px] bg-terracotta-light text-terracotta-dark px-1.5 py-0.5 rounded">
                                  Customized
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-ink-muted transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="p-3 pt-0 border-t border-warm-gray/50">
                              <p className="font-ui text-xs text-ink-muted mb-2 mt-2">
                                {promptStyleLabels[style].description}
                              </p>
                              <textarea
                                value={settings.journalPromptInstructions?.[style] || ''}
                                onChange={(e) =>
                                  updateSettings({
                                    journalPromptInstructions: {
                                      ...settings.journalPromptInstructions,
                                      [style]: e.target.value,
                                    },
                                  })
                                }
                                placeholder={`e.g., ${
                                  style === 'reflective'
                                    ? 'Ask about my emotional patterns and personal growth'
                                    : style === 'creative'
                                    ? 'Focus on my music composition and projection mapping projects'
                                    : style === 'tactical'
                                    ? 'Help me prioritize my side projects'
                                    : style === 'gratitude'
                                    ? 'Include prompts about small daily moments'
                                    : 'Balance between creative exploration and practical planning'
                                }`}
                                rows={2}
                                className="input w-full resize-none text-sm"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily word target */}
                {(() => {
                  const writeHabit = habits.find(
                    (h) => h.name.toLowerCase() === 'write' && h.targetType === 'numeric'
                  );
                  if (!writeHabit) return null;
                  return (
                    <div>
                      <label className="font-ui text-sm font-medium text-ink block mb-2">
                        Daily writing goal
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={writeHabit.targetValue || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value) && value >= 0) {
                              updateHabit(writeHabit.id, { targetValue: value });
                            }
                          }}
                          className="input w-32"
                        />
                        <span className="font-ui text-sm text-ink-muted">words</span>
                      </div>
                      <p className="font-ui text-xs text-ink-muted mt-2">
                        Your journal word count will auto-update this habit when you save
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-6">
                {/* Not configured warning */}
                {!isConfigured && (
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-ui text-sm font-medium text-yellow-800">
                          Google Calendar not configured
                        </p>
                        <p className="font-ui text-xs text-yellow-700 mt-1">
                          To enable calendar integration:
                        </p>
                        <ol className="font-ui text-xs text-yellow-700 mt-2 list-decimal list-inside space-y-1">
                          <li>Create a project at Google Cloud Console</li>
                          <li>Enable the Google Calendar API</li>
                          <li>Create OAuth 2.0 credentials</li>
                          <li>Copy <code className="bg-yellow-100 px-1 rounded">.env.example</code> to <code className="bg-yellow-100 px-1 rounded">.env</code></li>
                          <li>Add your Client ID</li>
                        </ol>
                        <a
                          href="https://console.cloud.google.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-yellow-700 hover:text-yellow-900"
                        >
                          Open Google Cloud Console
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="font-ui text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Connected account or connect button */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-3">
                    Google Calendar
                  </label>

                  {!isAuthenticated ? (
                    <div className="p-4 rounded-lg border border-dashed border-warm-gray-dark text-center">
                      <Calendar className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                      <p className="font-ui text-sm text-ink-muted mb-3">
                        Connect your Google Calendar to see today's events
                      </p>
                      <button
                        onClick={handleSignIn}
                        disabled={!isConfigured || isLoading || !isInitialized}
                        className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Calendar className="w-4 h-4" />
                            Connect Google Calendar
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Connected account */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-sage-light/30 border border-sage/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <Calendar className="w-5 h-5 text-sage-dark" />
                          </div>
                          <div>
                            <p className="font-ui text-sm font-medium text-ink">
                              {userEmail || 'Google Calendar'}
                            </p>
                            <p className="font-ui text-xs text-sage-dark">
                              <Check className="w-3 h-3 inline mr-1" />
                              Connected
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={refreshEvents}
                            disabled={isLoading}
                            className="btn-ghost p-2 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
                            title="Refresh events"
                          >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={handleSignOut}
                            className="btn-ghost p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="Disconnect"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Calendar selection */}
                      {calendars.length > 0 && (
                        <div>
                          <label className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-2 block">
                            Select calendars to display
                          </label>
                          <div className="space-y-1.5">
                            {calendars.map((calendar) => (
                              <button
                                key={calendar.id}
                                onClick={() => toggleCalendarSelection(calendar.id)}
                                className={`
                                  w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-left
                                  ${calendar.selected
                                    ? 'bg-warm-gray/30 border-warm-gray-dark'
                                    : 'border-transparent hover:bg-warm-gray/20'
                                  }
                                `}
                              >
                                <div
                                  className="w-3 h-3 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: calendar.color }}
                                />
                                <span className="font-ui text-sm text-ink flex-1 truncate">
                                  {calendar.name}
                                </span>
                                {calendar.selected && (
                                  <Check className="w-4 h-4 text-sage-dark flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-warm-gray/30">
                  <p className="font-ui text-xs text-ink-muted">
                    Calendar access allows you to view and create events from your dashboard.
                    Your calendar data is only stored locally on your device.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div className="space-y-6">
                {/* Browser Extension Section */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-3">
                    X Bookmarks - Browser Extension
                  </label>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-warm-gray-dark bg-parchment">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
                          <Puzzle className="w-5 h-5 text-terracotta" />
                        </div>
                        <div>
                          <p className="font-ui text-sm font-medium text-ink">
                            Chrome Extension
                          </p>
                          <p className="font-ui text-xs text-ink-muted">
                            Instant sync when you bookmark on X
                          </p>
                        </div>
                      </div>

                      {/* API Key Management */}
                      {!newApiKey ? (
                        <div className="space-y-3">
                          {apiKeys.length > 0 && (
                            <div className="space-y-2">
                              <p className="font-ui text-xs text-ink-muted">Active API keys:</p>
                              {apiKeys.map((key) => (
                                <div
                                  key={key.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-warm-gray/30"
                                >
                                  <div>
                                    <p className="font-ui text-sm text-ink">{key.name}</p>
                                    <p className="font-ui text-xs text-ink-muted">
                                      {key.last_used_at
                                        ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                                        : 'Never used'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRevokeApiKey(key.id)}
                                    className="btn-ghost p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                    title="Revoke key"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Error message */}
                          {apiKeyError && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                              <p className="font-ui text-sm text-red-700">{apiKeyError}</p>
                            </div>
                          )}

                          {/* Show sync prompt if sync not enabled */}
                          {!syncEnabled && !apiKeyError && (
                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                              <p className="font-ui text-sm text-yellow-800 mb-2">
                                Enable Sync first to generate API keys for the browser extension
                              </p>
                              <button
                                onClick={() => setActiveTab('sync')}
                                className="btn btn-primary text-sm"
                              >
                                Go to Sync Settings
                              </button>
                            </div>
                          )}

                          {syncEnabled && (
                            <button
                              onClick={handleGenerateApiKey}
                              disabled={isGeneratingKey}
                              className="btn btn-secondary text-sm w-full"
                            >
                              {isGeneratingKey ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Key className="w-4 h-4" />
                                  Generate API Key
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-sage-light/30 border border-sage/20">
                            <p className="font-ui text-xs text-sage-dark font-medium mb-2">
                              Your API Key (save this - it won't be shown again):
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={newApiKey}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                className="flex-1 font-mono text-xs bg-white p-2 rounded border border-sage/30 cursor-text select-all"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(newApiKey);
                                  setCopiedKey(true);
                                  setTimeout(() => setCopiedKey(false), 2000);
                                }}
                                className="btn-ghost p-2 rounded-lg text-sage-dark hover:bg-sage-light/50 flex-shrink-0"
                                title="Copy to clipboard"
                              >
                                {copiedKey ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            <p className="font-ui text-xs text-sage-dark mt-2">
                              Click the key to select it, or use the copy button
                            </p>
                          </div>
                          <button
                            onClick={() => setNewApiKey(null)}
                            className="btn btn-secondary text-sm w-full"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-warm-gray/30">
                      <p className="font-ui text-xs text-ink-muted mb-2">
                        <strong>Setup instructions:</strong>
                      </p>
                      <ol className="font-ui text-xs text-ink-muted list-decimal list-inside space-y-1">
                        <li>Generate an API key above</li>
                        <li>Install the Chrome extension (coming soon)</li>
                        <li>Paste your API key in the extension settings</li>
                        <li>Bookmarks will sync instantly when you use X</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'quotes' && (
              <div className="space-y-6">
                <p className="font-ui text-sm text-ink-muted">
                  Add inspirational quotes that will be displayed randomly below your daily focus line.
                </p>

                {/* Sync warning */}
                {!quotesSyncEnabled && (
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-ui text-sm font-medium text-yellow-800">
                          Sync required
                        </p>
                        <p className="font-ui text-xs text-yellow-700 mt-1 mb-3">
                          Enable Sync to save and manage your quotes collection.
                        </p>
                        <button
                          onClick={() => setActiveTab('sync')}
                          className="btn btn-primary text-sm"
                        >
                          Go to Sync Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error display */}
                {quotesError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="font-ui text-sm text-red-700">{quotesError}</p>
                  </div>
                )}

                {/* Add new quote form */}
                <div className="p-4 rounded-lg border border-warm-gray-dark bg-parchment">
                  <label className="font-ui text-sm font-medium text-ink block mb-3">
                    Add a new quote
                  </label>
                  <div className="space-y-3">
                    <textarea
                      value={newQuoteText}
                      onChange={(e) => setNewQuoteText(e.target.value)}
                      placeholder="Enter the quote text..."
                      rows={3}
                      className="input w-full resize-none text-sm"
                    />
                    <input
                      type="text"
                      value={newQuoteAuthor}
                      onChange={(e) => setNewQuoteAuthor(e.target.value)}
                      placeholder="Author (optional)"
                      className="input w-full text-sm"
                    />
                    <button
                      onClick={handleAddQuote}
                      disabled={!newQuoteText.trim() || !quotesSyncEnabled}
                      className="btn btn-primary text-sm disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Quote
                    </button>
                  </div>
                </div>

                {/* Existing quotes list */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-3">
                    Your quotes ({quotes.length})
                  </label>

                  {isLoadingQuotes ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-6 h-6 mx-auto text-ink-muted animate-spin" />
                      <p className="mt-2 font-ui text-sm text-ink-muted">Loading quotes...</p>
                    </div>
                  ) : quotes.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-warm-gray-dark rounded-lg">
                      <Quote className="w-8 h-8 mx-auto text-ink-muted mb-2" />
                      <p className="font-ui text-sm text-ink-muted">
                        No quotes yet. Add your first quote above!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="p-3 rounded-lg bg-warm-gray/30 group"
                        >
                          {editingQuote?.id === quote.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editQuoteText}
                                onChange={(e) => setEditQuoteText(e.target.value)}
                                rows={2}
                                className="input w-full resize-none text-sm"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editQuoteAuthor}
                                onChange={(e) => setEditQuoteAuthor(e.target.value)}
                                placeholder="Author (optional)"
                                className="input w-full text-sm"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleUpdateQuote}
                                  disabled={!editQuoteText.trim()}
                                  className="btn btn-primary text-xs disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingQuote(null);
                                    setEditQuoteText('');
                                    setEditQuoteAuthor('');
                                  }}
                                  className="btn btn-secondary text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-body text-sm text-ink-light italic">
                                "{quote.text}"
                              </p>
                              {quote.author && (
                                <p className="font-ui text-xs text-ink-muted mt-1">
                                  — {quote.author}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditingQuote(quote)}
                                  className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
                                  title="Edit quote"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteQuote(quote.id)}
                                  className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-red-500"
                                  title="Delete quote"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-warm-gray/30">
                  <p className="font-ui text-xs text-ink-muted">
                    A random quote from your collection will be displayed below your daily focus line each time you visit the dashboard.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                {/* AI Analysis toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-ui text-sm font-medium text-ink block">
                      AI journal analysis
                    </label>
                    <p className="font-ui text-xs text-ink-muted mt-0.5">
                      Generate weekly insights from your journal entries
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateSettings({ aiAnalysisEnabled: !settings.aiAnalysisEnabled })
                    }
                    className={`
                      relative w-11 h-6 rounded-full transition-colors
                      ${settings.aiAnalysisEnabled ? 'bg-terracotta' : 'bg-warm-gray-dark'}
                    `}
                  >
                    <span
                      className={`
                        absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${settings.aiAnalysisEnabled ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>

                {/* Computer Access */}
                <div className="p-4 rounded-lg border border-warm-gray-dark">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warm-gray flex items-center justify-center flex-shrink-0">
                      <Monitor className="w-5 h-5 text-ink-muted" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <label className="font-ui text-sm font-medium text-ink">
                          Computer access (experimental)
                        </label>
                        <button
                          onClick={() =>
                            updateSettings({
                              computerAccessEnabled: !settings.computerAccessEnabled,
                            })
                          }
                          className={`
                            relative w-11 h-6 rounded-full transition-colors
                            ${settings.computerAccessEnabled ? 'bg-terracotta' : 'bg-warm-gray-dark'}
                          `}
                        >
                          <span
                            className={`
                              absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                              ${settings.computerAccessEnabled ? 'translate-x-5' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      </div>
                      <p className="font-ui text-xs text-ink-muted mt-1">
                        Allow AI to view your screen and interact with apps to help with tasks.
                        Requires explicit confirmation for each action.
                      </p>

                      {settings.computerAccessEnabled && (
                        <div className="mt-3 p-2.5 rounded-lg bg-yellow-50 border border-yellow-200">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="font-ui text-xs text-yellow-800">
                              Computer access is session-based. You'll be asked to confirm before
                              any action is taken. An audit log is kept locally.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Perplexity API Key for Daily Brief */}
                <div className="p-4 rounded-lg border border-warm-gray-dark">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-terracotta-light/30 flex items-center justify-center flex-shrink-0">
                      <Newspaper className="w-5 h-5 text-terracotta" />
                    </div>
                    <div className="flex-1">
                      <label className="font-ui text-sm font-medium text-ink block">
                        Perplexity API Key
                      </label>
                      <p className="font-ui text-xs text-ink-muted mt-1 mb-3">
                        Enable real news articles in your Daily Brief with links to sources.
                        Get your API key from{' '}
                        <a
                          href="https://www.perplexity.ai/settings/api"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-terracotta hover:text-terracotta-dark"
                        >
                          perplexity.ai/settings/api
                        </a>
                      </p>
                      <input
                        type="password"
                        value={settings.perplexityApiKey || ''}
                        onChange={(e) => updateSettings({ perplexityApiKey: e.target.value })}
                        placeholder="pplx-xxxxxxxxxxxxxxxx"
                        className="input w-full text-sm"
                      />
                      {settings.perplexityApiKey && (
                        <p className="font-ui text-xs text-sage-dark mt-2 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          API key configured
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'interests' && (
              <div className="space-y-6">
                <p className="font-ui text-sm text-ink-muted">
                  Configure topics for your daily brief. We'll curate news and updates based on these interests.
                </p>

                {interestAreas.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-warm-gray-dark text-center">
                    <Newspaper className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                    <p className="font-ui text-sm text-ink-muted mb-3">
                      No interests configured yet
                    </p>
                    <button className="btn btn-primary text-sm">
                      Add your first topic
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {interestAreas.map((area) => (
                      <div
                        key={area.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-warm-gray/30"
                      >
                        <div>
                          <p className="font-ui text-sm font-medium text-ink">
                            {area.name}
                          </p>
                          <p className="font-ui text-xs text-ink-muted">
                            {area.keywords.slice(0, 3).join(', ')}
                            {area.keywords.length > 3 && ` +${area.keywords.length - 3}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className={`
                              p-1.5 rounded-lg transition-colors
                              ${area.enabled ? 'text-sage-dark' : 'text-ink-faint'}
                            `}
                          >
                            {area.enabled ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                          <button className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-secondary text-sm w-full mt-2">
                      Add new topic
                    </button>
                  </div>
                )}

                {/* Brief length */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Daily brief length
                  </label>
                  <select
                    value={settings.dailyBriefLength}
                    onChange={(e) =>
                      updateSettings({
                        dailyBriefLength: e.target.value as typeof settings.dailyBriefLength,
                      })
                    }
                    className="input w-full"
                  >
                    <option value="short">Short (3-5 items)</option>
                    <option value="medium">Medium (5-8 items)</option>
                    <option value="long">Long (8-12 items)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'sync' && (
              <div className="space-y-6">
                {/* Sync status */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-parchment border border-warm-gray-dark">
                  <div className="flex items-center gap-3">
                    {syncEnabled ? (
                      <div className="w-10 h-10 rounded-lg bg-sage-light flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-sage-dark" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-warm-gray flex items-center justify-center">
                        <CloudOff className="w-5 h-5 text-ink-muted" />
                      </div>
                    )}
                    <div>
                      <p className="font-ui text-sm font-medium text-ink">
                        {syncEnabled ? 'Sync enabled' : 'Sync disabled'}
                      </p>
                      {syncEnabled && lastSyncedAt && (
                        <p className="font-ui text-xs text-ink-muted">
                          Last synced: {new Date(lastSyncedAt).toLocaleString()}
                        </p>
                      )}
                      {syncStatus === 'syncing' && (
                        <p className="font-ui text-xs text-sage-dark flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Syncing...
                        </p>
                      )}
                      {syncStatus === 'error' && (
                        <p className="font-ui text-xs text-red-600">
                          Sync failed. Check your connection.
                        </p>
                      )}
                    </div>
                  </div>
                  {syncEnabled && (
                    <button
                      onClick={() => syncToServer()}
                      disabled={syncStatus === 'syncing'}
                      className="btn btn-secondary text-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      Sync now
                    </button>
                  )}
                </div>

                {/* Enable/disable sync */}
                {!syncEnabled ? (
                  <div className="space-y-4">
                    <p className="font-ui text-sm text-ink-muted">
                      Enable cloud sync to access your data across all your devices.
                    </p>
                    <div>
                      <label className="font-ui text-sm font-medium text-ink block mb-2">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={syncUserId}
                        onChange={(e) => setSyncUserId(e.target.value)}
                        placeholder="Enter a unique ID (e.g., your email)"
                        className="input w-full"
                      />
                      <p className="font-ui text-xs text-ink-muted mt-2">
                        Use the same ID on all devices to sync your data.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (syncUserId.trim()) {
                          setSyncEnabled(true, syncUserId.trim());
                          loadFromServer();
                        }
                      }}
                      disabled={!syncUserId.trim()}
                      className="btn btn-primary text-sm disabled:opacity-50"
                    >
                      <Cloud className="w-4 h-4" />
                      Enable sync
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-ui text-sm font-medium text-ink block">
                          Pull from cloud
                        </label>
                        <p className="font-ui text-xs text-ink-muted mt-0.5">
                          Download your data from the cloud
                        </p>
                      </div>
                      <button
                        onClick={() => loadFromServer()}
                        disabled={syncStatus === 'syncing'}
                        className="btn btn-secondary text-sm disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        Pull
                      </button>
                    </div>

                    <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                      <div className="flex items-start gap-3">
                        <CloudOff className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div>
                          <label className="font-ui text-sm font-medium text-red-700 block">
                            Disable sync
                          </label>
                          <p className="font-ui text-xs text-red-600 mt-0.5 mb-3">
                            Your data will only be stored locally on this device.
                          </p>
                          <button
                            onClick={() => setSyncEnabled(false)}
                            className="btn text-sm bg-red-500 text-white hover:bg-red-600"
                          >
                            Disable sync
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-warm-gray/30">
                  <p className="font-ui text-xs text-ink-muted">
                    Your data is synced to a secure Neon PostgreSQL database. Use the same User ID
                    on all devices to keep your data in sync.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Data export */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-ui text-sm font-medium text-ink block">
                      Export all data
                    </label>
                    <p className="font-ui text-xs text-ink-muted mt-0.5">
                      Download a structured Markdown file with all your data
                    </p>
                  </div>
                  <button
                    onClick={handleExportMarkdown}
                    className="btn btn-secondary text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {/* Delete data */}
                <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="font-ui text-sm font-medium text-red-700 block">
                        Delete all data
                      </label>
                      <p className="font-ui text-xs text-red-600 mt-0.5 mb-3">
                        This will permanently delete all your habits, journal entries, reflections,
                        bookmarks, and settings. This action cannot be undone.
                      </p>

                      {!showClearConfirm ? (
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="btn text-sm bg-red-500 text-white hover:bg-red-600"
                        >
                          Delete everything
                        </button>
                      ) : (
                        <div className="space-y-3 p-3 bg-red-100 rounded-lg">
                          <p className="font-ui text-xs text-red-800 font-medium">
                            Type "DELETE" to confirm:
                          </p>
                          <input
                            type="text"
                            value={clearConfirmText}
                            onChange={(e) => setClearConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="input w-full text-sm border-red-300 focus:border-red-500"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleClearAllData}
                              disabled={clearConfirmText !== 'DELETE'}
                              className="btn text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => {
                                setShowClearConfirm(false);
                                setClearConfirmText('');
                              }}
                              className="btn btn-secondary text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Privacy info */}
                <div className="p-3 rounded-lg bg-warm-gray/30">
                  <p className="font-ui text-xs text-ink-muted">
                    Your data is stored locally on your device. Journal analysis is opt-in and
                    processed with your explicit consent. We never sell or share your personal data.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
