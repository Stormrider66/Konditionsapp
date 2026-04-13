/**
 * Agent Alert Adapter for Slack
 *
 * Provides ready-made alert functions for each operator agent.
 * Called from the agent runner after a successful agent run that
 * has actionable findings.
 *
 * Usage (from agent-runner.ts):
 *   await postAgentResultToSlack(result)
 */

import { isSlackConfigured, postAgentAlert, postApprovalRequest } from './client'
import { logger } from '@/lib/logger'
import type { OperatorAgentRunResult } from '@/lib/operator-agents/types'

/**
 * Post an agent's result to Slack if there's something worth reporting.
 * Called after every agent run. Filters out "nothing to report" runs.
 *
 * All posts are wrapped in try/catch — Slack failures should NEVER
 * affect the agent's actual work.
 */
export async function postAgentResultToSlack(
  result: OperatorAgentRunResult
): Promise<void> {
  if (!isSlackConfigured()) return

  try {
    await postAgentResultToSlackInner(result)
  } catch (error) {
    // Slack failures are non-critical — log and move on
    logger.warn('[slack-alerts] Failed to post agent result to Slack', {
      agentType: result.agentType,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function postAgentResultToSlackInner(
  result: OperatorAgentRunResult
): Promise<void> {

  // Skip posting for clean runs with nothing interesting
  if (result.status === 'COMPLETED' && result.escalations === 0 && result.actionsTaken === 0) {
    // Nothing interesting happened — don't spam the channel
    return
  }

  if (result.status === 'FAILED') {
    // Post failures so the founder knows an agent is broken
    await postAgentAlert({
      agentName: formatAgentName(result.agentType),
      emoji: getAgentEmoji(result.agentType),
      severity: 'warning',
      title: `Agent failed`,
      body: `\`\`\`${result.errorMessage || result.summary}\`\`\``,
    })
    return
  }

  // Agent-specific formatting for actionable results
  switch (result.agentType) {
    case 'SUPPORT':
      if (result.itemsProcessed > 0) {
        await postAgentAlert({
          agentName: 'Support Agent',
          emoji: ':lifebuoy:',
          severity: result.escalations > 0 ? 'critical' : 'info',
          title: `Processed ${result.itemsProcessed} tickets`,
          body: result.summary,
        })
      }
      break

    case 'PLATFORM_HEALTH':
      if (result.escalations > 0) {
        await postAgentAlert({
          agentName: 'Platform Health',
          emoji: ':shield:',
          severity: 'critical',
          title: 'Platform issue detected',
          body: result.summary,
        })
      }
      break

    case 'COST_GUARDIAN':
      if (result.escalations > 0) {
        await postAgentAlert({
          agentName: 'Cost Guardian',
          emoji: ':moneybag:',
          severity: 'warning',
          title: 'Cost alert',
          body: result.summary,
        })
      }
      break

    case 'CHURN_PREDICTOR':
      if (result.actionsTaken > 0 || result.escalations > 0) {
        await postAgentAlert({
          agentName: 'Churn Predictor',
          emoji: ':heart:',
          severity: result.escalations > 0 ? 'critical' : 'info',
          title: `${result.itemsProcessed} subscribers analyzed`,
          body: result.summary,
          ...(result.escalations > 0 ? {
            actions: {
              callbackId: 'churn_review',
              context: { action: 'review' },
              approveLabel: 'Review in admin',
            },
          } : {}),
        })
      }
      break

    case 'FOUNDERS_BRIEF':
      // Always post the daily brief
      await postAgentAlert({
        agentName: "Founder's Brief",
        emoji: ':sunrise:',
        severity: 'info',
        title: 'Daily brief ready',
        body: result.summary.slice(0, 2000),
      })
      break

    case 'BUSINESS_INTELLIGENCE':
      // Always post the weekly BI report
      await postAgentAlert({
        agentName: 'Business Intelligence',
        emoji: ':bar_chart:',
        severity: 'info',
        title: 'Weekly report ready',
        body: result.summary.slice(0, 2000),
      })
      break

    case 'COMPETITOR_INTEL':
      await postAgentAlert({
        agentName: 'Competitor Intel',
        emoji: ':eyes:',
        severity: result.escalations > 0 ? 'warning' : 'info',
        title: 'Weekly digest ready',
        body: result.summary.slice(0, 2000),
      })
      break

    case 'DATA_QUALITY':
      if (result.escalations > 0) {
        await postAgentAlert({
          agentName: 'Data Quality',
          emoji: ':database:',
          severity: 'warning',
          title: 'Data integrity issue',
          body: result.summary,
        })
      }
      break

    case 'COMPLIANCE_SECURITY':
      if (result.escalations > 0) {
        await postAgentAlert({
          agentName: 'Compliance & Security',
          emoji: ':lock:',
          severity: 'critical',
          title: 'Security alert',
          body: result.summary,
        })
      }
      break

    case 'MARKETING_CONTENT':
      if (result.actionsTaken > 0) {
        await postAgentAlert({
          agentName: 'Marketing Content',
          emoji: ':mega:',
          severity: 'info',
          title: `${result.actionsTaken} content pieces drafted`,
          body: result.summary,
        })
      }
      break

    case 'ONBOARDING_ACTIVATION':
      if (result.actionsTaken > 0) {
        await postAgentAlert({
          agentName: 'Onboarding',
          emoji: ':wave:',
          severity: 'info',
          title: `${result.actionsTaken} nudges drafted`,
          body: result.summary,
        })
      }
      break

    default:
      // Generic posting for any new agent types
      if (result.escalations > 0 || result.actionsTaken > 0) {
        await postAgentAlert({
          agentName: formatAgentName(result.agentType),
          emoji: ':robot_face:',
          severity: result.escalations > 0 ? 'warning' : 'info',
          title: result.summary.slice(0, 100),
          body: result.summary,
        })
      }
  }
}

function formatAgentName(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function getAgentEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    SUPPORT: ':lifebuoy:',
    CHURN_PREDICTOR: ':heart:',
    FEATURE_CURATOR: ':sparkles:',
    PLATFORM_HEALTH: ':shield:',
    COST_GUARDIAN: ':moneybag:',
    FOUNDERS_BRIEF: ':sunrise:',
    ONBOARDING_ACTIVATION: ':wave:',
    BUSINESS_INTELLIGENCE: ':bar_chart:',
    MARKETING_CONTENT: ':mega:',
    DATA_QUALITY: ':database:',
    COMPLIANCE_SECURITY: ':lock:',
    COMPETITOR_INTEL: ':eyes:',
  }
  return emojiMap[type] || ':robot_face:'
}
