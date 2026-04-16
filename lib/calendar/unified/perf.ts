import { NextRequest, NextResponse } from 'next/server'
import { performance } from 'node:perf_hooks'
import type { CalendarItemsMode } from './types'

/**
 * Perf debug headers are only emitted when the request hits localhost and
 * carries the load-test bypass secret — used by k6 to pull handler timings
 * straight off the response.
 */
export function shouldEmitPerfDebugHeaders(request: NextRequest): boolean {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host

  const host = (() => {
    if (!rawHost) return request.nextUrl.hostname
    const ipv6 = rawHost.match(/^\[(.+)\](?::\d+)?$/)
    if (ipv6) return ipv6[1]
    return rawHost.split(':')[0]
  })()

  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!isLocal) return false

  const incomingSecret = request.headers.get('x-load-test-secret')
  const secret = process.env.LOAD_TEST_BYPASS_SECRET || 'local-k6-bypass-secret'
  return !!secret && !!incomingSecret && incomingSecret === secret
}

export function withHandlerTiming(
  enabled: boolean,
  t0: number,
  headers: Record<string, string>
): Record<string, string> | undefined {
  if (!enabled) return undefined
  const handlerMs = Math.max(0, performance.now() - t0)
  return {
    ...headers,
    'x-handler-ms': handlerMs.toFixed(2),
    'Server-Timing': `handler;dur=${handlerMs.toFixed(2)}`,
  }
}

export function jsonResponse(json: string, extraHeaders?: Record<string, string>) {
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  })
}

export function normalizeCalendarItemsMode(value: string | null): CalendarItemsMode {
  if (value === 'light') return 'light'
  return 'full'
}
