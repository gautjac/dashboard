import { useState, useEffect, useRef } from 'react';
import { Target, Check, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusLines } from '../hooks';

export function FocusLineInput() {
  const { todayFocusLine: todayFocus, setFocusLine } = useFocusLines();

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(todayFocus?.text || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setValue(todayFocus?.text || '');
  }, [todayFocus]);

  const handleSubmit = () => {
    if (value.trim()) {
      setFocusLine(value.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setValue(todayFocus?.text || '');
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="mt-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-terracotta" />
        <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
          Today's Focus
        </span>
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSubmit}
              placeholder="What's the one thing you want to accomplish today?"
              className="flex-1 font-display text-2xl sm:text-3xl text-ink bg-transparent border-b-2 border-terracotta focus:outline-none placeholder:text-ink-faint py-2"
            />
            <button
              onClick={handleSubmit}
              className="p-2 rounded-lg bg-terracotta text-white hover:bg-terracotta-dark transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="display"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsEditing(true)}
            className="group flex items-center gap-3 w-full text-left py-2"
          >
            {todayFocus?.text ? (
              <>
                <span className="font-display text-2xl sm:text-3xl text-ink">
                  {todayFocus.text}
                </span>
                <Pencil className="w-4 h-4 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            ) : (
              <span className="font-display text-2xl sm:text-3xl text-ink-faint italic">
                Set your intention for today...
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
