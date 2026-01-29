import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  X,
  Sparkles,
  RefreshCw,
  Save,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Hash,
  Clock,
  Wand2,
  Brain,
  ArrowRight,
  Angry,
  Frown,
  Meh,
  Smile,
  Laugh,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStore } from '../store';
import { useClaudeAnalysis, useJournal, useHabits, useSettings } from '../hooks';
import { getTodayPrompt, getRandomPrompt } from '../data/sampleData';
import type { JournalPrompt } from '../types';

// Mood options - 5 distinct icon-driven choices
const moodOptions = [
  { value: 1, icon: Angry, label: 'Rough', emoji: '😤', color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100 border-red-200', selectedBg: 'bg-red-100 border-red-400' },
  { value: 2, icon: Frown, label: 'Low', emoji: '😔', color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200', selectedBg: 'bg-orange-100 border-orange-400' },
  { value: 3, icon: Meh, label: 'Okay', emoji: '😐', color: 'text-yellow-500', bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200', selectedBg: 'bg-yellow-100 border-yellow-400' },
  { value: 4, icon: Smile, label: 'Good', emoji: '🙂', color: 'text-green-500', bgColor: 'bg-green-50 hover:bg-green-100 border-green-200', selectedBg: 'bg-green-100 border-green-400' },
  { value: 5, icon: Laugh, label: 'Great', emoji: '😊', color: 'text-emerald-500', bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', selectedBg: 'bg-emerald-100 border-emerald-400' },
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
  // DB-first hooks
  const { todayEntry, addJournalEntry, updateJournalEntry } = useJournal();
  const { habits, setHabitValue } = useHabits();
  const { settings } = useSettings();

  // UI state from store
  const { setJournalEditorOpen, journalEditorInitialPrompt, triggerJournalRefresh } = useDashboardStore();

  const {
    isConfigured: isAIConfigured,
    isGeneratingPrompt,
    generateContextualPrompt,
    generateFollowUpPrompt,
    error: aiError,
  } = useClaudeAnalysis();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to get today's custom prompt (same logic as JournalWidget)
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

  // Helper to get random custom or default prompt
  const getCustomOrDefaultPrompt = (): JournalPrompt => {
    const customPrompts = settings.customJournalPrompts;
    if (customPrompts && customPrompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * customPrompts.length);
      return {
        id: `custom-${randomIndex}`,
        text: customPrompts[randomIndex],
        category: 'reflective',
      };
    }
    return getRandomPrompt();
  };

  // Step tracking: 'mood' for mood selection, 'editor' for main editor
  // Skip mood step if entry already exists
  const [step, setStep] = useState<'mood' | 'editor'>(todayEntry ? 'editor' : 'mood');

  const [content, setContent] = useState(todayEntry?.content || '');
  const [mood, setMood] = useState<number | undefined>(todayEntry?.mood);
  const [energy, setEnergy] = useState<number | undefined>(todayEntry?.energy);
  const [tags, setTags] = useState<string[]>(todayEntry?.tags || []);
  const [tagInput, setTagInput] = useState('');
  // Initialize prompt from store (passed from JournalWidget) or fall back to defaults
  const getInitialPrompt = (): JournalPrompt => {
    if (journalEditorInitialPrompt) {
      return {
        id: 'passed-from-widget',
        text: journalEditorInitialPrompt,
        category: 'reflective',
      };
    }
    return getTodaysCustomPrompt();
  };

  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt>(getInitialPrompt);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiPromptStyle, setAiPromptStyle] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(true); // Always show prompt initially
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Calculate word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

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

  const handleSave = async (closeAfter = false) => {
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

    try {
      if (todayEntry) {
        await updateJournalEntry(todayEntry.id, entryData);
      } else {
        await addJournalEntry(entryData);
      }

      // Update "write" habit with word count
      const writeHabit = habits.find(
        (h) => h.name.toLowerCase() === 'write' && h.targetType === 'numeric'
      );
      if (writeHabit) {
        setHabitValue(writeHabit.id, wordCount);
      }

      // Trigger refresh so other components (JournalWidget) see the update
      triggerJournalRefresh();

      setLastSaved(new Date());

      if (closeAfter) {
        setJournalEditorOpen(false);
      }
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      alert('Failed to save journal entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Auto-save if there's content
    if (content.trim() && content !== todayEntry?.content) {
      handleSave();
    }
    setJournalEditorOpen(false);
  };

  const refreshPrompt = async () => {
    console.log('[refreshPrompt] isAIConfigured:', isAIConfigured, 'content length:', content.trim().length);

    if (isAIConfigured) {
      // If there's content, generate a contextual follow-up prompt
      if (content.trim().length > 50) {
        console.log('[refreshPrompt] Calling generateFollowUpPrompt...');
        const result = await generateFollowUpPrompt(content);
        console.log('[refreshPrompt] Follow-up result:', result);
        if (result) {
          setAiPrompt(result.prompt);
          setAiPromptStyle(result.chosenStyle);
          return;
        }
        // If result is null, there was an error - check aiError state
        console.log('[refreshPrompt] No result, aiError:', aiError);
      } else {
        // No content yet - generate an initial prompt
        console.log('[refreshPrompt] Calling generateContextualPrompt...');
        const prompt = await generateContextualPrompt();
        console.log('[refreshPrompt] Contextual result:', prompt);
        if (prompt) {
          setAiPrompt(prompt);
          setAiPromptStyle(null);
          return;
        }
      }
    } else {
      console.log('[refreshPrompt] AI not configured, using fallback');
    }
    // Fallback to local prompts (use custom if available)
    setAiPrompt(null);
    setAiPromptStyle(null);
    setCurrentPrompt(getCustomOrDefaultPrompt());
  };

  const displayedPrompt = aiPrompt || currentPrompt.text;

  // Insert prompt into content
  const useCurrentPrompt = () => {
    const promptText = `**${displayedPrompt}**\n\n`;
    const newContent = content ? `${content}\n\n${promptText}` : promptText;
    setContent(newContent);

    // Focus textarea after inserting
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = newContent.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  };

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

  // Handle mood selection and proceed to editor
  const handleMoodSelect = (selectedMood: number) => {
    setMood(selectedMood);
    // Small delay for visual feedback
    setTimeout(() => setStep('editor'), 150);
  };

  // Skip mood selection
  const skipMoodSelection = () => {
    setStep('editor');
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

      {/* Mood Selection Step */}
      <AnimatePresence mode="wait">
        {step === 'mood' && (
          <motion.div
            key="mood-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.25 }}
            className="relative bg-cream rounded-2xl shadow-lifted overflow-hidden"
            style={{ width: '95vw', maxWidth: '480px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-gray/50">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {format(new Date(), 'EEEE, MMMM d')}
                </h2>
                <p className="font-ui text-sm text-ink-muted">
                  How are you feeling?
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mood Selection Grid */}
            <div className="p-6">
              <div className="grid grid-cols-5 gap-3">
                {moodOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = mood === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => handleMoodSelect(option.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        flex flex-col items-center justify-center p-4 rounded-xl border-2
                        transition-all
                        ${isSelected ? option.selectedBg : option.bgColor}
                      `}
                    >
                      <Icon className={`w-8 h-8 ${option.color}`} />
                      <span className={`font-ui text-xs mt-2 ${option.color}`}>
                        {option.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Skip option */}
              <div className="mt-6 text-center">
                <button
                  onClick={skipMoodSelection}
                  className="font-ui text-sm text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1"
                >
                  Skip for now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Editor Panel */}
        {step === 'editor' && (
          <motion.div
            key="editor-step"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative bg-cream rounded-2xl shadow-lifted overflow-hidden"
            style={{ width: '95vw', maxWidth: '1280px' }}
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
                      {aiPrompt ? (aiPromptStyle ? `${aiPromptStyle} prompt` : 'AI Prompt') : 'Writing Prompt'}
                    </span>
                    {aiPromptStyle && (
                      <span className="font-ui text-[10px] text-terracotta bg-terracotta-light/30 px-1.5 py-0.5 rounded capitalize">
                        {aiPromptStyle}
                      </span>
                    )}
                    {isAIConfigured && !aiPrompt && (
                      <span className="font-ui text-[10px] text-ink-muted bg-warm-gray px-1.5 py-0.5 rounded">
                        AI available
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowPrompt(false)}
                    className="p-1.5 rounded-md text-ink-muted hover:bg-warm-gray transition-colors"
                    title="Hide prompts"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
                {aiError && (
                  <p className="font-ui text-xs text-red-500 mt-1">
                    AI Error: {aiError}
                  </p>
                )}
                {/* Prompt action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={useCurrentPrompt}
                    disabled={isGeneratingPrompt}
                    className="btn btn-secondary text-xs py-1.5 px-3"
                    title="Add this prompt to your entry"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Use This Prompt
                  </button>
                  <button
                    onClick={refreshPrompt}
                    disabled={isGeneratingPrompt}
                    className="btn-ghost text-xs py-1.5 px-3 rounded-lg text-terracotta hover:bg-terracotta-light/20"
                    title={isAIConfigured ? "Generate new AI prompt" : "Get a different prompt"}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPrompt ? 'animate-spin' : ''}`} />
                    New Prompt
                  </button>
                </div>
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
            className="w-full min-h-[300px] p-0 font-body text-lg text-ink bg-transparent border-none resize-none focus:outline-none placeholder:text-ink-faint leading-relaxed"
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
                className="btn-ghost flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-terracotta hover:bg-terracotta-light/20"
                title="Show writing prompts"
              >
                <Sparkles className="w-4 h-4" />
                <span className="font-ui text-xs">Prompts</span>
              </button>
            )}
            <span className="font-ui text-xs text-ink-muted">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
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
              onClick={() => handleSave(true)}
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}
