import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { handleInjuryDetection } from '@/lib/training-engine/injury-management/injury-handler'

class MockPrisma {
  workouts: any[] = []
  crossTrainingSessions: any[] = []

  workout = {
    create: async ({ data }: { data: any }) => {
      const workout = { id: `workout-${this.workouts.length + 1}`, ...data }
      this.workouts.push(workout)
      return workout
    },
    findFirst: async ({ where }: { where: any }) => {
      return this.workouts.find(workout =>
        workout.clientId === where.clientId &&
        isSameDay(workout.scheduledDate, where.scheduledDate)
      ) || null
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const workout = this.workouts.find(w => w.id === where.id)
      if (workout) {
        Object.assign(workout, data)
      }
      return workout
    }
  }

  crossTrainingSession = {
    create: async ({ data }: { data: any }) => {
      const session = { id: `cts-${this.crossTrainingSessions.length + 1}`, ...data }
      this.crossTrainingSessions.push(session)
      return session
    },
    findFirst: async ({ where }: { where: any }) => {
      return this.crossTrainingSessions.find(
        session =>
          session.clientId === where.clientId &&
          session.injuryType === (where.injuryType ?? session.injuryType)
      ) || null
    }
  }
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

describe('Injury Management Cascade', () => {
  const today = new Date('2025-01-15T08:00:00Z')

  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(today)
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it('cancels workouts and pauses program for gait-affecting injury', async () => {
    const prisma = new MockPrisma()
    await prisma.workout.create({
      data: {
        clientId: 'test-athlete',
        scheduledDate: new Date(),
        status: 'PLANNED',
        type: 'THRESHOLD_INTERVALS'
      }
    })

    const injury = {
      clientId: 'test-athlete',
      painLevel: 6,
      painLocation: 'ACHILLES' as const,
      gaitAffected: true,
      assessment: 'REST_2_3_DAYS' as const
    }

    const result = await handleInjuryDetection(injury, prisma)

    expect(result.workoutModified).toBe(true)
    expect(result.programPaused).toBe(true)
    expect(result.immediateAction).toBe('REST_2_3_DAYS')

    const workout = await prisma.workout.findFirst({
      where: { clientId: 'test-athlete', scheduledDate: new Date() }
    })
    expect(workout?.status).toBe('CANCELLED')
  })

  it('creates cross-training session for MODIFY assessment', async () => {
    const prisma = new MockPrisma()

    const injury = {
      clientId: 'test-athlete',
      painLevel: 4,
      painLocation: 'PLANTAR_FASCIA' as const,
      gaitAffected: false,
      assessment: 'MODIFY' as const
    }

    const result = await handleInjuryDetection(injury, prisma)

    expect(result.workoutModified).toBe(true)
    expect(result.programPaused).toBe(false)
    expect(result.crossTrainingModality).toBe('DEEP_WATER_RUNNING')

    const session = await prisma.crossTrainingSession.findFirst({
      where: { clientId: 'test-athlete', injuryType: 'PLANTAR_FASCIA' }
    })
    expect(session).toBeDefined()
    expect(session?.modality).toBe('DEEP_WATER_RUNNING')
  })

  it('selects proper modality for various injury types', async () => {
    const prisma = new MockPrisma()
    const scenarios = [
      { location: 'PLANTAR_FASCIA', expected: 'DEEP_WATER_RUNNING' },
      { location: 'ACHILLES', expected: 'DEEP_WATER_RUNNING' },
      { location: 'IT_BAND', expected: 'CYCLING' },
      { location: 'PATELLA', expected: 'CYCLING' },
      { location: 'SHIN', expected: 'ELLIPTICAL' }
    ] as const

    for (const scenario of scenarios) {
      await handleInjuryDetection(
        {
          clientId: 'test-athlete',
          painLevel: 4,
          painLocation: scenario.location,
          gaitAffected: false,
          assessment: 'MODIFY'
        },
        prisma
      )

      const session = await prisma.crossTrainingSession.findFirst({
        where: { clientId: 'test-athlete', injuryType: scenario.location }
      })

      expect(session?.modality).toBe(scenario.expected)
    }
  })
})

