/**
 * AI usage logger — every Gemini / Anthropic / OpenAI call writes one
 * `AIUsageLog` row so we can break down spend by feature.
 *
 * Two surfaces:
 *  1. `withAiContext({ userId, category, ... }, async () => { ... })` — wrap
 *     an async unit of work so every AI call inside it inherits this
 *     metadata via AsyncLocalStorage.
 *  2. `logAiUsage(...)` — direct call, used by the AI SDK middleware below
 *     and by `google-genai-client.ts` for the direct `@google/genai` path.
 *
 * Logging is fire-and-forget: a DB write failure must never break a user
 * request. Calls without a resolvable userId are stored as unattributed and
 * emit a warn so we can spot the gap.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { LanguageModelV2Middleware, LanguageModelV2StreamPart, LanguageModelV2Usage } from '@ai-sdk/provider'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { GEMINI_PRICING } from './gemini-config'

export type AiProviderTag = 'GOOGLE' | 'ANTHROPIC' | 'OPENAI'

/** Output-token threshold above which we emit a warn for runaway-cost detection. */
const HIGH_OUTPUT_WARN_THRESHOLD = 10_000

export interface AiUsageContext {
  userId?: string | null
  /** e.g. 'chat', 'briefing', 'food_scan', 'operator_agent', 'image_generation' */
  category: string
  conversationId?: string | null
  researchSessionId?: string | null
}

const ctxStore = new AsyncLocalStorage<AiUsageContext>()

export function withAiContext<T>(ctx: AiUsageContext, fn: () => Promise<T>): Promise<T> {
  return ctxStore.run(ctx, fn)
}

export function getAiContext(): AiUsageContext | undefined {
  return ctxStore.getStore()
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = GEMINI_PRICING[model]
  if (!pricing) return 0
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
}

export function estimateImageCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = GEMINI_PRICING[model]
  if (!pricing) return 0
  const outputRate = pricing.imageOutput ?? pricing.output
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * outputRate
}

export interface LogAiUsageParams {
  userId?: string | null
  category?: string
  provider: AiProviderTag
  model: string
  inputTokens: number
  outputTokens: number
  /** Override the auto-estimated cost. */
  estimatedCost?: number
  conversationId?: string | null
  researchSessionId?: string | null
}

/**
 * Fire-and-forget write to AIUsageLog. Falls back to AsyncLocalStorage
 * context for any field not provided. Stores unattributed rows when no userId
 * is resolvable; always emits a warn if output tokens cross the runaway
 * threshold.
 */
export function logAiUsage(params: LogAiUsageParams): void {
  const ctx = getAiContext()
  const userId = params.userId ?? ctx?.userId ?? null
  const category = params.category ?? ctx?.category ?? 'unknown'
  const conversationId = params.conversationId ?? ctx?.conversationId ?? null
  const researchSessionId = params.researchSessionId ?? ctx?.researchSessionId ?? null

  const inputTokens = Math.max(0, Math.floor(params.inputTokens || 0))
  const outputTokens = Math.max(0, Math.floor(params.outputTokens || 0))
  const estimatedCost =
    params.estimatedCost !== undefined
      ? params.estimatedCost
      : estimateCostUsd(params.model, inputTokens, outputTokens)

  if (outputTokens >= HIGH_OUTPUT_WARN_THRESHOLD) {
    logger.warn('[ai-usage] high output token call', {
      category,
      provider: params.provider,
      model: params.model,
      inputTokens,
      outputTokens,
      estimatedCost,
      userId: userId ?? '(none)',
    })
  }

  if (!userId) {
    logger.warn('[ai-usage] logging unattributed AI usage', {
      category,
      provider: params.provider,
      model: params.model,
      inputTokens,
      outputTokens,
      estimatedCost,
    })
  }

  prisma.aIUsageLog
    .create({
      data: {
        userId,
        category,
        provider: params.provider,
        model: params.model,
        inputTokens,
        outputTokens,
        estimatedCost,
        conversationId,
        researchSessionId,
      },
    })
    .catch((err) => {
      logger.error(
        '[ai-usage] failed to write AIUsageLog',
        { category, provider: params.provider, model: params.model },
        err,
      )
    })
}

/**
 * AI SDK middleware that captures token usage from both `generateText` and
 * `streamText` calls. Apply via `wrapLanguageModel({ model, middleware })`.
 *
 * Provider tag is supplied at construction time because the underlying
 * `LanguageModelV2.provider` string varies by SDK version (and we want a
 * stable provider name in the log table).
 */
export function usageLoggingMiddleware(provider: AiProviderTag): LanguageModelV2Middleware {
  return {
    middlewareVersion: 'v2',

    async wrapGenerate({ doGenerate, model }) {
      const result = await doGenerate()
      try {
        logAiUsage({
          provider,
          model: model.modelId,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens:
            (result.usage?.outputTokens ?? 0) +
            (result.usage?.reasoningTokens ?? 0),
        })
      } catch (err) {
        logger.error('[ai-usage] middleware wrapGenerate logging error', {}, err)
      }
      return result
    },

    async wrapStream({ doStream, model }) {
      const result = await doStream()

      let finalUsage: LanguageModelV2Usage | undefined
      const observed = result.stream.pipeThrough(
        new TransformStream<LanguageModelV2StreamPart, LanguageModelV2StreamPart>({
          transform(part, controller) {
            if (part.type === 'finish') {
              finalUsage = part.usage
            }
            controller.enqueue(part)
          },
          flush() {
            if (!finalUsage) return
            try {
              logAiUsage({
                provider,
                model: model.modelId,
                inputTokens: finalUsage.inputTokens ?? 0,
                outputTokens:
                  (finalUsage.outputTokens ?? 0) +
                  (finalUsage.reasoningTokens ?? 0),
              })
            } catch (err) {
              logger.error('[ai-usage] middleware wrapStream logging error', {}, err)
            }
          },
        }),
      )

      return { ...result, stream: observed }
    },
  }
}
