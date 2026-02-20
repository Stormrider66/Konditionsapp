/**
 * Create a Vercel AI SDK model instance from a ResolvedModel.
 *
 * Server-only — uses provider SDK factories that require API keys.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { ResolvedModel } from '@/types/ai-models'

export function createModelInstance(resolved: ResolvedModel) {
  switch (resolved.provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: resolved.apiKey })
      return anthropic(resolved.modelId)
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey: resolved.apiKey })
      return google(resolved.modelId)
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey: resolved.apiKey })
      return openai(resolved.modelId)
    }
    default:
      throw new Error(`Unsupported provider: ${resolved.provider}`)
  }
}
