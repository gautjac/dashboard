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
import { useClaudeAnalysis, useArticleEnhancement } from '../hooks';
import { useCollapsedState } from '../hooks/useCollapsedState';
import type { DailyBriefItem } from '../types';
import { anthropicService } from '../services/anthropic';

interface BriefItemProps {
  item: DailyBriefItem;
  index: number;
}

function BriefItem({ item, index }: BriefItemProps) {
  const [expanded, setExpanded] = useState(false);
  const { enhanceArticle, isEnhancing } = useArticleEnhancement();
  const isConfigured = anthropicService.isConfigured();

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await enhanceArticle(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="group"
    >
      <div className="flex items-start p-2 rounded-lg hover:bg-warm-gray/30 transition-colors">
        {/* Number indicator */}
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-warm-gray/50 flex items-center justify-center font-ui text-[10px] font-medium text-ink-muted mt-0.5">
          {index + 1}
        </span>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left ml-2"
        >
          {/* Title */}
          <h4 className="font-ui font-medium text-sm text-ink leading-snug pr-2">
            {item.title}
          </h4>

          {/* Source */}
          <span className="font-ui text-xs text-ink-muted">
            {item.source}
          </span>
        </button>

        {/* Action icons */}
        <div className="flex-shrink-0 flex items-center gap-1 ml-2">
          {/* Search/external link */}
          <a
            href={item.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(item.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-ink-faint hover:text-terracotta transition-colors"
            title={item.sourceUrl ? "Open source" : "Search for this topic"}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {/* Expand icon */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-ink-faint hover:text-ink transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

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
            <div className="px-2 pb-2 pl-9">
              {/* Summary */}
              <p className="font-body text-sm text-ink-light leading-relaxed">
                {item.summary}
              </p>

              {/* Why it matters */}
              {item.whyItMatters ? (
                <div className="mt-2 p-2 rounded-lg bg-terracotta-light/20 border border-terracotta/10">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-terracotta flex-shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-ink-light">
                      {item.whyItMatters}
                    </p>
                  </div>
                </div>
              ) : isConfigured && (
                <button
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-terracotta-light/30 hover:bg-terracotta-light/50 text-terracotta font-ui text-xs transition-colors disabled:opacity-50"
                >
                  {isEnhancing ? (
                    <>
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Why it matters
                    </>
                  )}
                </button>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface TopicSectionProps {
  topic: string;
  items: DailyBriefItem[];
  defaultExpanded?: boolean;
}

function TopicSection({ topic, items, defaultExpanded = true }: TopicSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-warm-gray/30 last:border-b-0">
      {/* Topic header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 hover:bg-warm-gray/20 transition-colors rounded-lg px-2 -mx-2"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          </motion.div>
          <h4 className="font-display text-base font-semibold text-ink">
            {topic}
          </h4>
          <span className="font-ui text-xs text-ink-muted bg-warm-gray/50 px-1.5 py-0.5 rounded">
            {items.length}
          </span>
        </div>
      </button>

      {/* Topic articles */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3 space-y-0.5">
              {items.map((item, index) => (
                <BriefItem key={item.id} item={item} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DailyBriefWidget() {
  const { getTodayBrief, interestAreas } = useDashboardStore();
  const { isConfigured, isGeneratingBrief, error, generateDailyBrief, clearError } = useClaudeAnalysis();
  const brief = getTodayBrief();
  const hasInterests = interestAreas.some(i => i.enabled);
  const [showQuestions, setShowQuestions] = useState(false);
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('daily-brief');

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
          <Newspaper className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            Daily Brief
          </h3>
          {isCollapsed && brief && brief.items.length > 0 && (
            <span className="font-ui text-sm text-ink-muted">
              ({brief.items.length} item{brief.items.length !== 1 ? 's' : ''})
            </span>
          )}
        </button>
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
                {/* Brief items grouped by topic */}
                {brief.topics && brief.itemsByTopic ? (
                  // Grouped view with collapsible topic sections
                  <div className="space-y-1">
                    {brief.topics.map((topic) => (
                      <TopicSection
                        key={topic}
                        topic={topic}
                        items={brief.itemsByTopic?.[topic] || []}
                        defaultExpanded={false}
                      />
                    ))}
                  </div>
                ) : (
                  // Fallback: flat list (for old briefs without topic grouping)
                  <div className="space-y-1">
                    {brief.items.map((item, index) => (
                      <BriefItem key={item.id} item={item} index={index} />
                    ))}
                  </div>
                )}

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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
