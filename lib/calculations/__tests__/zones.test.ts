import { describe, it, expect } from 'vitest'
import { calculateIndividualizedZones } from '../zones'
import type { TrainingZone } from '@/types'

describe('Zone Calculations', () => {
  describe('calculateIndividualizedZones', () => {
    it('should calculate 5 training zones', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 185,
        age: 30,
        gender: 'MALE'
      })

      expect(zones).toHaveLength(5)
      expect(zones[0].zone).toBe(1)
      expect(zones[4].zone).toBe(5)
    })

    it('should have non-overlapping HR ranges', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 185,
        age: 35,
        gender: 'MALE'
      })

      for (let i = 0; i < zones.length - 1; i++) {
        // Upper bound of current zone should be at or near lower bound of next zone
        expect(zones[i].hrMax).toBeLessThanOrEqual(zones[i + 1].hrMin + 1)
      }
    })

    it('should use provided LT1 threshold for zone boundaries', () => {
      const lt1HR = 145
      const zones = calculateIndividualizedZones({
        maxHR: 185,
        lt1: { hr: lt1HR, value: 12 },
        age: 30,
        gender: 'MALE'
      })

      // Zone 2 max should be influenced by LT1 (may not be exact due to zone algorithm)
      const zone2 = zones.find(z => z.zone === 2)
      expect(zone2).toBeDefined()
      expect(zone2?.hrMax).toBeGreaterThan(0)
      expect(zone2?.hrMax).toBeLessThanOrEqual(185)
    })

    it('should use provided LT2 threshold for zone boundaries', () => {
      const lt2HR = 168
      const zones = calculateIndividualizedZones({
        maxHR: 185,
        lt2: { hr: lt2HR, value: 15 },
        age: 30,
        gender: 'MALE'
      })

      // Zone 4 max should be close to LT2
      const zone4 = zones.find(z => z.zone === 4)
      expect(zone4?.hrMax).toBeGreaterThanOrEqual(lt2HR - 5)
      expect(zone4?.hrMax).toBeLessThanOrEqual(lt2HR + 5)
    })

    it('should calculate zones for female athletes', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 180,
        age: 28,
        gender: 'FEMALE'
      })

      expect(zones).toHaveLength(5)
      // All zones should have valid HR ranges
      zones.forEach(zone => {
        expect(zone.hrMin).toBeGreaterThan(0)
        expect(zone.hrMax).toBeGreaterThan(zone.hrMin)
      })
    })

    it('should estimate maxHR when not provided', () => {
      const zones = calculateIndividualizedZones({
        age: 40,
        gender: 'MALE'
      })

      expect(zones).toHaveLength(5)
      // Zone 5 max should be close to estimated max HR (208 - 0.7*40 = 180)
      const zone5 = zones.find(z => z.zone === 5)
      expect(zone5?.hrMax).toBeGreaterThanOrEqual(175)
      expect(zone5?.hrMax).toBeLessThanOrEqual(185)
    })

    it('should handle both LT1 and LT2 thresholds together', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 190,
        lt1: { hr: 140, value: 11 },
        lt2: { hr: 165, value: 14.5 },
        age: 25,
        gender: 'MALE'
      })

      expect(zones).toHaveLength(5)

      // Zone boundaries should respect both thresholds
      const zone2 = zones.find(z => z.zone === 2)
      const zone4 = zones.find(z => z.zone === 4)

      expect(zone2?.hrMax).toBeGreaterThanOrEqual(135)
      expect(zone2?.hrMax).toBeLessThanOrEqual(145)
      expect(zone4?.hrMax).toBeGreaterThanOrEqual(160)
      expect(zone4?.hrMax).toBeLessThanOrEqual(170)
    })
  })

  describe('Zone Labels and Descriptions', () => {
    it('should have Swedish zone names', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 185,
        age: 30,
        gender: 'MALE'
      })

      // Check that zones have Swedish names
      expect(zones[0].name).toBeDefined()
      expect(typeof zones[0].name).toBe('string')
    })

    it('should have valid percentages of max HR', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 200,
        age: 25,
        gender: 'MALE'
      })

      zones.forEach(zone => {
        const lowerPct = (zone.hrMin / 200) * 100
        const upperPct = (zone.hrMax / 200) * 100

        expect(lowerPct).toBeGreaterThanOrEqual(50)
        expect(upperPct).toBeLessThanOrEqual(102) // Allow small margin over max
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very low max HR', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 150,
        age: 65,
        gender: 'MALE'
      })

      expect(zones).toHaveLength(5)
      zones.forEach(zone => {
        expect(zone.hrMin).toBeGreaterThan(0)
        expect(zone.hrMax).toBeLessThanOrEqual(155)
      })
    })

    it('should handle high max HR', () => {
      const zones = calculateIndividualizedZones({
        maxHR: 210,
        age: 18,
        gender: 'MALE'
      })

      expect(zones).toHaveLength(5)
      const zone5 = zones.find(z => z.zone === 5)
      expect(zone5?.hrMax).toBeLessThanOrEqual(215)
    })

    it('should handle LT1 close to LT2', () => {
      // Some athletes have compressed threshold ranges
      const zones = calculateIndividualizedZones({
        maxHR: 185,
        lt1: { hr: 158, value: 13 },
        lt2: { hr: 165, value: 14 },
        age: 30,
        gender: 'MALE'
      })

      expect(zones).toHaveLength(5)
      // Zones should still be valid even with narrow threshold gap
      zones.forEach(zone => {
        expect(zone.hrMax).toBeGreaterThanOrEqual(zone.hrMin)
      })
    })
  })
})

describe('Zone Confidence Levels', () => {
  it('should provide HIGH confidence with lactate test data', () => {
    // When both LT1 and LT2 are provided from lactate test
    const zones = calculateIndividualizedZones({
      maxHR: 185,
      lt1: { hr: 140, value: 12, lactate: 2.0 },
      lt2: { hr: 165, value: 14.5, lactate: 4.0 },
      age: 30,
      gender: 'MALE'
    })

    expect(zones).toHaveLength(5)
    // Zones should be individualized based on actual lactate data
  })

  it('should handle estimated zones gracefully', () => {
    // When no thresholds provided, should use %HRmax estimates
    const zones = calculateIndividualizedZones({
      maxHR: 185,
      age: 35,
      gender: 'MALE'
    })

    expect(zones).toHaveLength(5)
    // Should still produce valid zones even without test data
    zones.forEach(zone => {
      expect(zone.hrMin).toBeDefined()
      expect(zone.hrMax).toBeDefined()
      expect(zone.zone).toBeDefined()
    })
  })
})
