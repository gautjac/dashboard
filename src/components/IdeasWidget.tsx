import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Lightbulb,
  RefreshCw,
  Settings2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trash2,
  Archive,
  RotateCcw,
  X,
  Plus,
  Pencil,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIdeas } from '../hooks/useIdeas';
import { useCollapsedState } from '../hooks/useCollapsedState';
import { useDashboardStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import { formatDistanceToNow } from 'date-fns';
import type { Idea } from '../types';

interface IdeaItemProps {
  idea: Idea;
  index: number;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onEdit?: () => void;
  isArchived?: boolean;
}

function IdeaItem({ idea, index, onDelete, onArchive, onRestore, onEdit, isArchived }: IdeaItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.05 }}
      className="group p-3 rounded-lg hover:bg-warm-gray/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Lightbulb icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-yellow-600" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Idea text */}
          <p className="font-body text-sm text-ink-light leading-relaxed">
            {idea.text}
          </p>

          {/* Category and timestamp */}
          <div className="flex items-center gap-2 mt-1">
            {idea.category && (
              <span className="badge badge-neutral text-[10px]">
                {idea.category}
              </span>
            )}
            <span className="font-ui text-xs text-ink-muted">
              {(() => {
                try {
                  const date = new Date(isArchived && idea.archivedAt ? idea.archivedAt : idea.createdAt);
                  if (isNaN(date.getTime())) return 'recently';
                  return formatDistanceToNow(date, { addSuffix: true });
                } catch {
                  return 'recently';
                }
              })()}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            {isArchived && onRestore && (
              <button
                onClick={onRestore}
                className="inline-flex items-center gap-1.5 font-ui text-xs text-sage hover:text-sage-dark transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Restore
              </button>
            )}

            {!isArchived && onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 font-ui text-xs text-ink-faint hover:text-ink opacity-0 group-hover:opacity-100 transition-all"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}

            {!isArchived && onArchive && (
              <button
                onClick={onArchive}
                className="inline-flex items-center gap-1.5 font-ui text-xs text-ink-faint hover:text-ink opacity-0 group-hover:opacity-100 transition-all"
              >
                <Archive className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 font-ui text-xs text-ink-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ArchivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  ideas: Idea[];
  isLoading: boolean;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

function ArchivePanel({ isOpen, onClose, ideas, isLoading, onRestore, onDelete }: ArchivePanelProps) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Theme-aware colors
  const colors = isDark ? {
    bg: '#222224',
    bgAlt: '#141416',
    text: '#f5f5f5',
    textMuted: '#9c9ca0',
    border: '#3d3d42',
    inputBg: '#2d2d30',
  } : {
    bg: '#FFFEF9',
    bgAlt: '#F5F2ED',
    text: '#1C1917',
    textMuted: '#78716C',
    border: '#E7E5E4',
    inputBg: '#FFFFFF',
  };

  // Filter ideas based on search query
  const filteredIdeas = searchQuery.trim()
    ? ideas.filter(idea => {
        const query = searchQuery.toLowerCase();
        return (
          idea.text.toLowerCase().includes(query) ||
          (idea.category && idea.category.toLowerCase().includes(query))
        );
      })
    : ideas;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(28, 25, 23, 0.4)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 512,
          maxHeight: '80vh',
          backgroundColor: colors.bg,
          borderRadius: 16,
          boxShadow: isDark
            ? '0 4px 16px rgba(0, 0, 0, 0.3), 0 12px 32px rgba(0, 0, 0, 0.25)'
            : '0 4px 16px rgba(28, 25, 23, 0.08), 0 12px 32px rgba(28, 25, 23, 0.06)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Archive style={{ width: 20, height: 20, color: colors.textMuted }} />
              <h3
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 18,
                  fontWeight: 600,
                  color: colors.text,
                  margin: 0,
                }}
              >
                Archived Ideas
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 4,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: colors.textMuted,
              }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: colors.textMuted,
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archived ideas..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.inputBg,
                color: colors.text,
                fontFamily: '"Jost", system-ui, sans-serif',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 120px)', backgroundColor: colors.bg }}>
          {isLoading ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <RefreshCw
                className="animate-spin"
                style={{
                  width: 24,
                  height: 24,
                  margin: '0 auto',
                  color: colors.textMuted,
                }}
              />
              <p
                style={{
                  marginTop: 8,
                  fontFamily: '"Jost", system-ui, sans-serif',
                  fontSize: 14,
                  color: colors.textMuted,
                }}
              >
                Loading archived ideas...
              </p>
            </div>
          ) : ideas.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <Archive
                style={{
                  width: 32,
                  height: 32,
                  margin: '0 auto 8px',
                  color: colors.textMuted,
                }}
              />
              <p
                style={{
                  fontFamily: '"Jost", system-ui, sans-serif',
                  fontSize: 14,
                  color: colors.textMuted,
                }}
              >
                No archived ideas
              </p>
            </div>
          ) : filteredIdeas.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <Search
                style={{
                  width: 32,
                  height: 32,
                  margin: '0 auto 8px',
                  color: colors.textMuted,
                }}
              />
              <p
                style={{
                  fontFamily: '"Jost", system-ui, sans-serif',
                  fontSize: 14,
                  color: colors.textMuted,
                }}
              >
                No ideas match "{searchQuery}"
              </p>
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              <AnimatePresence>
                {filteredIdeas.map((idea, index) => (
                  <IdeaItem
                    key={idea.id}
                    idea={idea}
                    index={index}
                    isArchived
                    onRestore={() => onRestore(idea.id)}
                    onDelete={() => onDelete(idea.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function IdeasWidget() {
  const { setSettingsOpen } = useDashboardStore();
  const {
    ideas,
    archivedIdeas,
    isLoading,
    isLoadingArchived,
    error,
    syncEnabled,
    refreshIdeas,
    fetchArchivedIdeas,
    addIdea,
    updateIdea,
    deleteIdea,
    archiveIdea,
    restoreIdea,
    total,
  } = useIdeas();

  const [showAll, setShowAll] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [newIdeaCategory, setNewIdeaCategory] = useState('');
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('ideas');

  const displayedIdeas = showAll ? ideas : ideas.slice(0, 5);
  const hasIdeas = ideas.length > 0 || total > 0;

  const handleOpenArchive = () => {
    setShowArchive(true);
    fetchArchivedIdeas();
  };

  const handleAddIdea = async () => {
    if (!newIdeaText.trim()) return;
    try {
      await addIdea(newIdeaText.trim(), newIdeaCategory.trim() || undefined);
      setNewIdeaText('');
      setNewIdeaCategory('');
      setShowAddForm(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleStartEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setEditText(idea.text);
    setEditCategory(idea.category || '');
  };

  const handleSaveEdit = async () => {
    if (!editingIdea || !editText.trim()) return;
    try {
      await updateIdea(editingIdea.id, editText.trim(), editCategory.trim() || undefined);
      setEditingIdea(null);
      setEditText('');
      setEditCategory('');
    } catch {
      // Error handled by hook
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="card p-5"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${!isCollapsed ? 'mb-4' : ''}`}>
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-ink-muted" />
          </motion.div>
          <Lightbulb className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            Idea Inbox
          </h3>
          {isCollapsed && ideas.length > 0 && (
            <span className="font-ui text-sm text-ink-muted">
              ({ideas.length})
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="View archive"
            onClick={handleOpenArchive}
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="Add idea"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4" />
          </button>
          {hasIdeas && (
            <button
              className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
              title="Refresh ideas"
              onClick={refreshIdeas}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="Configure API key"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Sync warning */}
            {!syncEnabled && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-ui text-sm text-yellow-800">
                    Enable Sync to save ideas. <button onClick={() => setSettingsOpen(true)} className="underline">Go to Settings</button>
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-ui text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Quick add form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="p-3 rounded-lg border border-warm-gray-dark bg-parchment">
                    <textarea
                      value={newIdeaText}
                      onChange={(e) => setNewIdeaText(e.target.value)}
                      placeholder="Capture your idea..."
                      rows={2}
                      className="input w-full resize-none text-sm mb-2"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newIdeaCategory}
                        onChange={(e) => setNewIdeaCategory(e.target.value)}
                        placeholder="Category (optional)"
                        className="input flex-1 text-sm"
                      />
                      <button
                        onClick={handleAddIdea}
                        disabled={!newIdeaText.trim() || !syncEnabled}
                        className="btn btn-primary text-sm disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewIdeaText('');
                          setNewIdeaCategory('');
                        }}
                        className="btn btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoading && ideas.length === 0 ? (
              // Loading state
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />
                </div>
                <p className="font-ui text-sm text-ink-muted">
                  Loading your ideas...
                </p>
              </div>
            ) : ideas.length === 0 ? (
              // Empty state
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="font-display text-lg text-ink">
                  No ideas yet
                </p>
                <p className="font-ui text-sm text-ink-muted mt-1 mb-4">
                  Capture ideas from anywhere with the iOS shortcut
                </p>
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add your first idea
                </button>
              </div>
            ) : (
              <>
                {/* Ideas list */}
                <div className="space-y-1">
                  <AnimatePresence>
                    {displayedIdeas.map((idea, index) => (
                      editingIdea?.id === idea.id ? (
                        <motion.div
                          key={idea.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-3 rounded-lg border border-warm-gray-dark bg-parchment"
                        >
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                            className="input w-full resize-none text-sm mb-2"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              placeholder="Category (optional)"
                              className="input flex-1 text-sm"
                            />
                            <button
                              onClick={handleSaveEdit}
                              disabled={!editText.trim()}
                              className="btn btn-primary text-sm disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingIdea(null);
                                setEditText('');
                                setEditCategory('');
                              }}
                              className="btn btn-secondary text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <IdeaItem
                          key={idea.id}
                          idea={idea}
                          index={index}
                          onArchive={() => archiveIdea(idea.id)}
                          onDelete={() => deleteIdea(idea.id)}
                          onEdit={() => handleStartEdit(idea)}
                        />
                      )
                    ))}
                  </AnimatePresence>
                </div>

                {/* Show more / less */}
                {ideas.length > 5 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-ink-muted hover:text-ink font-ui text-sm transition-colors"
                  >
                    {showAll ? (
                      <>
                        Show less <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Show all {ideas.length} ideas <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Panel */}
      <AnimatePresence>
        {showArchive && (
          <ArchivePanel
            isOpen={showArchive}
            onClose={() => setShowArchive(false)}
            ideas={archivedIdeas}
            isLoading={isLoadingArchived}
            onRestore={restoreIdea}
            onDelete={deleteIdea}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
