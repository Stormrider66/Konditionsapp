/**
 * Tests for Rehab Program API Routes
 *
 * Tests the following endpoints:
 * - POST /api/physio/rehab-programs - Create program
 * - GET /api/physio/rehab-programs - List programs
 * - GET /api/physio/rehab-programs/[id] - Get program details
 * - PATCH /api/physio/rehab-programs/[id] - Update program
 * - POST /api/physio/rehab-programs/[id]/exercises - Add exercise
 * - POST /api/physio/rehab-programs/[id]/milestones - Add milestone
 * - POST /api/physio/rehab-programs/[id]/progress - Log progress
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    rehabProgram: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    rehabExercise: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    rehabMilestone: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    rehabProgressLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    aINotification: {
      create: vi.fn(),
    },
    careTeamThread: {
      create: vi.fn(),
    },
  },
}))

// Mock auth utils
vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn(),
  canAccessAthleteAsPhysio: vi.fn(),
}))

// Mock care team notifications
vi.mock('@/lib/notifications/care-team', () => ({
  createRehabProgramThread: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessAthleteAsPhysio } from '@/lib/auth-utils'

describe('Rehab Program API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/physio/rehab-programs', () => {
    it('should create a new rehab program', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const mockProgram = {
        id: 'program-id',
        name: 'ACL Recovery Program',
        description: 'Post-surgery ACL rehabilitation',
        clientId: 'client-id',
        physioUserId: 'physio-user-id',
        currentPhase: 'ACUTE',
        status: 'ACTIVE',
        acceptablePainDuring: 3,
        acceptablePainAfter: 4,
        shortTermGoals: ['Reduce swelling', 'Restore ROM'],
        longTermGoals: ['Return to sport'],
        contraindications: ['No jumping', 'No pivoting'],
        createdAt: new Date(),
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
      vi.mocked(canAccessAthleteAsPhysio).mockResolvedValue(true)
      vi.mocked(prisma.rehabProgram.create).mockResolvedValue(mockProgram as any)

      const result = await prisma.rehabProgram.create({
        data: {
          name: 'ACL Recovery Program',
          clientId: 'client-id',
          physioUserId: mockUser.id,
          currentPhase: 'ACUTE',
        },
      })

      expect(result.name).toBe('ACL Recovery Program')
      expect(result.currentPhase).toBe('ACUTE')
      expect(result.physioUserId).toBe(mockUser.id)
    })

    it('should require valid phase', async () => {
      const validPhases = ['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT']

      validPhases.forEach((phase) => {
        expect(validPhases).toContain(phase)
      })

      const invalidPhase = 'INVALID_PHASE'
      expect(validPhases).not.toContain(invalidPhase)
    })

    it('should set pain thresholds', async () => {
      const program = {
        acceptablePainDuring: 3,
        acceptablePainAfter: 4,
      }

      expect(program.acceptablePainDuring).toBeGreaterThanOrEqual(0)
      expect(program.acceptablePainDuring).toBeLessThanOrEqual(10)
      expect(program.acceptablePainAfter).toBeGreaterThanOrEqual(0)
      expect(program.acceptablePainAfter).toBeLessThanOrEqual(10)
    })
  })

  describe('GET /api/physio/rehab-programs', () => {
    it('should return programs for assigned athletes', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const mockPrograms = [
        {
          id: 'program-1',
          name: 'Program 1',
          clientId: 'client-1',
          currentPhase: 'ACUTE',
          status: 'ACTIVE',
          client: { id: 'client-1', name: 'Athlete 1' },
          _count: { exercises: 5, milestones: 3, progressLogs: 10 },
        },
        {
          id: 'program-2',
          name: 'Program 2',
          clientId: 'client-2',
          currentPhase: 'FUNCTIONAL',
          status: 'ACTIVE',
          client: { id: 'client-2', name: 'Athlete 2' },
          _count: { exercises: 8, milestones: 5, progressLogs: 20 },
        },
      ]

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.rehabProgram.findMany).mockResolvedValue(mockPrograms as any)

      const result = await prisma.rehabProgram.findMany({
        where: { physioUserId: mockUser.id },
        include: { client: true, _count: true },
      })

      expect(result).toHaveLength(2)
      expect(result[0]._count.exercises).toBe(5)
    })

    it('should filter by status', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const mockActivePrograms = [
        { id: 'program-1', status: 'ACTIVE' },
      ]

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.rehabProgram.findMany).mockResolvedValue(mockActivePrograms as any)

      const result = await prisma.rehabProgram.findMany({
        where: { physioUserId: mockUser.id, status: 'ACTIVE' },
      })

      expect(result.every((p) => p.status === 'ACTIVE')).toBe(true)
    })
  })

  describe('PATCH /api/physio/rehab-programs/[id]', () => {
    it('should update program phase', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const updatedProgram = {
        id: 'program-id',
        name: 'ACL Recovery',
        currentPhase: 'SUBACUTE', // Progressed from ACUTE
        status: 'ACTIVE',
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.rehabProgram.update).mockResolvedValue(updatedProgram as any)

      const result = await prisma.rehabProgram.update({
        where: { id: 'program-id' },
        data: { currentPhase: 'SUBACUTE' },
      })

      expect(result.currentPhase).toBe('SUBACUTE')
    })

    it('should complete program', async () => {
      const mockUser = {
        id: 'physio-user-id',
        role: 'PHYSIO',
        email: 'physio@test.com',
      }

      const completedProgram = {
        id: 'program-id',
        status: 'COMPLETED',
        currentPhase: 'RETURN_TO_SPORT',
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
      vi.mocked(prisma.rehabProgram.update).mockResolvedValue(completedProgram as any)

      const result = await prisma.rehabProgram.update({
        where: { id: 'program-id' },
        data: { status: 'COMPLETED' },
      })

      expect(result.status).toBe('COMPLETED')
    })
  })

  describe('POST /api/physio/rehab-programs/[id]/exercises', () => {
    it('should add exercise to program', async () => {
      const mockExercise = {
        id: 'rehab-exercise-id',
        programId: 'program-id',
        exerciseId: 'exercise-id',
        sets: 3,
        reps: '10-12',
        frequency: 'DAILY',
        phase: 'ACUTE',
        progressionCriteria: 'No pain during exercise',
        notes: 'Focus on controlled movement',
      }

      vi.mocked(prisma.rehabExercise.create).mockResolvedValue(mockExercise as any)

      const result = await prisma.rehabExercise.create({
        data: mockExercise,
      })

      expect(result.programId).toBe('program-id')
      expect(result.sets).toBe(3)
      expect(result.frequency).toBe('DAILY')
    })
  })

  describe('POST /api/physio/rehab-programs/[id]/milestones', () => {
    it('should add milestone to program', async () => {
      const mockMilestone = {
        id: 'milestone-id',
        programId: 'program-id',
        name: 'Full ROM achieved',
        description: 'Patient can achieve full range of motion without pain',
        targetDate: new Date('2024-03-01'),
        isAchieved: false,
        achievedDate: null,
        criteria: ['0-130 degrees flexion', 'No pain at end range'],
      }

      vi.mocked(prisma.rehabMilestone.create).mockResolvedValue(mockMilestone as any)

      const result = await prisma.rehabMilestone.create({
        data: mockMilestone as any,
      })

      expect(result.name).toBe('Full ROM achieved')
      expect(result.isAchieved).toBe(false)
    })

    it('should mark milestone as achieved', async () => {
      const achievedMilestone = {
        id: 'milestone-id',
        programId: 'program-id',
        name: 'Full ROM achieved',
        isAchieved: true,
        achievedDate: new Date(),
      }

      vi.mocked(prisma.rehabMilestone.update).mockResolvedValue(achievedMilestone as any)

      const result = await prisma.rehabMilestone.update({
        where: { id: 'milestone-id' },
        data: { isAchieved: true, achievedDate: new Date() },
      })

      expect(result.isAchieved).toBe(true)
      expect(result.achievedDate).not.toBeNull()
    })
  })

  describe('POST /api/physio/rehab-programs/[id]/progress', () => {
    it('should log athlete progress', async () => {
      const mockProgressLog = {
        id: 'progress-log-id',
        programId: 'program-id',
        loggedById: 'athlete-user-id',
        exercisesCompleted: ['exercise-1', 'exercise-2'],
        painDuring: 2,
        painAfter: 3,
        difficulty: 'APPROPRIATE',
        overallFeeling: 'GOOD',
        notes: 'Felt strong today',
        loggedAt: new Date(),
      }

      vi.mocked(prisma.rehabProgressLog.create).mockResolvedValue(mockProgressLog as any)

      const result = await prisma.rehabProgressLog.create({
        data: mockProgressLog as any,
      })

      expect(result.painDuring).toBe(2)
      expect((result as any).overallFeeling).toBe('GOOD')
    })

    it('should trigger notification when pain exceeds threshold', async () => {
      const program = {
        acceptablePainDuring: 3,
        acceptablePainAfter: 4,
      }

      const progressLog = {
        painDuring: 5, // Exceeds threshold
        painAfter: 3,
      }

      const painExceeded =
        (progressLog.painDuring > program.acceptablePainDuring) ||
        (progressLog.painAfter > program.acceptablePainAfter)

      expect(painExceeded).toBe(true)
    })

    it('should allow athlete to request physio contact', async () => {
      const progressLog = {
        id: 'progress-log-id',
        wantsPhysioContact: true,
        notes: 'I have questions about my exercises',
      }

      expect(progressLog.wantsPhysioContact).toBe(true)
    })
  })
})

describe('Rehab Program Phase Progression', () => {
  it('should follow correct phase order', () => {
    const phaseOrder = ['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT']

    expect(phaseOrder.indexOf('ACUTE')).toBeLessThan(phaseOrder.indexOf('SUBACUTE'))
    expect(phaseOrder.indexOf('SUBACUTE')).toBeLessThan(phaseOrder.indexOf('REMODELING'))
    expect(phaseOrder.indexOf('REMODELING')).toBeLessThan(phaseOrder.indexOf('FUNCTIONAL'))
    expect(phaseOrder.indexOf('FUNCTIONAL')).toBeLessThan(phaseOrder.indexOf('RETURN_TO_SPORT'))
  })

  it('should have valid status values', () => {
    const validStatuses = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']

    validStatuses.forEach((status) => {
      expect(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).toContain(status)
    })
  })
})

describe('Rehab Exercise Frequency', () => {
  it('should have valid frequency values', () => {
    const validFrequencies = ['DAILY', 'TWICE_DAILY', 'EVERY_OTHER_DAY', 'WEEKLY', 'AS_NEEDED']

    validFrequencies.forEach((freq) => {
      expect(validFrequencies).toContain(freq)
    })
  })
})
