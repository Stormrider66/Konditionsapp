import { describe, it, expect } from 'vitest'
import { calculateIndividualizedZones } from '@/lib/calculations/zones'

const BASE_INPUT = {
  maxHR: 195,
  lt1: { hr: 150, value: 12.5, type: 'SPEED' as const },
  lt2: { hr: 175, value: 15.0, type: 'SPEED' as const },
  age: 30,
  gender: 'MALE' as const
}

describe('calculateIndividualizedZones', () => {
  it('generates five individualized zones when LT1/LT2 provided', () => {
    const zones = calculateIndividualizedZones(BASE_INPUT)

    expect(zones).toHaveLength(5)
    expect(zones[0].zone).toBe(1)
    expect(zones[4].hrMax).toBe(BASE_INPUT.maxHR)
    expect(zones[0].hrMax).toBeLessThan(BASE_INPUT.lt1.hr)
    expect(zones[2].hrMin).toBeGreaterThan(BASE_INPUT.lt1.hr)
  })

  it('anchors boundaries to thresholds instead of %HRmax when data available', () => {
    const zones = calculateIndividualizedZones(BASE_INPUT)

    // Zone 2 should sit around LT1 (±5 bpm)
    expect(zones[1].hrMax).toBeGreaterThanOrEqual(BASE_INPUT.lt1.hr - 1)
    expect(zones[1].hrMax).toBeLessThanOrEqual(BASE_INPUT.lt1.hr + 5)

    // Zone 4 should stay tightly coupled to LT2 boundaries
    expect(zones[3].hrMin).toBeGreaterThanOrEqual(BASE_INPUT.lt2.hr - 5)
    expect(zones[3].hrMin).toBeLessThanOrEqual(BASE_INPUT.lt2.hr + 3)
  })

  it('infers cycling zones when power-based thresholds are provided', () => {
    const cyclingZones = calculateIndividualizedZones({
      maxHR: 190,
      lt1: { hr: 140, value: 200, type: 'POWER' },
      lt2: { hr: 165, value: 280, type: 'POWER' },
      gender: 'FEMALE',
      age: 32
    })

    expect(cyclingZones).toHaveLength(5)
    cyclingZones.forEach(zone => {
      expect(zone.powerMin).toBeDefined()
      expect(zone.powerMax).toBeDefined()
      expect(zone.speedMin).toBeUndefined()
    })
  })
})

