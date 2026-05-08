import { performance } from 'node:perf_hooks'
import { NextResponse, type NextRequest } from 'next/server'

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function isVerifiedLocalPerfDebugRequest(request: NextRequest): boolean {
  if (process.env.ENABLE_LOAD_TEST_BYPASS !== 'true') return false
  if (!isLocalHostname(request.nextUrl.hostname)) return false

  const secret = process.env.LOAD_TEST_BYPASS_SECRET
  return !!secret && request.headers.get('x-load-test-secret') === secret
}

export function startPerfDebug(request: NextRequest) {
  return {
    enabled: isVerifiedLocalPerfDebugRequest(request),
    startedAt: performance.now(),
  }
}

export function perfDebugHeaders(
  perf: ReturnType<typeof startPerfDebug>,
  headers: Record<string, string> = {}
) {
  if (!perf.enabled) return headers

  const handlerMs = Math.max(0, performance.now() - perf.startedAt)
  return {
    ...headers,
    'x-handler-ms': handlerMs.toFixed(2),
    'Server-Timing': `handler;dur=${handlerMs.toFixed(2)}`,
  }
}

export function jsonWithPerfDebug(
  perf: ReturnType<typeof startPerfDebug>,
  body: unknown,
  init: Omit<ResponseInit, 'headers'> & { headers?: Record<string, string> } = {},
  headers: Record<string, string> = {}
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...perfDebugHeaders(perf, headers),
    },
  })
}
