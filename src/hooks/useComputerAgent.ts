import { useState, useCallback, useEffect } from 'react';
import { computerUseAgent } from '../services/computerUseAgent';
import type {
  AgentSession,
  AgentPlan,
  ScreenshotAnalysis,
  AuditLogEntry,
} from '../services/computerUseAgent';
import { useDashboardStore } from '../store';

interface UseComputerAgentReturn {
  // State
  isConfigured: boolean;
  isEnabled: boolean;
  isSessionActive: boolean;
  currentSession: AgentSession | null;
  currentPlan: AgentPlan | null;
  isCapturing: boolean;
  isPlanning: boolean;
  isExecuting: boolean;
  error: string | null;

  // Session management
  startSession: () => void;
  endSession: () => void;

  // Screenshot
  captureAndAnalyze: () => Promise<ScreenshotAnalysis | null>;

  // Planning
  createPlan: (goal: string, withScreenshot?: boolean) => Promise<AgentPlan | null>;
  cancelPlan: (planId: string) => void;

  // Action execution
  confirmAction: (planId: string, actionId: string) => void;
  cancelAction: (planId: string, actionId: string) => void;
  executeAction: (planId: string, actionId: string) => Promise<boolean>;
  executePlan: (planId: string) => Promise<{ completed: number; failed: number }>;

  // Audit
  getAuditLog: () => AuditLogEntry[];
  exportAuditLog: () => void;
  getAllSessions: () => AgentSession[];

  // Utils
  clearError: () => void;
}

export function useComputerAgent(): UseComputerAgentReturn {
  const { settings } = useDashboardStore();

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<AgentSession | null>(null);
  const [currentPlan, setCurrentPlan] = useState<AgentPlan | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = computerUseAgent.isConfigured();
  const isEnabled = settings.computerAccessEnabled;

  // Sync session state
  useEffect(() => {
    const session = computerUseAgent.getCurrentSession();
    if (session) {
      setIsSessionActive(session.isActive);
      setCurrentSession(session);
    }
  }, []);

  // Start a new agent session
  const startSession = useCallback(() => {
    if (!isEnabled) {
      setError('Computer access is not enabled in settings');
      return;
    }

    try {
      const session = computerUseAgent.startSession();
      setCurrentSession(session);
      setIsSessionActive(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, [isEnabled]);

  // End the current session
  const endSession = useCallback(() => {
    computerUseAgent.endSession();
    setIsSessionActive(false);
    setCurrentSession(null);
    setCurrentPlan(null);
  }, []);

  // Capture screenshot and analyze
  const captureAndAnalyze = useCallback(async (): Promise<ScreenshotAnalysis | null> => {
    if (!isSessionActive) {
      setError('No active session');
      return null;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const screenshot = await computerUseAgent.captureScreenshot();
      if (!screenshot) {
        throw new Error('Failed to capture screenshot');
      }

      const analysis = await computerUseAgent.analyzeScreenshot(screenshot);
      return analysis;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screenshot capture failed');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isSessionActive]);

  // Create an action plan
  const createPlan = useCallback(
    async (goal: string, withScreenshot = false): Promise<AgentPlan | null> => {
      if (!isSessionActive) {
        setError('No active session');
        return null;
      }

      setIsPlanning(true);
      setError(null);

      try {
        let screenshot: string | undefined;

        if (withScreenshot) {
          screenshot = (await computerUseAgent.captureScreenshot()) || undefined;
        }

        const plan = await computerUseAgent.createPlan(goal, screenshot);
        setCurrentPlan(plan);

        // Refresh session
        setCurrentSession(computerUseAgent.getCurrentSession());

        return plan;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create plan');
        return null;
      } finally {
        setIsPlanning(false);
      }
    },
    [isSessionActive]
  );

  // Cancel a plan
  const cancelPlan = useCallback((planId: string) => {
    computerUseAgent.cancelPlan(planId);
    if (currentPlan?.id === planId) {
      setCurrentPlan(null);
    }
    setCurrentSession(computerUseAgent.getCurrentSession());
  }, [currentPlan]);

  // Confirm an action
  const confirmAction = useCallback((planId: string, actionId: string) => {
    computerUseAgent.confirmAction(planId, actionId);
    setCurrentSession(computerUseAgent.getCurrentSession());

    // Update current plan if it matches
    const session = computerUseAgent.getCurrentSession();
    const plan = session?.plans.find((p) => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
    }
  }, []);

  // Cancel an action
  const cancelAction = useCallback((planId: string, actionId: string) => {
    computerUseAgent.cancelAction(planId, actionId);
    setCurrentSession(computerUseAgent.getCurrentSession());

    const session = computerUseAgent.getCurrentSession();
    const plan = session?.plans.find((p) => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
    }
  }, []);

  // Execute a single action
  const executeAction = useCallback(
    async (planId: string, actionId: string): Promise<boolean> => {
      setIsExecuting(true);
      setError(null);

      try {
        const result = await computerUseAgent.executeAction(planId, actionId);

        if (!result.success) {
          setError(result.error || 'Action failed');
        }

        setCurrentSession(computerUseAgent.getCurrentSession());

        const session = computerUseAgent.getCurrentSession();
        const plan = session?.plans.find((p) => p.id === planId);
        if (plan) {
          setCurrentPlan(plan);
        }

        return result.success;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Execution failed');
        return false;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  // Execute all confirmed actions in a plan
  const executePlan = useCallback(
    async (planId: string): Promise<{ completed: number; failed: number }> => {
      setIsExecuting(true);
      setError(null);

      try {
        const result = await computerUseAgent.executePlan(planId);

        if (result.failed > 0) {
          setError(`${result.failed} action(s) failed`);
        }

        setCurrentSession(computerUseAgent.getCurrentSession());

        const session = computerUseAgent.getCurrentSession();
        const plan = session?.plans.find((p) => p.id === planId);
        if (plan) {
          setCurrentPlan(plan);
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Execution failed');
        return { completed: 0, failed: 1 };
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  // Get audit log
  const getAuditLog = useCallback((): AuditLogEntry[] => {
    return computerUseAgent.exportAuditLog();
  }, []);

  // Export audit log as JSON file
  const exportAuditLog = useCallback(() => {
    const log = computerUseAgent.exportAuditLog();
    const blob = new Blob([JSON.stringify(log, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Get all sessions
  const getAllSessions = useCallback((): AgentSession[] => {
    return computerUseAgent.getAllSessions();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConfigured,
    isEnabled,
    isSessionActive,
    currentSession,
    currentPlan,
    isCapturing,
    isPlanning,
    isExecuting,
    error,
    startSession,
    endSession,
    captureAndAnalyze,
    createPlan,
    cancelPlan,
    confirmAction,
    cancelAction,
    executeAction,
    executePlan,
    getAuditLog,
    exportAuditLog,
    getAllSessions,
    clearError,
  };
}
