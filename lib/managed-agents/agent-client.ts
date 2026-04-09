/**
 * Claude Managed Agents - SDK Client
 *
 * Integrates with the Anthropic Sessions API to create, resume,
 * and interact with persistent agent sessions.
 *
 * Each agent type has a pre-registered agent definition with its
 * own system prompt, model, and tool set. Sessions are created
 * per-entity (athlete, coach, physio) and resumed on each event.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveModel, type ModelIntent, MODEL_TIERS } from '@/types/ai-models'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import type { AgentType, AgentEvent, EscalationContext } from './types'
import { resolveAgentModelIntent } from './types'
import { getOrCreateSession, updateSessionUsage, markSessionError } from './session-manager'
import { executeReadTool, executeCalculateTool, executeWriteTool } from './tool-executor'
import { COACHING_AGENT_SYSTEM_PROMPT } from './prompts/coaching-agent'
import { NUTRITION_AGENT_SYSTEM_PROMPT } from './prompts/nutrition-agent'

// ============================================================================
// AGENT DEFINITIONS - Tool schemas for each agent type
// ============================================================================

/** Tool definitions shared by the Coaching Agent */
const COACHING_TOOLS: Anthropic.Tool[] = [
  // READ tools
  {
    name: 'readAthleteProfile',
    description: 'Get athlete demographics, sport, experience level, and coaching mode.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'readReadiness',
    description: 'Get athlete readiness from daily check-in and/or Garmin wearable data. Includes sleep, HRV, stress, fatigue, mood.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        date: { type: 'string', description: 'ISO date string (optional, defaults to today)' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'readTrainingLoad',
    description: 'Get ACWR (Acute:Chronic Workload Ratio), acute/chronic load, TSS, and risk zone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'readActiveInjuries',
    description: 'Get active injuries and training restrictions for the athlete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'readUpcomingWorkouts',
    description: 'Get scheduled strength and cardio workouts for the next N days.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        days: { type: 'number', description: 'Number of days to look ahead (default 7)' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'readRecentDecisions',
    description: 'Get recent agent actions/decisions for context (avoid duplicating recommendations).',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        days: { type: 'number', description: 'Lookback period in days (default 7)' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'readGarminLatest',
    description: 'Get the latest Garmin wearable data (HRV, sleep, stress, resting HR, readiness score).',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
      },
      required: ['clientId'],
    },
  },
  // CALCULATE tools
  {
    name: 'detectPatterns',
    description: 'Analyze 7-day check-in trends to detect patterns: sleep degradation, fatigue accumulation, stress escalation, mood decline.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        days: { type: 'number', description: 'Days to analyze (default 7)' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'detectMilestones',
    description: 'Check for athlete milestones: check-in streaks, workout count achievements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'calculateInjuryRisk',
    description: 'Calculate injury risk score based on ACWR, injury history, HRV, sleep, and stress.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
      },
      required: ['clientId'],
    },
  },
  // WRITE tools
  {
    name: 'modifyWorkoutIntensity',
    description: 'Reduce workout intensity by a percentage. Respects athlete max reduction preference. Requires consent.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        assignmentId: { type: 'string', description: 'The workout assignment ID to modify' },
        reductionPercent: { type: 'number', description: 'Percentage to reduce (1-50)' },
      },
      required: ['clientId', 'assignmentId', 'reductionPercent'],
    },
  },
  {
    name: 'skipWorkout',
    description: 'Skip a scheduled workout with a reason. Use only for safety/recovery concerns.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        assignmentId: { type: 'string', description: 'The workout assignment ID to skip' },
        reason: { type: 'string', description: 'Why the workout should be skipped' },
      },
      required: ['clientId', 'assignmentId', 'reason'],
    },
  },
  {
    name: 'sendNotification',
    description: 'Send an in-app notification to the athlete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        type: { type: 'string', enum: ['RECOVERY', 'TRAINING', 'NUTRITION', 'MILESTONE', 'GENERAL'] },
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification message body' },
      },
      required: ['clientId', 'type', 'title', 'message'],
    },
  },
  {
    name: 'createCoachAlert',
    description: 'Create an alert for the athlete\'s coach about a concern.',
    input_schema: {
      type: 'object' as const,
      properties: {
        coachId: { type: 'string', description: 'The coach user ID' },
        clientId: { type: 'string', description: 'The athlete client ID' },
        alertType: { type: 'string', description: 'Alert type (READINESS_DROP, MISSED_CHECKINS, HIGH_ACWR, PAIN_MENTION)' },
        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        message: { type: 'string', description: 'Alert message for the coach' },
      },
      required: ['coachId', 'clientId', 'alertType', 'severity', 'message'],
    },
  },
  {
    name: 'logAgentAction',
    description: 'Log a decision/recommendation for the audit trail and learning system.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'The athlete client ID' },
        actionType: { type: 'string', description: 'Action type (WORKOUT_INTENSITY_REDUCTION, REST_DAY_INJECTION, etc.)' },
        reasoning: { type: 'string', description: 'Why this action was taken' },
        confidence: { type: 'number', description: 'Confidence score 0-1' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
      },
      required: ['clientId', 'actionType', 'reasoning', 'confidence', 'priority'],
    },
  },
]

