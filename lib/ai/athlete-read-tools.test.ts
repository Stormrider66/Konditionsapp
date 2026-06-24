import { beforeEach, describe, expect, it, vi } from 'vitest'

// The factory only builds tool definitions; it does not touch the DB at
// construction time. Mock the prisma singleton so importing the module graph
// does not open a real client during the test run.
const mockPrisma = vi.hoisted(() => ({
  test: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { createAthleteReadTools } from '@/lib/ai/athlete-read-tools'
import { createAthleteWorkoutWriteTools } from '@/lib/ai/athlete-workout-tools'

// The complete set of read-tool keys the athlete chat must always expose.
const EXPECTED_TOOL_KEYS = [
  'getMyWeekPlan',
  'getMyTestResults',
  'getMyTrainingLoad',
  'getMyReadinessHistory',
  'getMyPersonalRecords',
  'getMyActiveInjuries',
] as const

const EXPECTED_WRITE_TOOL_KEYS = [
  'logCompletedWorkout',
  'completeAssignedWorkout',
  'createCardioWorkout',
  'updateLiveWorkoutFeedback',
] as const

describe('createAthleteReadTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.test.findMany.mockResolvedValue([])
    mockPrisma.test.count.mockResolvedValue(0)
  })

  it('returns exactly the expected set of tool keys', () => {
    const tools = createAthleteReadTools('client-1', 'en')
    expect(Object.keys(tools).sort()).toEqual([...EXPECTED_TOOL_KEYS].sort())
  })

  it('returns the same tool keys regardless of locale', () => {
    const en = createAthleteReadTools('client-1', 'en')
    const sv = createAthleteReadTools('client-2', 'sv')
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort())
  })

  it('returns Vercel AI SDK tool definitions with an execute function', () => {
    const tools = createAthleteReadTools('client-1', 'en') as Record<string, { execute?: unknown }>
    for (const key of EXPECTED_TOOL_KEYS) {
      expect(typeof tools[key].execute).toBe('function')
    }
  })

  it('omits tests still waiting for quality review from AI test summaries', async () => {
    mockPrisma.test.findMany.mockResolvedValue([
      {
        id: 'test-clear',
        testDate: new Date('2026-06-15T00:00:00.000Z'),
        testType: 'RUNNING',
        vo2max: 58,
        maxHR: 188,
        maxLactate: 8.2,
        restingHeartRate: null,
        aerobicThreshold: null,
        anaerobicThreshold: null,
        manualLT1Lactate: null,
        manualLT1Intensity: null,
        manualLT2Lactate: null,
        manualLT2Intensity: null,
      },
    ])
    mockPrisma.test.count.mockResolvedValue(1)

    const tools = createAthleteReadTools('client-1', 'en') as unknown as Record<string, {
      execute: (input: { limit: number }) => Promise<unknown>
    }>
    const result = await tools.getMyTestResults.execute({ limit: 3 })

    expect(mockPrisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-1',
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        }),
      })
    )
    expect(mockPrisma.test.count).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        status: { not: 'DRAFT' },
        qualityReviewStatus: 'REVIEW_REQUIRED',
      },
    })
    expect(result).toMatchObject({
      success: true,
      reviewRequiredCount: 1,
      tests: [{ id: 'test-clear' }],
    })
  })
})

describe('createAthleteWorkoutWriteTools', () => {
  it('returns exactly the expected set of tool keys', () => {
    const tools = createAthleteWorkoutWriteTools('client-1', 'en')
    expect(Object.keys(tools).sort()).toEqual([...EXPECTED_WRITE_TOOL_KEYS].sort())
  })

  it('returns Vercel AI SDK tool definitions with an execute function', () => {
    const tools = createAthleteWorkoutWriteTools('client-1', 'en') as Record<string, { execute?: unknown }>
    for (const key of EXPECTED_WRITE_TOOL_KEYS) {
      expect(typeof tools[key].execute).toBe('function')
    }
  })
})
