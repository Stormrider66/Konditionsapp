import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBusinessMemberFindFirst = vi.hoisted(() => vi.fn())
const mockBusinessMemberFindUnique = vi.hoisted(() => vi.fn())
const mockBusinessMemberFindMany = vi.hoisted(() => vi.fn())
const mockBusinessMemberUpdate = vi.hoisted(() => vi.fn())
const mockCoachProfileFindUnique = vi.hoisted(() => vi.fn())
const mockTeamFindMany = vi.hoisted(() => vi.fn())
const mockClientFindMany = vi.hoisted(() => vi.fn())
const mockTcaFindMany = vi.hoisted(() => vi.fn())
const mockTcaDeleteMany = vi.hoisted(() => vi.fn())
const mockTcaCreate = vi.hoisted(() => vi.fn())
const mockTcaUpdateMany = vi.hoisted(() => vi.fn())
const mockPaFindMany = vi.hoisted(() => vi.fn())
const mockPaCreate = vi.hoisted(() => vi.fn())
const mockPaUpdateMany = vi.hoisted(() => vi.fn())
const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockGetStaffRolePreview = vi.hoisted(() => vi.fn())
const mockGetStaffPermissions = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => {
  const prisma: Record<string, unknown> = {
    businessMember: {
      findFirst: mockBusinessMemberFindFirst,
      findUnique: mockBusinessMemberFindUnique,
      findMany: mockBusinessMemberFindMany,
      update: mockBusinessMemberUpdate,
    },
    coachProfile: { findUnique: mockCoachProfileFindUnique },
    team: { findMany: mockTeamFindMany },
    client: { findMany: mockClientFindMany },
    teamCoachAssignment: {
      findMany: mockTcaFindMany,
      deleteMany: mockTcaDeleteMany,
      create: mockTcaCreate,
      updateMany: mockTcaUpdateMany,
    },
    physioAssignment: {
      findMany: mockPaFindMany,
      create: mockPaCreate,
      updateMany: mockPaUpdateMany,
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  }
  return { prisma }
})

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/permissions/role-preview-server', () => ({
  getStaffRolePreview: mockGetStaffRolePreview,
}))

vi.mock('@/lib/permissions/assistant-coach', async () => {
  const actual = await vi.importActual<typeof import('@/lib/permissions/assistant-coach')>(
    '@/lib/permissions/assistant-coach',
  )
  return {
    ...actual,
    getStaffPermissions: mockGetStaffPermissions,
  }
})

