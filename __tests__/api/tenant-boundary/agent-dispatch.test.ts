/**
 * Tenant-boundary contract for /api/agent-tools/dispatch.
 *
 * The dispatch endpoint fans out webhook events (Garmin, Strava, Concept2)
 * and internal triggers into per-athlete agent sessions. A mistake here
 * leaks data across tenants: foreign coaches trigger foreign athletes'
 * agents. This file pins the access boundary.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import './setup'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { resetTenantBoundaryMocks } from './setup'

vi.mock('@/lib/managed-agents', () => ({
  dispatchEvent: vi.fn().mockResolvedValue({ dispatched: [], debounced: [] }),
}))

import { dispatchEvent } from '@/lib/managed-agents'
import { POST as postDispatch } from '@/app/api/agent-tools/dispatch/route'

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/agent-tools/dispatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as any
}

describe('Tenant boundary - POST /api/agent-tools/dispatch', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
    process.env.INTERNAL_DISPATCH_SECRET = 'test-secret'
  })

  it('returns 401 when no session and no internal secret', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as any)

    const response = await postDispatch(
      buildRequest({ eventType: 'GARMIN_ACTIVITY', entityId: 'client-a' })
    )

    expect(response.status).toBe(401)
    expect(dispatchEvent).not.toHaveBeenCalled()
  })

  it('returns 401 when wrong internal secret is supplied', async () => {
    const response = await postDispatch(
      buildRequest(
        { eventType: 'GARMIN_ACTIVITY', entityId: 'client-a' },
        { 'x-internal-secret': 'wrong-secret' }
      )
    )

    expect(response.status).toBe(401)
    expect(dispatchEvent).not.toHaveBeenCalled()
  })

  it('returns 500 when internal secret is used but server env is missing', async () => {
    delete process.env.INTERNAL_DISPATCH_SECRET

    const response = await postDispatch(
      buildRequest(
        { eventType: 'GARMIN_ACTIVITY', entityId: 'client-a' },
        { 'x-internal-secret': 'anything' }
      )
    )

    expect(response.status).toBe(500)
    expect(dispatchEvent).not.toHaveBeenCalled()
  })

  it('accepts a webhook call with the correct internal secret without auth', async () => {
    const response = await postDispatch(
      buildRequest(
        { eventType: 'GARMIN_ACTIVITY', entityId: 'client-a', data: { foo: 1 } },
        { 'x-internal-secret': 'test-secret' }
      )
    )

    expect(response.status).toBe(200)
    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(canAccessClient).not.toHaveBeenCalled()
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    expect(vi.mocked(dispatchEvent).mock.calls[0][0].entityId).toBe('client-a')
  })

  it('denies session dispatch to a foreign client (403)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'client-b' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const response = await postDispatch(
      buildRequest({ eventType: 'GARMIN_ACTIVITY', entityId: 'client-b' })
    )

    expect(response.status).toBe(403)
    expect(canAccessClient).toHaveBeenCalledWith('coach-a', 'client-b')
    expect(dispatchEvent).not.toHaveBeenCalled()
  })

  it('allows session dispatch when canAccessClient() returns true', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'client-a' } as any)
    vi.mocked(canAccessClient).mockResolvedValue(true)

    const response = await postDispatch(
      buildRequest({ eventType: 'CHECKIN_SUBMITTED', entityId: 'client-a' })
    )

    expect(response.status).toBe(200)
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
  })

  it('denies cross-user dispatch for a coach outside the target business (403)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    // Entity is a User, not a Client.
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-b' } as any)
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue(null)

    const response = await postDispatch(
      buildRequest({ eventType: 'COACH_QUERY', entityId: 'user-b' })
    )

    expect(response.status).toBe(403)
    expect(dispatchEvent).not.toHaveBeenCalled()
  })

  it('allows cross-user dispatch when both users share an active business', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-b' } as any)
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue({ id: 'bm-1' } as any)

    const response = await postDispatch(
      buildRequest({ eventType: 'COACH_QUERY', entityId: 'user-b' })
    )

    expect(response.status).toBe(200)
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
  })

  it('always allows admins to dispatch to any user entity', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as any)
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-b' } as any)

    const response = await postDispatch(
      buildRequest({ eventType: 'COACH_QUERY', entityId: 'user-b' })
    )

    expect(response.status).toBe(200)
    expect(prisma.businessMember.findFirst).not.toHaveBeenCalled()
  })

  it('rejects invalid eventType with 400 before reaching dispatch', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)

    const response = await postDispatch(
      buildRequest({ eventType: 'NOT_A_REAL_EVENT', entityId: 'client-a' })
    )

    expect(response.status).toBe(400)
    expect(dispatchEvent).not.toHaveBeenCalled()
  })

  it('rejects missing eventType/entityId with 400', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)

    const response = await postDispatch(buildRequest({ eventType: 'GARMIN_ACTIVITY' }))

    expect(response.status).toBe(400)
    expect(dispatchEvent).not.toHaveBeenCalled()
  })
})
