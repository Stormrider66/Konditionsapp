/**
 * Compliance & Security Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { COMPLIANCE_SECURITY_SYSTEM_PROMPT } from '../prompts/compliance-security'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getConsentWithdrawals',
    description: 'Get count of users who withdrew consent in the last N days.',
    input_schema: {
      type: 'object' as const,
      properties: { days: { type: 'number' } },
    },
  },
  {
    name: 'getPendingGDPRRequests',
    description: 'Get outstanding GDPR data export or deletion requests.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getAuditLogAnomalies',
    description: 'Get audit log entries from the last N hours with anomaly flags.',
    input_schema: {
      type: 'object' as const,
      properties: { hours: { type: 'number' } },
    },
  },
  {
    name: 'getFailedLogins',
    description: 'Get failed login attempts from the last N hours (brute force detection).',
    input_schema: {
      type: 'object' as const,
      properties: { hours: { type: 'number' } },
    },
  },
  {
    name: 'getSuspiciousPatterns',
    description: 'Get device/IP anomalies and suspicious account access patterns.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getAgentActionAnomalies',
    description: 'Get anomalies in agent action patterns (burst writes, consent violations).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'alertFounder',
    description: 'Send security alert email. Use immediately for CRITICAL issues (GDPR deadlines, brute force, mass deletions).',
    input_schema: {
      type: 'object' as const,
      properties: {
        severity: { type: 'string', enum: ['CRITICAL', 'HIGH'] },
        title: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['severity', 'title', 'message'],
    },
  },
]

registerOperatorAgent({
  agentType: 'COMPLIANCE_SECURITY',
  systemPrompt: COMPLIANCE_SECURITY_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Run the daily compliance and security check. Check consent withdrawals, GDPR requests, audit log anomalies, failed logins, and agent action patterns. Alert the founder immediately on any CRITICAL issues.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 10)

    const alerts = result.toolsUsed.filter(t => t === 'alertFounder').length

    return {
      agentType: 'COMPLIANCE_SECURITY',
      status: 'COMPLETED',
      itemsProcessed: 1,
      actionsTaken: alerts,
      escalations: alerts,
      summary: result.finalResponse.slice(0, 500),
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
