import { describe, expect, it } from 'vitest'
import { buildOutlinePrompt } from './prompts'

describe('program generator prompts', () => {
  it('uses normalized court sport names and sport-specific context', () => {
    const prompt = buildOutlinePrompt({
      sport: 'TEAM_BASKETBALL',
      totalWeeks: 8,
      sessionsPerWeek: 5,
      goal: 'in-season-maintenance',
      locale: 'en',
      basketballSettings: {
        position: 'point_guard',
        seasonPhase: 'in_season',
        matchesPerWeek: 1,
      },
    })

    expect(prompt).toContain('8-week basketball program')
    expect(prompt).toContain('BASKETBALL CONTEXT')
    expect(prompt).toContain('Position: point_guard')
    expect(prompt).toContain('jump load')
  })

  it('defaults outline prompts to English', () => {
    const prompt = buildOutlinePrompt({
      sport: 'RUNNING',
      totalWeeks: 6,
      sessionsPerWeek: 4,
      goal: 'Improve 10K performance',
    })

    expect(prompt).toContain('Create a PERIODIZATION PLAN')
    expect(prompt).toContain('6-week running program')
    expect(prompt).not.toContain('Skapa en PERIODISERINGSPLAN')
  })
})
