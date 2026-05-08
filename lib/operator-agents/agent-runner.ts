/**
 * Operator Agent Runner
 *
 * Executes operator agents with logging, cost tracking, and error handling.
 * Every run creates an OperatorAgentRun record for audit and monitoring.
 *
 * Usage (from a cron route):
 *   import { runOperatorAgent } from '@/lib/operator-agents'
 *   await runOperatorAgent('SUPPORT', { triggeredBy: 'cron' })
 *
 * Provider: OpenAI GPT-5.4 Nano via Vercel AI SDK when OPENAI_API_KEY is
 * configured, otherwise Gemini Flash-Lite. Tool definitions are kept in
 * Anthropic JSON-schema shape so the 12 agent files don't have to change; the
 * runner converts them to AI SDK tools at the boundary.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, jsonSchema, stepCountIs, tool, type ToolSet } from 'ai'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { MODEL_TIERS, type ModelIntent } from '@/types/ai-models'
import type { AIProvider } from '@/types/ai-models'
import type { OperatorAgentType, OperatorAgentRunResult } from './types'
import { OPERATOR_MODEL_INTENT } from './types'

// ============================================================================
// AGENT PROMPT & TOOL REGISTRY
// ============================================================================

export interface OperatorAgentDefinition {
  agentType: OperatorAgentType
  systemPrompt: string
  /** Tools this agent has access to. Kept in Anthropic JSON-schema shape; the
   *  runner translates these into AI SDK tools at call time. */
  tools: Anthropic.Tool[]
  /** Handler that runs the agent loop and returns a result */
  run: (ctx: OperatorAgentContext) => Promise<OperatorAgentRunResult>
}

export interface OperatorAgentContext {
  agentType: OperatorAgentType
  runId: string
  triggeredBy: string
  model: string
  provider: AIProvider
  modelIntent: ModelIntent
}

interface OperatorModelSelection {
  provider: AIProvider
  modelId: string
  apiKey: string
}

function resolveOperatorModel(modelIntent: ModelIntent): OperatorModelSelection | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      modelId: MODEL_TIERS[modelIntent].openai.modelId,
      apiKey: process.env.OPENAI_API_KEY,
    }
  }

  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (googleApiKey) {
    return {
      provider: 'google',
      modelId: MODEL_TIERS[modelIntent].google.modelId,
      apiKey: googleApiKey,
    }
  }

  return null
}

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

export async function runOperatorAgent(
  agentType: OperatorAgentType,
  options: RunOperatorAgentOptions = {}
): Promise<OperatorAgentRunResult> {
  const triggeredBy = options.triggeredBy || 'cron'
  const startedAt = new Date()

  let run: { id: string } | null = null
  try {
    run = await prisma.operatorAgentRun.create({
      data: {
        agentType,
        status: 'RUNNING',
        triggeredBy,
        startedAt,
      },
    })
  } catch (dbError) {
    const msg = dbError instanceof Error ? dbError.message : String(dbError)
    logger.error('[operator-agents] Failed to create run record', { agentType, error: msg })
    return {
      agentType,
      status: 'FAILED',
      itemsProcessed: 0,
      actionsTaken: 0,
      escalations: 0,
      summary: `Failed to create run record: ${msg.slice(0, 200)}. This usually means the OperatorAgentRun table does not exist yet — run the Prisma migration.`,
      tokensUsed: 0,
      costUsd: 0,
      errorMessage: msg,
    }
  }

  try {
    const definition = AGENT_REGISTRY.get(agentType)
    if (!definition) {
      throw new Error(`Operator agent not registered: ${agentType}`)
    }

    const modelIntent = OPERATOR_MODEL_INTENT[agentType]
    const selectedModel = resolveOperatorModel(modelIntent)
    if (!selectedModel) {
      throw new Error('OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY not configured')
    }

    logger.info(`[operator-agents] Starting ${agentType}`, {
      runId: run.id,
      provider: selectedModel.provider,
      model: selectedModel.modelId,
    })

    const result = await definition.run({
      agentType,
      runId: run.id,
      triggeredBy,
      provider: selectedModel.provider,
      model: selectedModel.modelId,
      modelIntent,
    })

    const completedAt = new Date()
    try {
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
          modelUsed: result.modelUsed || selectedModel.modelId,
          tokensUsed: result.tokensUsed,
          costUsd: result.costUsd,
        },
      })
    } catch (updateError) {
      logger.warn('[operator-agents] Failed to update run record', {
        runId: run.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
    }

    logger.info(`[operator-agents] Completed ${agentType}`, {
      runId: run.id,
      items: result.itemsProcessed,
      tokens: result.tokensUsed,
      cost: result.costUsd,
    })

    import('@/lib/slack/agent-alerts').then(({ postAgentResultToSlack }) =>
      postAgentResultToSlack(result)
    ).catch(() => { /* Slack not configured or import failed — silent */ })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`[operator-agents] Failed ${agentType}`, { runId: run.id, error: errorMessage })

    const completedAt = new Date()
    try {
      await prisma.operatorAgentRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          errorMessage,
        },
      })
    } catch {
      // Best-effort — already logged the original error
    }

    const failureResult: OperatorAgentRunResult = {
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

    import('@/lib/slack/agent-alerts').then(({ postAgentResultToSlack }) =>
      postAgentResultToSlack(failureResult)
    ).catch(() => {})

    return failureResult
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Estimate cost based on model and token usage.
 * Reads pricing from types/ai-models.ts AI_MODELS as single source of truth.
 */
export function estimateOperatorCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const { AI_MODELS } = require('@/types/ai-models') as typeof import('@/types/ai-models')

  const modelConfig = AI_MODELS.find(m => m.modelId === model)

  if (!modelConfig) {
    // Fallback to Gemini Flash Lite pricing — current default operator tier
    const fallback = AI_MODELS.find(m => m.modelId === 'gemini-3.1-flash-lite-preview')
    if (!fallback) return 0
    return (
      (inputTokens * fallback.pricing.input + outputTokens * fallback.pricing.output) / 1_000_000
    )
  }

  return (
    (inputTokens * modelConfig.pricing.input + outputTokens * modelConfig.pricing.output) / 1_000_000
  )
}

