import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockCreatePostWorkoutPainCoachAlert = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  aINotification: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/coach/post-workout-pain-alert', () => ({
  createPostWorkoutPainCoachAlert: mockCreatePostWorkoutPainCoachAlert,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { POST } from './route'

describe('athlete workout feedback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      isCoachInAthleteMode: false,
      user: { id: 'athlete-user-1', language: 'en' },
    })
    mockPrisma.aINotification.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      contextData: {
        workoutId: 'workout-1',
        workoutName: 'Threshold intervals',
      },
      client: {
        id: 'client-1',
        name: 'Alex Athlete',
        userId: 'coach-1',
      },
    })
    mockPrisma.aINotification.update.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
    })
    mockCreatePostWorkoutPainCoachAlert.mockResolvedValue({
      created: true,
      alertId: 'alert-1',
      severity: 'MEDIUM',
    })
  })

  it('stores feedback and creates a coach alert when pain is reported', async () => {
    const request = new Request('http://localhost/api/athlete/workout-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: '11111111-1111-4111-8111-111111111111',
        overallFeeling: 5,
        energyLevel: 6,
        difficulty: 7,
        painOrDiscomfort: 'Left calf felt tight',
        notes: 'Started near the last interval',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      notificationId: '11111111-1111-4111-8111-111111111111',
    })
    expect(mockPrisma.aINotification.update).toHaveBeenCalledWith({
      where: { id: '11111111-1111-4111-8111-111111111111' },
      data: {
        actionTakenAt: expect.any(Date),
        contextData: expect.objectContaining({
          workoutId: 'workout-1',
          workoutName: 'Threshold intervals',
          feedback: expect.objectContaining({
            overallFeeling: 5,
            energyLevel: 6,
            difficulty: 7,
            painOrDiscomfort: 'Left calf felt tight',
            notes: 'Started near the last interval',
          }),
        }),
      },
    })
    expect(mockCreatePostWorkoutPainCoachAlert).toHaveBeenCalledWith({
      athleteUserId: 'athlete-user-1',
      client: {
        id: 'client-1',
        name: 'Alex Athlete',
        userId: 'coach-1',
      },
      notificationId: '11111111-1111-4111-8111-111111111111',
      notificationContextData: {
        workoutId: 'workout-1',
        workoutName: 'Threshold intervals',
      },
      feedback: {
        notificationId: '11111111-1111-4111-8111-111111111111',
        overallFeeling: 5,
        energyLevel: 6,
        difficulty: 7,
        painOrDiscomfort: 'Left calf felt tight',
        notes: 'Started near the last interval',
      },
    })
  })

  it('does not create a pain alert when pain is blank', async () => {
    const request = new Request('http://localhost/api/athlete/workout-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: '11111111-1111-4111-8111-111111111111',
        overallFeeling: 8,
        energyLevel: 8,
        difficulty: 4,
        painOrDiscomfort: '   ',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockCreatePostWorkoutPainCoachAlert).not.toHaveBeenCalled()
  })
})
