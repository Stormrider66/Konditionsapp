import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { resolveModel, isModelIntent } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { isProviderHealthy } from '@/lib/ai/circuit-breaker'
import { wrapAiFetch } from '@/lib/ai/fetch'
import { logger } from '@/lib/logger'

type EffectiveKeys = {
  anthropicKey?: string | null
  googleKey?: string | null
  openaiKey?: string | null
}

export type ChatProvider = 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'

export interface ResolveAiModelInput {
  provider: ChatProvider
  model: string
  effectiveKeys: EffectiveKeys
  /** Athlete-chat intent value (e.g. 'balanced'). Optional. */
  intent?: string
  isAthleteChat: boolean
  deepThinkEnabled?: boolean
}

export type ResolveAiModelResult =
  | { ok: true; aiModel: unknown; usageLoggedByMiddleware: boolean }
  | { ok: false; errorMessage: string }

/**
 * Resolve the concrete AI SDK model instance for the chat request.
 * Preference order:
 *   1. Athlete-chat `intent` if provided → resolveModel(keys, intent)
 *   2. Exact provider match if the key for that provider is present
 *   3. Fallback to resolveModel(keys, 'balanced') if anything else is set
 */
export function resolveAiModel(input: ResolveAiModelInput): ResolveAiModelResult {
  const { provider, model, effectiveKeys, intent, isAthleteChat, deepThinkEnabled } = input

  // Drop keys for providers whose circuit breaker is open so resolveModel /
  // explicit-provider matches naturally fall through to a healthy provider.
  const healthyKeys: EffectiveKeys = {
    anthropicKey: isProviderHealthy('anthropic') ? effectiveKeys.anthropicKey : null,
    googleKey: isProviderHealthy('google') ? effectiveKeys.googleKey : null,
    openaiKey: isProviderHealthy('openai') ? effectiveKeys.openaiKey : null,
  }

  if (intent && isModelIntent(intent) && isAthleteChat) {
    const resolved = resolveModel(healthyKeys, intent)
    if (resolved) {
      logger.info('Athlete intent-based model resolved', {
        intent,
        provider: resolved.provider,
        model: resolved.modelId,
      })
      return { ok: true, aiModel: createModelInstance(resolved), usageLoggedByMiddleware: true }
    }
    return { ok: false, errorMessage: 'Ingen AI API-nyckel konfigurerad.' }
  }

  if (provider === 'ANTHROPIC' && healthyKeys.anthropicKey) {
    const anthropic = createAnthropic({
      apiKey: healthyKeys.anthropicKey,
      fetch: wrapAiFetch('anthropic'),
    })
    return { ok: true, aiModel: anthropic(model || 'claude-sonnet-4-6'), usageLoggedByMiddleware: false }
  }

  if (provider === 'GOOGLE' && healthyKeys.googleKey) {
    const google = createGoogleGenerativeAI({
      apiKey: healthyKeys.googleKey,
      fetch: wrapAiFetch('google'),
    })
    const geminiModel = model || 'gemini-3-flash-preview'
    if (deepThinkEnabled) {
      logger.info('Using Gemini Deep Think mode', { model: geminiModel })
    }
    return { ok: true, aiModel: google(geminiModel), usageLoggedByMiddleware: false }
  }

  if (provider === 'OPENAI' && healthyKeys.openaiKey) {
    const openai = createOpenAI({
      apiKey: healthyKeys.openaiKey,
      fetch: wrapAiFetch('openai'),
    })
    return { ok: true, aiModel: openai(model || 'gpt-5.5'), usageLoggedByMiddleware: false }
  }

  // No healthy key for the requested provider — try any healthy provider.
  const fallback = resolveModel(healthyKeys, 'balanced')
  if (fallback) {
    logger.info('Falling back to available provider', {
      requestedProvider: provider,
      fallbackProvider: fallback.provider,
      fallbackModel: fallback.modelId,
    })
    return { ok: true, aiModel: createModelInstance(fallback), usageLoggedByMiddleware: true }
  }

  return {
    ok: false,
    errorMessage:
      'AI-tjänsten är tillfälligt otillgänglig. Försök igen om en stund.',
  }
}

/** Max output tokens per provider, with per-model overrides. */
export function getMaxOutputTokens(provider: ChatProvider, model: string): number {
  if (provider === 'OPENAI') return 128000
  if (provider === 'ANTHROPIC') {
    if (model.includes('opus')) return 128000
    return 64000
  }
  if (provider === 'GOOGLE') return 65536
  return 16384
}
