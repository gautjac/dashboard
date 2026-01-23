import { motion } from 'motion/react';
import { Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, signup, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-ink flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-parchment animate-pulse" />
          </div>
          <p className="font-ui text-sm text-ink-muted">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment paper-texture flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ink flex items-center justify-center shadow-lifted">
            <Sparkles className="w-8 h-8 text-parchment" />
          </div>
          <h1 className="font-display text-4xl font-bold text-ink tracking-tight">
            Daily
          </h1>
          <p className="font-body text-lg text-ink-muted mt-2">
            Your personal dashboard for mindful living
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <div className="text-center mb-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              Welcome
            </h2>
            <p className="font-ui text-sm text-ink-muted mt-1">
              Sign in to access your dashboard
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={login}
              className="btn btn-primary w-full justify-center py-3"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>

            <button
              onClick={signup}
              className="btn btn-secondary w-full justify-center py-3"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </button>
          </div>

          <p className="mt-6 text-center font-ui text-xs text-ink-faint">
            Secure authentication powered by Netlify Identity
          </p>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Habits', desc: 'Track daily' },
            { label: 'Journal', desc: 'Reflect & grow' },
            { label: 'Insights', desc: 'AI-powered' },
          ].map((feature) => (
            <div key={feature.label} className="p-3">
              <p className="font-ui text-sm font-medium text-ink">{feature.label}</p>
              <p className="font-ui text-xs text-ink-muted">{feature.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
