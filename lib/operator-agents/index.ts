/**
 * Operator Agents
 *
 * Semi-autonomous agents that help the founder run the platform.
 * Live in the /admin super admin page. Run on schedules (not event-driven).
 *
 * @module lib/operator-agents
 */

export * from './types'
export {
  registerOperatorAgent,
  getOperatorAgent,
  runOperatorAgent,
  runAgentLoop,
  estimateOperatorCost,
} from './agent-runner'
export type {
  OperatorAgentDefinition,
  OperatorAgentContext,
  RunOperatorAgentOptions,
} from './agent-runner'
export { executeOperatorTool } from './tool-executor'

// Register agents (side-effect imports)
import './agents/platform-health-agent'
import './agents/support-agent'
import './agents/cost-guardian-agent'
import './agents/feature-curator-agent'
import './agents/churn-predictor-agent'
import './agents/founders-brief-agent'
import './agents/onboarding-activation-agent'
import './agents/business-intelligence-agent'
import './agents/marketing-content-agent'
