import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import './setup'
import { expectDeniedResponse, resetTenantBoundaryMocks } from './setup'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { GET as getExternalTests } from '@/app/api/external/v1/tests/route'
import { GET as getExternalTestById } from '@/app/api/external/v1/tests/[id]/route'
import { GET as getExternalAthleteById } from '@/app/api/external/v1/athletes/[id]/route'
import { GET as getBusiness } from '@/app/api/business/[id]/route'
import { DELETE as deleteBusiness } from '@/app/api/business/[id]/route'
import { GET as getBusinessMembers } from '@/app/api/business/[id]/members/route'
import { GET as getBusinessStats } from '@/app/api/business/[id]/stats/route'

describe('Tenant boundary - external and business', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
  })

  it('returns 404 when athleteId does not belong to API key business', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([{ userId: 'coach-a' }] as any)
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null as any)

    const request = new Request('http://localhost/api/external/v1/tests?athleteId=athlete-b')
    const response = await getExternalTests(request as any, { params: Promise.resolve({}) })
    const body = await expectDeniedResponse(response as any, 404, ['data', 'athlete'])

    expect(body.success).toBe(false)
    expect(prisma.test.findMany).not.toHaveBeenCalled()
    expect(prisma.test.count).not.toHaveBeenCalled()
  })

  it('returns consistent 404 deny shape across different foreign athleteIds', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([{ userId: 'coach-a' }] as any)
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null as any)

    const responseA = await getExternalTests(
      new Request('http://localhost/api/external/v1/tests?athleteId=athlete-b') as any,
      { params: Promise.resolve({}) }
    )
    const responseB = await getExternalTests(
      new Request('http://localhost/api/external/v1/tests?athleteId=athlete-c') as any,
      { params: Promise.resolve({}) }
    )

    const bodyA = await expectDeniedResponse(responseA as any, 404, ['data'])
    const bodyB = await expectDeniedResponse(responseB as any, 404, ['data'])

    expect(bodyA.success).toBe(false)
    expect(bodyB.success).toBe(false)
  })

  it('returns 200 and applies filter when athleteId belongs to business', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([{ userId: 'coach-a' }] as any)
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: 'athlete-a' } as any)
    vi.mocked(prisma.test.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.test.count).mockResolvedValue(0 as any)

    const request = new Request('http://localhost/api/external/v1/tests?athleteId=athlete-a')
    const response = await getExternalTests(request as any, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    expect(prisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'athlete-a',
          userId: { in: ['coach-a'] },
        }),
      })
    )
  })

  it('GET /api/external/v1/tests/[id] returns 404 for cross-business test id', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([{ userId: 'coach-a' }] as any)
    vi.mocked(prisma.test.findFirst).mockResolvedValue(null as any)

    const request = new Request('http://localhost/api/external/v1/tests/test-b')
    const response = await getExternalTestById(request as any, {
      params: Promise.resolve({ id: 'test-b' }),
    })
    const body = await expectDeniedResponse(response as any, 404, ['data'])

    expect(body.success).toBe(false)
    expect(prisma.test.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'test-b',
          userId: { in: ['coach-a'] },
        }),
      })
    )
  })

  it('GET /api/external/v1/athletes/[id] returns 404 for cross-business athlete id', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([{ userId: 'coach-a' }] as any)
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null as any)

    const request = new Request('http://localhost/api/external/v1/athletes/athlete-b')
    const response = await getExternalAthleteById(request as any, {
      params: Promise.resolve({ id: 'athlete-b' }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
    expect(prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'athlete-b',
          userId: { in: ['coach-a'] },
        }),
      })
    )
  })

  it('GET /api/business/[id] denies inactive member', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue(null as any)

    const request = new Request('http://localhost/api/business/business-a')
    const response = await getBusiness(request as any, {
      params: Promise.resolve({ id: 'business-a' }),
    })

    expect(response.status).toBe(403)
    expect(prisma.businessMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'coach-a',
          businessId: 'business-a',
          isActive: true,
        }),
      })
    )
  })

  it('GET /api/business/[id]/members denies inactive member', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue(null as any)

    const request = new Request('http://localhost/api/business/business-a/members')
    const response = await getBusinessMembers(request as any, {
      params: Promise.resolve({ id: 'business-a' }),
    })

    expect(response.status).toBe(403)
    expect(prisma.businessMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'coach-a',
          businessId: 'business-a',
          isActive: true,
        }),
      })
    )
  })

  it('GET /api/business/[id]/stats denies inactive member', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue(null as any)

    const request = new NextRequest('http://localhost/api/business/business-a/stats')
    const response = await getBusinessStats(request as any, {
      params: Promise.resolve({ id: 'business-a' }),
    })

    expect(response.status).toBe(403)
    expect(prisma.businessMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'coach-a',
          businessId: 'business-a',
          isActive: true,
        }),
      })
    )
  })

  it('DELETE /api/business/[id] denies admin who is not owner', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'admin-a', role: 'ADMIN' } as any)
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue(null as any)

    const request = new Request('http://localhost/api/business/business-a', { method: 'DELETE' })
    const response = await deleteBusiness(request as any, {
      params: Promise.resolve({ id: 'business-a' }),
    })

    expect(response.status).toBe(403)
    expect(prisma.business.update).not.toHaveBeenCalled()
  })
})
