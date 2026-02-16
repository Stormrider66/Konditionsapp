import http from 'k6/http'
import { Rate, Trend } from 'k6/metrics'

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// These are created in init context so k6 will include them.
// We attach {endpoint: "..."} tags to break down p95/p99 per endpoint.
export const endpointDuration = new Trend('endpoint_duration', true)
export const endpointFailed = new Rate('endpoint_failed')
export const endpointCacheHit = new Rate('endpoint_cache_hit')
export const endpointCacheStale = new Rate('endpoint_cache_stale')
export const endpointCacheMiss = new Rate('endpoint_cache_miss')
export const endpointMwBypass = new Rate('endpoint_mw_bypass')
export const endpointHandlerMs = new Trend('endpoint_handler_ms', true)
export const endpointOverheadMs = new Trend('endpoint_overhead_ms', true)
export const endpointMwMs = new Trend('endpoint_mw_ms', true)
export const endpointNextQueueMs = new Trend('endpoint_next_queue_ms', true)

function getHeader(res, headerName) {
  if (!res || !res.headers) return null
  const desired = String(headerName || '').toLowerCase()
  for (const k in res.headers) {
    if (String(k).toLowerCase() === desired) {
      return res.headers[k]
    }
  }
  return null
}

function recordEndpointMetrics(res, tags) {
  const endpoint = tags && tags.endpoint
  if (!endpoint) return

  // Status 0 indicates network/transport errors in k6.
  const status = res && typeof res.status === 'number' ? res.status : 0
  const failed = status === 0 || status >= 400

  const durationMs = res && res.timings ? res.timings.duration : null
  if (typeof durationMs === 'number') {
    endpointDuration.add(durationMs, { endpoint })
  }
  endpointFailed.add(failed, { endpoint })

  // Optional perf-debug headers (only enabled for local load tests).
  const cache = String(getHeader(res, 'x-cache') || '').toLowerCase()
  endpointCacheHit.add(cache === 'hit', { endpoint })
  endpointCacheStale.add(cache === 'stale', { endpoint })
  endpointCacheMiss.add(cache === 'miss', { endpoint })

  const mwBypass = String(getHeader(res, 'x-mw-bypass') || '').toLowerCase()
  endpointMwBypass.add(mwBypass === '1' || mwBypass === 'true' || mwBypass === 'yes', { endpoint })

  const mwHeader = getHeader(res, 'x-mw-ms')
  const mwMs = mwHeader ? parseFloat(String(mwHeader)) : NaN
  if (Number.isFinite(mwMs)) {
    endpointMwMs.add(mwMs, { endpoint })
  }

  const handlerHeader = getHeader(res, 'x-handler-ms')
  const handlerMs = handlerHeader ? parseFloat(String(handlerHeader)) : NaN
  if (Number.isFinite(handlerMs)) {
    endpointHandlerMs.add(handlerMs, { endpoint })
    if (typeof durationMs === 'number') {
      endpointOverheadMs.add(Math.max(0, durationMs - handlerMs), { endpoint })
      if (Number.isFinite(mwMs)) {
        endpointNextQueueMs.add(Math.max(0, durationMs - handlerMs - mwMs), { endpoint })
      }
    }
  }
}

export function buildHeaders(extra = {}) {
  const headers = {
    Accept: 'application/json',
    ...extra,
  }

  if (__ENV.BEARER_TOKEN) {
    headers.Authorization = `Bearer ${__ENV.BEARER_TOKEN}`
  }
  if (__ENV.AUTH_COOKIE) {
    headers.Cookie = __ENV.AUTH_COOKIE
  }
  if (__ENV.LOAD_TEST_BYPASS_SECRET) {
    headers['x-load-test-secret'] = __ENV.LOAD_TEST_BYPASS_SECRET
  }
  if (__ENV.LOAD_TEST_BYPASS_USER_EMAIL) {
    headers['x-auth-user-email'] = __ENV.LOAD_TEST_BYPASS_USER_EMAIL
  }

  return headers
}

export function get(path, tags = {}) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: buildHeaders(),
    tags,
  })
  recordEndpointMetrics(res, tags)
  return res
}

export function postJson(path, body, tags = {}) {
  const res = http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    tags,
  })
  recordEndpointMetrics(res, tags)
  return res
}

export function requiredEnv(name) {
  const value = __ENV[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}
