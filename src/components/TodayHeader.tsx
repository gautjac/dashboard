import { useState } from 'react';
import { format } from 'date-fns';
import { Sun, Cloud, Moon, ImagePlus, Loader2, X, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStore } from '../store';

// Available FAL.ai models
const FAL_MODELS = [
  { id: 'flux-schnell', name: 'FLUX Schnell', description: 'Fast (~2s)' },
  { id: 'flux-dev', name: 'FLUX Dev', description: 'Balanced (~10s)' },
  { id: 'flux-pro', name: 'FLUX Pro', description: 'High quality (~15s)' },
  { id: 'flux-pro-1.1', name: 'FLUX Pro 1.1', description: 'Best quality (~15s)' },
  { id: 'nana-banana-pro', name: 'Nana Banana Pro', description: 'Creative (~10s)' },
];

export function TodayHeader() {
  const { settings, setDailyImage, getTodayImage } = useDashboardStore();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('flux-schnell');
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
          model: selectedModel,
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
      {/* Banner Image */}
      {todayImage ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 rounded-xl overflow-hidden group"
        >
          <img
            src={todayImage.imageUrl}
            alt={todayImage.prompt}
            className="w-full h-40 sm:h-52 object-cover"
          />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {/* Regenerate button on hover */}
          {hasFalKey && (
            <button
              onClick={() => setShowPromptModal(true)}
              className="absolute top-3 right-3 p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Generate new image"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      ) : hasFalKey ? (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowPromptModal(true)}
          className="w-full mb-6 h-32 rounded-xl border-2 border-dashed border-warm-gray-dark hover:border-terracotta bg-cream/50 hover:bg-terracotta-light/10 flex items-center justify-center gap-3 transition-colors"
        >
          <ImagePlus className="w-6 h-6 text-ink-muted" />
          <span className="font-ui text-sm text-ink-muted">Generate a header image for today</span>
        </motion.button>
      ) : null}

      {/* Date and Greeting */}
      <div className="flex items-start justify-between gap-4">
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
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="font-body text-lg text-ink-light mt-2"
          >
            {getGreeting()}
          </motion.p>
        </div>

        {/* Time display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center gap-3 p-3 bg-cream rounded-xl border border-warm-gray/50"
        >
          <TimeIcon />
          <div className="text-right">
            <p className="font-ui text-2xl font-semibold text-ink">
              {format(now, 'h:mm')}
            </p>
            <p className="font-ui text-xs text-ink-muted uppercase">
              {format(now, 'a')}
            </p>
          </div>
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
                  Generate Header Image
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
                Describe the panoramic image you'd like for today's header.
              </p>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A serene mountain landscape at sunrise with soft pastel colors and misty valleys..."
                className="w-full h-24 px-3 py-2 text-sm font-ui bg-cream text-ink border border-warm-gray-dark rounded-lg resize-none focus:outline-none focus:border-terracotta placeholder:text-ink-faint"
                disabled={isGenerating}
              />

              {/* Model selector */}
              <div className="mt-3">
                <label className="font-ui text-xs text-ink-muted block mb-1.5">Model</label>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isGenerating}
                    className="w-full appearance-none px-3 py-2 pr-8 text-sm font-ui bg-cream text-ink border border-warm-gray-dark rounded-lg focus:outline-none focus:border-terracotta cursor-pointer"
                  >
                    {FAL_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                </div>
              </div>

              {error && (
                <p className="mt-3 text-sm text-red-500 font-ui">{error}</p>
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
