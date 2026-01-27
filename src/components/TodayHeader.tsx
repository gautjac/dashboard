import { useState } from 'react';
import { format } from 'date-fns';
import { Sun, Cloud, Moon, ImagePlus, Loader2, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStore } from '../store';

export function TodayHeader() {
  const { settings, dailyImage, setDailyImage, getTodayImage } = useDashboardStore();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = format(now, 'EEEE');
  const dateFormatted = format(now, 'MMMM d');

  const todayImage = getTodayImage();
  const hasFalKey = Boolean(settings.falApiKey);

  // Determine greeting based on time of day
  const getGreeting = () => {
    const name = settings.userName ? `, ${settings.userName}` : '';
    if (hour < 12) return `Good morning${name}`;
    if (hour < 17) return `Good afternoon${name}`;
    if (hour < 21) return `Good evening${name}`;
    return `Good night${name}`;
  };

  // Determine icon based on time of day
  const TimeIcon = () => {
    if (hour >= 6 && hour < 18) {
      if (hour < 12) return <Sun className="w-5 h-5 text-terracotta" />;
      return <Cloud className="w-5 h-5 text-ink-muted" />;
    }
    return <Moon className="w-5 h-5 text-ink-muted" />;
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim() || !settings.falApiKey) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          apiKey: settings.falApiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();

      setDailyImage({
        date: format(new Date(), 'yyyy-MM-dd'),
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        generatedAt: data.generatedAt,
      });

      setShowPromptModal(false);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="mb-6"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left side: Date and greeting */}
        <div className="flex-1">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="font-ui text-sm text-ink-muted uppercase tracking-wider mb-1"
          >
            {dayOfWeek}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="font-display text-5xl sm:text-6xl font-semibold text-ink tracking-tight leading-none"
          >
            {dateFormatted}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center gap-3 mt-2"
          >
            <p className="font-body text-lg text-ink-light">
              {getGreeting()}
            </p>
            <div className="flex items-center gap-1.5 text-ink-muted">
              <TimeIcon />
              <span className="font-ui text-sm">
                {format(now, 'h:mm a')}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Right side: Generated image or prompt button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex-shrink-0"
        >
          {todayImage ? (
            <div className="relative group">
              <img
                src={todayImage.imageUrl}
                alt={todayImage.prompt}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover border border-warm-gray/50 shadow-sm"
              />
              {/* Regenerate button on hover */}
              {hasFalKey && (
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Generate new image"
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </button>
              )}
            </div>
          ) : hasFalKey ? (
            <button
              onClick={() => setShowPromptModal(true)}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl border-2 border-dashed border-warm-gray-dark hover:border-terracotta bg-cream hover:bg-terracotta-light/10 flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <ImagePlus className="w-8 h-8 text-ink-muted" />
              <span className="font-ui text-xs text-ink-muted">Generate image</span>
            </button>
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl bg-cream border border-warm-gray/50 flex items-center justify-center">
              <div className="text-center p-3">
                <TimeIcon />
                <p className="font-ui text-2xl font-semibold text-ink mt-2">
                  {format(now, 'h:mm')}
                </p>
                <p className="font-ui text-xs text-ink-muted uppercase">
                  {format(now, 'a')}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Decorative divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="mt-6 h-px bg-gradient-to-r from-transparent via-warm-gray-dark to-transparent origin-left"
      />

      {/* Prompt Modal */}
      <AnimatePresence>
        {showPromptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !isGenerating && setShowPromptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-parchment rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-ink">
                  Generate Daily Image
                </h3>
                <button
                  onClick={() => !isGenerating && setShowPromptModal(false)}
                  className="p-1 rounded-lg hover:bg-warm-gray/50 text-ink-muted"
                  disabled={isGenerating}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="font-ui text-sm text-ink-muted mb-4">
                Describe the image you'd like to generate for today's dashboard.
              </p>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A serene mountain landscape at sunrise with soft pastel colors..."
                className="w-full h-24 px-3 py-2 text-sm font-ui bg-cream text-ink border border-warm-gray-dark rounded-lg resize-none focus:outline-none focus:border-terracotta placeholder:text-ink-faint"
                disabled={isGenerating}
              />

              {error && (
                <p className="mt-2 text-sm text-red-500 font-ui">{error}</p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="btn btn-secondary text-sm"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateImage}
                  disabled={!prompt.trim() || isGenerating}
                  className="btn btn-primary text-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
