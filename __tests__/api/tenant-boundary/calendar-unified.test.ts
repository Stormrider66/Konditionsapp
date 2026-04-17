/**
 * Tenant-boundary contract for GET /api/calendar/unified.
 *
 * The unified calendar fans out into workouts, races, check-ins and
 * third-party activity streams for a given clientId. Skipping the
 * client-access check leaks schedule + biometrics across tenants.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import './setup'
import { canAccessClient } from '@/lib/auth-utils'
import { resetTenantBoundaryMocks } from './setup'

vi.mock('@/lib/calendar/unified/auth', () => ({
  resolveAuthenticatedUserId: vi.fn(),
}))

vi.mock('@/lib/calendar/unified/build-payload', () => ({
  buildUnifiedCalendarPayload: vi.fn(),
}))

import { resolveAuthenticatedUserId } from '@/lib/calendar/unified/auth'
import { buildUnifiedCalendarPayload } from '@/lib/calendar/unified/build-payload'
import {
  clientAccessCache,
  clientAccessInFlight,
  unifiedCalendarInFlight,
} from '@/lib/calendar/unified/caches'
import { GET as getUnifiedCalendar } from '@/app/api/calendar/unified/route'

function buildRequest(query: string) {
  const url = `http://localhost/api/calendar/unified${query}`
  // NextRequest is constructible from a URL; the route only reads
  // searchParams + headers so a plain NextRequest works.
  const { NextRequest } = require('next/server') as typeof import('next/server')
  return new NextRequest(url)
}

describe('Tenant boundary - GET /api/calendar/unified', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
    clientAccessCache.clear()
    clientAccessInFlight.clear()
    unifiedCalendarInFlight.clear()
  })

  it('bails out with 401 when the auth resolver rejects', async () => {
    vi.mocked(resolveAuthenticatedUserId).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await getUnifiedCalendar(buildRequest('?clientId=client-a'))

    expect(response.status).toBe(401)
    expect(canAccessClient).not.toHaveBeenCalled()
    expect(buildUnifiedCalendarPayload).not.toHaveBeenCalled()
  })

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(resolveAuthenticatedUserId).mockResolvedValue({
      ok: true,
      userId: 'coach-a',
    })

    const response = await getUnifiedCalendar(buildRequest(''))

    expect(response.status).toBe(400)
    expect(canAccessClient).not.toHaveBeenCalled()
    expect(buildUnifiedCalendarPayload).not.toHaveBeenCalled()
  })

  it('denies access with 403 when canAccessClient returns false', async () => {
    vi.mocked(resolveAuthenticatedUserId).mockResolvedValue({
      ok: true,
      userId: 'coach-a',
    })
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const response = await getUnifiedCalendar(buildRequest('?clientId=client-foreign'))

    expect(response.status).toBe(403)
    expect(canAccessClient).toHaveBeenCalledWith('coach-a', 'client-foreign')
    expect(buildUnifiedCalendarPayload).not.toHaveBeenCalled()
  })

  it('serves the payload when the caller can access the client', async () => {
    vi.mocked(resolveAuthenticatedUserId).mockResolvedValue({
      ok: true,
      userId: 'coach-a',
    })
    vi.mocked(canAccessClient).mockResolvedValue(true)
    vi.mocked(buildUnifiedCalendarPayload).mockResolvedValue({
      json: JSON.stringify({ items: [], groupedByDate: {} }),
    } as any)

    const response = await getUnifiedCalendar(
      buildRequest('?clientId=client-a&startDate=2026-04-01&endDate=2026-04-30')
    )

    expect(response.status).toBe(200)
    expect(buildUnifiedCalendarPayload).toHaveBeenCalledTimes(1)
    expect(vi.mocked(buildUnifiedCalendarPayload).mock.calls[0][0].clientId).toBe('client-a')
    expect(vi.mocked(buildUnifiedCalendarPayload).mock.calls[0][0].dbUserId).toBe('coach-a')
  })

  it('caches the allowed decision per (user, client) so duplicate lookups are skipped', async () => {
    vi.mocked(resolveAuthenticatedUserId).mockResolvedValue({
      ok: true,
      userId: 'coach-a',
    })
    vi.mocked(canAccessClient).mockResolvedValue(true)
    vi.mocked(buildUnifiedCalendarPayload).mockResolvedValue({
      json: JSON.stringify({ items: [] }),
    } as any)

    await getUnifiedCalendar(
      buildRequest('?clientId=client-a&startDate=2026-04-01&endDate=2026-04-30')
    )
    await getUnifiedCalendar(
      buildRequest('?clientId=client-a&startDate=2026-05-01&endDate=2026-05-31')
    )

    // Both requests targeted the same (user, client) pair; access should
    // only have been checked once. If this assertion fires, the access
    // cache is no longer guarding against redundant permission lookups.
    expect(canAccessClient).toHaveBeenCalledTimes(1)
  })

  it('does not reuse an allow decision across different clientIds', async () => {
    vi.mocked(resolveAuthenticatedUserId).mockResolvedValue({
      ok: true,
      userId: 'coach-a',
    })
    // client-a is allowed; client-b is not.
    vi.mocked(canAccessClient).mockImplementation(async (_userId, clientId) =>
      clientId === 'client-a'
    )
    vi.mocked(buildUnifiedCalendarPayload).mockResolvedValue({
      json: JSON.stringify({ items: [] }),
    } as any)

    const ok = await getUnifiedCalendar(buildRequest('?clientId=client-a'))
    const denied = await getUnifiedCalendar(buildRequest('?clientId=client-b'))

    expect(ok.status).toBe(200)
    expect(denied.status).toBe(403)
    expect(canAccessClient).toHaveBeenCalledTimes(2)
  })
})
