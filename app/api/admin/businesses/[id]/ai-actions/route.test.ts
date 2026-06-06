import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdminRole: vi.fn(),
  prisma: {
    business: {
      findUnique: vi.fn(),
    },
    aIActionDraft: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAdminRole: mocks.requireAdminRole,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/businesses/[id]/ai-actions/route'

function request(query = '') {
  return new NextRequest(`http://localhost/api/admin/businesses/business-1/ai-actions${query}`)
}

function ctx(id = 'business-1') {
  return { params: Promise.resolve({ id }) }
}

function action(overrides: Record<string, unknown> = {}) {
  return {
    id: 'draft-1',
    capabilityId: 'sendCoachMessage',
    actorUserId: 'coach-user-1',
    actorRole: 'COACH',
    surface: 'coach_chat',
    actionType: 'send',
    riskLevel: 'medium',
    status: 'PENDING',
    businessId: 'business-1',
    businessSlug: 'konditionslabbet',
    clientId: 'client-1',
    teamId: 'team-1',
    conversationId: 'conversation-1',
    preview: {
      title: 'Send message',
      targetLabel: 'Team Green',
    },
    result: null,
    errorMessage: null,
    expiresAt: new Date('2026-06-07T08:00:00Z'),
    confirmedAt: null,
    executedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-06-06T08:00:00Z'),
    updatedAt: new Date('2026-06-06T08:00:00Z'),
    ...overrides,
  }
}

describe('GET /api/admin/businesses/[id]/ai-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminRole.mockResolvedValue({ id: 'admin-1' })
    mocks.prisma.business.findUnique.mockResolvedValue({
      id: 'business-1',
      name: 'Konditionslabbet',
      slug: 'konditionslabbet',
    })
    mocks.prisma.aIActionDraft.findMany.mockResolvedValue([action()])
    mocks.prisma.aIActionDraft.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { status: 3 } },
      { status: 'EXECUTED', _count: { status: 7 } },
    ])
    mocks.prisma.user.findMany.mockResolvedValue([
      { id: 'coach-user-1', name: 'Ada Coach', email: 'ada@example.com', role: 'COACH' },
    ])
    mocks.prisma.client.findMany.mockResolvedValue([
      { id: 'client-1', name: 'Maja Runner', email: 'maja@example.com' },
    ])
    mocks.prisma.team.findMany.mockResolvedValue([
      { id: 'team-1', name: 'Team Green' },
    ])
  })

  it('returns scoped action history with actor and target labels', async () => {
    const response = await GET(request(), ctx())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.requireAdminRole).toHaveBeenCalledWith(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])
    expect(mocks.prisma.aIActionDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'business-1' },
        take: 50,
      })
    )
    expect(body.data.summary).toMatchObject({
      PENDING: 3,
      EXECUTED: 7,
      FAILED: 0,
    })
    expect(body.data.actions[0]).toMatchObject({
      id: 'draft-1',
      actorName: 'Ada Coach',
      actorEmail: 'ada@example.com',
      clientName: 'Maja Runner',
      teamName: 'Team Green',
    })
  })

  it('filters by status and caps the requested limit', async () => {
    const response = await GET(request('?status=FAILED&limit=10'), ctx())

    expect(response.status).toBe(200)
    expect(mocks.prisma.aIActionDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'business-1', status: 'FAILED' },
        take: 10,
      })
    )
  })

  it('returns 404 when the business does not exist', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(null)

    const response = await GET(request(), ctx())

    expect(response.status).toBe(404)
    expect(mocks.prisma.aIActionDraft.findMany).not.toHaveBeenCalled()
    expect(mocks.prisma.aIActionDraft.groupBy).not.toHaveBeenCalled()
  })

  it('denies unauthorized admin access before reading action history', async () => {
    mocks.requireAdminRole.mockRejectedValue(new Error('Access denied'))

    const response = await GET(request(), ctx())

    expect(response.status).toBe(403)
    expect(mocks.prisma.business.findUnique).not.toHaveBeenCalled()
    expect(mocks.prisma.aIActionDraft.findMany).not.toHaveBeenCalled()
  })
})
