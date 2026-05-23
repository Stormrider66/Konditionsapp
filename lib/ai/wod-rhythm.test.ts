import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WODAthleteContext } from '@/types/wod'

const mockWorkoutLogFindMany = vi.hoisted(() => vi.fn())
const mockAdHocFindMany = vi.hoisted(() => vi.fn())
const mockWodFindMany = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workoutLog: {
      findMany: mockWorkoutLogFindMany,
    },
    adHocWorkout: {
      findMany: mockAdHocFindMany,
    },
    aIGeneratedWOD: {
      findMany: mockWodFindMany,
    },
  },
}))

import { inferWODRhythmIntent } from './wod-rhythm'

const baseContext: WODAthleteContext = {
  clientId: 'client-1',
  athleteName: 'Test Athlete',
  primarySport: 'RUNNING',
  experienceLevel: 'RECREATIONAL',
  readinessScore: 7,
  fatigueLevel: 3,
  sorenessLevel: 2,
  sleepQuality: 4,
  weeklyTSS: 300,
  acwrZone: 'OPTIMAL',
  activeInjuries: [],
  recentWorkouts: [],
  availableEquipment: ['none', 'rower', 'dumbbells'],
  preferredDuration: 45,
}

describe('WOD rhythm inference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkoutLogFindMany.mockResolvedValue([])
    mockAdHocFindMany.mockResolvedValue([])
    mockWodFindMany.mockResolvedValue([])
  })

  it('prefers the athlete same-weekday training rhythm', async () => {
    mockWodFindMany.mockResolvedValue([
      {
        completedAt: new Date('2026-05-18T08:00:00Z'),
        workoutType: 'cardio',
        requestedDuration: 35,
        equipment: ['rower'],
        intensityAdjusted: 'moderate',
      },
      {
        completedAt: new Date('2026-05-11T08:00:00Z'),
        workoutType: 'cardio',
        requestedDuration: 45,
        equipment: ['rower'],
        intensityAdjusted: 'moderate',
      },
      {
        completedAt: new Date('2026-05-14T08:00:00Z'),
        workoutType: 'strength',
        requestedDuration: 60,
        equipment: ['dumbbells'],
        intensityAdjusted: 'moderate',
      },
    ])

    const intent = await inferWODRhythmIntent(
      'client-1',
      baseContext,
      'en',
      new Date('2026-05-25T10:00:00Z')
    )

    expect(intent.source).toBe('rhythm')
    expect(intent.workoutType).toBe('cardio')
    expect(intent.duration).toBe(40)
    expect(intent.equipment).toEqual(['rower'])
    expect(intent.confidence).toBeGreaterThan(0.6)
    expect(intent.signals.some((signal) => signal.includes('weekday'))).toBe(true)
  })

  it('leans calmer when readiness and load are risky', async () => {
    const intent = await inferWODRhythmIntent(
      'client-1',
      {
        ...baseContext,
        readinessScore: 3,
        acwrZone: 'DANGER',
      },
      'en',
      new Date('2026-05-25T10:00:00Z')
    )

    expect(intent.mode).toBe('casual')
    expect(intent.focusArea).toBe('recovery')
    expect(intent.duration).toBeLessThanOrEqual(35)
  })
})
