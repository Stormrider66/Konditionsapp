import { describe, expect, it } from 'vitest'
import type { Client, CreateTrainingProgramDTO } from '@/types'
import { generateSportProgram } from '../sport-router/dispatcher'
import type { SportProgramParams } from '../sport-router/types'
import { validateGeneratedProgramQuality } from '../validators/program-quality-validator'

const client = { id: 'client-1', name: 'Alex Court' } as Client

type CourtSportCase = {
  sport: SportProgramParams['sport']
  settingsKey:
    | 'basketballSettings'
    | 'handballSettings'
    | 'floorballSettings'
    | 'volleyballSettings'
    | 'tennisSettings'
    | 'padelSettings'
  settings: Record<string, unknown>
  expectedName: string
  expectedSessionName: RegExp
}

const sportCases: CourtSportCase[] = [
  {
    sport: 'TEAM_BASKETBALL',
    settingsKey: 'basketballSettings',
    settings: { position: 'point_guard', seasonPhase: 'in_season', matchesPerWeek: 1, sessionsPerWeek: 5 },
    expectedName: 'Basket',
    expectedSessionName: /Basket skills|Repeated sprint/,
  },
  {
    sport: 'TEAM_HANDBALL',
    settingsKey: 'handballSettings',
    settings: { position: 'pivot', seasonPhase: 'pre_season', matchesPerWeek: 0, sessionsPerWeek: 4 },
    expectedName: 'Handboll',
    expectedSessionName: /Handbollsteknik|Kastkraft/,
  },
  {
    sport: 'TEAM_FLOORBALL',
    settingsKey: 'floorballSettings',
    settings: { position: 'defender', seasonPhase: 'in_season', matchesPerWeek: 1, sessionsPerWeek: 4 },
    expectedName: 'Innebandy',
    expectedSessionName: /Klubbteknik|Bytesintervaller/,
  },
  {
    sport: 'TEAM_VOLLEYBALL',
    settingsKey: 'volleyballSettings',
    settings: { position: 'libero', seasonPhase: 'pre_season', matchesPerWeek: 0, sessionsPerWeek: 4 },
    expectedName: 'Volleyboll',
    expectedSessionName: /Volleybollteknik|Approach jumps/,
  },
  {
    sport: 'TENNIS',
    settingsKey: 'tennisSettings',
    settings: { playStyle: 'aggressive_baseliner', seasonPhase: 'tournament', matchesPerWeek: 2, sessionsPerWeek: 5 },
    expectedName: 'Tennis',
    expectedSessionName: /Tennisteknik|Matchplay/,
  },
  {
    sport: 'PADEL',
    settingsKey: 'padelSettings',
    settings: { position: 'left_side', seasonPhase: 'tournament', matchesPerWeek: 2, sessionsPerWeek: 5 },
    expectedName: 'Padel',
    expectedSessionName: /Padelteknik|Matchplay/,
  },
]

function paramsFor(testCase: CourtSportCase): SportProgramParams {
  return {
    clientId: 'client-1',
    coachId: 'coach-1',
    sport: testCase.sport,
    goal: 'in-season-maintenance',
    dataSource: 'PROFILE',
    durationWeeks: 6,
    sessionsPerWeek: Number(testCase.settings.sessionsPerWeek) || 4,
    [testCase.settingsKey]: testCase.settings,
  } as SportProgramParams
}

function expectRealProgram(
  program: CreateTrainingProgramDTO,
  sport: string,
  expectedSessionsPerWeek: number
) {
  const result = validateGeneratedProgramQuality(program, {
    sport,
    expectedSessionsPerWeek,
  })

  expect(result.valid, result.errors.join(', ')).toBe(true)
  expect(result.stats.workouts).toBeGreaterThan(0)
  expect(result.stats.activeWeeks).toBe(result.stats.weeks)
  expect(result.stats.averageWorkoutsPerWeek).toBeGreaterThanOrEqual(Math.min(7, expectedSessionsPerWeek))
}

describe('generateCourtSportProgram through sport router', () => {
  it.each(sportCases)('creates useful $sport programs', async (testCase) => {
    const program = await generateSportProgram(paramsFor(testCase), client)

    expect(program.name).toContain(testCase.expectedName)
    expectRealProgram(program, testCase.sport, Number(testCase.settings.sessionsPerWeek) || 4)

    const workouts = program.weeks?.[0].days.flatMap((day) => day.workouts) ?? []
    const workoutText = workouts.map((workout) => `${workout.name} ${workout.instructions}`).join(' ')

    expect(workoutText).toMatch(testCase.expectedSessionName)
    expect(program.planningMetadata).toMatchObject({
      source: 'court-sport-generator',
      sport: testCase.sport,
    })
  })
})
