/**
 * Computer Use Agent Service
 *
 * Implements Claude's computer use tool pattern for:
 * - Screenshot capture and analysis
 * - Action planning with step-by-step confirmation
 * - Mouse/keyboard action simulation (placeholder)
 * - Audit trail logging
 *
 * Security Model:
 * - Session-based permissions (explicit enable)
 * - Confirmation required for all irreversible actions
 * - Full audit trail stored locally
 * - Restricted to dashboard context by default
 */

// Types
export interface AgentAction {
  id: string;
  type: 'screenshot' | 'click' | 'type' | 'scroll' | 'key' | 'wait';
  description: string;
  parameters?: Record<string, unknown>;
  requiresConfirmation: boolean;
  isIrreversible: boolean;
  status: 'pending' | 'confirmed' | 'executed' | 'cancelled' | 'failed';
  timestamp: string;
  result?: string;
  error?: string;
}

export interface AgentPlan {
  id: string;
  goal: string;
  reasoning: string;
  steps: AgentAction[];
  status: 'planning' | 'awaiting_confirmation' | 'executing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export interface AgentSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  plans: AgentPlan[];
  auditLog: AuditLogEntry[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 'session_start' | 'session_end' | 'plan_created' | 'action_confirmed' | 'action_executed' | 'action_cancelled' | 'error';
  description: string;
  details?: Record<string, unknown>;
  screenshotData?: string; // Base64 screenshot at time of action
}

export interface ScreenshotAnalysis {
  description: string;
  elements: UIElement[];
  suggestedActions: string[];
}

export interface UIElement {
  type: 'button' | 'input' | 'link' | 'text' | 'image' | 'unknown';
  description: string;
  bounds?: { x: number; y: number; width: number; height: number };
  interactable: boolean;
}

// Claude API configuration for computer use
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// Irreversible action keywords
const IRREVERSIBLE_KEYWORDS = [
  'delete', 'remove', 'send', 'post', 'publish', 'submit',
  'purchase', 'buy', 'pay', 'transfer', 'confirm', 'execute',
];

class ComputerUseAgentService {
  private apiKey: string;
  private currentSession: AgentSession | null = null;
  private sessionStorageKey = 'agent_sessions';

  constructor() {
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Check if a session is currently active
   */
  isSessionActive(): boolean {
    return this.currentSession?.isActive ?? false;
  }

  /**
   * Get current session
   */
  getCurrentSession(): AgentSession | null {
    return this.currentSession;
  }

  /**
   * Start a new agent session
   */
  startSession(): AgentSession {
    if (this.currentSession?.isActive) {
      this.endSession();
    }

    const session: AgentSession = {
      id: `session-${Date.now()}`,
      startedAt: new Date().toISOString(),
      isActive: true,
      plans: [],
      auditLog: [],
    };

    this.currentSession = session;
    this.addAuditLog('session_start', 'Agent session started');
    this.saveSessionToStorage();

    return session;
  }

  /**
   * End the current session
   */
  endSession(): void {
    if (!this.currentSession) return;

    this.currentSession.isActive = false;
    this.currentSession.endedAt = new Date().toISOString();
    this.addAuditLog('session_end', 'Agent session ended');
    this.saveSessionToStorage();
    this.currentSession = null;
  }

  /**
   * Add entry to audit log
   */
  private addAuditLog(
    type: AuditLogEntry['type'],
    description: string,
    details?: Record<string, unknown>,
    screenshotData?: string
  ): void {
    if (!this.currentSession) return;

    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      description,
      details,
      screenshotData,
    };

    this.currentSession.auditLog.push(entry);
  }