/** Nutrition Agent gets coaching tools plus nutrition-specific ones */
const NUTRITION_TOOLS: Anthropic.Tool[] = [
  // Include basic read tools
  ...COACHING_TOOLS.filter(t => ['readAthleteProfile', 'readReadiness', 'sendNotification', 'logAgentAction'].includes(t.name)),
  // Nutrition-specific
  {
    name: 'readMealsToday',
    description: 'Get all meals logged today with macro totals.',
    input_schema: {
      type: 'object' as const,
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'readBodyCompHistory',
    description: 'Get body composition measurements (weight, body fat, muscle mass) over time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
        days: { type: 'number', description: 'Lookback period in days (default 90)' },
      },
      required: ['clientId'],
    },
  },
]

/** Map agent types to their tool definitions */
const AGENT_TOOLS: Partial<Record<AgentType, Anthropic.Tool[]>> = {
  COACHING: COACHING_TOOLS,
  NUTRITION: NUTRITION_TOOLS,
}

/** Map agent types to their system prompts */
const AGENT_PROMPTS: Partial<Record<AgentType, string>> = {
  COACHING: COACHING_AGENT_SYSTEM_PROMPT,
  NUTRITION: NUTRITION_AGENT_SYSTEM_PROMPT,
}

// ============================================================================
// SDK CLIENT
// ============================================================================

/**
 * Invoke a managed agent with an event.
 *
 * This creates or resumes an agent session, sends the event as context,
 * and processes the agent's response including any tool calls.
 *
 * For the MVP, we use the Messages API with tools (not the full Sessions API)
 * since it doesn't require environment setup. This gives us the same
 * tool-calling loop but without persistent server-side sessions.
 * When the Sessions API is fully available, we swap the transport layer.
 */
export async function invokeAgent(
  agentType: AgentType,
  event: AgentEvent,
  escalationContext?: EscalationContext
): Promise<{
  sessionId: string
  response: string
  toolsUsed: string[]
  tokensUsed: number
}> {
  const { sessionId, isNew } = await getOrCreateSession(
    agentType,
    event.entityId,
    escalationContext
  )

  const modelIntent = resolveAgentModelIntent(agentType, escalationContext)
  const tools = AGENT_TOOLS[agentType] || []
  const systemPrompt = AGENT_PROMPTS[agentType] || 'You are a helpful training assistant.'

  // Resolve API key - try user keys first, then env
  const apiKey = await resolveApiKey(event.entityId)
  if (!apiKey) {
    await markSessionError(sessionId, 'No Anthropic API key available')
    return { sessionId, response: '', toolsUsed: [], tokensUsed: 0 }
  }

  const client = new Anthropic({ apiKey })
  const modelId = MODEL_TIERS[modelIntent].anthropic.modelId

  try {
    const result = await runAgentLoop(client, {
      model: modelId,
      systemPrompt,
      tools,
      event,
      maxIterations: 10,
    })

    // Track usage
    await updateSessionUsage(sessionId, result.tokensUsed, result.estimatedCost)

    return {
      sessionId,
      response: result.finalResponse,
      toolsUsed: result.toolsUsed,
      tokensUsed: result.tokensUsed,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`[managed-agents] Agent ${agentType} failed for ${event.entityId}`, { error: msg })
    await markSessionError(sessionId, msg)
    return { sessionId, response: '', toolsUsed: [], tokensUsed: 0 }
  }
}

