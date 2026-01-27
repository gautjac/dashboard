import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { createPortal } from 'react-dom';
import {
  X,
  Pencil,
  Smile,
  Meh,
  Frown,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Hash,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import type { JournalEntry } from '../types';

interface JournalEntryViewerProps {
  entry: JournalEntry;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
}

// Mood icons
const moodIcons = [
  { value: 1, icon: Frown, label: 'Struggling', color: 'text-red-400' },
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
  { value: 5, icon: BatteryFull, label: 'Peak', color: 'text-emerald-500' },
];

export function JournalEntryViewer({ entry, onClose, onEdit, onDelete }: JournalEntryViewerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { isDark } = useTheme();

  // Theme-aware colors for inline styles
  const colors = isDark ? {
    bg: '#222224',
    bgAlt: '#141416',
    text: '#f5f5f5',
  } : {
    bg: '#FFFEF9',
    bgAlt: '#F5F2ED',
    text: '#1C1917',
  };

  const getMoodData = (mood: number | undefined) => {
    if (!mood) return null;
    return moodIcons.find((m) => m.value === mood);
  };

  const getEnergyData = (energy: number | undefined) => {
    if (!energy) return null;
    return energyIcons.find((e) => e.value === energy);
  };

  const moodData = getMoodData(entry.mood);
  const energyData = getEnergyData(entry.energy);

  // Calculate word count
  const wordCount = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;

  const handleDelete = () => {
    if (onDelete) {
      onDelete(entry.id);
      onClose();
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-start justify-center pt-12 pb-12 px-4 overflow-y-auto"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(28, 25, 23, 0.4)', backdropFilter: 'blur(4px)' }} />

      {/* Viewer Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative rounded-2xl shadow-lifted overflow-hidden"
        style={{ width: '95vw', maxWidth: '1280px', backgroundColor: colors.bg, zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-gray/50" style={{ backgroundColor: colors.bg }}>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {format(parseISO(entry.date), 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="font-ui text-sm text-ink-muted">
              {wordCount} words
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="btn btn-secondary text-sm"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg text-ink-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete entry"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mood & Energy Display */}
        {(moodData || energyData) && (
          <div className="flex items-center gap-6 px-6 py-3 border-b border-warm-gray/50" style={{ backgroundColor: colors.bgAlt }}>
            {moodData && (
              <div className="flex items-center gap-2">
                <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                  Mood
                </span>
                <div className={`flex items-center gap-1.5 ${moodData.color}`}>
                  <moodData.icon className="w-5 h-5" />
                  <span className="font-ui text-sm">{moodData.label}</span>
                </div>
              </div>
            )}
            {energyData && (
              <div className="flex items-center gap-2">
                <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                  Energy
                </span>
                <div className={`flex items-center gap-1.5 ${energyData.color}`}>
                  <energyData.icon className="w-5 h-5" />
                  <span className="font-ui text-sm">{energyData.label}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6" style={{ backgroundColor: colors.bg }}>
          <div className="font-body text-lg text-ink leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-warm-gray/50">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-ink-muted" />
                <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                  Tags
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <span key={tag} className="badge badge-terracotta">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prompt used */}
          {entry.promptUsed && (
            <div className="mt-4 p-3 rounded-lg bg-terracotta-light/10 border border-terracotta/10">
              <span className="font-ui text-xs text-terracotta-dark uppercase tracking-wider">
                Prompt used
              </span>
              <p className="font-display text-sm text-ink mt-1 italic">
                "{entry.promptUsed}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-warm-gray/50" style={{ backgroundColor: colors.bgAlt }}>
          <button
            onClick={onClose}
            className="btn btn-secondary text-sm"
          >
            Close
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: isDark ? 'rgba(34, 34, 36, 0.95)' : 'rgba(255, 254, 249, 0.95)', zIndex: 10 }}
          >
            <div className="text-center p-6">
              <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-ink mb-2">
                Delete this entry?
              </h3>
              <p className="font-ui text-sm text-ink-muted mb-6">
                This will permanently delete your journal entry from {format(parseISO(entry.date), 'MMMM d, yyyy')}.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="btn text-sm"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
