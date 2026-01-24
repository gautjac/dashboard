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
    if (!isConfigured) {
      setError('Anthropic API key not configured');
      return null;
    }

    setIsGeneratingBrief(true);
    setError(null);

    try {
      const brief = await anthropicService.generateDailyBrief(
        interestAreas,
        settings.dailyBriefLength
      );

      setDailyBrief(brief);
      return brief;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate brief';
      setError(message);
      return null;
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [isConfigured, interestAreas, settings.dailyBriefLength, setDailyBrief]);

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
