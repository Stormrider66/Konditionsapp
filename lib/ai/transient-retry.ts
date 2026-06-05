/**
 * Shared transient-error detection + retry for AI provider calls.
 *
 * Vision/structured-output calls (Gemini especially) intermittently fail with
 * 429/503/overload/"try again" under load. A single un-retried failure surfaces
 * to the user as a hard error (e.g. the recipe scanner's "Kunde inte tolka
 * receptet"), even though an immediate retry usually succeeds. The refine route
 * already does this inline; this is the reusable version.
 */

export function getErrorText(error: unknown): string {
  if (error == null) return ''
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause
    return `${error.name} ${error.message} ${cause != null ? String(cause) : ''}`.toLowerCase()
  }
  return String(error).toLowerCase()
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

/** Whether an AI provider error is worth retrying (overload / rate limit / 5xx). */
export function isTransientAiError(error: unknown): boolean {
  if (isAbortError(error)) return false
  const text = getErrorText(error)
  return (
    text.includes('429') ||
    text.includes('503') ||
    text.includes('504') ||
    // Be specific: a bare 'rate' substring also matches "gene-rate-d", which
    // would wrongly retry "No object generated" schema failures.
    text.includes('rate limit') ||
    text.includes('ratelimit') ||
    text.includes('rate_limit') ||
    text.includes('resource_exhausted') ||
    text.includes('overloaded') ||
    text.includes('service unavailable') ||
    text.includes('temporarily unavailable') ||
    text.includes('try again') ||
    text.includes('unavailable')
  )
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Run `fn`, retrying only on transient AI errors with the given backoff delays.
 * `delaysMs.length` is the max number of retries (so [500, 1500] = up to 2
 * retries, 3 attempts total). Non-transient errors throw immediately.
 */
export async function retryOnTransientAiError<T>(
  fn: () => Promise<T>,
  delaysMs: number[] = [500, 1500],
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= delaysMs.length || !isTransientAiError(error)) throw error
      await sleep(delaysMs[attempt])
    }
  }
}
