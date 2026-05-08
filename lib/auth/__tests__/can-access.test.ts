import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    client: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    coachAgreement: {
      findFirst: vi.fn(),
    },
    businessMember: {
      findMany: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    teamCoachAssignment: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: vi.fn(),
  canAccessPhysioPlatform: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { canAccessClient } from '../can-access'
import {
  canAccessCoachPlatform,
  canAccessPhysioPlatform,
} from '@/lib/user-capabilities'

describe('canAccessClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'staff-1',
      role: 'COACH',
      athleteAccount: null,
    } as any)
    vi.mocked(canAccessCoachPlatform).mockResolvedValue(true)
    vi.mocked(canAccessPhysioPlatform).mockResolvedValue(false)
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.coachAgreement.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.team.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.teamCoachAssignment.findFirst).mockResolvedValue(null)
  })

  it('allows business-wide staff to access clients in their business', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([
      { businessId: 'business-1', role: 'COACH' },
    ] as any)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      businessId: 'business-1',
      teamId: 'team-1',
    } as any)

    await expect(canAccessClient('staff-1', 'client-1')).resolves.toBe(true)
  })

  it('does not grant business-wide client access to team-scoped staff', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([
      { businessId: 'business-1', role: 'PHYSICAL_TRAINER' },
    ] as any)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      businessId: 'business-1',
      teamId: 'team-1',
    } as any)

    await expect(canAccessClient('staff-1', 'client-1')).resolves.toBe(false)
    expect(prisma.teamCoachAssignment.findFirst).toHaveBeenCalledWith({
      where: { teamId: 'team-1', userId: 'staff-1' },
    })
  })

  it('allows team-scoped staff to access athletes on assigned teams', async () => {
    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([
      { businessId: 'business-1', role: 'ASSISTANT_COACH' },
    ] as any)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      businessId: 'business-1',
      teamId: 'team-1',
    } as any)
    vi.mocked(prisma.teamCoachAssignment.findFirst).mockResolvedValue({
      id: 'assignment-1',
      teamId: 'team-1',
      userId: 'staff-1',
    } as any)

    await expect(canAccessClient('staff-1', 'client-1')).resolves.toBe(true)
  })
})
