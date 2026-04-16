/**
 * Slack Integration
 *
 * Full-featured Slack bot for the Elite Training Platform:
 * - Proactive agent alerts (agent runs → Slack channel)
 * - Interactive conversation with Claude (Slack → Claude + tools → Slack)
 * - GitHub code tools (read, search, branch, push, PR, merge)
 * - Approval flows (buttons for merge, email, issue creation)
 *
 * @module lib/slack
 */

export {
  isSlackConfigured,
  postMessage,
  replyInThread,
  postApprovalRequest,
  addReaction,
  removeReaction,
  updateMessage,
  postAgentAlert,
  verifySlackRequest,
} from './client'

export { handleSlackMessage } from './conversation-handler'

export { executeGitHubTool } from './github-code-tools'

export { postAgentResultToSlack } from './agent-alerts'
