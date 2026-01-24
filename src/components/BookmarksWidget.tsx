import { useState, useMemo } from 'react';
import {
  Bookmark as BookmarkIcon,
  ExternalLink,
  RefreshCw,
  Settings2,
  AlertCircle,
  Twitter,
  ChevronDown,
  ChevronUp,
  Puzzle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReadwiseBookmarks } from '../hooks/useReadwiseBookmarks';
import { useExtensionBookmarks } from '../hooks/useExtensionBookmarks';
import { useDashboardStore } from '../store';
import { formatDistanceToNow } from 'date-fns';
import type { Bookmark } from '../types';

interface BookmarkItemProps {
  bookmark: Bookmark;
  index: number;
}

function BookmarkItem({ bookmark, index }: BookmarkItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongText = bookmark.text.length > 180;
  const displayText = expanded || !isLongText
    ? bookmark.text
    : bookmark.text.slice(0, 180) + '...';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group p-3 rounded-lg hover:bg-warm-gray/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Twitter icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center">
          <Twitter className="w-4 h-4 text-[#1DA1F2]" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Author */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-ui text-sm font-medium text-ink">
              {bookmark.author}
            </span>
            <span className="font-ui text-xs text-ink-muted">
              {(() => {
                try {
                  const date = new Date(bookmark.savedAt);
                  if (isNaN(date.getTime())) return 'recently';
                  return formatDistanceToNow(date, { addSuffix: true });
                } catch {
                  return 'recently';
                }
              })()}
            </span>
            {bookmark.source === 'extension' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-terracotta/10 text-terracotta text-[10px] font-medium">
                <Puzzle className="w-2.5 h-2.5" />
                ext
              </span>
            )}
          </div>

          {/* Tweet text */}
          <p className="font-body text-sm text-ink-light leading-relaxed">
            {displayText}
          </p>

          {/* Expand button for long texts */}
          {isLongText && (
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

          {/* Link to original */}
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-ui text-xs text-[#1DA1F2] hover:text-[#1a8cd8] transition-colors"
          >
            View on X
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export function BookmarksWidget() {
  const { setSettingsOpen } = useDashboardStore();
  const {
    isConfigured: isReadwiseConfigured,
    isLoading: isReadwiseLoading,
    error: readwiseError,
    bookmarks: readwiseBookmarks,
    refreshBookmarks: refreshReadwiseBookmarks,
    clearError: clearReadwiseError,
  } = useReadwiseBookmarks();

  const {
    bookmarks: extensionBookmarks,
    isLoading: isExtensionLoading,
    error: extensionError,
    refreshBookmarks: refreshExtensionBookmarks,
  } = useExtensionBookmarks();

  const [showAll, setShowAll] = useState(false);

  // Merge and dedupe bookmarks from both sources
  const allBookmarks = useMemo(() => {
    const combined: Bookmark[] = [];
    const seenUrls = new Set<string>();

    // Add extension bookmarks first (they're more recent)
    for (const bookmark of extensionBookmarks) {
      const normalizedUrl = bookmark.url.replace(/^https?:\/\/(www\.)?(twitter|x)\.com/, '');
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        combined.push({ ...bookmark, source: 'extension' });
      }
    }

    // Add Readwise bookmarks, skipping duplicates
    for (const bookmark of readwiseBookmarks) {
      const normalizedUrl = bookmark.url.replace(/^https?:\/\/(www\.)?(twitter|x)\.com/, '');
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        combined.push({ ...bookmark, source: 'readwise' });
      }
    }

    // Sort by savedAt descending
    return combined.sort((a, b) => {
      const dateA = new Date(a.savedAt).getTime();
      const dateB = new Date(b.savedAt).getTime();
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateB - dateA;
    });
  }, [readwiseBookmarks, extensionBookmarks]);

  const isLoading = isReadwiseLoading || isExtensionLoading;
  const error = readwiseError || extensionError;
  const isConfigured = isReadwiseConfigured || extensionBookmarks.length > 0;

  const handleRefresh = () => {
    refreshReadwiseBookmarks();
    refreshExtensionBookmarks();
  };

  const displayedBookmarks = showAll ? allBookmarks : allBookmarks.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            X Bookmarks
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {isConfigured && (
            <button
              className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
              title="Refresh bookmarks"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="Configure Readwise"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-ui text-sm text-red-700">{error}</p>
            <button
              onClick={clearReadwiseError}
              className="font-ui text-xs text-red-500 hover:text-red-700 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!isConfigured ? (
        // Not configured state
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center">
            <Twitter className="w-6 h-6 text-[#1DA1F2]" />
          </div>
          <p className="font-display text-lg text-ink">
            See your X bookmarks
          </p>
          <p className="font-ui text-sm text-ink-muted mt-1 mb-4">
            Connect Readwise to sync your saved tweets
          </p>
          <button
            className="btn btn-secondary text-sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
            Configure Readwise
          </button>
        </div>
      ) : isLoading && allBookmarks.length === 0 ? (
        // Loading state
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-6 h-6 text-[#1DA1F2] animate-spin" />
          </div>
          <p className="font-ui text-sm text-ink-muted">
            Loading your bookmarks...
          </p>
        </div>
      ) : allBookmarks.length === 0 ? (
        // Empty state
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warm-gray flex items-center justify-center">
            <BookmarkIcon className="w-6 h-6 text-ink-muted" />
          </div>
          <p className="font-display text-lg text-ink">
            No bookmarks yet
          </p>
          <p className="font-ui text-sm text-ink-muted mt-1">
            Bookmark tweets on X to see them here
          </p>
        </div>
      ) : (
        <>
          {/* Bookmarks list */}
          <div className="space-y-1">
            <AnimatePresence>
              {displayedBookmarks.map((bookmark, index) => (
                <BookmarkItem key={bookmark.id} bookmark={bookmark} index={index} />
              ))}
            </AnimatePresence>
          </div>

          {/* Show more / less */}
          {allBookmarks.length > 5 && (
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
                  Show all {allBookmarks.length} bookmarks <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
