import { describe, it, expect, vi } from 'vitest'

// The factory only builds tool definitions; it does not touch the DB at
// construction time. We still mock the prisma singleton so importing the
// module graph does not attempt to open a real client during the test run.
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

import { createCoachChatTools } from '@/lib/ai/coach-chat-tools'

// The complete set of tool keys createCoachChatTools must always return.
// Guards against a tool silently disappearing when the monolith was split
// into focused coach-tools modules.
const EXPECTED_TOOL_KEYS = [
  // strength-tools
  'generateStrengthSession',
  'createComplementaryStrengthSession',
  'modifyStrengthSession',
  'generateTrainingProgram',
  // athlete-tools
  'listAthletes',
  'findAthleteByName',
  'getLatestCompletedWorkout',
  // calendar-tools
  'getTeamCalendarBriefing',
  'getTeamPlannedWorkout',
  'planTeamWorkoutInCalendar',
  // workout-tools
  'createCardioSession',
  'createHybridWorkout',
  'createSportWorkout',
  // navigation-tools
  'suggestCoachNavigation',
  // messaging-tools
  'prepareCoachMessageDraft',
  // monitoring-tools
  'getAthletesNeedingAttention',
  'getAthleteStatusSummary',
  'getAthleteReadinessHistory',
  'getAthleteTrainingLoad',
  'getAthleteTestResults',
  'getTrainingCaptureGuide',
  // assignment-tools
  'assignSessionToAthlete',
  // cardio-action-tools
  'createAndAssignCardioWorkout',
  'modifyCardioAssignment',
  'repeatPreviousCardioWorkout',
  'modifyTeamCardioAssignments',
  // briefing-action-tools
  'prepareCoachDailyBriefing',
] as const

describe('createCoachChatTools', () => {
  it('returns exactly the expected set of tool keys', () => {
    const tools = createCoachChatTools('coach-1', 'slug', 'en')
    expect(Object.keys(tools).sort()).toEqual([...EXPECTED_TOOL_KEYS].sort())
  })

  it('returns the same tool keys regardless of locale or business scope', () => {
    const en = createCoachChatTools('coach-1', 'slug', 'en')
    const sv = createCoachChatTools('coach-2', undefined, 'sv')
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort())
  })

  it('returns Vercel AI SDK tool definitions with an execute function', () => {
    const tools = createCoachChatTools('coach-1', 'slug', 'en') as Record<string, { execute?: unknown }>
    for (const key of EXPECTED_TOOL_KEYS) {
      expect(typeof tools[key].execute).toBe('function')
    }
  })
})
