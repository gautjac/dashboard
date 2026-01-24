import { useState } from 'react';
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
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDashboardStore } from '../store';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

type SettingsTab = 'general' | 'calendar' | 'ai' | 'interests' | 'sync' | 'privacy';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
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
    updateHabit,
    syncEnabled,
    syncStatus,
    lastSyncedAt,
    setSyncEnabled,
    syncToServer,
    loadFromServer,
  } = useDashboardStore();

  const [syncUserId, setSyncUserId] = useState('');

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

  const handleClose = () => {
    setSettingsOpen(false);
  };

  const handleSignIn = async () => {
    await signIn();
  };

  const handleSignOut = () => {
    signOut();
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
                      Download a copy of all your data
                    </p>
                  </div>
                  <button className="btn btn-secondary text-sm">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {/* Export format */}
                <div>
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Export format
                  </label>
                  <select
                    value={settings.dataExportFormat}
                    onChange={(e) =>
                      updateSettings({
                        dataExportFormat: e.target.value as typeof settings.dataExportFormat,
                      })
                    }
                    className="input w-full"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>

                {/* Delete data */}
                <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <label className="font-ui text-sm font-medium text-red-700 block">
                        Delete all data
                      </label>
                      <p className="font-ui text-xs text-red-600 mt-0.5 mb-3">
                        This will permanently delete all your habits, journal entries, and settings.
                        This action cannot be undone.
                      </p>
                      <button className="btn text-sm bg-red-500 text-white hover:bg-red-600">
                        Delete everything
                      </button>
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
