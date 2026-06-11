import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  trainingProgramFindMany: vi.fn(),
  dailyMetricsFindFirst: vi.fn(),
  workoutLogFindMany: vi.fn(),
  injuryFindMany: vi.fn(),
  wodFindMany: vi.fn(),
  adHocFindMany: vi.fn(),
  workoutFindMany: vi.fn(),
  strengthFindMany: vi.fn(),
  cardioFindMany: vi.fn(),
  hybridFindMany: vi.fn(),
  agilityFindMany: vi.fn(),
  getDashboardWeeklyLoad: vi.fn(),
  getDashboardRecentActivitySummary: vi.fn(),
  getWODUsageStats: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    trainingProgram: { findMany: mocks.trainingProgramFindMany },
    dailyMetrics: { findFirst: mocks.dailyMetricsFindFirst },
    workoutLog: { findMany: mocks.workoutLogFindMany },
    injuryAssessment: { findMany: mocks.injuryFindMany },
    aIGeneratedWOD: { findMany: mocks.wodFindMany },
    adHocWorkout: { findMany: mocks.adHocFindMany },
    workout: { findMany: mocks.workoutFindMany },
    strengthSessionAssignment: { findMany: mocks.strengthFindMany },
    cardioSessionAssignment: { findMany: mocks.cardioFindMany },
    hybridWorkoutAssignment: { findMany: mocks.hybridFindMany },
    agilityWorkoutAssignment: { findMany: mocks.agilityFindMany },
  },
}))

vi.mock('@/lib/dashboard/activity-insights', () => ({
  getDashboardWeeklyLoad: mocks.getDashboardWeeklyLoad,
  getDashboardRecentActivitySummary: mocks.getDashboardRecentActivitySummary,
}))

vi.mock('@/lib/ai/wod-context-builder', () => ({
  getWODUsageStats: mocks.getWODUsageStats,
}))

import { getAthleteDashboardData } from '../dashboard-data'

const NOW = new Date('2026-06-11T12:00:00.000Z')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.trainingProgramFindMany.mockResolvedValue([])
  mocks.dailyMetricsFindFirst.mockResolvedValue(null)
  mocks.workoutLogFindMany.mockResolvedValue([])
  mocks.injuryFindMany.mockResolvedValue([])
  mocks.wodFindMany.mockResolvedValue([])
  mocks.adHocFindMany.mockResolvedValue([])
  mocks.workoutFindMany.mockResolvedValue([])
  mocks.strengthFindMany.mockResolvedValue([])
  mocks.cardioFindMany.mockResolvedValue([])
  mocks.hybridFindMany.mockResolvedValue([])
  mocks.agilityFindMany.mockResolvedValue([])
  mocks.getDashboardWeeklyLoad.mockResolvedValue({ weeklyTSS: 120, weeklyTSSTarget: 300 })
  mocks.getDashboardRecentActivitySummary.mockResolvedValue(null)
  mocks.getWODUsageStats.mockResolvedValue({ remaining: 3, isUnlimited: false })
})

function baseParams() {
  return {
    userId: 'user-1',
    clientId: 'client-1',
    subscriptionTier: 'FREE',
    locale: 'en' as const,
    now: NOW,
  }
}

describe('getAthleteDashboardData', () => {
  it('queries WorkoutLog by User.id and everything else by Client.id', async () => {
    await getAthleteDashboardData(baseParams())

    expect(mocks.workoutLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ athleteId: 'user-1' }) })
    )
    for (const fn of [
      mocks.strengthFindMany,
      mocks.cardioFindMany,
      mocks.hybridFindMany,
      mocks.agilityFindMany,
      mocks.adHocFindMany,
    ]) {
      expect(fn).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ athleteId: 'client-1' }) })
      )
    }
    expect(mocks.trainingProgramFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: 'client-1' }) })
    )
  })

  it('puts incomplete items first, ordered program > assignment > wod', async () => {
    // Today's WOD (second findMany call on aIGeneratedWOD) — incomplete.
    mocks.wodFindMany
      .mockResolvedValueOnce([]) // history
      .mockResolvedValueOnce([
        {
          id: 'wod-1',
          title: 'AI Blast',
          subtitle: null,
          description: null,
          mode: 'GUIDED',
          workoutType: null,
          requestedDuration: 30,
          actualDuration: null,
          status: 'GENERATED',
          createdAt: NOW,
          completedAt: null,
          intensityAdjusted: null,
          sessionRPE: null,
          primarySport: 'RUNNING',
        },
      ])
    // Strength assignment today — completed.
    mocks.strengthFindMany.mockResolvedValue([
      {
        id: 'st-1',
        assignedDate: NOW,
        status: 'COMPLETED',
        completedAt: NOW,
        session: { id: 's-1', name: 'Heavy day', description: null, phase: null, estimatedDuration: 45 },
        location: null,
      },
    ])

    const data = await getAthleteDashboardData(baseParams())

    expect(data.sortedTodayItems.map((i) => i.kind)).toEqual(['wod', 'assignment'])
    // First actionable skips completed items.
    expect(data.firstActionableItem?.kind).toBe('wod')
  })

  it('computes wod stats from completed history and readiness from latest metrics', async () => {
    mocks.wodFindMany
      .mockResolvedValueOnce([
        {
          id: 'w1',
          title: 'A',
          status: 'COMPLETED',
          requestedDuration: 30,
          actualDuration: 25,
          createdAt: NOW,
          completedAt: NOW, // this week (Thursday; week starts Monday)
        },
        {
          id: 'w2',
          title: 'B',
          status: 'COMPLETED',
          requestedDuration: 20,
          actualDuration: null,
          createdAt: NOW,
          completedAt: new Date('2026-05-01T10:00:00Z'), // older
        },
        { id: 'w3', title: 'C', status: 'ABANDONED', requestedDuration: 30, actualDuration: null, createdAt: NOW, completedAt: null },
      ])
      .mockResolvedValueOnce([])
    mocks.dailyMetricsFindFirst.mockResolvedValue({
      readinessScore: 82,
      date: new Date('2026-06-11T05:00:00Z'),
    })

    const data = await getAthleteDashboardData(baseParams())

    expect(data.wodStats).toEqual({ thisWeek: 1, totalCompleted: 2, totalMinutes: 45 })
    expect(data.readinessScore).toBe(82)
    expect(data.hasCheckedInToday).toBe(true)
    expect(data.weeklyTSS).toBe(120)
    expect(data.weeklyTSSTarget).toBe(300)
  })
})
