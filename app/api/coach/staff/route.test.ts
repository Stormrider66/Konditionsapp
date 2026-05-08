import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBusinessMemberFindFirst = vi.hoisted(() => vi.fn())
const mockBusinessMemberFindMany = vi.hoisted(() => vi.fn())
const mockTeamFindMany = vi.hoisted(() => vi.fn())
const mockTeamCoachAssignmentCreate = vi.hoisted(() => vi.fn())
const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockGetStaffRolePreview = vi.hoisted(() => vi.fn())
const mockGetStaffPermissions = vi.hoisted(() => vi.fn())
const mockInviteUserToBusiness = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    businessMember: {
      findFirst: mockBusinessMemberFindFirst,
      findMany: mockBusinessMemberFindMany,
    },
    team: {
      findMany: mockTeamFindMany,
    },
    teamCoachAssignment: {
      create: mockTeamCoachAssignmentCreate,
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
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

vi.mock('@/lib/invite-utils', () => ({
  inviteUserToBusiness: mockInviteUserToBusiness,
}))

import { POST } from './route'

const teamA = '11111111-1111-4111-8111-111111111111'
const teamB = '22222222-2222-4222-8222-222222222222'

function staffInviteRequest(body: unknown) {
  return new Request('http://localhost/api/coach/staff', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/coach/staff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'owner-1', role: 'COACH' })
    mockGetStaffRolePreview.mockResolvedValue(null)
    mockGetStaffPermissions.mockResolvedValue({ canInviteStaff: true })
    mockBusinessMemberFindFirst.mockResolvedValue({
      businessId: 'business-1',
      business: { type: 'CLUB' },
    })
    mockBusinessMemberFindMany.mockResolvedValue([{ userId: 'owner-1' }])
    mockInviteUserToBusiness.mockResolvedValue({
      success: true,
      userId: 'staff-1',
      memberId: 'member-1',
    })
    mockTeamCoachAssignmentCreate.mockResolvedValue({ id: 'assignment-1' })
  })

  it('requires at least one team assignment for team-scoped roles', async () => {
    const response = await POST(staffInviteRequest({
      email: 'assistant@example.com',
      name: 'Assistant Coach',
      role: 'ASSISTANT_COACH',
    }) as any)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Team-bundna roller måste kopplas till minst ett lag',
    })
    expect(mockInviteUserToBusiness).not.toHaveBeenCalled()
    expect(mockTeamCoachAssignmentCreate).not.toHaveBeenCalled()
  })

  it('rejects team assignments outside the current business', async () => {
    mockTeamFindMany.mockResolvedValue([{ id: teamA }])

    const response = await POST(staffInviteRequest({
      email: 'trainer@example.com',
      name: 'Physical Trainer',
      role: 'PHYSICAL_TRAINER',
      teamIds: [teamA, teamB],
    }) as any)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Ett eller flera lag tillhör inte denna verksamhet',
    })
    expect(mockInviteUserToBusiness).not.toHaveBeenCalled()
    expect(mockTeamCoachAssignmentCreate).not.toHaveBeenCalled()
  })

  it('creates assignments only for validated unique team ids', async () => {
    mockTeamFindMany.mockResolvedValue([{ id: teamA }, { id: teamB }])

    const response = await POST(staffInviteRequest({
      email: 'physio@example.com',
      name: 'Team Physio',
      role: 'PHYSIO',
      teamIds: [teamA, teamA, teamB],
    }) as any)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      success: true,
      userId: 'staff-1',
      roleLabel: 'Fysioterapeut',
    })
    expect(mockInviteUserToBusiness).toHaveBeenCalled()
    expect(mockTeamCoachAssignmentCreate).toHaveBeenCalledTimes(2)
    expect(mockTeamCoachAssignmentCreate).toHaveBeenNthCalledWith(1, {
      data: {
        teamId: teamA,
        userId: 'staff-1',
        canRunTests: false,
        canRunIntervals: false,
        canCreateEvents: true,
      },
    })
    expect(mockTeamCoachAssignmentCreate).toHaveBeenNthCalledWith(2, {
      data: {
        teamId: teamB,
        userId: 'staff-1',
        canRunTests: false,
        canRunIntervals: false,
        canCreateEvents: true,
      },
    })
  })
})
