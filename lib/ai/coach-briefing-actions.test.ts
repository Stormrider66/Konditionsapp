import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCanAccessAthlete = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  client: { findMany: vi.fn() },
}))

vi.mock('@/lib/auth/athlete-access', () => ({
  canAccessAthlete: mockCanAccessAthlete,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { buildCoachDailyBriefingPreview } from './coach-briefing-actions'

describe('coach briefing AI actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanAccessAthlete.mockResolvedValue({ allowed: true })
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Henrik Lundholm',
        team: { name: 'A Team' },
        dailyCheckIns: [{ readinessScore: 42, readinessDecision: 'REDUCE', sleepHours: 6, fatigue: 7, soreness: 5, date: new Date('2026-06-24') }],
        dailyMetrics: [],
        trainingLoads: [{ acwr: 1.5, acwrZone: 'DANGER', injuryRisk: 'HIGH' }],
        injuryAssessments: [],
        cardioSessionAssignments: [{
          assignedDate: new Date('2026-06-24'),
          status: 'PENDING',
          session: { name: 'Bike intervals', totalDuration: 2400 },
        }],
        strengthSessionAssignments: [],
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Anna Andersson',
        team: { name: 'A Team' },
        dailyCheckIns: [{ readinessScore: 48, readinessDecision: 'EASY', sleepHours: 5.5, fatigue: 8, soreness: 6, date: new Date('2026-06-24') }],
        dailyMetrics: [],
        trainingLoads: [],
        injuryAssessments: [{ bodyPart: 'ANKLE', side: 'RIGHT', painLevel: 4, status: 'ACTIVE' }],
        cardioSessionAssignments: [],
        strengthSessionAssignments: [],
      },
    ])
  })

  it('builds briefing follow-up context for selected athletes', async () => {
    const result = await buildCoachDailyBriefingPreview('coach-1', {
      date: '2026-06-24',
      focus: 'MORNING',
      limit: 6,
    }, 'skelleftea', 'en')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.preview.recipientCount).toBe(2)
    expect(result.preview.suggestedFollowUps?.join(' | ')).toContain('Draft a short check-in message')
    expect(result.preview.suggestedFollowUps?.join(' | ')).toContain("Change today's planned cardio")
    expect(result.preview.followUpContext?.selectedClientIds).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
    ])
    expect(result.preview.followUpContext?.hints?.join(' | ')).toContain('teamTarget SELECTED')
  })
})
