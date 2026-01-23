import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  X,
  Sparkles,
  RefreshCw,
  Save,
  Smile,
  Meh,
  Frown,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Hash,
  Clock,
  Wand2,
  Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStore } from '../store';
import { useClaudeAnalysis } from '../hooks';
import { getTodayPrompt, getRandomPrompt } from '../data/sampleData';
import type { JournalPrompt } from '../types';

// Mood options
const moodOptions = [
  { value: 1, icon: Frown, label: 'Struggling', color: 'text-red-400 hover:bg-red-50' },
  { value: 2, icon: Meh, label: 'Below average', color: 'text-orange-400 hover:bg-orange-50' },
  { value: 3, icon: Meh, label: 'Neutral', color: 'text-yellow-500 hover:bg-yellow-50' },
  { value: 4, icon: Smile, label: 'Good', color: 'text-green-400 hover:bg-green-50' },
  { value: 5, icon: Smile, label: 'Great', color: 'text-emerald-500 hover:bg-emerald-50' },
];

// Energy options
const energyOptions = [
  { value: 1, icon: BatteryLow, label: 'Exhausted', color: 'text-red-400 hover:bg-red-50' },
  { value: 2, icon: BatteryLow, label: 'Tired', color: 'text-orange-400 hover:bg-orange-50' },
  { value: 3, icon: BatteryMedium, label: 'Moderate', color: 'text-yellow-500 hover:bg-yellow-50' },
  { value: 4, icon: BatteryMedium, label: 'Energized', color: 'text-green-400 hover:bg-green-50' },
  { value: 5, icon: BatteryFull, label: 'Peak', color: 'text-emerald-500 hover:bg-emerald-50' },
];

// Suggested tags
const suggestedTags = [
  'gratitude', 'reflection', 'progress', 'challenge', 'insight',
  'creative', 'work', 'personal', 'health', 'learning',
];

