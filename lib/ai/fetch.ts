/**
 * Wrapped fetch for the Vercel AI SDK provider clients.
 *
 * Two responsibilities:
 *   1. Apply a default 60s request timeout if the caller didn't supply one.
 *      Without this an upstream hang pins a Fluid Compute instance until
 *      the platform-level execution timeout (5 min) fires.
 *   2. Record outcome to the per-provider circuit breaker so a sustained
 *      regional outage stops being routed to.
 *
 * Treat 5xx and network/timeout errors as breaker failures. Treat 4xx as
 * success — those mean the provider is up; we sent something it didn't
 * like (rate-limit excluded, see below).
 *
 * 429 (rate-limit) is also recorded as a failure: it's a signal that
 * sustained traffic to this provider isn't healthy, and falling over to
 * another provider for a 30s window is the right move.
 */

import { recordAiFailure, recordAiSuccess, type AiProvider } from './circuit-breaker'

const DEFAULT_TIMEOUT_MS = 60_000

export function wrapAiFetch(
  provider: AiProvider,
  base: typeof fetch = fetch,
): typeof fetch {
  return async function aiFetch(input, init) {
    const next: RequestInit = { ...init }
    if (!next.signal) {
      next.signal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    }

    try {
      const res = await base(input, next)
      if (res.status >= 500 || res.status === 429) {
        recordAiFailure(provider)
      } else {
        recordAiSuccess(provider)
      }
      return res
    } catch (err) {
      recordAiFailure(provider)
      throw err
    }
  }
}
