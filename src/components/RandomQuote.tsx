import { Quote, RefreshCw, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuotes } from '../hooks/useQuotes';
import { useDashboardStore } from '../store';

export function RandomQuote() {
  const { randomQuote, isLoadingRandom, fetchRandomQuote, total } = useQuotes();
  const { setSettingsOpen } = useDashboardStore();

  // Don't render anything if there are no quotes
  if (!randomQuote && !isLoadingRandom && total === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="mt-6 pt-4 border-t border-warm-gray/50"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Quote className="w-4 h-4 text-sage" />
          <span className="font-ui text-xs text-ink-muted uppercase tracking-wider">
            Daily Inspiration
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchRandomQuote}
            disabled={isLoadingRandom}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink transition-colors disabled:opacity-50"
            title="Get new quote"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRandom ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink transition-colors"
            title="Manage quotes"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoadingRandom ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-2"
          >
            <div className="h-6 w-3/4 bg-warm-gray/50 rounded animate-pulse" />
          </motion.div>
        ) : randomQuote ? (
          <motion.blockquote
            key={randomQuote.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="py-1"
          >
            <p className="font-body text-lg text-ink-light italic leading-relaxed">
              "{randomQuote.text}"
            </p>
            {randomQuote.author && (
              <footer className="mt-2 font-ui text-sm text-ink-muted">
                — {randomQuote.author}
              </footer>
            )}
          </motion.blockquote>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
