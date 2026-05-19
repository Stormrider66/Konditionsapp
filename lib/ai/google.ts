/**
 * Drop-in replacement for `import { google } from '@ai-sdk/google'` that
 * routes every call through `usageLoggingMiddleware`.
 *
 * Use as:
 *   import { google } from '@/lib/ai/google'
 *   const model = google('gemini-3.5-flash')
 *
 * Combine with `withAiContext({ userId, category: 'chat' }, async () => { ... })`
 * around the `generateText`/`streamText` call so the resulting AIUsageLog row
 * is correctly attributed.
 */
import { google as rawGoogle } from '@ai-sdk/google'
import { wrapLanguageModel } from 'ai'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import { wrapAiFetch } from './fetch'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { normalizeAIModelId } from './model-compat'
import { usageLoggingMiddleware } from './usage-logger'

const middleware = usageLoggingMiddleware('GOOGLE')

const sharedFetch = wrapAiFetch('google')

const sharedClient = createGoogleGenerativeAI({ fetch: sharedFetch })

export function google(modelId: string) {
  return wrapLanguageModel({ model: sharedClient(normalizeAIModelId(modelId)), middleware })
}

/**
 * Wrap a Google model built with a per-user `createGoogleGenerativeAI`
 * (BYOK) client so that every call lands in `AIUsageLog`. Use at the
 * call site:
 *
 *   const userGoogle = createGoogleGenerativeAI({ apiKey: userKey })
 *   const model = withGoogleLogging(userGoogle(GEMINI_MODELS.FLASH))
 */
export function withGoogleLogging(model: LanguageModelV2): LanguageModelV2 {
  return wrapLanguageModel({ model, middleware })
}

/**
 * Re-export the raw provider for callers that need provider settings
 * (`createGoogleGenerativeAI`); they should opt into instrumentation
 * manually by wrapping their model with `withGoogleLogging`.
 */
export { createGoogleGenerativeAI, rawGoogle }
