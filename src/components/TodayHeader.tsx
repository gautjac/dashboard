import { format } from 'date-fns';
import { Sun, Cloud, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useDashboardStore } from '../store';

export function TodayHeader() {
  const { settings } = useDashboardStore();
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = format(now, 'EEEE');
  const dateFormatted = format(now, 'MMMM d');

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
      if (hour < 12) return <Sun className="w-6 h-6 text-terracotta" />;
      return <Cloud className="w-6 h-6 text-ink-muted" />;
    }
    return <Moon className="w-6 h-6 text-ink-muted" />;
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="mb-6"
    >
      <div className="flex items-start justify-between">
        <div>
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
    </motion.header>
  );
}