/**
 * Run generateText with exponential backoff for transient errors.
 * Retries on: 429 (rate limit), 5xx, and network errors.
 */
async function generateWithRetry(
  params: Parameters<typeof generateText>[0],
  maxAttempts: number = 4
): Promise<Awaited<ReturnType<typeof generateText>>> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generateText(params)
    } catch (error) {
      lastError = error
      const status = (error as { statusCode?: number; status?: number })?.statusCode
        ?? (error as { statusCode?: number; status?: number })?.status
      const isRetryable =
        status === 429 ||
        (typeof status === 'number' && status >= 500) ||
        status === undefined

      if (!isRetryable || attempt === maxAttempts) throw error

      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.floor(Math.random() * 500)
      logger.warn('[operator-agents] AI provider transient error, retrying', {
        status,
        attempt,
        maxAttempts,
        backoffMs,
      })
      await new Promise(resolve => setTimeout(resolve, backoffMs))
    }
  }
  throw lastError
}

/**
 * Run a tool-calling loop for an operator agent using the Vercel AI SDK.
 * Translates Anthropic-shape tool defs into AI SDK tools, attaches the
 * provided executor, and lets the SDK drive the multi-step loop.
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
  const selectedModel = resolveOperatorModel(ctx.modelIntent)
  if (!selectedModel) {
    throw new Error('OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY not configured')
  }

  const aiModel = selectedModel.provider === 'openai'
    ? createOpenAI({ apiKey: selectedModel.apiKey })(selectedModel.modelId)
    : createGoogleGenerativeAI({ apiKey: selectedModel.apiKey })(selectedModel.modelId)

  const toolsUsed: string[] = []

  const aiTools: ToolSet = Object.fromEntries(
    definition.tools.map(t => [
      t.name,
      tool({
        description: t.description,
        inputSchema: jsonSchema(t.input_schema as object),
        execute: async (input: unknown) => {
          toolsUsed.push(t.name)
          try {
            return await toolExecutor(t.name, (input ?? {}) as Record<string, unknown>)
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) }
          }
        },
      }),
    ])
  )

  const result = await generateWithRetry({
    model: aiModel,
    system: definition.systemPrompt,
    prompt: initialPrompt,
    tools: aiTools,
    stopWhen: stepCountIs(maxIterations),
  })

  const inputTokens = result.usage?.inputTokens ?? 0
  const outputTokens = result.usage?.outputTokens ?? 0

  return {
    finalResponse: result.text || 'Max iterations reached without a final response.',
    toolsUsed,
    tokensUsed: inputTokens + outputTokens,
    costUsd: estimateOperatorCost(selectedModel.modelId, inputTokens, outputTokens),
  }
}
