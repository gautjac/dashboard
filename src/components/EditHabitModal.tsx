import { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Dumbbell,
  Pencil,
  Moon,
  Brain,
  Hash,
  Target,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useHabits } from '../hooks';
import type { Habit } from '../types';

interface EditHabitModalProps {
  habit: Habit;
  onClose: () => void;
}

const iconOptions = [
  { value: 'brain', icon: Brain, label: 'Brain' },
  { value: 'book', icon: BookOpen, label: 'Book' },
  { value: 'dumbbell', icon: Dumbbell, label: 'Exercise' },
  { value: 'pen', icon: Pencil, label: 'Writing' },
  { value: 'moon', icon: Moon, label: 'Sleep' },
  { value: 'default', icon: Sparkles, label: 'General' },
];

const scheduleOptions = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export function EditHabitModal({ habit, onClose }: EditHabitModalProps) {
  const { updateHabit, deleteHabit } = useHabits();

  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description || '');
  const [icon, setIcon] = useState(habit.icon || 'default');
  const [schedule, setSchedule] = useState<'daily' | 'weekly'>(
    habit.schedule === 'custom' ? 'daily' : habit.schedule
  );
  const [targetType, setTargetType] = useState<'binary' | 'numeric'>(habit.targetType);
  const [targetValue, setTargetValue] = useState(habit.targetValue?.toString() || '');
  const [targetUnit, setTargetUnit] = useState(habit.targetUnit || '');
  const [tags, setTags] = useState<string[]>(habit.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateHabit(habit.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      schedule,
      targetType,
      targetValue: targetType === 'numeric' ? parseInt(targetValue, 10) || undefined : undefined,
      targetUnit: targetType === 'numeric' ? targetUnit.trim() || undefined : undefined,
      tags,
    });

    onClose();
  };

  const handleDelete = () => {
    deleteHabit(habit.id);
    onClose();
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
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-cream rounded-2xl shadow-lifted overflow-hidden"
        style={{ width: '95vw', maxWidth: '480px', maxHeight: '90vh' }}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-warm-gray/50">
            <h2 className="font-display text-xl font-semibold text-ink">
              Edit Habit
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* Name */}
            <div>
              <label className="font-ui text-sm font-medium text-ink block mb-2">
                Habit name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning meditation"
                className="input w-full"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="font-ui text-sm font-medium text-ink block mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., 10 minutes of mindfulness"
                className="input w-full"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="font-ui text-sm font-medium text-ink block mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setIcon(option.value)}
                      className={`
                        p-3 rounded-lg border transition-all
                        ${icon === option.value
                          ? 'border-terracotta bg-terracotta-light/20'
                          : 'border-warm-gray-dark hover:border-ink-faint'
                        }
                      `}
                      title={option.label}
                    >
                      <IconComponent className={`w-5 h-5 ${icon === option.value ? 'text-terracotta-dark' : 'text-ink-muted'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="font-ui text-sm font-medium text-ink block mb-2">
                Frequency
              </label>
              <div className="flex gap-2">
                {scheduleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSchedule(option.value)}
                    className={`
                      flex-1 p-3 rounded-lg border transition-all font-ui text-sm
                      ${schedule === option.value
                        ? 'border-terracotta bg-terracotta-light/20 text-ink'
                        : 'border-warm-gray-dark hover:border-ink-faint text-ink-light'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target type */}
            <div>
              <label className="font-ui text-sm font-medium text-ink block mb-2">
                Tracking type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('binary')}
                  className={`
                    flex-1 p-3 rounded-lg border transition-all font-ui text-sm
                    ${targetType === 'binary'
                      ? 'border-terracotta bg-terracotta-light/20 text-ink'
                      : 'border-warm-gray-dark hover:border-ink-faint text-ink-light'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-current" />
                    <span>Yes / No</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('numeric')}
                  className={`
                    flex-1 p-3 rounded-lg border transition-all font-ui text-sm
                    ${targetType === 'numeric'
                      ? 'border-terracotta bg-terracotta-light/20 text-ink'
                      : 'border-warm-gray-dark hover:border-ink-faint text-ink-light'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>Numeric goal</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Numeric target fields */}
            {targetType === 'numeric' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Target value
                  </label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="e.g., 8"
                    className="input w-full"
                    min="1"
                  />
                </div>
                <div className="flex-1">
                  <label className="font-ui text-sm font-medium text-ink block mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value)}
                    placeholder="e.g., glasses"
                    className="input w-full"
                  />
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-ink-muted" />
                <label className="font-ui text-sm font-medium text-ink">
                  Tags (optional)
                </label>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
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
              <div className="flex flex-wrap gap-1.5">
                {['health', 'mindfulness', 'productivity', 'learning', 'fitness']
                  .filter((t) => !tags.includes(t))
                  .slice(0, 4)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="badge badge-neutral hover:bg-warm-gray-dark transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>

            {/* Delete section */}
            <div className="pt-4 border-t border-warm-gray/50">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 font-ui text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete habit
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="font-ui text-sm text-red-700 mb-3">
                    Are you sure? This will delete the habit and all its completion history.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="btn text-sm bg-red-500 text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-warm-gray/50 bg-parchment-dark/30">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
