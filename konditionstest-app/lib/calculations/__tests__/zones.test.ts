// lib/calculations/__tests__/zones.test.ts
import { calculateTrainingZones, estimateMaxHR } from '../zones'
import { Client, Threshold, TestType } from '@/types'

describe('Training Zone Calculations', () => {
  const mockClient: Client = {
    id: '1',
    userId: '1',
    name: 'Test Athlete',
    gender: 'MALE',
    birthDate: new Date('1990-01-01'), // 35 years old in 2025
    height: 180,
    weight: 75,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockLT1: Threshold = {
    heartRate: 145,
    value: 12.5, // km/h
    unit: 'km/h',
    lactate: 2.0,
    percentOfMax: 75
  }

  const mockLT2: Threshold = {
    heartRate: 170,
    value: 15.0, // km/h
    unit: 'km/h',
    lactate: 4.0,
    percentOfMax: 87
  }

  describe('Tier 1: Lactate Test Zones', () => {
    it('should use LT1/LT2 when lactate test data exists', () => {
      const result = calculateTrainingZones(
        mockClient,
        195, // maxHR
        mockLT1,
        mockLT2,
        'RUNNING'
      )

      expect(result.method).toBe('LACTATE_TEST')
      expect(result.confidence).toBe('HIGH')
      expect(result.warning).toBeUndefined()
      expect(result.zones).toHaveLength(5)
    })

    it('should create zones anchored to LT1 and LT2', () => {
      const result = calculateTrainingZones(
        mockClient,
        195,
        mockLT1,
        mockLT2,
        'RUNNING'
      )

      const zones = result.zones

      // Zone 2 should be around LT1
      expect(zones[1].intensity).toContain('LT1')
      expect(zones[1].hrMax).toBe(mockLT1.heartRate + 5) // LT1 + 5 bpm

      // Zone 4 should be around LT2
      expect(zones[3].intensity).toContain('LT2')
      expect(zones[3].hrMax).toBe(mockLT2.heartRate + 5) // LT2 + 5 bpm
    })

    it('should add speed ranges for running tests', () => {
      const result = calculateTrainingZones(
        mockClient,
        195,
        mockLT1,
        mockLT2,
        'RUNNING'
      )

      const zones = result.zones

      // All zones should have speed ranges
      zones.forEach(zone => {
        expect(zone.speedMin).toBeDefined()
        expect(zone.speedMax).toBeDefined()
        expect(zone.speedMin!).toBeLessThan(zone.speedMax!)
      })
    })
  })

  describe('Tier 3: %HRmax Fallback', () => {
    it('should use fallback when no lactate data exists', () => {
      const result = calculateTrainingZones(
        mockClient,
        undefined, // No maxHR
        null, // No LT1
        null, // No LT2
        'RUNNING'
      )

      expect(result.method).toBe('ESTIMATED')
      expect(result.confidence).toBe('LOW')
      expect(result.warning).toBeDefined()
      expect(result.warning).toContain('estimerad')
    })

    it('should estimate maxHR from age and gender if not provided', () => {
      const result = calculateTrainingZones(
        mockClient,
        undefined,
        null,
        null,
        'RUNNING'
      )

      // For 35-year-old male: 208 - (0.7 * 35) = 183.5 → 184
      const estimatedMax = estimateMaxHR(35, 'MALE')
      expect(estimatedMax).toBe(184)

      // Zones should be based on estimated max
      expect(result.zones[4].hrMax).toBe(estimatedMax)
    })

    it('should use Gulati formula for women', () => {
      const femaleClient = { ...mockClient, gender: 'FEMALE' as const }

      // Gulati: 206 - (0.88 * 35) = 175.2 → 175
      const estimatedMax = estimateMaxHR(35, 'FEMALE')
      expect(estimatedMax).toBe(175)

      const result = calculateTrainingZones(
        femaleClient,
        undefined,
        null,
        null,
        'RUNNING'
      )

      expect(result.zones[4].hrMax).toBe(175)
    })

    it('should use Tanaka formula for men', () => {
      // Tanaka: 208 - (0.7 * 35) = 183.5 → 184
      const estimatedMax = estimateMaxHR(35, 'MALE')
      expect(estimatedMax).toBe(184)
    })
  })

  describe('Power zones for cycling', () => {
    const cyclingLT1: Threshold = {
      heartRate: 145,
      value: 200, // watts
      unit: 'watt',
      lactate: 2.0,
      percentOfMax: 75
    }

    const cyclingLT2: Threshold = {
      heartRate: 170,
      value: 280, // watts
      unit: 'watt',
      lactate: 4.0,
      percentOfMax: 87
    }

    it('should add power ranges for cycling tests', () => {
      const result = calculateTrainingZones(
        mockClient,
        195,
        cyclingLT1,
        cyclingLT2,
        'CYCLING'
      )

      const zones = result.zones

      // All zones should have power ranges
      zones.forEach(zone => {
        expect(zone.powerMin).toBeDefined()
        expect(zone.powerMax).toBeDefined()
        expect(zone.powerMin!).toBeLessThan(zone.powerMax!)
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle missing maxHR but existing thresholds', () => {
      const result = calculateTrainingZones(
        mockClient,
        undefined, // No maxHR
        mockLT1,
        mockLT2,
        'RUNNING'
      )

      // Should fall back to estimation since maxHR is required for Tier 1
      expect(result.method).toBe('ESTIMATED')
      expect(result.confidence).toBe('LOW')
    })

    it('should handle only LT1 without LT2', () => {
      const result = calculateTrainingZones(
        mockClient,
        195,
        mockLT1,
        null, // No LT2
        'RUNNING'
      )

      // Should fall back since both thresholds are required
      expect(result.method).toBe('ESTIMATED')
      expect(result.confidence).toBe('LOW')
    })
  })

  describe('Zone distribution validation', () => {
    it('should create 5 distinct zones', () => {
      const result = calculateTrainingZones(
        mockClient,
        195,
        mockLT1,
        mockLT2,
        'RUNNING'
      )

      expect(result.zones).toHaveLength(5)
      expect(result.zones.map(z => z.zone)).toEqual([1, 2, 3, 4, 5])
    })

    it('should have non-overlapping HR zones', () => {
      const result = calculateTrainingZones(
        mockClient,
        195,
        mockLT1,
        mockLT2,
        'RUNNING'
      )

      const zones = result.zones

      for (let i = 0; i < zones.length - 1; i++) {
        // Each zone's max should be less than or equal to next zone's min
        expect(zones[i].hrMax).toBeLessThanOrEqual(zones[i + 1].hrMin + 1)
      }
    })

    it('should span from ~50% to 100% of maxHR', () => {
      const maxHR = 195
      const result = calculateTrainingZones(
        mockClient,
        maxHR,
        mockLT1,
        mockLT2,
        'RUNNING'
      )

      const zones = result.zones

      // Zone 1 should start around 50% max
      expect(zones[0].hrMin).toBeGreaterThanOrEqual(Math.round(maxHR * 0.4))
      expect(zones[0].hrMin).toBeLessThanOrEqual(Math.round(maxHR * 0.6))

      // Zone 5 should end at maxHR
      expect(zones[4].hrMax).toBe(maxHR)
    })
  })
})
