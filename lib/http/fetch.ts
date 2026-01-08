import 'server-only'

export type FetchWithTimeoutAndRetryOptions = {
  /**
   * Total time allowed per attempt (not including retries/backoff).
   */
  timeoutMs?: number
  /**
   * Total attempts including the first one.
   */
  maxAttempts?: number
  /**
   * Base delay for exponential backoff.
   */
  baseDelayMs?: number
  /**
   * Cap for backoff delays (and Retry-After).
   */
  maxDelayMs?: number
  /**
   * HTTP status codes that should be retried.
   */
  retryOnStatuses?: number[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null

  // seconds
  const seconds = Number.parseInt(retryAfter, 10)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)

  // HTTP date
  const dateMs = Date.parse(retryAfter)
  if (!Number.isFinite(dateMs)) return null
  return Math.max(0, dateMs - Date.now())
}

function isRepeatableBody(body: RequestInit['body']): boolean {
  if (body == null) return true
  if (typeof body === 'string') return true
  if (body instanceof URLSearchParams) return true
  if (body instanceof ArrayBuffer) return true
  if (ArrayBuffer.isView(body)) return true // includes Buffer/TypedArrays/DataView
  // Blob/FormData are typically repeatable in Node, but we avoid retrying them by default.
  return false
}

function isRetryableStatus(status: number, retryOnStatuses: Set<number>): boolean {
  return retryOnStatuses.has(status)
}

function getBackoffDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1))
  const jitter = Math.floor(Math.random() * 100)
  return Math.min(maxDelayMs, exp + jitter)
}

/**
 * Fetch wrapper that enforces a per-attempt timeout and retries a small set of transient failures.
 *
 * Notes:
 * - Retries are only enabled when the request body is repeatable (string/URLSearchParams/Buffer/ArrayBuffer/etc).
 * - `Retry-After` is honored but capped by `maxDelayMs`.
 */
export async function fetchWithTimeoutAndRetry(
  url: string,
  init: RequestInit = {},
  options: FetchWithTimeoutAndRetryOptions = {}
): Promise<Response> {
  const timeoutMs = Math.max(1, options.timeoutMs ?? 10_000)
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 250)
  const maxDelayMs = Math.max(0, options.maxDelayMs ?? 2_000)
  const retryOnStatuses = new Set(options.retryOnStatuses ?? [408, 429, 500, 502, 503, 504])

  const method = (init.method ?? 'GET').toUpperCase()
  const canRetry = isRepeatableBody(init.body)
  const maxAttemptsDefault = method === 'GET' || method === 'HEAD' ? 3 : 2
  const maxAttempts = Math.max(1, options.maxAttempts ?? (canRetry ? maxAttemptsDefault : 1))

  const externalSignal = init.signal

  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const onAbort = () => controller.abort()

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort()
      } else {
        externalSignal.addEventListener('abort', onAbort, { once: true })
      }
    }

    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...init, signal: controller.signal })

      if (response.ok) {
        return response
      }

      const shouldRetry =
        canRetry && attempt < maxAttempts && isRetryableStatus(response.status, retryOnStatuses)

      if (!shouldRetry) {
        return response
      }

      // Cancel the body so the connection can be reused before retrying.
      try {
        response.body?.cancel()
      } catch {
        // ignore
      }

      const retryAfterMsRaw = parseRetryAfterMs(response.headers.get('retry-after'))
      const retryAfterMs = retryAfterMsRaw != null ? Math.min(maxDelayMs, retryAfterMsRaw) : null
      const delayMs = retryAfterMs ?? getBackoffDelayMs(attempt, baseDelayMs, maxDelayMs)
      await sleep(delayMs)
      continue
    } catch (err: unknown) {
      lastError = err

      // If the caller aborted, don't retry.
      if (externalSignal?.aborted) throw err

      const shouldRetry = canRetry && attempt < maxAttempts
      if (!shouldRetry) throw err

      const delayMs = getBackoffDelayMs(attempt, baseDelayMs, maxDelayMs)
      await sleep(delayMs)
      continue
    } finally {
      clearTimeout(timeout)
      if (externalSignal && !externalSignal.aborted) {
        externalSignal.removeEventListener('abort', onAbort)
      }
    }
  }

  // Shouldn't be reachable, but keep TS happy.
  throw lastError ?? new Error('fetch failed')
}


