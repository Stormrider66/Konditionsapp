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
  it('creates an English match-week plan for an in-season midfielder by default', async () => {
    const program = await generateFootballProgram(params(), client)

    expect(program.weeks).toHaveLength(8)
    expect(program.name).toContain('Football')

    const firstWeek = program.weeks?.[0]
    const workouts = firstWeek?.days.flatMap((day) => day.workouts) ?? []

    expect(workouts.some((workout) => workout.name === 'MD+1 recovery')).toBe(true)
    expect(workouts.some((workout) => workout.name === 'MD-1 activation')).toBe(true)
    expect(workouts.some((workout) => workout.name === 'Match')).toBe(true)
    expect(workouts.some((workout) => workout.instructions?.includes('FIFA 11+'))).toBe(true)
    expect(JSON.stringify(program)).not.toMatch(/[åäöÅÄÖ]|\b(Fotbollsspecifik|Vilodag|Skadeprevention|återhämtning|uppvärmning)\b/)
    expect(program.planningMetadata).toMatchObject({
      sport: 'TEAM_FOOTBALL',
      position: 'midfielder',
      seasonPhase: 'in_season',
      football: {
        matchesPerWeek: 1,
        sessionsPerWeek: 5,
      },
    })
  })

  it('preserves Swedish football program output when requested', async () => {
    const program = await generateFootballProgram(params({ locale: 'sv' }), client)

    expect(program.name).toContain('Fotboll')

    const workouts = program.weeks?.[0].days.flatMap((day) => day.workouts) ?? []

    expect(workouts.some((workout) => workout.name === 'MD+1 återhämtning')).toBe(true)
    expect(workouts.some((workout) => workout.name === 'Fotbollsspecifik kondition')).toBe(true)
    expect(program.notes).toContain('Programmet följer matchveckans rytm')
  })

  it('reduces hard conditioning when GPS sprint load is high in English', async () => {
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
      .find((workout) => workout.name === 'Football-specific conditioning')

    expect(conditioning?.duration).toBeLessThan(55)
    expect(program.notes).toContain('GPS load is high')
    expect(program.planningMetadata).toMatchObject({
      sport: 'TEAM_FOOTBALL',
      position: 'forward',
      intensityMultiplier: expect.any(Number),
    })
  })
})
