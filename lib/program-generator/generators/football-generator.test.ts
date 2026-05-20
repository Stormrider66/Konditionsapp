import { describe, expect, it } from 'vitest'
import { generateFootballProgram } from './football-generator'
import type { Client } from '@/types'
import type { SportProgramParams } from '../sport-router/types'

const client = { id: 'client-1', name: 'Alex Football' } as Client

function params(overrides: Partial<SportProgramParams> = {}): SportProgramParams {
  return {
    clientId: 'client-1',
    coachId: 'coach-1',
    sport: 'TEAM_FOOTBALL',
    goal: 'in-season-maintenance',
    dataSource: 'PROFILE',
    durationWeeks: 8,
    sessionsPerWeek: 5,
    footballSettings: {
      position: 'midfielder',
      seasonPhase: 'in_season',
      matchesPerWeek: 1,
      weeklyTrainingSessions: 5,
    },
    ...overrides,
  }
}

describe('generateFootballProgram', () => {
  it('creates a match-week plan for an in-season midfielder', async () => {
    const program = await generateFootballProgram(params(), client)

    expect(program.weeks).toHaveLength(8)
    expect(program.name).toContain('Fotboll')

    const firstWeek = program.weeks?.[0]
    const workouts = firstWeek?.days.flatMap((day) => day.workouts) ?? []

    expect(workouts.some((workout) => workout.name.includes('MD+1'))).toBe(true)
    expect(workouts.some((workout) => workout.name.includes('MD-1'))).toBe(true)
    expect(workouts.some((workout) => workout.name === 'Match')).toBe(true)
    expect(workouts.some((workout) => workout.instructions?.includes('FIFA 11+'))).toBe(true)
  })
})
