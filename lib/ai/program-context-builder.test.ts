import { describe, expect, it } from 'vitest'
import { buildProgramPrompt, type ProgramContext } from './program-context-builder'

describe('buildProgramPrompt team sport context', () => {
  it('includes hockey settings in the generated prompt', () => {
    const context: ProgramContext = {
      wizardData: {
        sport: 'TEAM_ICE_HOCKEY',
        goal: 'in-season-maintenance',
        dataSource: 'PROFILE',
        clientId: 'client-1',
        clientName: 'Alex Hockey',
        durationWeeks: 8,
        sessionsPerWeek: 4,
        includeStrength: true,
        hockeySettings: {
          position: 'goalie',
          seasonPhase: 'in_season',
          shiftsPerGame: 20,
          injuryHistory: ['groin'],
        },
      },
    }

    const prompt = buildProgramPrompt(context)

    expect(prompt).toContain('ISHOCKEYSPECIFIK PROFIL')
    expect(prompt).toContain('goalie')
    expect(prompt).toContain('Undvik hård off-ice kondition')
  })

  it('includes football settings in the generated prompt', () => {
    const context: ProgramContext = {
      wizardData: {
        sport: 'TEAM_FOOTBALL',
        goal: 'in-season-maintenance',
        dataSource: 'PROFILE',
        clientId: 'client-1',
        clientName: 'Alex Football',
        durationWeeks: 8,
        sessionsPerWeek: 5,
        includeStrength: true,
        footballSettings: {
          position: 'forward',
          seasonPhase: 'in_season',
          matchesPerWeek: 1,
          avgSprintDistanceM: 500,
          injuryHistory: ['hamstring'],
        },
      },
    }

    const prompt = buildProgramPrompt(context)

    expect(prompt).toContain('FOTBOLLSSPECIFIK PROFIL')
    expect(prompt).toContain('forward')
    expect(prompt).toContain('MD+1 återhämtning')
  })
})
