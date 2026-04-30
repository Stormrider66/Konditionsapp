import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canAccessClientInTeam,
  getBusinessSlugFromRequest,
  getBusinessTeamOwnerIds,
} from './team-access'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    businessMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    client: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/permissions/assistant-coach', () => ({
  getStaffPermissions: vi.fn(),
}))

describe('team access business scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getStaffPermissions).mockResolvedValue({
      role: 'OWNER',
      roleLabel: 'Agare',
      isTeamScoped: false,
      canViewAthletes: true,
      canViewTestResults: true,
      canViewProgress: true,
      canEditPrograms: true,
      canRunIntervals: true,
      canRunTests: true,
      canAccessStudios: true,
      canAccessAI: true,
      canViewCalendar: true,
      canCreateEvents: true,
      canInviteStaff: true,
      canAssignTeams: true,
      canManageBilling: true,
      canManageSettings: true,
      assignedTeamIds: [],
    })
  })

  it('extracts business slug from explicit header before referrer', () => {
    const request = new Request('http://localhost/api/teams', {
      headers: {
        'x-business-slug': 'skelleftea-aik',
        referer: 'http://localhost/star-by-thomson/coach/teams',
      },
    })

    expect(getBusinessSlugFromRequest(request)).toBe('skelleftea-aik')
  })

  it('extracts business slug from business route referrer', () => {
    const request = new Request('http://localhost/api/teams', {
      headers: {
        referer: 'http://localhost/skelleftea-aik/coach/teams/team-1',
      },
    })

    expect(getBusinessSlugFromRequest(request)).toBe('skelleftea-aik')
  })

  it('looks up business-wide team owners inside the requested slug only', async () => {
    vi.mocked(prisma.businessMember.findFirst).mockResolvedValue({
      businessId: 'skelleftea-business',
      role: 'OWNER',
    } as any)
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([
      { userId: 'skelleftea-owner' },
      { userId: 'skelleftea-phys' },
    ] as any)

    const ownerIds = await getBusinessTeamOwnerIds('coach-a', 'skelleftea-aik')

    expect(ownerIds).toEqual(['skelleftea-owner', 'skelleftea-phys'])
    expect(prisma.businessMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          business: { slug: 'skelleftea-aik' },
        }),
      })
    )
    expect(prisma.businessMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'skelleftea-business',
        }),
      })
    )
  })

  it('checks client access against the requested business membership', async () => {
    vi.mocked(prisma.businessMember.findFirst)
      .mockResolvedValueOnce({ businessId: 'skelleftea-business', role: 'OWNER' } as any)
      .mockResolvedValueOnce({ businessId: 'skelleftea-business' } as any)
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([{ userId: 'skelleftea-owner' }] as any)
    vi.mocked(prisma.team.findFirst).mockResolvedValue({
      id: 'team-a',
      userId: 'skelleftea-owner',
      name: 'A-team',
    } as any)
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: 'client-a' } as any)

    const allowed = await canAccessClientInTeam(
      'coach-a',
      'client-a',
      'team-a',
      'skelleftea-aik'
    )

    expect(allowed).toBe(true)
    expect(prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'client-a',
          teamId: 'team-a',
          OR: expect.arrayContaining([{ businessId: 'skelleftea-business' }]),
        }),
      })
    )
  })
})
