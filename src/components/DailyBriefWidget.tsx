import { useState } from 'react';
import {
  Newspaper,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Settings2,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStore } from '../store';
import { useClaudeAnalysis } from '../hooks';
import type { DailyBriefItem } from '../types';

interface BriefItemProps {
  item: DailyBriefItem;
  index: number;
}

function BriefItem({ item, index }: BriefItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 rounded-lg hover:bg-warm-gray/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Number indicator */}
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-warm-gray flex items-center justify-center font-ui text-xs font-medium text-ink-muted">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="font-ui font-medium text-sm text-ink leading-snug pr-6">
              {item.title}
            </h4>

            {/* Source and topic */}
            <div className="flex items-center gap-2 mt-1">
              <span className="font-ui text-xs text-ink-muted">
                {item.source}
              </span>
              <span className="w-1 h-1 rounded-full bg-ink-faint" />
              <span className="badge badge-neutral text-[10px] py-0.5">
                {item.topic}
              </span>
            </div>
          </div>

          {/* Expand icon */}
          <div className="flex-shrink-0 text-ink-faint">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-11">
              {/* Summary */}
              <p className="font-body text-sm text-ink-light leading-relaxed">
                {item.summary}
              </p>

              {/* Why it matters */}
              {item.whyItMatters && (
                <div className="mt-3 p-2.5 rounded-lg bg-terracotta-light/20 border border-terracotta/10">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-terracotta flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-ui text-[10px] text-terracotta-dark uppercase tracking-wider">
                        Why it matters
                      </span>
                      <p className="font-body text-sm text-ink-light mt-0.5">
                        {item.whyItMatters}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Link */}
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 font-ui text-xs text-terracotta hover:text-terracotta-dark transition-colors"
                >
                  Read more
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DailyBriefWidget() {
  const { getTodayBrief, interestAreas } = useDashboardStore();
  const { isConfigured, isGeneratingBrief, error, generateDailyBrief, clearError } = useClaudeAnalysis();
  const brief = getTodayBrief();
  const hasInterests = interestAreas.some(i => i.enabled);
  const [showQuestions, setShowQuestions] = useState(false);

  const handleGenerateBrief = async () => {
    clearError();
    await generateDailyBrief();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            Daily Brief
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
            title={isConfigured ? "Refresh brief" : "Configure API key in settings"}
            onClick={handleGenerateBrief}
            disabled={!isConfigured || isGeneratingBrief || !hasInterests}
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingBrief ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="Configure interests"
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
              onClick={clearError}
              className="font-ui text-xs text-red-500 hover:text-red-700 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!hasInterests ? (
        // Empty state - Set up interests
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warm-gray flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-ink-muted" />
          </div>
          <p className="font-display text-lg text-ink">
            Stay informed on what matters
          </p>
          <p className="font-ui text-sm text-ink-muted mt-1 mb-4">
            Add topics you want to follow
          </p>
          <button className="btn btn-secondary text-sm">
            <Settings2 className="w-4 h-4" />
            Configure interests
          </button>
        </div>
      ) : isGeneratingBrief ? (
        // Generating state
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-terracotta-light/30 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-terracotta" />
          </div>
          <p className="font-ui text-sm text-ink-muted">
            Generating your daily brief...
          </p>
        </div>
      ) : !brief || brief.items.length === 0 ? (
        // Empty state - Generate brief
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-terracotta-light/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-terracotta" />
          </div>
          <p className="font-display text-lg text-ink">
            Your daily brief awaits
          </p>
          <p className="font-ui text-sm text-ink-muted mt-1 mb-4">
            {isConfigured
              ? "Generate a personalized brief based on your interests"
              : "Configure your Anthropic API key in settings to generate briefs"}
          </p>
          <button
            className="btn btn-primary text-sm"
            onClick={handleGenerateBrief}
            disabled={!isConfigured}
          >
            <Sparkles className="w-4 h-4" />
            Generate Brief
          </button>
        </div>
      ) : (
        <>
          {/* Brief items */}
          <div className="space-y-1">
            {brief.items.map((item, index) => (
              <BriefItem key={item.id} item={item} index={index} />
            ))}
          </div>

          {/* Follow-up questions */}
          {brief.followUpQuestions && brief.followUpQuestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-warm-gray/50">
              <button
                onClick={() => setShowQuestions(!showQuestions)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-terracotta" />
                  <span className="font-ui text-sm font-medium text-ink">
                    Questions to explore
                  </span>
                </div>
                {showQuestions ? (
                  <ChevronUp className="w-4 h-4 text-ink-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-ink-muted" />
                )}
              </button>

              <AnimatePresence>
                {showQuestions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ul className="mt-3 space-y-2">
                      {brief.followUpQuestions.map((question, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-lg bg-warm-gray/30"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-terracotta-light/50 flex items-center justify-center font-ui text-[10px] font-medium text-terracotta-dark">
                            ?
                          </span>
                          <p className="font-body text-sm text-ink-light">
                            {question}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* View more / Interests */}
      {brief && brief.items.length > 0 && (
        <button className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-ink-muted hover:text-ink font-ui text-sm transition-colors">
          View all stories
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
