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

  it('reduces hard conditioning when GPS sprint load is high', async () => {
    const program = await generateFootballProgram(params({
      footballSettings: {
        position: 'forward',
        seasonPhase: 'in_season',
        matchesPerWeek: 1,
        weeklyTrainingSessions: 5,
        hasGPSData: true,
        avgMatchDistanceKm: 11,
        avgSprintDistanceM: 700,
      },
    }), client)

    const conditioning = program.weeks?.[0].days
      .flatMap((day) => day.workouts)
      .find((workout) => workout.name === 'Fotbollsspecifik kondition')

    expect(conditioning?.duration).toBeLessThan(55)
    expect(program.notes).toContain('GPS-belastning är hög')
  })
})
