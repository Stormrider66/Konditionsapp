import { describe, it, expect, vi } from 'vitest'

// The factory only builds tool definitions; it does not touch the DB at
// construction time. Mock the prisma singleton so importing the module graph
// does not open a real client during the test run.
vi.mock('@/lib/prisma', () => ({
  prisma: {},
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
] as const

describe('createAthleteReadTools', () => {
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
