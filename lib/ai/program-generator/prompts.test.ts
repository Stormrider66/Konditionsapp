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
})
