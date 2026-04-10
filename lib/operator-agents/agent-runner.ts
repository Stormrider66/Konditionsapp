/**
 * Operator Agent Runner
 *
 * Executes operator agents with logging, cost tracking, and error handling.
 * Every run creates an OperatorAgentRun record for audit and monitoring.
 *
 * Usage (from a cron route):
 *   import { runOperatorAgent } from '@/lib/operator-agents'
 *   await runOperatorAgent('SUPPORT', { triggeredBy: 'cron' })
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { MODEL_TIERS, type ModelIntent } from '@/types/ai-models'
import type { OperatorAgentType, OperatorAgentRunResult } from './types'
import { OPERATOR_MODEL_INTENT } from './types'

// ============================================================================
// AGENT PROMPT & TOOL REGISTRY
// ============================================================================

/**
 * Each operator agent has a system prompt + handler.
 * The handler receives a ready-made Anthropic client and returns a result.
 */
export interface OperatorAgentDefinition {
  agentType: OperatorAgentType
  systemPrompt: string
  /** Tools this agent has access to (JSON schemas for the Anthropic API) */
  tools: Anthropic.Tool[]
  /** Handler that runs the agent loop and returns a result */
  run: (ctx: OperatorAgentContext) => Promise<OperatorAgentRunResult>
}

export interface OperatorAgentContext {
  agentType: OperatorAgentType
  runId: string
  triggeredBy: string
  client: Anthropic
  model: string
  modelIntent: ModelIntent
}

// Registry populated by individual agent modules
const AGENT_REGISTRY = new Map<OperatorAgentType, OperatorAgentDefinition>()

export function registerOperatorAgent(definition: OperatorAgentDefinition): void {
  AGENT_REGISTRY.set(definition.agentType, definition)
}

export function getOperatorAgent(agentType: OperatorAgentType): OperatorAgentDefinition | undefined {
  return AGENT_REGISTRY.get(agentType)
}

// ============================================================================
// RUNNER
// ============================================================================

export interface RunOperatorAgentOptions {
  triggeredBy?: 'cron' | 'manual' | 'event'
}

/**
 * Run an operator agent. Handles registration lookup, API key resolution,
 * logging to OperatorAgentRun, and error capture.
 */
export async function runOperatorAgent(
  agentType: OperatorAgentType,
  options: RunOperatorAgentOptions = {}
): Promise<OperatorAgentRunResult> {
  const triggeredBy = options.triggeredBy || 'cron'
  const startedAt = new Date()

  // Create run record
  const run = await prisma.operatorAgentRun.create({
    data: {
      agentType,
      status: 'RUNNING',
      triggeredBy,
      startedAt,
    },
  })

  try {
    // Look up agent definition
    const definition = AGENT_REGISTRY.get(agentType)
    if (!definition) {
      throw new Error(`Operator agent not registered: ${agentType}`)
    }

    // Resolve API key — operator agents always use env var (not user keys)
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    // Resolve model
    const modelIntent = OPERATOR_MODEL_INTENT[agentType]
    const modelId = MODEL_TIERS[modelIntent].anthropic.modelId
    const client = new Anthropic({ apiKey })

    logger.info(`[operator-agents] Starting ${agentType}`, { runId: run.id, model: modelId })

    // Run the agent
    const result = await definition.run({
      agentType,
      runId: run.id,
      triggeredBy,
      client,
      model: modelId,
      modelIntent,
    })

    // Update run with results
    const completedAt = new Date()
    await prisma.operatorAgentRun.update({
      where: { id: run.id },
      data: {
        status: result.status,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        itemsProcessed: result.itemsProcessed,
        actionsTaken: result.actionsTaken,
        escalations: result.escalations,
        summary: result.summary,
        details: result.details as never,
        modelUsed: result.modelUsed || modelId,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
      },
    })

    logger.info(`[operator-agents] Completed ${agentType}`, {
      runId: run.id,
      items: result.itemsProcessed,
      tokens: result.tokensUsed,
      cost: result.costUsd,
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`[operator-agents] Failed ${agentType}`, { runId: run.id, error: errorMessage })

    const completedAt = new Date()
    await prisma.operatorAgentRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        errorMessage,
      },
    })

    return {
      agentType,
      status: 'FAILED',
      itemsProcessed: 0,
      actionsTaken: 0,
      escalations: 0,
      summary: `Failed: ${errorMessage}`,
      tokensUsed: 0,
      costUsd: 0,
      errorMessage,
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Estimate cost based on model and token usage.
 */
export function estimateOperatorCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-haiku-4-5-20251016': { input: 1.0, output: 5.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-opus-4-6': { input: 15.0, output: 75.0 },
  }
  const rate = rates[model] || rates['claude-sonnet-4-6']
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000
}

/**
 * Run a simple tool-calling loop for an operator agent.
 * Mirrors the managed-agents pattern but simpler (no persistent sessions).
 */
export async function runAgentLoop(
  ctx: OperatorAgentContext,
  definition: OperatorAgentDefinition,
  initialPrompt: string,
  toolExecutor: (name: string, input: Record<string, unknown>) => Promise<unknown>,
  maxIterations: number = 10
): Promise<{
  finalResponse: string
  toolsUsed: string[]
  tokensUsed: number
  costUsd: number
}> {
  const toolsUsed: string[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let messages: Anthropic.MessageParam[] = [{ role: 'user', content: initialPrompt }]

  for (let i = 0; i < maxIterations; i++) {
    const response = await ctx.client.messages.create({
      model: ctx.model,
      max_tokens: 4096,
      system: definition.systemPrompt,
      tools: definition.tools,
      messages,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    if (response.stop_reason === 'end_turn') {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')

      return {
        finalResponse: text,
        toolsUsed,
        tokensUsed: totalInputTokens + totalOutputTokens,
        costUsd: estimateOperatorCost(ctx.model, totalInputTokens, totalOutputTokens),
      }
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        toolsUsed.push(toolUse.name)
        const input = toolUse.input as Record<string, unknown>

        try {
          const result = await toolExecutor(toolUse.name, input)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          })
        } catch (error) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ success: false, error: String(error) }),
            is_error: true,
          })
        }
      }

      messages.push({ role: 'user', content: toolResults })
    }
  }

  return {
    finalResponse: 'Max iterations reached without completion.',
    toolsUsed,
    tokensUsed: totalInputTokens + totalOutputTokens,
    costUsd: estimateOperatorCost(ctx.model, totalInputTokens, totalOutputTokens),
  }
}
