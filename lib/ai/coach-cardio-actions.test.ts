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

import {
  buildCreateAndAssignCardioWorkoutPreview,
  createAndAssignCardioWorkoutInputSchema,
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
})
