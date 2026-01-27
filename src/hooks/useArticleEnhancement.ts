import { useState, useCallback } from 'react';
import { useDashboardStore } from '../store';
import type { DailyBriefItem } from '../types';

interface UseArticleEnhancementReturn {
  enhanceArticle: (article: DailyBriefItem) => Promise<string | null>;
  isEnhancing: boolean;
  error: string | null;
}

export function useArticleEnhancement(): UseArticleEnhancementReturn {
  const { interestAreas, updateBriefItemInsight } = useDashboardStore();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhanceArticle = useCallback(async (article: DailyBriefItem): Promise<string | null> => {
    setIsEnhancing(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enhanceSingleItem',
          article: {
            title: article.title,
            summary: article.summary,
            source: article.source,
            topic: article.topic
          },
          interests: interestAreas.filter(i => i.enabled)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate insight');
      }

      const data = await response.json();
      const insight = data.text || null;

      if (insight) {
        // Update the brief item in the store
        updateBriefItemInsight(article.id, insight);
      }

      return insight;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate insight';
      setError(message);
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, [interestAreas, updateBriefItemInsight]);

  return {
    enhanceArticle,
    isEnhancing,
    error
  };
}
