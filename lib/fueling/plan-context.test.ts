import { describe, expect, it } from 'vitest'
import { formatFuelingPlanContext } from './plan-context'

describe('formatFuelingPlanContext', () => {
  it('formats sport, distance, target intensity and race date', () => {
    expect(formatFuelingPlanContext({
      sport: 'RUNNING',
      distanceKm: 42.195,
      targetPaceMinKm: 4.5,
      raceDate: '2026-09-12T08:00:00.000Z',
    }, { includeRaceDate: true })).toBe('Löpning · Marathon · 4:30 min/km · 12 sep. 2026')
  })

  it('uses a friendly half-marathon distance label', () => {
    expect(formatFuelingPlanContext({
      sport: 'RUNNING',
      distanceKm: 21.1,
    })).toBe('Löpning · Halvmarathon')
  })

  it('can include the plan name for workout-level context', () => {
    expect(formatFuelingPlanContext({
      name: 'Stockholm Marathon',
      sport: 'RUNNING',
      targetSpeedKmh: 12,
    }, { includeName: true })).toBe('Stockholm Marathon · Löpning · 12 km/h')
  })

  it('returns null when no useful context exists', () => {
    expect(formatFuelingPlanContext({})).toBeNull()
    expect(formatFuelingPlanContext(null)).toBeNull()
  })
})