  /**
   * Save session to localStorage
   */
  private saveSessionToStorage(): void {
    try {
      const sessions = this.getAllSessions();
      const index = sessions.findIndex((s) => s.id === this.currentSession?.id);

      if (index >= 0) {
        sessions[index] = this.currentSession!;
      } else if (this.currentSession) {
        sessions.push(this.currentSession);
      }

      // Keep only last 10 sessions
      const recentSessions = sessions.slice(-10);
      localStorage.setItem(this.sessionStorageKey, JSON.stringify(recentSessions));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Get all stored sessions
   */
  getAllSessions(): AgentSession[] {
    try {
      const data = localStorage.getItem(this.sessionStorageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Capture a screenshot (uses browser's Screen Capture API)
   */
  async captureScreenshot(): Promise<string | null> {
    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
      });

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait for video to load
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Stop all tracks
      stream.getTracks().forEach((track) => track.stop());

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];

      return base64;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  }

  /**
   * Analyze a screenshot using Claude's vision capabilities
   */
  async analyzeScreenshot(screenshotBase64: string): Promise<ScreenshotAnalysis> {
    if (!this.isConfigured()) {
      throw new Error('API key not configured');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: screenshotBase64,
                },
              },
              {
                type: 'text',
                text: `Analyze this screenshot and identify:
1. What application/website is shown
2. Key UI elements that can be interacted with
3. The current state/context

Return JSON:
{
  "description": "Brief description of what's on screen",
  "elements": [
    {
      "type": "button|input|link|text|image|unknown",
      "description": "what this element is/does",
      "interactable": true/false
    }
  ],
  "suggestedActions": ["possible action 1", "possible action 2"]
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Screenshot analysis failed');
    }

    const data = await response.json();
    const textContent = data.content?.find((c: { type: string }) => c.type === 'text');

    try {
      const jsonMatch = textContent?.text?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        description: 'Unable to analyze screenshot',
        elements: [],
        suggestedActions: [],
      };
    }
  }

  /**
   * Create an action plan for a given goal
   */
  async createPlan(goal: string, screenshotBase64?: string): Promise<AgentPlan> {
    if (!this.currentSession?.isActive) {
      throw new Error('No active session');
    }

    const messages: Array<{
      role: 'user';
      content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
    }> = [
      {
        role: 'user',
        content: [
          ...(screenshotBase64
            ? [
                {
                  type: 'image' as const,
                  source: {
                    type: 'base64' as const,
                    media_type: 'image/png',
                    data: screenshotBase64,
                  },
                },
              ]
            : []),
          {
            type: 'text' as const,
            text: `Create a step-by-step plan to accomplish this goal: "${goal}"

${screenshotBase64 ? 'Use the screenshot to understand the current state.' : ''}

Return JSON:
{
  "reasoning": "Brief explanation of the approach",
  "steps": [
    {
      "type": "screenshot|click|type|scroll|key|wait",
      "description": "Human-readable description of this step",
      "parameters": { ... },
      "requiresConfirmation": true/false,
      "isIrreversible": true/false
    }
  ]
}

Rules:
- Break down into small, atomic steps
- Mark actions that delete, send, or make permanent changes as isIrreversible: true
- Mark all irreversible actions as requiresConfirmation: true
- Include "screenshot" steps between major actions to verify state
- Be specific about what to click/type`,
          },
        ],
      },
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: `You are a computer use assistant. Create careful, step-by-step plans.
Always err on the side of caution - mark any potentially destructive action as requiring confirmation.
Never assume - include verification steps.`,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error('Plan creation failed');
    }

    const data = await response.json();
    const textContent = data.content?.find((c: { type: string }) => c.type === 'text');

    try {
      const jsonMatch = textContent?.text?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const planData = JSON.parse(jsonMatch[0]);

      const plan: AgentPlan = {
        id: `plan-${Date.now()}`,
        goal,
        reasoning: planData.reasoning || '',
        steps: (planData.steps || []).map(
          (step: Partial<AgentAction>, index: number) => {
            // Check if action contains irreversible keywords
            const descLower = (step.description || '').toLowerCase();
            const hasIrreversibleKeyword = IRREVERSIBLE_KEYWORDS.some((kw) =>
              descLower.includes(kw)
            );

            return {
              id: `action-${Date.now()}-${index}`,
              type: step.type || 'screenshot',
              description: step.description || '',
              parameters: step.parameters,
              requiresConfirmation:
                step.requiresConfirmation || hasIrreversibleKeyword,
              isIrreversible: step.isIrreversible || hasIrreversibleKeyword,
              status: 'pending',
              timestamp: new Date().toISOString(),
            };
          }
        ),
        status: 'awaiting_confirmation',
        createdAt: new Date().toISOString(),
      };

      this.currentSession.plans.push(plan);
      this.addAuditLog('plan_created', `Plan created: ${goal}`, { planId: plan.id });
      this.saveSessionToStorage();

      return plan;
    } catch (error) {
      console.error('Failed to parse plan:', error);
      throw new Error('Failed to create plan');
    }
  }

  /**
   * Confirm an action for execution
   */
  confirmAction(planId: string, actionId: string): boolean {
    if (!this.currentSession) return false;

    const plan = this.currentSession.plans.find((p) => p.id === planId);
    if (!plan) return false;

    const action = plan.steps.find((s) => s.id === actionId);
    if (!action) return false;

    action.status = 'confirmed';
    this.addAuditLog('action_confirmed', action.description, {
      planId,
      actionId,
    });
    this.saveSessionToStorage();

    return true;
  }

  /**
   * Cancel an action
   */
  cancelAction(planId: string, actionId: string): boolean {
    if (!this.currentSession) return false;

    const plan = this.currentSession.plans.find((p) => p.id === planId);
    if (!plan) return false;

    const action = plan.steps.find((s) => s.id === actionId);
    if (!action) return false;

    action.status = 'cancelled';
    this.addAuditLog('action_cancelled', action.description, {
      planId,
      actionId,
    });
    this.saveSessionToStorage();

    return true;
  }

  /**
   * Cancel an entire plan
   */
  cancelPlan(planId: string): boolean {
    if (!this.currentSession) return false;

    const plan = this.currentSession.plans.find((p) => p.id === planId);
    if (!plan) return false;

    plan.status = 'cancelled';
    plan.steps.forEach((step) => {
      if (step.status === 'pending' || step.status === 'confirmed') {
        step.status = 'cancelled';
      }
    });

    this.addAuditLog('action_cancelled', `Plan cancelled: ${plan.goal}`, {
      planId,
    });
    this.saveSessionToStorage();

    return true;
  }

  /**
   * Execute an action (simulated for now)
   * In a real implementation, this would use browser automation
   */
  async executeAction(
    planId: string,
    actionId: string
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'No active session' };
    }

    const plan = this.currentSession.plans.find((p) => p.id === planId);
    if (!plan) return { success: false, error: 'Plan not found' };

    const action = plan.steps.find((s) => s.id === actionId);
    if (!action) return { success: false, error: 'Action not found' };

    if (action.status !== 'confirmed' && action.requiresConfirmation) {
      return { success: false, error: 'Action requires confirmation first' };
    }

    try {
      // Execute based on action type
      let result = '';

      switch (action.type) {
        case 'screenshot':
          const screenshot = await this.captureScreenshot();
          if (screenshot) {
            result = 'Screenshot captured successfully';
            this.addAuditLog(
              'action_executed',
              action.description,
              { planId, actionId },
              screenshot
            );
          } else {
            throw new Error('Screenshot capture failed');
          }
          break;

        case 'click':
        case 'type':
        case 'scroll':
        case 'key':
          // These would require actual browser automation
          // For now, simulate with a delay
          await new Promise((resolve) => setTimeout(resolve, 500));
          result = `Simulated: ${action.description}`;
          this.addAuditLog('action_executed', action.description, {
            planId,
            actionId,
            simulated: true,
          });
          break;

        case 'wait':
          const waitTime = (action.parameters?.duration as number) || 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          result = `Waited ${waitTime}ms`;
          break;

        default:
          result = 'Unknown action type';
      }

      action.status = 'executed';
      action.result = result;
      this.saveSessionToStorage();

      return { success: true, result };
    } catch (error) {
      action.status = 'failed';
      action.error = error instanceof Error ? error.message : 'Unknown error';
      this.addAuditLog('error', `Action failed: ${action.description}`, {
        planId,
        actionId,
        error: action.error,
      });
      this.saveSessionToStorage();

      return { success: false, error: action.error };
    }
  }

  /**
   * Execute all confirmed actions in a plan sequentially
   */
  async executePlan(planId: string): Promise<{
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const plan = this.currentSession.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');

    plan.status = 'executing';
    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    for (const action of plan.steps) {
      if (action.status === 'cancelled') {
        cancelled++;
        continue;
      }

      if (action.status === 'pending' && !action.requiresConfirmation) {
        action.status = 'confirmed';
      }

      if (action.status === 'confirmed') {
        const result = await this.executeAction(planId, action.id);
        if (result.success) {
          completed++;
        } else {
          failed++;
          // Stop on first failure
          break;
        }
      }
    }

    plan.status = failed > 0 ? 'failed' : 'completed';
    plan.completedAt = new Date().toISOString();
    this.saveSessionToStorage();

    return { completed, failed, cancelled };
  }

  /**
   * Get audit log for export
   */
  exportAuditLog(sessionId?: string): AuditLogEntry[] {
    if (sessionId) {
      const session = this.getAllSessions().find((s) => s.id === sessionId);
      return session?.auditLog || [];
    }
    return this.currentSession?.auditLog || [];
  }

  /**
   * Clear all stored sessions
   */
  clearAllSessions(): void {
    localStorage.removeItem(this.sessionStorageKey);
    this.currentSession = null;
  }
}

// Export singleton
export const computerUseAgent = new ComputerUseAgentService();
