import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Calendar, ArrowLeft, Check } from 'lucide-react';
import { format } from 'date-fns';

// Get sync userId from localStorage
function getSyncUserId(): string | null {
  return localStorage.getItem('dashboard_user_id');
}

export function QuickAddTodo() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set today as default due date
  useEffect(() => {
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    const userId = getSyncUserId();
    if (!userId) {
      setError('Please sign in to add tasks');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/todos?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || null,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to add tasks');
        }
        throw new Error('Failed to add task');
      }

      setSuccess(true);
      setTitle('');

      // Reset after showing success
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment paper-texture flex flex-col">
      {/* Header */}
      <header className="bg-parchment/80 backdrop-blur-md border-b border-warm-gray-dark/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-lg hover:bg-warm-gray/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ink-muted" />
          </button>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-ink-muted" />
            <h1 className="font-display text-xl font-semibold text-ink">
              Quick Add
            </h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
          {/* Task input */}
          <div>
            <label htmlFor="title" className="block font-ui text-sm font-medium text-ink mb-2">
              What needs to be done?
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task..."
              className="w-full px-4 py-3 rounded-xl border border-warm-gray bg-cream font-ui text-base text-ink placeholder:text-ink-muted focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="dueDate" className="block font-ui text-sm font-medium text-ink mb-2">
              Due date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-warm-gray bg-cream font-ui text-base text-ink focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="font-ui text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 rounded-xl bg-sage-light/50 border border-sage/30 flex items-center gap-2">
              <Check className="w-5 h-5 text-sage-dark" />
              <p className="font-ui text-sm text-sage-dark">Task added!</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-ink text-parchment font-ui font-medium text-base hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </button>

          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDueDate(format(new Date(), 'yyyy-MM-dd'))}
              className="flex-1 py-2 px-3 rounded-lg border border-warm-gray font-ui text-sm text-ink-muted hover:bg-warm-gray/30 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setDueDate(format(tomorrow, 'yyyy-MM-dd'));
              }}
              className="flex-1 py-2 px-3 rounded-lg border border-warm-gray font-ui text-sm text-ink-muted hover:bg-warm-gray/30 transition-colors"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setDueDate('')}
              className="flex-1 py-2 px-3 rounded-lg border border-warm-gray font-ui text-sm text-ink-muted hover:bg-warm-gray/30 transition-colors"
            >
              No date
            </button>
          </div>
        </form>
      </main>

      {/* Footer hint */}
      <footer className="px-4 py-4 text-center">
        <p className="font-ui text-xs text-ink-muted">
          Add this page to your home screen for quick access
        </p>
      </footer>
    </div>
  );
}
