import { useState, useCallback } from 'react';
import { useDashboardStore } from '../store';
import { useSettings } from './useSettings';
import { useJournal } from './useJournal';
import { useHabits } from './useHabits';
import { useInterestAreas } from './useInterestAreas';
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
  generateFollowUpPrompt: (currentContent: string) => Promise<{ prompt: string; chosenStyle: string } | null>;
  generateEntryReflection: (entryId: string) => Promise<string | null>;
  clearError: () => void;
}

export function useClaudeAnalysis(): UseClaudeAnalysisReturn {
  // DB-first hooks for data
  const { settings } = useSettings();
  const { journalEntries } = useJournal();
  const { habitsWithStats } = useHabits();
  const { interestAreas } = useInterestAreas();

  // Store for actions
  const { setDailyBrief } = useDashboardStore();

  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All AI features now use Perplexity
  const isConfigured = !!settings.perplexityApiKey;

  const generateWeeklyInsights = useCallback(async (): Promise<WeeklyInsight | null> => {
    if (!isConfigured) {
      setError('Perplexity API key not configured');
      return null;
    }

    setIsGeneratingInsights(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateWeeklyInsights',
          apiKey: settings.perplexityApiKey,
          recentEntries: journalEntries.slice(0, 7).map(e => ({
            content: e.content,
            date: e.date,
            mood: e.mood,
            energy: e.energy,
            tags: e.tags
          })),
          habits: habitsWithStats.map(h => ({
            name: h.name,
            currentStreak: h.currentStreak,
            completionRate7Days: h.completionRate7Days,
            bestStreak: h.bestStreak
          })),
          interests: []
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to generate insights';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorMsg;
        } catch {
          // Use default message
        }
        throw new Error(errorMsg);
      }

      const insights = await response.json();

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
  }, [isConfigured, settings.perplexityApiKey, journalEntries, habitsWithStats]);

  const generateDailyBrief = useCallback(async (): Promise<DailyBrief | null> => {
    if (!isConfigured) {
      setError('Perplexity API key not configured');
      return null;
    }

    setIsGeneratingBrief(true);
    setError(null);

    try {
      // Helper to group items by topic
      const groupByTopic = (items: any[], topicList: string[]) => {
        const grouped: Record<string, any[]> = {};
        for (const topic of topicList) {
          grouped[topic] = items.filter((item: any) => item.topic === topic);
        }
        return grouped;
      };

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

      if (articles.length === 0) {
        throw new Error('No articles found. Please check your interests configuration or try again later.');
      }

      const items = articles.map((a: any, i: number) => ({
        id: `brief-${Date.now()}-${i}`,
        title: a.title,
        summary: a.summary,
        source: a.source,
        sourceUrl: a.sourceUrl,
        topic: a.topic,
        fetchedAt: new Date().toISOString()
      }));

      const brief: DailyBrief = {
        date: new Date().toISOString().split('T')[0],
        items,
        itemsByTopic: groupByTopic(items, topics),
        topics,
        followUpQuestions: [],
        generatedAt: new Date().toISOString()
      };

      setDailyBrief(brief);
      return brief;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate brief';
      setError(message);
      return null;
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [isConfigured, interestAreas, settings.dailyBriefLength, settings.perplexityApiKey, setDailyBrief]);

  const generateContextualPrompt = useCallback(async (): Promise<string | null> => {
    if (!isConfigured) {
      setError('Perplexity API key not configured');
      return null;
    }

    setIsGeneratingPrompt(true);
    setError(null);

    try {
      // Call Perplexity endpoint for journal prompts
      const response = await fetch('/.netlify/functions/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateJournalPrompt',
          apiKey: settings.perplexityApiKey,
          recentEntries: journalEntries.slice(0, 5).map(e => ({
            content: e.content,
            date: e.date
          })),
          habits: habitsWithStats.map(h => ({
            name: h.name,
            currentStreak: h.currentStreak,
            completionRate7Days: h.completionRate7Days
          })),
          promptStyle: settings.journalPromptStyle,
          styleInstructions: settings.journalPromptInstructions,
          interests: [] // Not needed for this action
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to generate prompt';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorMsg;
        } catch {
          // Use default message
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data.prompt || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate prompt';
      setError(message);
      return null;
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [isConfigured, journalEntries, habitsWithStats, settings.perplexityApiKey, settings.journalPromptStyle, settings.journalPromptInstructions]);

  const generateFollowUpPrompt = useCallback(async (
    currentContent: string
  ): Promise<{ prompt: string; chosenStyle: string } | null> => {
    if (!isConfigured) {
      setError('Perplexity API key not configured');
      return null;
    }

    if (!currentContent.trim()) {
      setError('No content to analyze');
      return null;
    }

    setIsGeneratingPrompt(true);
    setError(null);

    try {
      // Call Perplexity endpoint for follow-up prompts
      const response = await fetch('/.netlify/functions/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateFollowUpPrompt',
          apiKey: settings.perplexityApiKey,
          currentContent,
          customPrompts: settings.customJournalPrompts || [],
          styleInstructions: settings.journalPromptInstructions,
          interests: [] // Not needed for this action
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to generate follow-up prompt';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorMsg;
        } catch {
          // Use default message
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return {
        prompt: data.prompt || '',
        chosenStyle: data.chosenStyle || 'mixed'
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate follow-up prompt';
      setError(message);
      return null;
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [isConfigured, settings.perplexityApiKey, settings.customJournalPrompts, settings.journalPromptInstructions]);

  const generateEntryReflection = useCallback(
    async (entryId: string): Promise<string | null> => {
      if (!isConfigured) {
        setError('Perplexity API key not configured');
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
        const response = await fetch('/.netlify/functions/perplexity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generateEntryReflection',
            apiKey: settings.perplexityApiKey,
            entry: {
              content: entry.content,
              date: entry.date,
              mood: entry.mood,
              energy: entry.energy,
              tags: entry.tags
            },
            otherEntries: journalEntries
              .filter((e) => e.id !== entryId)
              .slice(0, 3)
              .map(e => ({
                content: e.content,
                date: e.date
              })),
            styleInstructions: settings.journalPromptInstructions,
            interests: []
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = 'Failed to generate reflection';
          try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.error || errorMsg;
          } catch {
            // Use default message
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const reflection = data.reflection || '';

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
    [isConfigured, settings.perplexityApiKey, journalEntries, settings.journalPromptInstructions]
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
    generateFollowUpPrompt,
    generateEntryReflection,
    clearError,
  };
}