vi.mock('@/lib/api/utils', () => ({
  handleApiError: (e: unknown) =>
    new Response(JSON.stringify({ error: 'handled', message: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }),
}))

import { PATCH } from './route'

const teamA = '11111111-1111-4111-8111-111111111111'
const teamB = '22222222-2222-4222-8222-222222222222'
const clientX = '33333333-3333-4333-8333-333333333333'

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/coach/staff/member-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function ctx() {
  return { params: Promise.resolve({ memberId: 'member-1' }) }
}

describe('PATCH /api/coach/staff/[memberId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', language: 'en' })
    mockGetRequestedBusinessScope.mockReturnValue({})
    mockGetStaffRolePreview.mockResolvedValue(null)
    mockGetStaffPermissions.mockResolvedValue({ canInviteStaff: true })
    mockBusinessMemberFindFirst.mockResolvedValue({
      businessId: 'business-1',
      business: { type: 'CLUB' },
    })
    mockBusinessMemberFindUnique.mockResolvedValue({
      userId: 'staff-1',
      role: 'ASSISTANT_COACH',
      businessId: 'business-1',
    })
    mockBusinessMemberFindMany.mockResolvedValue([{ userId: 'admin-1' }, { userId: 'staff-1' }])
    mockBusinessMemberUpdate.mockResolvedValue({})
    mockCoachProfileFindUnique.mockResolvedValue({ dashboardMode: 'TEAM' })
    mockTeamFindMany.mockResolvedValue([{ id: teamA }, { id: teamB }])
    mockClientFindMany.mockResolvedValue([{ id: clientX }])
    mockTcaFindMany.mockResolvedValue([])
    mockTcaDeleteMany.mockResolvedValue({ count: 0 })
    mockTcaCreate.mockResolvedValue({ id: 'tca-1' })
    mockTcaUpdateMany.mockResolvedValue({ count: 0 })
    mockPaFindMany.mockResolvedValue([])
    mockPaCreate.mockResolvedValue({ id: 'pa-1' })
    mockPaUpdateMany.mockResolvedValue({ count: 0 })
  })

  it('rejects callers without staff-management permission', async () => {
    mockGetStaffPermissions.mockResolvedValue({ canInviteStaff: false })
    const res = await PATCH(patchRequest({ role: 'COACH' }) as any, ctx() as any)
    expect(res.status).toBe(403)
    expect(mockBusinessMemberUpdate).not.toHaveBeenCalled()
  })

  it('rejects non-team contexts (gym business, not in team mode)', async () => {
    mockBusinessMemberFindFirst.mockResolvedValue({ businessId: 'business-1', business: { type: 'GYM' } })
    mockCoachProfileFindUnique.mockResolvedValue({ dashboardMode: 'GYM' })
    const res = await PATCH(patchRequest({ role: 'COACH' }) as any, ctx() as any)
    expect(res.status).toBe(400)
    expect(mockBusinessMemberUpdate).not.toHaveBeenCalled()
  })

  it('allows a non-club business when the requester is in team mode', async () => {
    mockBusinessMemberFindFirst.mockResolvedValue({ businessId: 'business-1', business: { type: 'INDEPENDENT_COACH' } })
    mockCoachProfileFindUnique.mockResolvedValue({ dashboardMode: 'TEAM' })
    mockBusinessMemberFindUnique.mockResolvedValue({ userId: 'staff-1', role: 'PHYSIO', businessId: 'business-1' })
    mockTcaFindMany.mockResolvedValue([{ teamId: teamA }])
    const res = await PATCH(patchRequest({ role: 'COACH' }) as any, ctx() as any)
    expect(res.status).toBe(200)
    expect(mockBusinessMemberUpdate).toHaveBeenCalledWith({ where: { id: 'member-1' }, data: { role: 'COACH' } })
  })

  it('returns 404 for a member outside the requester business', async () => {
    mockBusinessMemberFindUnique.mockResolvedValue({ userId: 'staff-1', role: 'COACH', businessId: 'other-business' })
    const res = await PATCH(patchRequest({ role: 'COACH' }) as any, ctx() as any)
    expect(res.status).toBe(404)
  })

  it('refuses to edit the owner', async () => {
    mockBusinessMemberFindUnique.mockResolvedValue({ userId: 'staff-1', role: 'OWNER', businessId: 'business-1' })
    const res = await PATCH(patchRequest({ role: 'COACH' }) as any, ctx() as any)
    expect(res.status).toBe(400)
  })

  it('refuses to edit yourself', async () => {
    mockBusinessMemberFindUnique.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN', businessId: 'business-1' })
    const res = await PATCH(patchRequest({ role: 'COACH' }) as any, ctx() as any)
    expect(res.status).toBe(400)
  })

  it('requires at least one team for team-scoped roles', async () => {
    const res = await PATCH(patchRequest({ role: 'PHYSICAL_TRAINER', teamIds: [] }) as any, ctx() as any)
    expect(res.status).toBe(400)
    expect(mockTcaCreate).not.toHaveBeenCalled()
  })

  it('rejects individual athletes outside the business', async () => {
    mockClientFindMany.mockResolvedValue([]) // requested client is not in this business
    const res = await PATCH(
      patchRequest({ role: 'PHYSIO', teamIds: [teamA], clientIds: [clientX] }) as any,
      ctx() as any,
    )
    expect(res.status).toBe(400)
    expect(mockPaCreate).not.toHaveBeenCalled()
  })

  it('drops all team rows and physio assignments when moving to a non-team-scoped role', async () => {
    mockBusinessMemberFindUnique.mockResolvedValue({ userId: 'staff-1', role: 'PHYSIO', businessId: 'business-1' })
    mockTcaFindMany.mockResolvedValue([{ teamId: teamA }])
    const res = await PATCH(patchRequest({ role: 'COACH' }) as any, ctx() as any)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true, roleLabel: 'Head coach' })
    expect(mockBusinessMemberUpdate).toHaveBeenCalledWith({ where: { id: 'member-1' }, data: { role: 'COACH' } })
    expect(mockTcaDeleteMany).toHaveBeenCalledWith({ where: { userId: 'staff-1' } })
    expect(mockPaUpdateMany).toHaveBeenCalledWith({
      where: { physioUserId: 'staff-1', clientId: { not: null }, isActive: true },
      data: { isActive: false },
    })
    expect(mockTcaCreate).not.toHaveBeenCalled()
  })

  it('reconciles team connections (add new, remove dropped)', async () => {
    mockTcaFindMany.mockResolvedValue([{ teamId: teamA }])
    const res = await PATCH(patchRequest({ role: 'ASSISTANT_COACH', teamIds: [teamB] }) as any, ctx() as any)
    expect(res.status).toBe(200)
    expect(mockTcaDeleteMany).toHaveBeenCalledWith({ where: { userId: 'staff-1', teamId: { in: [teamA] } } })
    expect(mockTcaCreate).toHaveBeenCalledWith({
      data: { teamId: teamB, userId: 'staff-1', canRunTests: true, canRunIntervals: true, canCreateEvents: true },
    })
  })

  it('reconciles physio individual athletes', async () => {
    mockBusinessMemberFindUnique.mockResolvedValue({ userId: 'staff-1', role: 'PHYSIO', businessId: 'business-1' })
    mockTcaFindMany.mockResolvedValue([{ teamId: teamA }])
    mockPaFindMany.mockResolvedValue([])
    const res = await PATCH(
      patchRequest({ role: 'PHYSIO', teamIds: [teamA], clientIds: [clientX] }) as any,
      ctx() as any,
    )
    expect(res.status).toBe(200)
    expect(mockPaCreate).toHaveBeenCalledWith({
      data: {
        physioUserId: 'staff-1',
        clientId: clientX,
        role: 'PRIMARY',
        canCreateRestrictions: true,
        canViewFullHistory: true,
        isActive: true,
      },
    })
    // team unchanged → no create/delete of team rows
    expect(mockTcaCreate).not.toHaveBeenCalled()
    expect(mockTcaDeleteMany).not.toHaveBeenCalled()
  })
})
