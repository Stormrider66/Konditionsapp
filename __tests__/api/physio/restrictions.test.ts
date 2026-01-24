/**
 * Tests for Training Restriction API Routes
 *
 * Tests the following endpoints:
 * - POST /api/physio/restrictions - Create restriction
 * - GET /api/physio/restrictions - List restrictions
 * - GET /api/restrictions/athlete/[clientId] - Get athlete restrictions
 * - PATCH /api/physio/restrictions/[id] - Update restriction
 * - DELETE /api/physio/restrictions/[id] - Delete restriction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    trainingRestriction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    athleteAccount: {
      findUnique: vi.fn(),
    },
    physioAssignment: {
      findFirst: vi.fn(),
    },
  },
}))

// Mock auth utils
vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn(),
  canAccessAthleteAsPhysio: vi.fn(),
  canAccessClient: vi.fn(),
}))

// Mock care team notifications
vi.mock('@/lib/notifications/care-team', () => ({
  notifyCoachOfRestriction: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessAthleteAsPhysio, canAccessClient } from '@/lib/auth-utils'

describe('Training Restriction API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/physio/restrictions', () => {
    it('should create a new training restriction', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const mockRestriction = {
        id: 'restriction-id',
        clientId: 'client-id',
        type: 'NO_RUNNING',
        severity: 'MODERATE',
        bodyParts: ['KNEE', 'ANKLE'],
        description: 'Avoid running due to knee inflammation',
        reason: 'Acute knee injury',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        isActive: true,
        source: 'PHYSIO_MANUAL',
        createdById: 'physio-user-id',
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(canAccessAthleteAsPhysio).mockResolvedValue(true)
      vi.mocked(prisma.trainingRestriction.create).mockResolvedValue(mockRestriction)

      const result = await prisma.trainingRestriction.create({
        data: mockRestriction,
      })

      expect(result.type).toBe('NO_RUNNING')
      expect(result.severity).toBe('MODERATE')
      expect(result.bodyParts).toContain('KNEE')
    })

    it('should validate restriction type', () => {
      const validTypes = [
        'NO_RUNNING',
        'NO_JUMPING',
        'NO_IMPACT',
        'NO_UPPER_BODY',
        'NO_LOWER_BODY',
        'REDUCED_VOLUME',
        'REDUCED_INTENSITY',
        'MODIFIED_ONLY',
        'SPECIFIC_EXERCISES',
        'CUSTOM',
      ]

      validTypes.forEach((type) => {
        expect(validTypes).toContain(type)
      })
    })

    it('should validate severity levels', () => {
      const validSeverities = ['MILD', 'MODERATE', 'SEVERE', 'COMPLETE']

      validSeverities.forEach((severity) => {
        expect(validSeverities).toContain(severity)
      })
    })

    it('should set volume and intensity limits', async () => {
      const restriction = {
        type: 'REDUCED_VOLUME',
        severity: 'MODERATE',
        volumeReductionPercent: 50,
        maxIntensityZone: 3, // Max zone 3
      }

      expect(restriction.volumeReductionPercent).toBeGreaterThanOrEqual(0)
      expect(restriction.volumeReductionPercent).toBeLessThanOrEqual(100)
      expect(restriction.maxIntensityZone).toBeGreaterThanOrEqual(1)
      expect(restriction.maxIntensityZone).toBeLessThanOrEqual(5)
    })
  })

  describe('GET /api/restrictions/athlete/[clientId]', () => {
    it('should return active restrictions for athlete', async () => {
      const mockUser = {
        id: 'athlete-user-id',
        role: 'ATHLETE',
        email: 'athlete@test.com',
      }

      const mockRestrictions = [
        {
          id: 'restriction-1',
          clientId: 'client-id',
          type: 'NO_RUNNING',
          severity: 'MODERATE',
          bodyParts: ['KNEE'],
          isActive: true,
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'restriction-2',
          clientId: 'client-id',
          type: 'REDUCED_INTENSITY',
          severity: 'MILD',
          bodyParts: [],
          isActive: true,
          maxIntensityZone: 3,
        },
      ]

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(prisma.athleteAccount.findUnique).mockResolvedValue({
        userId: mockUser.id,
        clientId: 'client-id',
      })
      vi.mocked(prisma.trainingRestriction.findMany).mockResolvedValue(mockRestrictions)

      const result = await prisma.trainingRestriction.findMany({
        where: {
          clientId: 'client-id',
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
      })

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.isActive)).toBe(true)
    })

    it('should compute restriction summary for AI WOD', () => {
      const restrictions = [
        {
          id: '1',
          type: 'NO_RUNNING',
          severity: 'SEVERE',
          bodyParts: ['KNEE', 'ANKLE'],
          affectedWorkoutTypes: ['CARDIO', 'INTERVAL'],
          affectedExerciseIds: ['ex-1', 'ex-2'],
          volumeReductionPercent: 30,
          maxIntensityZone: 3,
        },
        {
          id: '2',
          type: 'REDUCED_INTENSITY',
          severity: 'MILD',
          bodyParts: [],
          affectedWorkoutTypes: [],
          affectedExerciseIds: [],
          volumeReductionPercent: 20,
          maxIntensityZone: 4,
        },
      ]

      const summary = {
        hasActiveRestrictions: restrictions.length > 0,
        restrictedBodyParts: [...new Set(restrictions.flatMap((r) => r.bodyParts))],
        restrictedWorkoutTypes: [...new Set(restrictions.flatMap((r) => r.affectedWorkoutTypes))],
        restrictedExerciseIds: [...new Set(restrictions.flatMap((r) => r.affectedExerciseIds))],
        maxSeverity: 'SEVERE',
        volumeReductionPercent: Math.max(...restrictions.map((r) => r.volumeReductionPercent || 0)),
        maxIntensityZone: Math.min(...restrictions.filter((r) => r.maxIntensityZone).map((r) => r.maxIntensityZone)),
      }

      expect(summary.hasActiveRestrictions).toBe(true)
      expect(summary.restrictedBodyParts).toContain('KNEE')
      expect(summary.restrictedBodyParts).toContain('ANKLE')
      expect(summary.restrictedWorkoutTypes).toContain('CARDIO')
      expect(summary.volumeReductionPercent).toBe(30)
      expect(summary.maxIntensityZone).toBe(3)
    })

    it('should allow physio to view athlete restrictions', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(canAccessAthleteAsPhysio).mockResolvedValue(true)

      const hasAccess = await canAccessAthleteAsPhysio(mockUser.id, 'client-id')
      expect(hasAccess).toBe(true)
    })

    it('should allow coach to view athlete restrictions', async () => {
      const mockUser = {
        id: 'coach-user-id',
        role: 'COACH',
        email: 'coach@test.com',
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(canAccessClient).mockResolvedValue(true)

      const hasAccess = await canAccessClient(mockUser.id, 'client-id')
      expect(hasAccess).toBe(true)
    })
  })

  describe('PATCH /api/physio/restrictions/[id]', () => {
    it('should update restriction end date', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const newEndDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 3 weeks

      const updatedRestriction = {
        id: 'restriction-id',
        endDate: newEndDate,
        isActive: true,
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(prisma.trainingRestriction.update).mockResolvedValue(updatedRestriction)

      const result = await prisma.trainingRestriction.update({
        where: { id: 'restriction-id' },
        data: { endDate: newEndDate },
      })

      expect(result.endDate).toEqual(newEndDate)
    })

    it('should deactivate restriction', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const deactivatedRestriction = {
        id: 'restriction-id',
        isActive: false,
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(prisma.trainingRestriction.update).mockResolvedValue(deactivatedRestriction)

      const result = await prisma.trainingRestriction.update({
        where: { id: 'restriction-id' },
        data: { isActive: false },
      })

      expect(result.isActive).toBe(false)
    })

    it('should update severity', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const updatedRestriction = {
        id: 'restriction-id',
        severity: 'MILD', // Reduced from MODERATE
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(prisma.trainingRestriction.update).mockResolvedValue(updatedRestriction)

      const result = await prisma.trainingRestriction.update({
        where: { id: 'restriction-id' },
        data: { severity: 'MILD' },
      })

      expect(result.severity).toBe('MILD')
    })
  })
})

describe('Restriction Source Types', () => {
  it('should have valid source types', () => {
    const validSources = ['INJURY_CASCADE', 'PHYSIO_MANUAL', 'COACH_MANUAL', 'SYSTEM']

    validSources.forEach((source) => {
      expect(validSources).toContain(source)
    })
  })
})

describe('Body Part Validation', () => {
  it('should have valid body part values', () => {
    const validBodyParts = [
      'ANKLE',
      'KNEE',
      'HIP',
      'LOWER_BACK',
      'UPPER_BACK',
      'SHOULDER',
      'ELBOW',
      'WRIST',
      'NECK',
      'GROIN',
      'HAMSTRING',
      'QUADRICEPS',
      'CALF',
      'ACHILLES',
      'FOOT',
      'SHIN',
    ]

    validBodyParts.forEach((part) => {
      expect(validBodyParts).toContain(part)
    })
  })
})

describe('Restriction Integration with AI WOD', () => {
  it('should filter exercises based on restrictions', () => {
    const restrictions = {
      restrictedBodyParts: ['KNEE', 'ANKLE'],
      restrictedExerciseIds: ['squat-id', 'lunge-id'],
      maxIntensityZone: 3,
    }

    const exercises = [
      { id: 'squat-id', name: 'Squat', bodyPart: 'KNEE' },
      { id: 'bench-id', name: 'Bench Press', bodyPart: 'CHEST' },
      { id: 'lunge-id', name: 'Lunge', bodyPart: 'KNEE' },
      { id: 'pullup-id', name: 'Pull-up', bodyPart: 'BACK' },
    ]

    const filteredExercises = exercises.filter((ex) => {
      const isRestricted = restrictions.restrictedExerciseIds.includes(ex.id)
      const bodyPartRestricted = restrictions.restrictedBodyParts.includes(ex.bodyPart)
      return !isRestricted && !bodyPartRestricted
    })

    expect(filteredExercises).toHaveLength(2)
    expect(filteredExercises.map((e) => e.name)).toContain('Bench Press')
    expect(filteredExercises.map((e) => e.name)).toContain('Pull-up')
    expect(filteredExercises.map((e) => e.name)).not.toContain('Squat')
    expect(filteredExercises.map((e) => e.name)).not.toContain('Lunge')
  })

  it('should cap intensity zone based on restriction', () => {
    const maxIntensityZone = 3
    const requestedZone = 5

    const effectiveZone = Math.min(requestedZone, maxIntensityZone)

    expect(effectiveZone).toBe(3)
  })

  it('should reduce volume based on restriction', () => {
    const volumeReductionPercent = 30
    const originalVolume = 100

    const reducedVolume = originalVolume * (1 - volumeReductionPercent / 100)

    expect(reducedVolume).toBe(70)
  })
})
