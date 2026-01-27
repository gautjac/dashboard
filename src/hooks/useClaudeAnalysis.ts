import { useState, useCallback } from 'react';
import { anthropicService } from '../services/anthropic';
import { useDashboardStore } from '../store';
import type { WeeklyInsight, DailyBrief } from '../types';

interface UseClaudeAnalysisReturn {
  // State
  isConfigured: boolean;
  isGeneratingInsights: boolean;
  isGeneratingBrief: boolean;
  isGeneratingPrompt: boolean;
  isGeneratingReflection: boolean;
  error: string | null;

  // Actions
  generateWeeklyInsights: () => Promise<WeeklyInsight | null>;
  generateDailyBrief: () => Promise<DailyBrief | null>;
  generateContextualPrompt: () => Promise<string | null>;
  generateEntryReflection: (entryId: string) => Promise<string | null>;
  clearError: () => void;
}

export function useClaudeAnalysis(): UseClaudeAnalysisReturn {
  const {
    journalEntries,
    getHabitsWithStats,
    interestAreas,
    settings,
    setDailyBrief,
  } = useDashboardStore();

  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = anthropicService.isConfigured();

  const generateWeeklyInsights = useCallback(async (): Promise<WeeklyInsight | null> => {
    if (!isConfigured) {
      setError('Anthropic API key not configured');
      return null;
    }

    setIsGeneratingInsights(true);
    setError(null);

    try {
      const habits = getHabitsWithStats();
      const insights = await anthropicService.generateWeeklyInsights(
        journalEntries,
        habits
      );

      // Store the insights
      useDashboardStore.setState((state) => ({
        weeklyInsights: [...state.weeklyInsights, insights],
      }));

      return insights;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate insights';
      setError(message);
      return null;
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [isConfigured, journalEntries, getHabitsWithStats]);

  const generateDailyBrief = useCallback(async (): Promise<DailyBrief | null> => {
    setIsGeneratingBrief(true);
    setError(null);

    try {
      let brief: DailyBrief;

      // Helper to group items by topic
      const groupByTopic = (items: any[], topicList: string[]) => {
        const grouped: Record<string, any[]> = {};
        for (const topic of topicList) {
          grouped[topic] = items.filter((item: any) => item.topic === topic);
        }
        return grouped;
      };

      // Check if Perplexity API key is configured for real news
      if (settings.perplexityApiKey) {
        console.log('Fetching from Perplexity...');
        const perplexityResponse = await fetch('/.netlify/functions/perplexity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interests: interestAreas.filter(i => i.enabled),
            briefLength: settings.dailyBriefLength,
            apiKey: settings.perplexityApiKey
          })
        });

        if (!perplexityResponse.ok) {
          const errorText = await perplexityResponse.text();
          console.error('Perplexity error:', perplexityResponse.status, errorText);
          let errorMsg = 'Failed to fetch news from Perplexity';
          try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.error || errorMsg;
          } catch {
            // Use default message
          }
          throw new Error(errorMsg);
        }

        const perplexityData = await perplexityResponse.json();
        const articles = perplexityData.articles || [];
        const topics = perplexityData.topics || [];

        console.log('Perplexity response:', { articleCount: articles.length, topics });

        if (articles.length > 0) {
          // Use Perplexity articles directly (no bulk Claude enhancement)
          // Users can enhance individual items on-demand
          const items = articles.map((a: any, i: number) => ({
            id: `brief-${Date.now()}-${i}`,
            title: a.title,
            summary: a.summary,
            source: a.source,
            sourceUrl: a.sourceUrl,
            topic: a.topic,
            fetchedAt: new Date().toISOString()
          }));
          brief = {
            date: new Date().toISOString().split('T')[0],
            items,
            itemsByTopic: groupByTopic(items, topics),
            topics,
            followUpQuestions: [],
            generatedAt: new Date().toISOString()
          };
        } else if (isConfigured) {
          // Perplexity returned no articles and Anthropic is configured, fall back to Claude-only
          brief = await anthropicService.generateDailyBrief(
            interestAreas,
            settings.dailyBriefLength
          );
        } else {
          // No articles from Perplexity and no Anthropic fallback
          throw new Error('Perplexity returned no articles. Please check your interests configuration or try again later.');
        }
      } else {
        // No Perplexity key, use Claude-only (simulated news)
        brief = await anthropicService.generateDailyBrief(
          interestAreas,
          settings.dailyBriefLength
        );
      }

      setDailyBrief(brief);
      return brief;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate brief';
      setError(message);
      return null;
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [interestAreas, settings.dailyBriefLength, settings.perplexityApiKey, setDailyBrief, isConfigured]);

  const generateContextualPrompt = useCallback(async (): Promise<string | null> => {
    if (!isConfigured) {
      setError('Anthropic API key not configured');
      return null;
    }

    setIsGeneratingPrompt(true);
    setError(null);

    try {
      const habits = getHabitsWithStats();
      const prompt = await anthropicService.generateContextualPrompt(
        journalEntries.slice(0, 5),
        habits,
        settings.journalPromptStyle,
        settings.journalPromptInstructions // Now passes the full style-specific instructions map
      );

      return prompt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate prompt';
      setError(message);
      return null;
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [isConfigured, journalEntries, getHabitsWithStats, settings.journalPromptStyle, settings.journalPromptInstructions]);

  const generateEntryReflection = useCallback(
    async (entryId: string): Promise<string | null> => {
      if (!isConfigured) {
        setError('Anthropic API key not configured');
        return null;
      }

      const entry = journalEntries.find((e) => e.id === entryId);
      if (!entry) {
        setError('Entry not found');
        return null;
      }

      setIsGeneratingReflection(true);
      setError(null);

      try {
        const reflection = await anthropicService.generateEntryReflection(
          entry,
          journalEntries.filter((e) => e.id !== entryId)
        );

        // Update the entry with the reflection
        useDashboardStore.setState((state) => ({
          journalEntries: state.journalEntries.map((e) =>
            e.id === entryId ? { ...e, aiReflection: reflection } : e
          ),
        }));

        return reflection;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate reflection';
        setError(message);
        return null;
      } finally {
        setIsGeneratingReflection(false);
      }
    },
    [isConfigured, journalEntries]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConfigured,
    isGeneratingInsights,
    isGeneratingBrief,
    isGeneratingPrompt,
    isGeneratingReflection,
    error,
    generateWeeklyInsights,
    generateDailyBrief,
    generateContextualPrompt,
    generateEntryReflection,
    clearError,
  };
}
