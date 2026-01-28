import { useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Sun, Cloud, Moon, ImagePlus, Loader2, X, Sparkles, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useDashboardStore } from '../store';
import { useSettings } from '../hooks';

// Available FAL.ai models
const FAL_MODELS = [
  { id: 'flux-schnell', name: 'FLUX Schnell', description: 'Fast (~2s)' },
  { id: 'flux-dev', name: 'FLUX Dev', description: 'Balanced (~10s)' },
  { id: 'flux-pro-1.1-ultra', name: 'FLUX Pro 1.1 Ultra', description: 'High quality (~15s)' },
  { id: 'flux-2-pro', name: 'FLUX 2 Pro', description: 'Best quality (~20s)' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', description: 'Creative (~10s)' },
];

export function TodayHeader() {
  const { setDailyImage, getTodayImage } = useDashboardStore();
  const { settings } = useSettings();
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

      {/* Prompt Modal - rendered via portal to #modal-root */}
      {showPromptModal && createPortal(
        <div
          className="image-gen-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            boxSizing: 'border-box',
          }}
          onClick={() => !isGenerating && setShowPromptModal(false)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2c',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              width: '448px',
              maxWidth: 'calc(100vw - 2rem)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: '#f5f5f5', margin: 0 }}>
                Generate Header Image
              </h3>
              <button
                onClick={() => !isGenerating && setShowPromptModal(false)}
                style={{ padding: '4px', borderRadius: '8px', color: '#9c9ca0', background: 'transparent', border: 'none', cursor: 'pointer' }}
                disabled={isGenerating}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#9c9ca0', marginBottom: '16px', marginTop: 0 }}>
              Describe the panoramic image you'd like for today's header.
            </p>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A serene mountain landscape at sunrise with soft pastel colors and misty valleys..."
              style={{
                display: 'block',
                width: '100%',
                height: '96px',
                padding: '8px 12px',
                fontSize: '14px',
                fontFamily: 'var(--font-ui)',
                backgroundColor: '#222224',
                color: '#f5f5f5',
                border: '1px solid #3d3d42',
                borderRadius: '8px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              disabled={isGenerating}
            />

            {/* Model selector */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#9c9ca0', display: 'block', marginBottom: '6px' }}>Model</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isGenerating}
                  style={{
                    display: 'block',
                    width: '100%',
                    appearance: 'none',
                    padding: '8px 32px 8px 12px',
                    fontSize: '14px',
                    fontFamily: 'var(--font-ui)',
                    backgroundColor: '#222224',
                    color: '#f5f5f5',
                    border: '1px solid #3d3d42',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {FAL_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
                <ChevronDown style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9c9ca0', pointerEvents: 'none' }} />
              </div>
            </div>

            {error && (
              <p style={{ marginTop: '12px', fontSize: '14px', color: '#ef4444', fontFamily: 'var(--font-ui)' }}>{error}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
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
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </motion.header>
  );
}
