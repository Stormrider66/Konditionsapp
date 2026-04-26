/**
 * Create a Vercel AI SDK model instance from a ResolvedModel.
 *
 * Server-only — uses provider SDK factories that require API keys.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { ResolvedModel } from '@/types/ai-models'
import { wrapAiFetch } from './fetch'

export function createModelInstance(resolved: ResolvedModel) {
  switch (resolved.provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: resolved.apiKey,
        fetch: wrapAiFetch('anthropic'),
      })
      return anthropic(resolved.modelId)
    }
    case 'google': {
      const google = createGoogleGenerativeAI({
        apiKey: resolved.apiKey,
        fetch: wrapAiFetch('google'),
      })
      return google(resolved.modelId)
    }
    case 'openai': {
      const openai = createOpenAI({
        apiKey: resolved.apiKey,
        fetch: wrapAiFetch('openai'),
      })
      return openai(resolved.modelId)
    }
    default:
      throw new Error(`Unsupported provider: ${resolved.provider}`)
  }
}

/**
 * Models that no longer accept the `temperature` request parameter.
 *
 * Claude Opus 4.7 ships extended thinking on by default and the API rejects
 * `temperature` outright ("`temperature` is deprecated for this model"); the
 * AI SDK then bubbles that up as a 400. OpenAI's o-series reasoning models
 * have the same constraint. Keep this list explicit so a future thinking-
 * mode model doesn't silently break callers the same way.
 */
const NO_TEMPERATURE_MODELS = new Set<string>([
  'claude-opus-4-7',
])

export function modelDeprecatesTemperature(modelId: string): boolean {
  if (NO_TEMPERATURE_MODELS.has(modelId)) return true
  // Anything matching the OpenAI o-series naming convention also rejects
  // temperature in the current API surface.
  if (/^o[1-9]/i.test(modelId)) return true
  return false
}

/**
 * Spread-able generateText option fragment that includes `temperature` only
 * when the model accepts it. Use as:
 *
 *   await generateText({
 *     model,
 *     prompt,
 *     ...generationTuning(resolved.modelId, { temperature: 0.1 }),
 *   })
 *
 * Pass any combination of sampling params; only the keys the model supports
 * survive into the spread.
 */
export function generationTuning(
  modelId: string,
  opts: { temperature?: number; topP?: number; topK?: number }
): Partial<{ temperature: number; topP: number; topK: number }> {
  if (!modelDeprecatesTemperature(modelId)) return opts
  // Strip sampling params on no-temperature models. topP/topK are also
  // typically rejected when temperature is, so drop them too.
  const { temperature: _t, topP: _p, topK: _k, ...rest } = opts
  return rest
}
