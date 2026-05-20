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
  it('creates goalie-specific in-season work with mobility and reaction emphasis', async () => {
    const program = await generateHockeyProgram(params(), client)

    expect(program.weeks).toHaveLength(8)
    expect(program.name).toContain('Hockey')

    const firstWeek = program.weeks?.[0]
    const instructions = (firstWeek?.days.flatMap((day) => day.workouts) ?? [])
      .map((workout) => `${workout.name} ${workout.instructions}`)
      .join(' ')

    expect(instructions).toContain('Match')
    expect(instructions).toMatch(/Höft|höft/)
    expect(instructions).toMatch(/reaktion|Reaktion/)
  })
})
