/**
 * Per-provider circuit breaker for the three AI providers we route through
 * the Vercel AI SDK (Anthropic, Google, OpenAI).
 *
 * Goal: when one provider has a regional outage or sustained slowness, fail
 * fast and let the model-selector route to a healthy provider rather than
 * pinning request handlers waiting on a stuck upstream.
 *
 * Policy:
 *   - 5 consecutive failures within a 60s rolling window → open for 30s.
 *   - While open, isProviderHealthy() returns false; the model-selector
 *     filters that provider's key out before resolving.
 *   - After the open window expires we let traffic through again. If it
 *     fails immediately the breaker re-opens for another 30s. (No explicit
 *     half-open — the natural recovery window plus failure recording is
 *     enough at our scale.)
 *
 * State is in-memory per Fluid Compute instance. That's deliberate: this is
 * a hot-path latency guard, not a global rate-limit, and per-instance state
 * avoids a Redis hop on every AI call. The blast radius of state divergence
 * across instances is "some instances retry sooner than others" — fine.
 *
 * Direct SDK paths (@google/genai, raw `openai` client used for embeddings
 * and deep research) are NOT covered here. If those become hot enough to
 * matter, wire wrapAiFetch() into them too.
 */

import { logger } from '@/lib/logger'

export type AiProvider = 'anthropic' | 'google' | 'openai'

const FAILURE_WINDOW_MS = 60_000
const FAILURE_THRESHOLD = 5
const OPEN_DURATION_MS = 30_000

interface BreakerState {
  failureTimestamps: number[]
  openedUntil: number
}

const states: Record<AiProvider, BreakerState> = {
  anthropic: { failureTimestamps: [], openedUntil: 0 },
  google: { failureTimestamps: [], openedUntil: 0 },
  openai: { failureTimestamps: [], openedUntil: 0 },
}

export function isProviderHealthy(provider: AiProvider): boolean {
  return Date.now() >= states[provider].openedUntil
}

export function recordAiSuccess(provider: AiProvider): void {
  const s = states[provider]
  if (s.failureTimestamps.length === 0 && s.openedUntil === 0) return
  s.failureTimestamps = []
  s.openedUntil = 0
}

export function recordAiFailure(provider: AiProvider): void {
  const s = states[provider]
  const now = Date.now()

  s.failureTimestamps.push(now)
  s.failureTimestamps = s.failureTimestamps.filter(
    (t) => now - t < FAILURE_WINDOW_MS,
  )

  if (s.failureTimestamps.length >= FAILURE_THRESHOLD && now >= s.openedUntil) {
    s.openedUntil = now + OPEN_DURATION_MS
    logger.warn('AI circuit breaker opened', {
      provider,
      failuresInWindow: s.failureTimestamps.length,
      openForMs: OPEN_DURATION_MS,
    })
  }
}

/** Test/debug only — drop breaker state across providers. */
export function resetAiBreakers(): void {
  for (const k of Object.keys(states) as AiProvider[]) {
    states[k] = { failureTimestamps: [], openedUntil: 0 }
  }
}