// ============================================================================
// AGENT LOOP - Tool-calling agentic loop
// ============================================================================

interface AgentLoopConfig {
  model: string
  systemPrompt: string
  tools: Anthropic.Tool[]
  event: AgentEvent
  maxIterations: number
}

interface AgentLoopResult {
  finalResponse: string
  toolsUsed: string[]
  tokensUsed: number
  estimatedCost: number
}

/**
 * Run the agent loop: send message -> handle tool calls -> repeat until done.
 */
async function runAgentLoop(
  client: Anthropic,
  config: AgentLoopConfig
): Promise<AgentLoopResult> {
  const { model, systemPrompt, tools, event, maxIterations } = config
  const toolsUsed: string[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0

  // Build initial message with event context
  const eventContext = `EVENT: ${event.type}\nDATA: ${JSON.stringify(event.data, null, 2)}\nENTITY: ${event.entityId}\nTIME: ${event.timestamp.toISOString()}\n\nAnalyze this event and take appropriate action using your tools. Always start by reading the athlete's current state before making decisions.`

  let messages: Anthropic.MessageParam[] = [
    { role: 'user', content: eventContext },
  ]

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    // Check if the agent is done (no more tool calls)
    if (response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      )
      const finalResponse = textBlocks.map(b => b.text).join('\n')

      return {
        finalResponse,
        toolsUsed,
        tokensUsed: totalInputTokens + totalOutputTokens,
        estimatedCost: estimateCost(model, totalInputTokens, totalOutputTokens),
      }
    }

    // Process tool calls
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      // Add assistant response to messages
      messages.push({ role: 'assistant', content: response.content })

      // Execute each tool call and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        toolsUsed.push(toolUse.name)
        const input = toolUse.input as Record<string, unknown>

        logger.info(`[managed-agents] Tool call: ${toolUse.name}`, {
          input: JSON.stringify(input).slice(0, 200),
        })

        // Route to appropriate executor
        let result
        if (['readAthleteProfile', 'readReadiness', 'readTrainingLoad', 'readActiveInjuries', 'readUpcomingWorkouts', 'readRecentDecisions', 'readGarminLatest', 'readMealsToday', 'readBodyCompHistory'].includes(toolUse.name)) {
          result = await executeReadTool(toolUse.name, input)
        } else if (['detectPatterns', 'detectMilestones', 'calculateInjuryRisk'].includes(toolUse.name)) {
          result = await executeCalculateTool(toolUse.name, input)
        } else {
          result = await executeWriteTool(toolUse.name, input)
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      }

      // Add tool results to messages
      messages.push({ role: 'user', content: toolResults })
    }
  }

  // Max iterations reached
  return {
    finalResponse: 'Agent reached maximum iterations without completing.',
    toolsUsed,
    tokensUsed: totalInputTokens + totalOutputTokens,
    estimatedCost: estimateCost(model, totalInputTokens, totalOutputTokens),
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve an Anthropic API key for a given entity.
 * Tries user's stored key first, then falls back to env var.
 */
async function resolveApiKey(entityId: string): Promise<string | null> {
  // Try to find the user associated with this entity
  const client = await prisma.client.findUnique({
    where: { id: entityId },
    select: { userId: true },
  })

  if (client?.userId) {
    const keys = await getResolvedAiKeys(client.userId)
    if (keys.anthropicKey) return keys.anthropicKey
  }

  // Fall back to environment variable
  return process.env.ANTHROPIC_API_KEY || null
}

/**
 * Estimate cost based on model and token usage.
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Find pricing from MODEL_TIERS
  for (const tier of Object.values(MODEL_TIERS)) {
    if (tier.anthropic.modelId === model) {
      // Look up from AI_MODELS for pricing — use approximate rates
      break
    }
  }

  // Approximate pricing per 1M tokens
  const rates: Record<string, { input: number; output: number }> = {
    'claude-haiku-4-5-20251016': { input: 1.0, output: 5.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-opus-4-6': { input: 15.0, output: 75.0 },
  }

  const rate = rates[model] || rates['claude-sonnet-4-6']
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000
}
