import { describe, expect, it } from 'vitest'
import { generateHockeyProgram } from './hockey-generator'
import type { Client } from '@/types'
import type { SportProgramParams } from '../sport-router/types'

const client = { id: 'client-1', name: 'Alex Hockey' } as Client

function params(overrides: Partial<SportProgramParams> = {}): SportProgramParams {
  return {
    clientId: 'client-1',
    coachId: 'coach-1',
    sport: 'TEAM_ICE_HOCKEY',
    goal: 'in-season-maintenance',
    dataSource: 'PROFILE',
    durationWeeks: 8,
    sessionsPerWeek: 4,
    hockeySettings: {
      position: 'goalie',
      seasonPhase: 'in_season',
      weeklyOffIceSessions: 4,
      hasAccessToIce: true,
      hasAccessToGym: true,
    },
    ...overrides,
  }
}

describe('generateHockeyProgram', () => {
  it('creates English goalie-specific in-season work by default', async () => {
    const program = await generateHockeyProgram(params(), client)

    expect(program.weeks).toHaveLength(8)
    expect(program.name).toContain('Hockey')

    const firstWeek = program.weeks?.[0]
    const instructions = (firstWeek?.days.flatMap((day) => day.workouts) ?? [])
      .map((workout) => `${workout.name} ${workout.instructions}`)
      .join(' ')

    expect(instructions).toContain('Match')
    expect(instructions).toMatch(/Hip|hip/)
    expect(instructions).toMatch(/reaction|Reaction/)
    expect(JSON.stringify(program)).not.toMatch(/[åäöÅÄÖ]|\b(Vilodag|Återhämtning|Skadeprevention|Hög|istid|bytesbelastning|rörlighet)\b/)
    expect(program.planningMetadata).toMatchObject({
      sport: 'TEAM_ICE_HOCKEY',
      position: 'goalie',
      seasonPhase: 'in_season',
    })
  })

  it('preserves Swedish hockey program output when requested', async () => {
    const program = await generateHockeyProgram(params({ locale: 'sv' }), client)

    const firstWeek = program.weeks?.[0]
    const instructions = (firstWeek?.days.flatMap((day) => day.workouts) ?? [])
      .map((workout) => `${workout.name} ${workout.instructions}`)
      .join(' ')

    expect(program.name).toContain('Hockey säsongsunderhåll')
    expect(instructions).toContain('Kort styrka/prehab')
    expect(instructions).toContain('Matchförberedande aktivering')
    expect(instructions).toMatch(/Höft|höft/)
    expect(program.notes).toContain('Programmet styrs av säsongsfas')
  })

  it('backs off off-ice load for high game and ice-time load in English', async () => {
    const program = await generateHockeyProgram(params({
      hockeySettings: {
        position: 'defense',
        seasonPhase: 'in_season',
        matchesThisWeek: 2,
        averageIceTimeMinutes: 24,
        shiftsPerGame: 28,
        weeklyOffIceSessions: 5,
        hasAccessToIce: false,
        hasAccessToGym: true,
      },
    }), client)

    const conditioning = program.weeks?.[0].days
      .flatMap((day) => day.workouts)
      .find((workout) => workout.name.includes('Shift intervals'))

    expect(conditioning?.duration ?? 0).toBeLessThan(45)
    expect(program.notes).toContain('High ice-time/shift load')
    expect(program.planningMetadata).toMatchObject({
      sport: 'TEAM_ICE_HOCKEY',
      position: 'defense',
      hockey: {
        matchesThisWeek: 2,
      },
    })
  })
})
