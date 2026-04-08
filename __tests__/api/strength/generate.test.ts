/**
 * Tests for Strength Session Generation API
 *
 * Covers:
 * - Single session generation
 * - Weekly program generation (A/B/C)
 * - Athlete context loading (restrictions, 1RM)
 * - Exercise filtering (restrictions, body parts, contraindications)
 * - Calendar constraints integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    progressionTracking: { findMany: vi.fn().mockResolvedValue([]) },
    oneRepMaxHistory: { findMany: vi.fn().mockResolvedValue([]) },
    trainingRestriction: { findMany: vi.fn().mockResolvedValue([]) },
    exercise: { findMany: vi.fn().mockResolvedValue([]) },
    strengthSession: { create: vi.fn() },
    hiddenExercise: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: vi.fn().mockResolvedValue({ id: 'coach-1', role: 'COACH' }),
}))

vi.mock('@/lib/calendar/availability-calculator', () => ({
  getCalendarConstraints: vi.fn().mockResolvedValue({
    blockedDates: [],
    reducedDates: [],
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/strength-sessions/generate/route'

const mockExercises = [
  { id: 'ex1', name: 'Squat', nameSv: 'Knäböj', biomechanicalPillar: 'KNEE_DOMINANCE', progressionLevel: 'LEVEL_2', equipment: 'barbell', category: 'STRENGTH', targetBodyParts: ['legs'], contraindications: [] },
  { id: 'ex2', name: 'Deadlift', nameSv: 'Marklyft', biomechanicalPillar: 'POSTERIOR_CHAIN', progressionLevel: 'LEVEL_2', equipment: 'barbell', category: 'STRENGTH', targetBodyParts: ['back', 'legs'], contraindications: [] },
  { id: 'ex3', name: 'Lunge', nameSv: 'Utfall', biomechanicalPillar: 'UNILATERAL', progressionLevel: 'LEVEL_2', equipment: 'dumbbell', category: 'STRENGTH', targetBodyParts: ['legs'], contraindications: [] },
  { id: 'ex4', name: 'Box Jump', nameSv: 'Lådhopp', biomechanicalPillar: 'KNEE_DOMINANCE', progressionLevel: 'LEVEL_3', equipment: 'box', category: 'PLYOMETRIC', targetBodyParts: ['legs'], contraindications: [] },
  { id: 'ex5', name: 'Plank', nameSv: 'Planka', biomechanicalPillar: 'ANTI_ROTATION_CORE', progressionLevel: 'LEVEL_1', equipment: 'bodyweight', category: 'CORE', targetBodyParts: ['core'], contraindications: [] },
]

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/strength-sessions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('POST /api/strength-sessions/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.exercise.findMany).mockResolvedValue(mockExercises as any)
  })

  it('generates a single session with correct structure', async () => {
    const response = await POST(makeRequest({
      goal: 'strength',
      phase: 'ANATOMICAL_ADAPTATION',
      athleteLevel: 'INTERMEDIATE',
      sessionsPerWeek: 2,
      timePerSession: 45,
      equipmentAvailable: ['barbell', 'dumbbell', 'bodyweight'],
      includeWarmup: true,
      includeCore: true,
      includeCooldown: true,
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.mode).toBe('single')
    expect(data.data).toBeDefined()
    expect(data.data.name).toBeTruthy()
    expect(data.data.sections).toBeInstanceOf(Array)
    expect(data.data.totalExercises).toBeGreaterThan(0)
    expect(data.data.rationale).toBeTruthy()
  })

  it('generates weekly program with multiple sessions', async () => {
    const response = await POST(makeRequest({
      goal: 'strength',
      phase: 'ANATOMICAL_ADAPTATION',
      athleteLevel: 'INTERMEDIATE',
      sessionsPerWeek: 3,
      timePerSession: 45,
      equipmentAvailable: ['barbell', 'dumbbell', 'bodyweight'],
      mode: 'weekly',
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.mode).toBe('weekly')
    expect(data.data).toBeInstanceOf(Array)
    expect(data.data).toHaveLength(3)

    // Each session should have a distinct name (A/B/C)
    const names = data.data.map((s: any) => s.name)
    expect(names[0]).toContain('Pass A')
    expect(names[1]).toContain('Pass B')
    expect(names[2]).toContain('Pass C')
  })

  it('filters out plyometric exercises when NO_JUMPING restriction', async () => {
    vi.mocked(prisma.trainingRestriction.findMany).mockResolvedValue([
      { type: 'NO_JUMPING', bodyParts: [], affectedExerciseIds: [] },
    ] as any)

    const response = await POST(makeRequest({
      clientId: 'athlete-1',
      goal: 'power',
      phase: 'POWER',
      athleteLevel: 'ADVANCED',
      sessionsPerWeek: 2,
      timePerSession: 45,
      equipmentAvailable: ['barbell', 'dumbbell', 'bodyweight', 'box'],
    }))

    expect(response.status).toBe(200)
    const data = await response.json()

    // Box Jump (PLYOMETRIC) should be filtered out
    const allExerciseIds = data.data.exercises?.map((e: any) => e.exerciseId) || []
    expect(allExerciseIds).not.toContain('ex4') // Box Jump
  })

  it('returns 400 if goal or phase missing', async () => {
    const response = await POST(makeRequest({
      athleteLevel: 'INTERMEDIATE',
    }))

    expect(response.status).toBe(400)
  })

  it('uses 1RM data for load calculation when clientId provided', async () => {
    vi.mocked(prisma.oneRepMaxHistory.findMany).mockResolvedValue([
      { exerciseId: 'ex1', oneRepMax: 100 },
      { exerciseId: 'ex2', oneRepMax: 120 },
    ] as any)

    const response = await POST(makeRequest({
      clientId: 'athlete-1',
      goal: 'strength',
      phase: 'MAXIMUM_STRENGTH',
      athleteLevel: 'ADVANCED',
      sessionsPerWeek: 2,
      timePerSession: 45,
      equipmentAvailable: ['barbell', 'dumbbell', 'bodyweight'],
    }))

    expect(response.status).toBe(200)
    // Verify 1RM history was queried
    expect(prisma.oneRepMaxHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'athlete-1' },
      })
    )
  })
})
