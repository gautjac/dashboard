import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Calendar, ArrowLeft, Check } from 'lucide-react';
import { format } from 'date-fns';
import netlifyIdentity from 'netlify-identity-widget';
import { ProjectSelect } from './ProjectSelect';

// Get user info - try localStorage first (for sync), then Netlify Identity
function getUserInfo(): { userId: string; email: string } | null {
  // First check localStorage (sync service)
  const syncUserId = localStorage.getItem('dashboard_user_id');
  const syncEmail = localStorage.getItem('dashboard_user_email');
  if (syncUserId && syncEmail) {
    return { userId: syncUserId, email: syncEmail };
  }

  // Fall back to Netlify Identity user
  const user = netlifyIdentity.currentUser();
  if (user?.id && user?.email) {
    return { userId: user.id, email: user.email };
  }

  return null;
}

export function QuickAddTodo() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [project, setProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set today as default due date
  useEffect(() => {
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  // Fetch existing projects for autocomplete
  const fetchProjects = async () => {
    const userInfo = getUserInfo();
    if (!userInfo) return;

    try {
      const params = new URLSearchParams({
        userId: userInfo.userId,
        email: userInfo.email,
        distinct: 'projects',
      });
      const response = await fetch(`/.netlify/functions/todos?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    const userInfo = getUserInfo();
    if (!userInfo) {
      setError('Please sign in to add tasks');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId: userInfo.userId,
        email: userInfo.email,
      });
      const response = await fetch(`/.netlify/functions/todos?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || null,
          project: project,
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

      // If a new project was used, add it to the list for autocomplete
      if (project && !projects.includes(project)) {
        setProjects(prev => [...prev, project].sort());
      }
      setProject(null);

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
      <main className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="block w-full px-4 py-3 rounded-xl border border-warm-gray bg-cream font-ui text-base text-ink placeholder:text-ink-muted focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
              autoFocus
              autoComplete="off"
              style={{ width: '100%' }}
            />
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="dueDate" className="block font-ui text-sm font-medium text-ink mb-2">
              Due date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted pointer-events-none" />
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 rounded-xl border border-warm-gray bg-cream font-ui text-base text-ink focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block font-ui text-sm font-medium text-ink mb-2">
              Project
            </label>
            <ProjectSelect
              value={project}
              onChange={setProject}
              projects={projects}
              placeholder="Project (optional)"
            />
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
            className="block w-full py-3 px-4 rounded-xl bg-ink text-parchment font-ui font-medium text-base hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </button>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDueDate(format(new Date(), 'yyyy-MM-dd'))}
              className="py-2 px-3 rounded-lg border border-warm-gray font-ui text-sm text-ink-muted hover:bg-warm-gray/30 transition-colors"
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
              className="py-2 px-3 rounded-lg border border-warm-gray font-ui text-sm text-ink-muted hover:bg-warm-gray/30 transition-colors"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setDueDate('')}
              className="py-2 px-3 rounded-lg border border-warm-gray font-ui text-sm text-ink-muted hover:bg-warm-gray/30 transition-colors"
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
