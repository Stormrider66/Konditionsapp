import { describe, it, expect } from 'vitest'
import {
  validateARaceSpacing,
  assessSeasonFeasibility
} from '@/lib/training-engine/advanced-features/multi-race-planning'

function makeRace(id: string, date: string, classification: 'A' | 'B' | 'C', distance: string) {
  return {
    id,
    name: `Race ${id}`,
    date: new Date(date),
    classification,
    distance
  }
}

describe('Multi-Race Season Validation', () => {
  it('rejects A-races spaced fewer than 8 weeks apart', () => {
    const races = [
      makeRace('1', '2025-03-01', 'A', 'MARATHON'),
      makeRace('2', '2025-04-15', 'A', 'HALF_MARATHON')
    ]

    const result = validateARaceSpacing(races)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('6')
    expect(result.recommendations).toContain('Downgrade one race to B-race classification')
  })

  it('warns when A-races are 8-10 weeks apart', () => {
    const races = [
      makeRace('1', '2025-03-01', 'A', 'MARATHON'),
      makeRace('2', '2025-05-10', 'A', 'HALF_MARATHON')
    ]

    const result = validateARaceSpacing(races)

    expect(result.valid).toBe(true)
    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(result.recommendations[0]).toContain('10')
  })

  it('flags seasons with more than three A-races as critical risk', () => {
    const races = [
      makeRace('1', '2025-03-01', 'A', 'MARATHON'),
      makeRace('2', '2025-06-01', 'A', 'HALF_MARATHON'),
      makeRace('3', '2025-09-01', 'A', 'MARATHON'),
      makeRace('4', '2025-11-01', 'A', 'HALF_MARATHON')
    ]

    const result = assessSeasonFeasibility(
      races,
      { experienceLevel: 'RECREATIONAL', currentWeeklyVolume: 50 },
      { maxWeeklyVolume: 80, sessionsPerWeek: 5 }
    )

    expect(result.risk).toBe('CRITICAL')
    expect(result.concerns).toContain('4 A-races exceeds recommended maximum of 3 per year')
  })

  it('detects high race frequency risk', () => {
    const races = Array.from({ length: 12 }, (_, i) =>
      makeRace(
        `${i + 1}`,
        `2025-${String(i + 1).padStart(2, '0')}-01`,
        i < 2 ? 'A' : i < 6 ? 'B' : 'C',
        'HALF_MARATHON'
      )
    )

    const result = assessSeasonFeasibility(
      races,
      { experienceLevel: 'ADVANCED', currentWeeklyVolume: 70 },
      { maxWeeklyVolume: 100, sessionsPerWeek: 6 }
    )

    expect(result.raceFrequency).toBeCloseTo(1.0, 1)
    expect(result.risk).toBe('HIGH')
  })
})

