import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  coachAlert: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import {
  createPostWorkoutPainCoachAlert,
  getPostWorkoutPainAlertSeverity,
} from './post-workout-pain-alert'

describe('post-workout pain coach alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.coachAlert.findFirst.mockResolvedValue(null)
    mockPrisma.coachAlert.create.mockResolvedValue({ id: 'alert-1' })
  })

  it('creates a deduped pain alert for the owning coach', async () => {
    const result = await createPostWorkoutPainCoachAlert({
      athleteUserId: 'athlete-user-1',
      client: {
        id: 'client-1',
        name: 'Alex Athlete',
        userId: 'coach-1',
      },
      notificationId: 'notification-1',
      notificationContextData: {
        workoutId: 'workout-1',
        workoutName: 'Threshold intervals',
        workoutType: 'RUNNING',
        completedAt: '2026-06-15T10:00:00.000Z',
      },
      feedback: {
        overallFeeling: 6,
        energyLevel: 5,
        difficulty: 7,
        painOrDiscomfort: 'Left calf felt tight',
        notes: 'Started near the last interval',
      },
      now: new Date('2026-06-16T10:00:00.000Z'),
    })

    expect(result).toEqual({
      created: true,
      alertId: 'alert-1',
      severity: 'MEDIUM',
    })
    expect(mockPrisma.coachAlert.findFirst).toHaveBeenCalledWith({
      where: {
        coachId: 'coach-1',
        clientId: 'client-1',
        alertType: 'PAIN_MENTION',
        sourceId: 'notification-1',
        status: { in: ['ACTIVE', 'ACTIONED'] },
      },
      select: { id: true, severity: true },
    })
    expect(mockPrisma.coachAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        coachId: 'coach-1',
        clientId: 'client-1',
        alertType: 'PAIN_MENTION',
        severity: 'MEDIUM',
        sourceId: 'notification-1',
        contextData: expect.objectContaining({
          source: 'POST_WORKOUT_FEEDBACK',
          notificationId: 'notification-1',
          workoutId: 'workout-1',
          workoutName: 'Threshold intervals',
        }),
      }),
      select: { id: true },
    })
  })

  it('does not create a duplicate alert for the same source notification', async () => {
    mockPrisma.coachAlert.findFirst.mockResolvedValue({ id: 'alert-existing', severity: 'HIGH' })

    const result = await createPostWorkoutPainCoachAlert({
      athleteUserId: 'athlete-user-1',
      client: {
        id: 'client-1',
        name: 'Alex Athlete',
        userId: 'coach-1',
      },
      notificationId: 'notification-1',
      notificationContextData: null,
      feedback: {
        overallFeeling: 2,
        energyLevel: 2,
        difficulty: 9,
        painOrDiscomfort: 'Sharp knee pain',
      },
    })

    expect(result).toEqual({
      created: false,
      alertId: 'alert-existing',
      skippedReason: 'DUPLICATE',
      severity: 'HIGH',
    })
    expect(mockPrisma.coachAlert.create).not.toHaveBeenCalled()
  })

  it('skips self-coached athletes', async () => {
    const result = await createPostWorkoutPainCoachAlert({
      athleteUserId: 'user-1',
      client: {
        id: 'client-1',
        name: 'Self Coach',
        userId: 'user-1',
      },
      notificationId: 'notification-1',
      notificationContextData: null,
      feedback: {
        overallFeeling: 5,
        energyLevel: 5,
        difficulty: 5,
        painOrDiscomfort: 'Some soreness',
      },
    })

    expect(result).toEqual({ created: false, skippedReason: 'SELF_COACHED' })
    expect(mockPrisma.coachAlert.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.coachAlert.create).not.toHaveBeenCalled()
  })

  it('raises severity for poor ratings or high-risk pain language', () => {
    expect(getPostWorkoutPainAlertSeverity({
      overallFeeling: 6,
      energyLevel: 6,
      difficulty: 8,
      painOrDiscomfort: 'Tight hamstring',
    })).toBe('HIGH')

    expect(getPostWorkoutPainAlertSeverity({
      overallFeeling: 6,
      energyLevel: 6,
      difficulty: 5,
      painOrDiscomfort: 'Sharp pain in the foot',
    })).toBe('HIGH')
  })
})
