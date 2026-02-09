import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    hybridWorkoutAssignment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    hybridWorkout: {
      findFirst: vi.fn(),
    },
    hybridWorkoutResult: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn(),
  resolveAthleteClientId: vi.fn(),
  requireCoach: vi.fn(),
}))

vi.mock('@/lib/auth/athlete-access', () => ({
  canAccessAthlete: vi.fn(),
}))

vi.mock('@/lib/logger-console', () => ({
  logError: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { getCurrentUser, requireCoach, resolveAthleteClientId } from '@/lib/auth-utils'
import { GET as getAssignments, POST as postAssignments } from '@/app/api/hybrid-assignments/route'
import { DELETE as deleteAssignment } from '@/app/api/hybrid-assignments/[id]/route'
import { GET as getHybridAnalytics } from '@/app/api/hybrid-analytics/route'

describe('Hybrid API security regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks cross-coach access on GET /api/hybrid-assignments?athleteId=', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(resolveAthleteClientId).mockResolvedValue(null)
    vi.mocked(canAccessAthlete).mockResolvedValue({ allowed: false, reason: 'No relationship' })

    const request = new Request('http://localhost/api/hybrid-assignments?athleteId=athlete-b')
    const response = await getAssignments(request as any)

    expect(response.status).toBe(403)
    expect(prisma.hybridWorkoutAssignment.findMany).not.toHaveBeenCalled()
  })

  it('scopes coach list queries when athleteId is omitted', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(resolveAthleteClientId).mockResolvedValue(null)
    vi.mocked(prisma.hybridWorkoutAssignment.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/hybrid-assignments')
    const response = await getAssignments(request as any)

    expect(response.status).toBe(200)
    expect(prisma.hybridWorkoutAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          athlete: { userId: 'coach-a' },
        }),
      })
    )
  })

  it('blocks cross-coach deletion on DELETE /api/hybrid-assignments/[id]', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.hybridWorkoutAssignment.findUnique).mockResolvedValue({
      id: 'assignment-1',
      athleteId: 'athlete-b',
    } as any)
    vi.mocked(canAccessAthlete).mockResolvedValue({ allowed: false, reason: 'No relationship' })

    const request = new Request('http://localhost/api/hybrid-assignments/assignment-1', {
      method: 'DELETE',
    })
    const response = await deleteAssignment(request as any, {
      params: Promise.resolve({ id: 'assignment-1' }),
    })

    expect(response.status).toBe(403)
    expect(prisma.hybridWorkoutAssignment.delete).not.toHaveBeenCalled()
  })

  it('blocks cross-coach access on GET /api/hybrid-analytics?athleteId=', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(canAccessAthlete).mockResolvedValue({ allowed: false, reason: 'No relationship' })

    const request = new Request('http://localhost/api/hybrid-analytics?athleteId=athlete-b')
    const response = await getHybridAnalytics(request as any)

    expect(response.status).toBe(403)
    expect(prisma.hybridWorkoutResult.findMany).not.toHaveBeenCalled()
  })

  it('blocks assignment creation when coach cannot access one athlete', async () => {
    vi.mocked(requireCoach).mockResolvedValue({ id: 'coach-a', role: 'COACH' } as any)
    vi.mocked(prisma.hybridWorkout.findFirst).mockResolvedValue({
      id: 'workout-1',
      coachId: 'coach-a',
    } as any)
    vi.mocked(canAccessAthlete).mockResolvedValue({ allowed: false, reason: 'No relationship' })

    const request = new Request('http://localhost/api/hybrid-assignments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workoutId: 'workout-1',
        athleteIds: ['athlete-b'],
        assignedDate: '2026-02-09',
      }),
    })

    const response = await postAssignments(request as any)

    expect(response.status).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
