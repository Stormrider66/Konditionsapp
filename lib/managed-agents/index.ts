/**
 * Managed Agents
 *
 * Event-driven agent system built on Claude Managed Agents.
 * Replaces the cron-based perceive/decide/execute loop with
 * real-time, multi-step autonomous agents.
 *
 * @module lib/managed-agents
 */

export * from './types'
export {
  getOrCreateSession,
  updateSessionUsage,
  expireInactiveSessions,
  markSessionError,
  routeEvent,
  dispatchEvent,
  getActiveSessions,
  getSessionStats,
} from './session-manager'
export {
  executeReadTool,
  executeCalculateTool,
  executeWriteTool,
} from './tool-executor'
