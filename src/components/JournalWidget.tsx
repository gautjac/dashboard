import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  BookOpen,
  Pencil,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStore } from '../store';
import { useCollapsedState } from '../hooks/useCollapsedState';
import { getTodayPrompt, getRandomPrompt } from '../data/sampleData';
import { JournalCalendar } from './JournalCalendar';
import { JournalEntryViewer } from './JournalEntryViewer';
import type { JournalPrompt, JournalEntry } from '../types';

// Mood icons
const moodIcons = [
  { value: 1, icon: Frown, label: 'Low', color: 'text-red-400' },
  { value: 2, icon: Meh, label: 'Below average', color: 'text-orange-400' },
  { value: 3, icon: Meh, label: 'Neutral', color: 'text-yellow-500' },
  { value: 4, icon: Smile, label: 'Good', color: 'text-green-400' },
  { value: 5, icon: Smile, label: 'Great', color: 'text-emerald-500' },
];

// Energy icons
const energyIcons = [
  { value: 1, icon: BatteryLow, label: 'Exhausted', color: 'text-red-400' },
  { value: 2, icon: BatteryLow, label: 'Tired', color: 'text-orange-400' },
  { value: 3, icon: BatteryMedium, label: 'Moderate', color: 'text-yellow-500' },
  { value: 4, icon: BatteryMedium, label: 'Energized', color: 'text-green-400' },
  { value: 5, icon: BatteryFull, label: 'Peak energy', color: 'text-emerald-500' },
];

export function JournalWidget() {
  const {
    getTodayEntry,
    journalEntries,
    setJournalEditorOpen,
    deleteJournalEntry,
    settings,
  } = useDashboardStore();

  // Helper to get a random custom prompt or fall back to default
  const getCustomOrDefaultPrompt = (): JournalPrompt => {
    const customPrompts = settings.customJournalPrompts;
    if (customPrompts && customPrompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * customPrompts.length);
      return {
        id: `custom-${randomIndex}`,
        text: customPrompts[randomIndex],
        category: 'reflective', // Default category for custom prompts
      };
    }
    return getTodayPrompt();
  };

  // Helper to get today's custom prompt (deterministic for the day)
  const getTodaysCustomPrompt = (): JournalPrompt => {
    const customPrompts = settings.customJournalPrompts;
    if (customPrompts && customPrompts.length > 0) {
      const dayOfYear = Math.floor(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const index = dayOfYear % customPrompts.length;
      return {
        id: `custom-${index}`,
        text: customPrompts[index],
        category: 'reflective',
      };
    }
    return getTodayPrompt();
  };

  const todayEntry = getTodayEntry();
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt>(
    getTodaysCustomPrompt()
  );
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('journal');
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  const refreshPrompt = () => {
    const customPrompts = settings.customJournalPrompts;
    if (customPrompts && customPrompts.length > 0) {
      setCurrentPrompt(getCustomOrDefaultPrompt());
    } else {
      setCurrentPrompt(getRandomPrompt());
    }
  };

  // Get last few entries for quick view
  const recentEntries = journalEntries
    .filter((e) => e.date !== format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2);

  const getMoodIcon = (mood: number) => {
    const moodData = moodIcons.find((m) => m.value === mood);
    if (!moodData) return null;
    const Icon = moodData.icon;
    return <Icon className={`w-4 h-4 ${moodData.color}`} />;
  };

  const getEnergyIcon = (energy: number) => {
    const energyData = energyIcons.find((e) => e.value === energy);
    if (!energyData) return null;
    const Icon = energyData.icon;
    return <Icon className={`w-4 h-4 ${energyData.color}`} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
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
          <BookOpen className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            Journal
          </h3>
          {isCollapsed && todayEntry && (
            <span className="font-ui text-sm text-sage-dark">(written today)</span>
          )}
        </button>
        {isCollapsed ? (
          <button
            onClick={() => setJournalEditorOpen(true)}
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="Write"
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setJournalEditorOpen(true)}
            className="btn btn-primary text-sm py-2 px-3"
          >
            <Pencil className="w-4 h-4" />
            Write
          </button>
        )}
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
            {/* Today's prompt */}
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-terracotta-light/20 to-terracotta-light/5 border border-terracotta/10">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-terracotta" />
                  <span className="font-ui text-xs text-terracotta-dark uppercase tracking-wider">
                    Today's Prompt
                  </span>
                </div>
                <button
                  onClick={refreshPrompt}
                  className="p-1 rounded-md text-terracotta hover:bg-terracotta-light/30 transition-colors"
                  title="Get new prompt"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="font-display text-lg text-ink leading-relaxed">
                {currentPrompt.text}
              </p>
              <span className="inline-block mt-2 badge badge-terracotta text-[10px]">
                {currentPrompt.category}
              </span>
            </div>

            {/* Today's entry preview or empty state */}
            {todayEntry ? (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                    Today's Entry
                  </span>
                  <div className="flex items-center gap-2">
                    {todayEntry.mood && getMoodIcon(todayEntry.mood)}
                    {todayEntry.energy && getEnergyIcon(todayEntry.energy)}
                  </div>
                </div>
                <button
                  onClick={() => setJournalEditorOpen(true)}
                  className="w-full text-left p-3 rounded-lg bg-warm-gray/30 hover:bg-warm-gray/50 transition-colors group"
                >
                  <p className="font-body text-sm text-ink-light line-clamp-3">
                    {todayEntry.content}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 font-ui text-xs text-ink-muted group-hover:text-ink transition-colors">
                    Continue writing
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              </div>
            ) : (
              <div className="mb-4 p-4 rounded-lg border border-dashed border-warm-gray-dark text-center">
                <p className="font-ui text-sm text-ink-muted">
                  No entry yet today
                </p>
                <button
                  onClick={() => setJournalEditorOpen(true)}
                  className="mt-2 font-ui text-sm text-terracotta hover:text-terracotta-dark transition-colors"
                >
                  Start writing
                </button>
              </div>
            )}

            {/* Recent entries */}
            {recentEntries.length > 0 && (
              <div>
                <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                  Recent Entries
                </span>
                <div className="mt-2 space-y-2">
                  {recentEntries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setViewingEntry(entry)}
                      className="w-full text-left p-3 rounded-lg hover:bg-warm-gray/30 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-ui text-xs font-medium text-ink-muted">
                          {format(parseISO(entry.date), 'EEEE, MMM d')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {entry.mood && getMoodIcon(entry.mood)}
                          {entry.energy && getEnergyIcon(entry.energy)}
                        </div>
                      </div>
                      <p className="font-body text-sm text-ink-light line-clamp-2">
                        {entry.content}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* View all link */}
            <button
              onClick={() => setShowCalendar(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-ink-muted hover:text-ink font-ui text-sm transition-colors"
            >
              <Calendar className="w-4 h-4" />
              View all entries
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journal Calendar Modal */}
      {showCalendar && (
        <JournalCalendar
          onClose={() => setShowCalendar(false)}
          onSelectEntry={(entry) => setViewingEntry(entry)}
        />
      )}

      {/* Journal Entry Viewer Modal */}
      {viewingEntry && (
        <JournalEntryViewer
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
          onDelete={(id) => {
            deleteJournalEntry(id);
            setViewingEntry(null);
          }}
        />
      )}
    </motion.div>
  );
}
