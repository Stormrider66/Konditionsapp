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

    expect(prompt).toContain('ICE HOCKEY CONTEXT')
    expect(prompt).toContain('goalie')
    expect(prompt).toContain('avoid hard off-ice conditioning')
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

    expect(prompt).toContain('FOOTBALL CONTEXT')
    expect(prompt).toContain('forward')
    expect(prompt).toContain('MD+1 recovery')
  })

  it('includes court and racket sport settings in the generated prompt', () => {
    const context: ProgramContext = {
      wizardData: {
        sport: 'TENNIS',
        goal: 'tournament',
        dataSource: 'PROFILE',
        clientId: 'client-1',
        clientName: 'Alex Tennis',
        durationWeeks: 6,
        sessionsPerWeek: 5,
        includeStrength: true,
        tennisSettings: {
          playStyle: 'aggressive_baseliner',
          seasonPhase: 'tournament',
          matchesPerWeek: 2,
        },
      },
    }

    const prompt = buildProgramPrompt(context)

    expect(prompt).toContain('TENNIS CONTEXT')
    expect(prompt).toContain('aggressive_baseliner')
    expect(prompt).toContain('point intervals')
  })

  it('uses the latest decision-safe test in generated prompts', () => {
    const context: ProgramContext = {
      wizardData: {
        sport: 'RUNNING',
        goal: 'base',
        dataSource: 'TEST',
        clientId: 'client-1',
        clientName: 'Alex Runner',
        durationWeeks: 8,
        sessionsPerWeek: 4,
        includeStrength: false,
      },
      recentTests: [
        {
          id: 'test-pending',
          testDate: new Date('2026-06-10T00:00:00.000Z'),
          testType: 'RUNNING',
          maxHR: 199,
          vo2max: 99,
          maxLactate: null,
          qualityReviewStatus: 'REVIEW_REQUIRED',
          aerobicThreshold: null,
          anaerobicThreshold: null,
          trainingZones: null,
        },
        {
          id: 'test-clear',
          testDate: new Date('2026-05-15T00:00:00.000Z'),
          testType: 'RUNNING',
          maxHR: 184,
          vo2max: 55,
          maxLactate: null,
          qualityReviewStatus: 'CLEAR',
          aerobicThreshold: null,
          anaerobicThreshold: null,
          trainingZones: null,
        },
      ],
    }

    const prompt = buildProgramPrompt(context)

    expect(prompt).toContain('LATEST TEST RESULTS')
    expect(prompt).toContain('VO2max**: 55.0')
    expect(prompt).toContain('Test data excluded from program decisions')
    expect(prompt).toContain('pending coach review')
    expect(prompt).not.toContain('VO2max**: 99.0')
    expect(prompt).not.toContain('199 bpm')
  })

  it('omits test context when all tests still require review', () => {
    const context: ProgramContext = {
      wizardData: {
        sport: 'RUNNING',
        goal: 'base',
        dataSource: 'TEST',
        clientId: 'client-1',
        clientName: 'Alex Runner',
        durationWeeks: 8,
        sessionsPerWeek: 4,
        includeStrength: false,
      },
      recentTests: [
        {
          id: 'test-pending',
          testDate: new Date('2026-06-10T00:00:00.000Z'),
          testType: 'RUNNING',
          maxHR: 199,
          vo2max: 99,
          maxLactate: null,
          qualityReviewStatus: 'REVIEW_REQUIRED',
          aerobicThreshold: null,
          anaerobicThreshold: null,
          trainingZones: null,
        },
      ],
    }

    const prompt = buildProgramPrompt(context)

    expect(prompt).not.toContain('LATEST TEST RESULTS')
    expect(prompt).toContain('Test data excluded from program decisions')
    expect(prompt).not.toContain('VO2max**: 99.0')
  })

  it('includes recent pain follow-up outcomes in generated prompts', () => {
    const context: ProgramContext = {
      wizardData: {
        sport: 'RUNNING',
        goal: 'base',
        dataSource: 'PROFILE',
        clientId: 'client-1',
        clientName: 'Alex Runner',
        durationWeeks: 8,
        sessionsPerWeek: 4,
        includeStrength: false,
      },
      painFollowUps: [
        {
          status: 'RESOLVED',
          message: 'Alex reported calf pain after intervals.',
          resolutionOutcome: 'TRAINING_ADJUSTED',
          actionNote: 'Reduced intensity for the next two sessions.',
          followUpAt: new Date('2026-06-20T09:00:00.000Z'),
          resolvedAt: new Date('2026-06-16T10:00:00.000Z'),
          createdAt: new Date('2026-06-15T10:00:00.000Z'),
        },
      ],
    }

    const prompt = buildProgramPrompt(context)

    expect(prompt).toContain('RECENT PAIN FOLLOW-UPS')
    expect(prompt).toContain('Adjusted training')
    expect(prompt).toContain('Reduced intensity for the next two sessions.')
  })
})
