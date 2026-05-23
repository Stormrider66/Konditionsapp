import { describe, expect, it } from 'vitest'
import { buildRaceDayFuelingPlan } from './race-day-plan'

describe('buildRaceDayFuelingPlan', () => {
  it('builds practical pack and timing guidance', () => {
    const plan = buildRaceDayFuelingPlan(75, 180)

    expect(plan).toMatchObject({
      carbsPerHour: 75,
      durationMinutes: 180,
      totalCarbs: 225,
      intakeEvery20Min: 25,
      gelEquivalentCount: 9,
      bottleMixCount: 6,
    })
    expect(plan?.timing[0]).toEqual({ minute: 20, carbs: 25, label: '20 min' })
    expect(plan?.timing).toHaveLength(8)
  })

  it('localizes race-day notes', () => {
    const englishPlan = buildRaceDayFuelingPlan(75, 180, 'en')
    const swedishPlan = buildRaceDayFuelingPlan(75, 180, 'sv')

    expect(englishPlan?.notesSv).toContain('Always test the plan during long sessions before race day.')
    expect(englishPlan?.notesSv).toContain('For races over three hours, also plan sodium/fluid separately based on heat and sweat loss.')
    expect(swedishPlan?.notesSv).toContain('Testa alltid planen på långpass innan tävling.')
    expect(swedishPlan?.notesSv).toContain('För lopp över tre timmar: planera även salt/vätska separat utifrån värme och svettförlust.')
  })

  it('returns null without a carbohydrate target', () => {
    expect(buildRaceDayFuelingPlan(null, 180)).toBeNull()
  })
})
