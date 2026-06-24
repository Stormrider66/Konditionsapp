import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCanAccessAthlete = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  client: { findMany: vi.fn() },
  cardioSessionAssignment: { findMany: vi.fn() },
}))

vi.mock('@/lib/auth/athlete-access', () => ({
  canAccessAthlete: mockCanAccessAthlete,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import {
  buildCreateAndAssignCardioWorkoutPreview,
  buildRepeatPreviousCardioWorkoutPreview,
  createAndAssignCardioWorkoutInputSchema,
  repeatPreviousCardioWorkoutInputSchema,
} from './coach-cardio-actions'

describe('coach cardio AI actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanAccessAthlete.mockResolvedValue({ allowed: true })
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Henrik Lundholm',
        email: 'henrik@example.com',
        team: { id: 'team-1', name: 'A Team' },
        athleteAccount: { userId: 'athlete-user-1' },
      },
    ])
    mockPrisma.cardioSessionAssignment.findMany.mockResolvedValue([])
  })

  it('validates a 10 x 3 minute Wattbike interval workout', () => {
    const parsed = createAndAssignCardioWorkoutInputSchema.safeParse({
      targetType: 'ATHLETE',
      teamTarget: 'ALL',
      athleteName: 'Henrik',
      date: '2026-06-24',
      name: '10 x 3 min Wattbike',
      workoutType: 'INTERVAL',
      sport: 'CYCLING',
      equipment: 'WATTBIKE',
      rounds: 10,
      workDurationSeconds: 180,
      restDurationSeconds: 60,
      intensity: 'RPE 8 / threshold',
      warmupSeconds: 600,
      cooldownSeconds: 300,
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects interval workouts when rest is missing', () => {
    const parsed = createAndAssignCardioWorkoutInputSchema.safeParse({
      targetType: 'ATHLETE',
      athleteName: 'Henrik',
      date: '2026-06-24',
      name: '10 x 3 min Wattbike',
      workoutType: 'INTERVAL',
      sport: 'CYCLING',
      equipment: 'WATTBIKE',
      rounds: 10,
      workDurationSeconds: 180,
      intensity: 'RPE 8',
    })

    expect(parsed.success).toBe(false)
  })

  it('builds a preview with date, equipment, work/rest, intensity, and total time', async () => {
    const result = await buildCreateAndAssignCardioWorkoutPreview('coach-1', {
      targetType: 'ATHLETE',
      teamTarget: 'ALL',
      athleteName: 'Henrik',
      date: '2026-06-24',
      name: '10 x 3 min Wattbike',
      workoutType: 'INTERVAL',
      sport: 'CYCLING',
      equipment: 'WATTBIKE',
      rounds: 10,
      workDurationSeconds: 180,
      restDurationSeconds: 60,
      intensity: 'RPE 8 / threshold',
      warmupSeconds: 600,
      cooldownSeconds: 300,
    }, 'skelleftea', 'en')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.preview.recipientCount).toBe(1)
    expect(result.preview.targetLabel).toBe('Henrik Lundholm')
    expect(result.preview.details.join(' | ')).toContain('2026-06-24')
    expect(result.preview.details.join(' | ')).toContain('WATTBIKE')
    expect(result.preview.details.join(' | ')).toContain('10 x 3 min / 1 min rest')
    expect(result.preview.details.join(' | ')).toContain('RPE 8 / threshold')
    expect(result.preview.details.join(' | ')).toContain('55 min')
  })

  it('adds load and calendar warnings to the assignment preview', async () => {
    mockPrisma.client.findMany
      .mockResolvedValueOnce([
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Henrik Lundholm',
          email: 'henrik@example.com',
          team: { id: 'team-1', name: 'A Team' },
          athleteAccount: { userId: 'athlete-user-1' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Henrik Lundholm',
          dailyCheckIns: [{ readinessScore: 42, readinessDecision: 'REDUCE', date: new Date('2026-06-24') }],
          dailyMetrics: [],
          trainingLoads: [{ acwr: 1.6, acwrZone: 'DANGER', injuryRisk: 'HIGH', date: new Date('2026-06-24') }],
          injuryAssessments: [{ bodyPart: 'KNEE', side: 'LEFT', painLevel: 5, status: 'ACTIVE' }],
          cardioSessionAssignments: [{
            assignedDate: new Date('2026-06-24'),
            status: 'PENDING',
            session: { name: 'Morning ride', totalDuration: 1800 },
          }],
          strengthSessionAssignments: [],
        },
      ])

    const result = await buildCreateAndAssignCardioWorkoutPreview('coach-1', {
      targetType: 'ATHLETE',
      teamTarget: 'ALL',
      athleteName: 'Henrik',
      date: '2026-06-24',
      name: '10 x 3 min Wattbike',
      workoutType: 'INTERVAL',
      sport: 'CYCLING',
      equipment: 'WATTBIKE',
      rounds: 10,
      workDurationSeconds: 180,
      restDurationSeconds: 60,
      intensity: 'RPE 8 / threshold',
    }, 'skelleftea', 'en')

    expect(result.success).toBe(true)
    if (!result.success) return
    const details = result.preview.details.join(' | ')
    expect(details).toContain('readiness is 42/100')
    expect(details).toContain('Calendar conflict')
    expect(details).toContain('ACWR flag')
    expect(details).toContain('Injury flag')
  })

  it('validates and previews repeating a previous workout', async () => {
    const parsed = repeatPreviousCardioWorkoutInputSchema.safeParse({
      targetType: 'ATHLETE',
      athleteName: 'Henrik',
      date: '2026-06-25',
      adjustment: 'EASIER',
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    mockPrisma.cardioSessionAssignment.findMany.mockResolvedValue([
      {
        id: 'assignment-source-1',
        assignedDate: new Date('2026-06-18'),
        notes: null,
        status: 'COMPLETED',
        calendarEventId: null,
        athlete: { id: '11111111-1111-4111-8111-111111111111', name: 'Henrik Lundholm', team: { id: 'team-1', name: 'A Team' } },
        session: {
          id: 'session-source-1',
          name: 'Threshold Wattbike',
          description: null,
          sport: 'CYCLING',
          segments: [{ type: 'STEADY', duration: 1800, zone: 4 }],
          totalDuration: 1800,
          totalDistance: null,
          avgZone: 4,
          teamId: null,
          tags: [],
        },
      },
    ])

    const result = await buildRepeatPreviousCardioWorkoutPreview('coach-1', parsed.data, 'skelleftea', 'en')

    expect(result.success).toBe(true)
    if (!result.success) return
    const details = result.preview.details.join(' | ')
    expect(details).toContain('Source workout: Threshold Wattbike')
    expect(details).toContain('Adjustment: Easier than source')
    expect(details).toContain('Estimated total: 30 min')
  })
})
