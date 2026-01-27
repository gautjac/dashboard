import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Link2,
  ExternalLink,
  RefreshCw,
  Settings2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Trash2,
  Loader2,
  Archive,
  RotateCcw,
  X,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLinks } from '../hooks/useLinks';
import { useCollapsedState } from '../hooks/useCollapsedState';
import { useDashboardStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import { formatDistanceToNow } from 'date-fns';
import type { Link } from '../types';

interface LinkItemProps {
  link: Link;
  index: number;
  onSummarize?: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  isSummarizing?: boolean;
  isArchived?: boolean;
}

// Extract domain from URL for display
function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinkItem({ link, index, onSummarize, onDelete, onArchive, onRestore, isSummarizing, isArchived }: LinkItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSummary = link.summary && link.summary !== 'Unable to generate summary';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.05 }}
      className="group p-3 rounded-lg hover:bg-warm-gray/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Link icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-purple-600" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title or URL */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-ui text-sm font-medium text-ink truncate">
              {link.title || getDomain(link.url)}
            </span>
            <span className="font-ui text-xs text-ink-muted flex-shrink-0">
              {(() => {
                try {
                  const date = new Date(isArchived && link.archivedAt ? link.archivedAt : link.savedAt);
                  if (isNaN(date.getTime())) return 'recently';
                  return formatDistanceToNow(date, { addSuffix: true });
                } catch {
                  return 'recently';
                }
              })()}
            </span>
          </div>

          {/* Domain */}
          {link.title && (
            <p className="font-ui text-xs text-ink-muted mb-1 truncate">
              {getDomain(link.url)}
            </p>
          )}

          {/* Summary */}
          {hasSummary && (
            <>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                {expanded ? link.summary : link.summary!.slice(0, 150) + (link.summary!.length > 150 ? '...' : '')}
              </p>
              {link.summary!.length > 150 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-ui text-xs text-purple-600 hover:text-purple-700 transition-colors"
            >
              Open link
              <ExternalLink className="w-3 h-3" />
            </a>

            {!isArchived && !hasSummary && onSummarize && (
              <button
                onClick={onSummarize}
                disabled={isSummarizing}
                className="inline-flex items-center gap-1.5 font-ui text-xs text-terracotta hover:text-terracotta-dark transition-colors disabled:opacity-50"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Get summary
                  </>
                )}
              </button>
            )}

            {isArchived && onRestore && (
              <button
                onClick={onRestore}
                className="inline-flex items-center gap-1.5 font-ui text-xs text-sage hover:text-sage-dark transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Restore
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
  links: Link[];
  isLoading: boolean;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

function ArchivePanel({ isOpen, onClose, links, isLoading, onRestore, onDelete }: ArchivePanelProps) {
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

  // Filter links based on search query
  const filteredLinks = searchQuery.trim()
    ? links.filter(link => {
        const query = searchQuery.toLowerCase();
        return (
          (link.title && link.title.toLowerCase().includes(query)) ||
          link.url.toLowerCase().includes(query) ||
          (link.summary && link.summary.toLowerCase().includes(query))
        );
      })
    : links;

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
                Archived Links
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
              placeholder="Search archived links..."
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
                Loading archived links...
              </p>
            </div>
          ) : links.length === 0 ? (
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
                No archived links
              </p>
            </div>
          ) : filteredLinks.length === 0 ? (
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
                No links match "{searchQuery}"
              </p>
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              <AnimatePresence>
                {filteredLinks.map((link, index) => (
                  <LinkItem
                    key={link.id}
                    link={link}
                    index={index}
                    isArchived
                    onRestore={() => onRestore(link.id)}
                    onDelete={() => onDelete(link.id)}
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

export function LinksWidget() {
  const { setSettingsOpen } = useDashboardStore();
  const {
    links,
    archivedLinks,
    isLoading,
    isLoadingArchived,
    error,
    refreshLinks,
    fetchArchivedLinks,
    deleteLink,
    archiveLink,
    restoreLink,
    summarizeLink,
    summarizingId,
    total,
  } = useLinks();

  const [showAll, setShowAll] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('links');

  const displayedLinks = showAll ? links : links.slice(0, 5);
  const hasLinks = links.length > 0 || total > 0;

  const handleOpenArchive = () => {
    setShowArchive(true);
    fetchArchivedLinks();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
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
          <Link2 className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            Links
          </h3>
          {isCollapsed && links.length > 0 && (
            <span className="font-ui text-sm text-ink-muted">
              ({links.length})
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
          {hasLinks && (
            <button
              className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
              title="Refresh links"
              onClick={refreshLinks}
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
            {/* Error state */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-ui text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {isLoading && links.length === 0 ? (
              // Loading state
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
                <p className="font-ui text-sm text-ink-muted">
                  Loading your links...
                </p>
              </div>
            ) : links.length === 0 ? (
              // Empty state
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-purple-600" />
                </div>
                <p className="font-display text-lg text-ink">
                  No saved links yet
                </p>
                <p className="font-ui text-sm text-ink-muted mt-1 mb-4">
                  Share links from Safari using your API key
                </p>
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 className="w-4 h-4" />
                  Set up shortcuts
                </button>
              </div>
            ) : (
              <>
                {/* Links list */}
                <div className="space-y-1">
                  <AnimatePresence>
                    {displayedLinks.map((link, index) => (
                      <LinkItem
                        key={link.id}
                        link={link}
                        index={index}
                        onSummarize={() => summarizeLink(link.id)}
                        onArchive={() => archiveLink(link.id)}
                        onDelete={() => deleteLink(link.id)}
                        isSummarizing={summarizingId === link.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Show more / less */}
                {links.length > 5 && (
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
                        Show all {links.length} links <ChevronDown className="w-4 h-4" />
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
            links={archivedLinks}
            isLoading={isLoadingArchived}
            onRestore={restoreLink}
            onDelete={deleteLink}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