export function JournalEditor() {
  const {
    getTodayEntry,
    addJournalEntry,
    updateJournalEntry,
    setJournalEditorOpen,
  } = useDashboardStore();

  const {
    isConfigured: isAIConfigured,
    isGeneratingPrompt,
    generateContextualPrompt,
  } = useClaudeAnalysis();

  const todayEntry = getTodayEntry();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState(todayEntry?.content || '');
  const [mood, setMood] = useState<number | undefined>(todayEntry?.mood);
  const [energy, setEnergy] = useState<number | undefined>(todayEntry?.energy);
  const [tags, setTags] = useState<string[]>(todayEntry?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt>(getTodayPrompt());
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(!todayEntry?.content);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Focus textarea on open
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSave = () => {
    if (!content.trim()) return;

    setIsSaving(true);

    const entryData = {
      date: format(new Date(), 'yyyy-MM-dd'),
      content: content.trim(),
      mood,
      energy,
      tags,
      promptUsed: showPrompt ? displayedPrompt : undefined,
    };

    if (todayEntry) {
      updateJournalEntry(todayEntry.id, entryData);
    } else {
      addJournalEntry(entryData);
    }

    setLastSaved(new Date());
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  const handleClose = () => {
    // Auto-save if there's content
    if (content.trim() && content !== todayEntry?.content) {
      handleSave();
    }
    setJournalEditorOpen(false);
  };

  const refreshPrompt = async () => {
    if (isAIConfigured) {
      const prompt = await generateContextualPrompt();
      if (prompt) {
        setAiPrompt(prompt);
        return;
      }
    }
    // Fallback to local prompts
    setAiPrompt(null);
    setCurrentPrompt(getRandomPrompt());
  };

  const displayedPrompt = aiPrompt || currentPrompt.text;

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags([...tags, normalizedTag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save with Cmd/Ctrl + S
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Close with Escape
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 px-4 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Editor Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative bg-cream rounded-2xl shadow-lifted overflow-hidden"
        style={{ width: '95vw', maxWidth: '672px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-gray/50">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {format(new Date(), 'EEEE, MMMM d')}
            </h2>
            <p className="font-ui text-sm text-ink-muted">
              {todayEntry ? 'Continue your entry' : 'Start your reflection'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Section */}
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-warm-gray/50 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-terracotta-light/10 to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {aiPrompt ? (
                      <Brain className="w-4 h-4 text-terracotta" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-terracotta" />
                    )}
                    <span className="font-ui text-xs text-terracotta-dark uppercase tracking-wider">
                      {aiPrompt ? 'AI Prompt' : 'Prompt'}
                    </span>
                    {isAIConfigured && !aiPrompt && (
                      <span className="font-ui text-[10px] text-ink-muted bg-warm-gray px-1.5 py-0.5 rounded">
                        AI available
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={refreshPrompt}
                      disabled={isGeneratingPrompt}
                      className="p-1.5 rounded-md text-terracotta hover:bg-terracotta-light/30 transition-colors disabled:opacity-50"
                      title={isAIConfigured ? "Generate AI prompt" : "Get new prompt"}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPrompt ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setShowPrompt(false)}
                      className="p-1.5 rounded-md text-ink-muted hover:bg-warm-gray transition-colors"
                      title="Hide prompt"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {isGeneratingPrompt ? (
                  <p className="font-body text-base text-ink-muted mt-2 italic">
                    Generating a personalized prompt...
                  </p>
                ) : (
                  <p className="font-display text-lg text-ink mt-2">
                    {displayedPrompt}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Content */}
        <div className="p-6">
          {/* Mood & Energy */}
          <div className="flex flex-wrap gap-6 mb-4">
            {/* Mood selector */}
            <div>
              <label className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-2 block">
                Mood
              </label>
              <div className="flex items-center gap-1">
                {moodOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = mood === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setMood(isSelected ? undefined : option.value)}
                      className={`
                        p-2 rounded-lg transition-all
                        ${isSelected
                          ? `bg-warm-gray ${option.color.split(' ')[0]}`
                          : `${option.color} opacity-40 hover:opacity-100`
                        }
                      `}
                      title={option.label}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Energy selector */}
            <div>
              <label className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-2 block">
                Energy
              </label>
              <div className="flex items-center gap-1">
                {energyOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = energy === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setEnergy(isSelected ? undefined : option.value)}
                      className={`
                        p-2 rounded-lg transition-all
                        ${isSelected
                          ? `bg-warm-gray ${option.color.split(' ')[0]}`
                          : `${option.color} opacity-40 hover:opacity-100`
                        }
                      `}
                      title={option.label}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full min-h-[200px] p-0 font-body text-lg text-ink bg-transparent border-none resize-none focus:outline-none placeholder:text-ink-faint leading-relaxed"
          />

          {/* Tags */}
          <div className="mt-4 pt-4 border-t border-warm-gray/50">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-ink-muted" />
              <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                Tags
              </span>
            </div>

            {/* Selected tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => removeTag(tag)}
                  className="badge badge-terracotta hover:bg-terracotta-light transition-colors"
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </button>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput) {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Add tag..."
                className="font-ui text-sm bg-transparent border-none focus:outline-none placeholder:text-ink-faint w-24"
              />
            </div>

            {/* Suggested tags */}
            <div className="flex flex-wrap gap-1.5">
              {suggestedTags
                .filter((tag) => !tags.includes(tag))
                .slice(0, 5)
                .map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="badge badge-neutral hover:bg-warm-gray-dark transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-warm-gray/50 bg-parchment-dark/30">
          <div className="flex items-center gap-3">
            {!showPrompt && (
              <button
                onClick={() => setShowPrompt(true)}
                className="btn-ghost p-2 rounded-lg text-ink-muted hover:text-ink"
                title="Show prompt"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            )}
            {lastSaved && (
              <span className="flex items-center gap-1.5 font-ui text-xs text-ink-muted">
                <Clock className="w-3 h-3" />
                Saved at {format(lastSaved, 'h:mm a')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Entry
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
