import { useState } from 'react';
import {
  Bot,
  Power,
  PowerOff,
  Camera,
  Play,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Loader2,
  Shield,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useComputerAgent } from '../hooks/useComputerAgent';
import type { AgentAction, AgentPlan } from '../services/computerUseAgent';

interface ActionItemProps {
  action: AgentAction;
  onConfirm: () => void;
  onCancel: () => void;
  onExecute: () => void;
  isExecuting: boolean;
}

function ActionItem({
  action,
  onConfirm,
  onCancel,
  onExecute,
  isExecuting,
}: ActionItemProps) {
  const statusColors = {
    pending: 'bg-warm-gray text-ink-muted',
    confirmed: 'bg-sage-light text-sage-dark',
    executed: 'bg-sage text-white',
    cancelled: 'bg-warm-gray-dark text-ink-muted line-through',
    failed: 'bg-red-100 text-red-700',
  };

  const statusIcons = {
    pending: <Clock className="w-3 h-3" />,
    confirmed: <Check className="w-3 h-3" />,
    executed: <Check className="w-3 h-3" />,
    cancelled: <X className="w-3 h-3" />,
    failed: <AlertTriangle className="w-3 h-3" />,
  };

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all
        ${action.isIrreversible ? 'border-yellow-300 bg-yellow-50' : 'border-warm-gray-dark bg-cream'}
        ${action.status === 'cancelled' ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div
          className={`
            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
            ${statusColors[action.status]}
          `}
        >
          {statusIcons[action.status]}
        </div>

        <div className="flex-1 min-w-0">
          {/* Action type badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-neutral text-[10px] uppercase">
              {action.type}
            </span>
            {action.isIrreversible && (
              <span className="badge text-[10px] bg-yellow-200 text-yellow-800">
                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                Irreversible
              </span>
            )}
          </div>

          {/* Description */}
          <p className="font-ui text-sm text-ink">{action.description}</p>

          {/* Result or error */}
          {action.result && (
            <p className="font-ui text-xs text-sage-dark mt-1">{action.result}</p>
          )}
          {action.error && (
            <p className="font-ui text-xs text-red-600 mt-1">{action.error}</p>
          )}
        </div>

        {/* Actions */}
        {action.status === 'pending' && action.requiresConfirmation && (
          <div className="flex items-center gap-1">
            <button
              onClick={onConfirm}
              className="p-1.5 rounded-lg bg-sage-light text-sage-dark hover:bg-sage hover:text-white transition-colors"
              title="Confirm"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {action.status === 'confirmed' && (
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="p-1.5 rounded-lg bg-terracotta text-white hover:bg-terracotta-dark disabled:opacity-50 transition-colors"
            title="Execute"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface PlanViewProps {
  plan: AgentPlan;
  onConfirmAction: (actionId: string) => void;
  onCancelAction: (actionId: string) => void;
  onExecuteAction: (actionId: string) => void;
  onCancelPlan: () => void;
  onExecutePlan: () => void;
  isExecuting: boolean;
}

function PlanView({
  plan,
  onConfirmAction,
  onCancelAction,
  onExecuteAction,
  onCancelPlan,
  onExecutePlan,
  isExecuting,
}: PlanViewProps) {
  const [expanded, setExpanded] = useState(true);

  const pendingConfirmations = plan.steps.filter(
    (s) => s.status === 'pending' && s.requiresConfirmation
  ).length;
  const confirmedCount = plan.steps.filter((s) => s.status === 'confirmed').length;
  const executedCount = plan.steps.filter((s) => s.status === 'executed').length;
  const totalSteps = plan.steps.length;

  const statusColors = {
    planning: 'text-yellow-600 bg-yellow-100',
    awaiting_confirmation: 'text-orange-600 bg-orange-100',
    executing: 'text-blue-600 bg-blue-100',
    completed: 'text-sage-dark bg-sage-light',
    failed: 'text-red-600 bg-red-100',
    cancelled: 'text-ink-muted bg-warm-gray',
  };

  return (
    <div className="rounded-xl border border-warm-gray-dark bg-parchment overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-warm-gray/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <Bot className="w-4 h-4 text-parchment" />
          </div>
          <div className="text-left">
            <h4 className="font-ui font-medium text-sm text-ink">{plan.goal}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[10px] font-ui px-1.5 py-0.5 rounded ${statusColors[plan.status]}`}
              >
                {plan.status.replace('_', ' ')}
              </span>
              <span className="font-ui text-xs text-ink-muted">
                {executedCount}/{totalSteps} steps
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-ink-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-muted" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-warm-gray/50">
              {/* Reasoning */}
              {plan.reasoning && (
                <p className="font-body text-sm text-ink-light mt-3 mb-4 p-3 rounded-lg bg-warm-gray/30">
                  {plan.reasoning}
                </p>
              )}

              {/* Steps */}
              <div className="space-y-2">
                {plan.steps.map((action) => (
                  <ActionItem
                    key={action.id}
                    action={action}
                    onConfirm={() => onConfirmAction(action.id)}
                    onCancel={() => onCancelAction(action.id)}
                    onExecute={() => onExecuteAction(action.id)}
                    isExecuting={isExecuting}
                  />
                ))}
              </div>

              {/* Actions */}
              {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-warm-gray/50">
                  <div className="font-ui text-xs text-ink-muted">
                    {pendingConfirmations > 0 && (
                      <span className="text-orange-600">
                        {pendingConfirmations} action(s) need confirmation
                      </span>
                    )}
                    {pendingConfirmations === 0 && confirmedCount > 0 && (
                      <span className="text-sage-dark">
                        {confirmedCount} action(s) ready to execute
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onCancelPlan}
                      className="btn btn-secondary text-sm py-1.5"
                    >
                      Cancel Plan
                    </button>
                    {confirmedCount > 0 && (
                      <button
                        onClick={onExecutePlan}
                        disabled={isExecuting}
                        className="btn btn-primary text-sm py-1.5 disabled:opacity-50"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Execute All
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AgentPanelProps {
  onClose: () => void;
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const {
    isConfigured,
    isEnabled,
    isSessionActive,
    currentSession,
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
    exportAuditLog,
    clearError,
  } = useComputerAgent();

  const [goalInput, setGoalInput] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);

  const handleCreatePlan = async () => {
    if (!goalInput.trim()) return;
    await createPlan(goalInput.trim(), true);
    setGoalInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-end"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '32rem',
          height: '100%',
          backgroundColor: '#FFFEF9',
          boxShadow: '0 4px 16px rgba(28, 25, 23, 0.08), 0 12px 32px rgba(28, 25, 23, 0.06)',
          overflowY: 'auto',
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center">
                <Bot className="w-5 h-5 text-parchment" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">
                  Agent Assistant
                </h2>
                {isSessionActive && (
                  <span className="flex items-center gap-1.5 font-ui text-xs text-sage-dark">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
                    Session active
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-gray transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isEnabled ? (
            // Not enabled state
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warm-gray flex items-center justify-center">
                <Shield className="w-8 h-8 text-ink-muted" />
              </div>
              <p className="font-display text-lg text-ink mb-2">
                Computer access is disabled
              </p>
              <p className="font-ui text-sm text-ink-muted">
                Enable it in Settings → AI & Analysis
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Session Control */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-parchment border border-warm-gray-dark">
                <div className="flex items-center gap-2">
                  {isSessionActive && (
                    <button
                      onClick={() => setShowAuditLog(!showAuditLog)}
                      className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
                      title="View audit log"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={isSessionActive ? endSession : startSession}
                  className={`
                    btn text-sm py-1.5
                    ${isSessionActive ? 'bg-red-500 text-white hover:bg-red-600' : 'btn-primary'}
                  `}
                >
                  {isSessionActive ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      End Session
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Start Session
                    </>
                  )}
                </button>
              </div>

              {/* Error display */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-start justify-between">
                    <p className="font-ui text-sm text-red-700">{error}</p>
                    <button
                      onClick={clearError}
                      className="p-1 rounded text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Not configured warning */}
              {!isConfigured && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="font-ui text-sm text-yellow-800">
                      Add VITE_ANTHROPIC_API_KEY to your .env file to enable the agent.
                    </p>
                  </div>
                </div>
              )}

              {!isSessionActive ? (
                // Session not started
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-ink/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-ink-muted" />
                  </div>
                  <p className="font-display text-lg text-ink">Ready to assist</p>
                  <p className="font-ui text-sm text-ink-muted mt-1 mb-4">
                    Start a session to enable computer control
                  </p>
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-left max-w-sm mx-auto">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="font-ui text-xs text-yellow-800">
                        The agent will request permission before taking any action.
                        All actions are logged locally.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Session active
                <div className="space-y-4">
                  {/* Goal input */}
                  <div>
                    <label className="font-ui text-xs text-ink-muted uppercase tracking-wider mb-2 block">
                      What would you like me to do?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()}
                        placeholder="e.g., Open the notes app and create a new note..."
                        className="input flex-1"
                        disabled={isPlanning}
                      />
                      <button
                        onClick={handleCreatePlan}
                        disabled={!goalInput.trim() || isPlanning}
                        className="btn btn-primary disabled:opacity-50"
                      >
                        {isPlanning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Plan'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={captureAndAnalyze}
                      disabled={isCapturing}
                      className="btn btn-secondary text-sm py-1.5 disabled:opacity-50"
                    >
                      {isCapturing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      Capture Screen
                    </button>
                    <button
                      onClick={() => createPlan('Analyze what is currently on screen', true)}
                      disabled={isPlanning}
                      className="btn btn-secondary text-sm py-1.5 disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                      Analyze Screen
                    </button>
                  </div>

                  {/* Current/recent plans */}
                  {currentSession?.plans && currentSession.plans.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                        Plans
                      </h4>
                      {currentSession.plans
                        .slice()
                        .reverse()
                        .slice(0, 3)
                        .map((plan) => (
                          <PlanView
                            key={plan.id}
                            plan={plan}
                            onConfirmAction={(actionId) => confirmAction(plan.id, actionId)}
                            onCancelAction={(actionId) => cancelAction(plan.id, actionId)}
                            onExecuteAction={(actionId) => executeAction(plan.id, actionId)}
                            onCancelPlan={() => cancelPlan(plan.id)}
                            onExecutePlan={() => executePlan(plan.id)}
                            isExecuting={isExecuting}
                          />
                        ))}
                    </div>
                  )}

                  {/* Audit log toggle */}
                  <AnimatePresence>
                    {showAuditLog && currentSession?.auditLog && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-warm-gray/50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                              Audit Log ({currentSession.auditLog.length} entries)
                            </h4>
                            <button
                              onClick={exportAuditLog}
                              className="font-ui text-xs text-terracotta hover:text-terracotta-dark"
                            >
                              Export JSON
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {currentSession.auditLog
                              .slice()
                              .reverse()
                              .map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex items-start gap-2 p-2 rounded bg-warm-gray/30 text-xs"
                                >
                                  <span className="font-ui text-ink-faint flex-shrink-0">
                                    {format(new Date(entry.timestamp), 'HH:mm:ss')}
                                  </span>
                                  <span
                                    className={`
                                      font-ui
                                      ${entry.type === 'error' ? 'text-red-600' : 'text-ink-light'}
                                    `}
                                  >
                                    {entry.description}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
