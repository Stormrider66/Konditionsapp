import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { resolveModel, isModelIntent } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
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
  | { ok: true; aiModel: unknown }
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

  if (intent && isModelIntent(intent) && isAthleteChat) {
    const resolved = resolveModel(effectiveKeys, intent)
    if (resolved) {
      logger.info('Athlete intent-based model resolved', {
        intent,
        provider: resolved.provider,
        model: resolved.modelId,
      })
      return { ok: true, aiModel: createModelInstance(resolved) }
    }
    return { ok: false, errorMessage: 'Ingen AI API-nyckel konfigurerad.' }
  }

  if (provider === 'ANTHROPIC' && effectiveKeys.anthropicKey) {
    const anthropic = createAnthropic({ apiKey: effectiveKeys.anthropicKey })
    return { ok: true, aiModel: anthropic(model || 'claude-sonnet-4-6') }
  }

  if (provider === 'GOOGLE' && effectiveKeys.googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: effectiveKeys.googleKey })
    const geminiModel = model || 'gemini-3-flash-preview'
    if (deepThinkEnabled) {
      logger.info('Using Gemini Deep Think mode', { model: geminiModel })
    }
    return { ok: true, aiModel: google(geminiModel) }
  }

  if (provider === 'OPENAI' && effectiveKeys.openaiKey) {
    const openai = createOpenAI({ apiKey: effectiveKeys.openaiKey })
    return { ok: true, aiModel: openai(model || 'gpt-5.5') }
  }

  // No key for the requested provider — try any available.
  const fallback = resolveModel(effectiveKeys, 'balanced')
  if (fallback) {
    logger.info('Falling back to available provider', {
      requestedProvider: provider,
      fallbackProvider: fallback.provider,
      fallbackModel: fallback.modelId,
    })
    return { ok: true, aiModel: createModelInstance(fallback) }
  }

  return {
    ok: false,
    errorMessage:
      'Ingen AI API-nyckel konfigurerad. Konfigurera minst en API-nyckel i inställningarna.',
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
