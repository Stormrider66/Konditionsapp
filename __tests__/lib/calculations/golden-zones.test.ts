/**
 * Training-zone golden snapshots.
 *
 * Pins Tier 1 (lactate-derived) and Tier 3 (%HRmax fallback) zone
 * outputs for a representative runner. Zones feed every workout
 * prescription, so silent shifts in boundaries or intensity ranges
 * need to fail loudly.
 */

import { describe, it, expect } from 'vitest'
import type { Client, Threshold } from '@/types'
import {
  calculateTrainingZones,
  estimateMaxHR,
} from '@/lib/calculations/zones'

const CLIENT: Client = {
  id: 'golden-client',
  userId: 'golden-user',
  name: 'Golden Runner',
  gender: 'MALE',
  birthDate: new Date('1990-01-01'),
  height: 180,
  weight: 75,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  teamId: null,
}

const LT1: Threshold = {
  heartRate: 145,
  value: 12,
  unit: 'km/h',
  percentOfMax: 76,
}

const LT2: Threshold = {
  heartRate: 170,
  value: 16,
  unit: 'km/h',
  percentOfMax: 89,
}

describe('Training zones golden snapshots', () => {
  describe('Tier 1 — lactate-derived zones (running)', () => {
    const result = calculateTrainingZones(CLIENT, 190, LT1, LT2, 'RUNNING')

    it('returns HIGH confidence when LT1 + LT2 + maxHR are present', () => {
      expect(result.confidence).toBe('HIGH')
      expect(result.method).toBe('LACTATE_TEST')
    })

    it('produces exactly five zones with monotonic HR ranges', () => {
      expect(result.zones).toHaveLength(5)
      for (let i = 0; i < result.zones.length; i++) {
        const z = result.zones[i]
        expect(z.hrMin).toBeLessThanOrEqual(z.hrMax)
        if (i > 0) {
          expect(z.hrMin).toBe(result.zones[i - 1].hrMax + 1)
        }
      }
    })

    it('places LT1 inside or adjacent to zone 2', () => {
      const z2 = result.zones[1]
      expect(z2.hrMax).toBeGreaterThanOrEqual(LT1.heartRate - 1)
      expect(z2.hrMax).toBeLessThanOrEqual(LT1.heartRate + 6)
    })

    it('places LT2 inside zone 4', () => {
      const z4 = result.zones[3]
      expect(LT2.heartRate).toBeGreaterThanOrEqual(z4.hrMin - 6)
      expect(LT2.heartRate).toBeLessThanOrEqual(z4.hrMax + 1)
    })

    it('attaches speed ranges to every zone for running', () => {
      for (const zone of result.zones) {
        expect(zone.speedMin).toBeDefined()
        expect(zone.speedMax).toBeDefined()
        expect(zone.speedMin!).toBeLessThanOrEqual(zone.speedMax!)
      }
    })

    it('top zone caps at maxHR', () => {
      const z5 = result.zones[4]
      expect(z5.hrMax).toBe(190)
      expect(z5.percentMax).toBe(100)
    })
  })

  describe('Tier 1 — lactate-derived zones (cycling)', () => {
    const lt1Power: Threshold = {
      heartRate: 150,
      value: 220,
      unit: 'watt',
      percentOfMax: 79,
    }
    const lt2Power: Threshold = {
      heartRate: 170,
      value: 290,
      unit: 'watt',
      percentOfMax: 89,
    }
    const result = calculateTrainingZones(
      CLIENT,
      190,
      lt1Power,
      lt2Power,
      'CYCLING'
    )

    it('attaches power ranges instead of speed', () => {
      for (const zone of result.zones) {
        expect(zone.powerMin).toBeDefined()
        expect(zone.powerMax).toBeDefined()
        expect(zone.speedMin).toBeUndefined()
      }
    })

    it('zone 4 power bracket straddles LT2 power', () => {
      const z4 = result.zones[3]
      expect(z4.powerMin!).toBeLessThanOrEqual(lt2Power.value)
      expect(z4.powerMax!).toBeGreaterThanOrEqual(lt2Power.value)
    })
  })

  describe('Tier 1 — narrow LT1/LT2 gap', () => {
    const narrowLT1: Threshold = { ...LT1, heartRate: 155, percentOfMax: 82 }
    const narrowLT2: Threshold = { ...LT2, heartRate: 165, percentOfMax: 87 }
    const result = calculateTrainingZones(
      CLIENT,
      190,
      narrowLT1,
      narrowLT2,
      'RUNNING',
      undefined,
      undefined,
      'sv'
    )

    it('emits a warning about close thresholds', () => {
      expect(result.warning).toMatch(/nära varandra/i)
    })

    it('keeps zones non-overlapping even with a 10 bpm gap', () => {
      for (let i = 1; i < result.zones.length; i++) {
        expect(result.zones[i].hrMin).toBeGreaterThan(result.zones[i - 1].hrMax)
      }
    })
  })

  describe('Tier 3 — %HRmax fallback', () => {
    const result = calculateTrainingZones(CLIENT, undefined, null, null, 'RUNNING')

    it('returns LOW confidence and a guidance warning', () => {
      expect(result.confidence).toBe('LOW')
      expect(result.method).toBe('ESTIMATED')
      expect(result.warning).toBeDefined()
    })

    it('uses Tanaka for a 36-year-old male', () => {
      const z5 = result.zones[4]
      expect(z5.hrMax).toBe(estimateMaxHR(36, 'MALE'))
    })

    it('produces five zones covering 50%–100% of HRmax', () => {
      expect(result.zones).toHaveLength(5)
      expect(result.zones[0].percentMin).toBe(50)
      expect(result.zones[4].percentMax).toBe(100)
    })
  })

  describe('MaxHR estimation', () => {
    it('uses Gulati for women: 206 - 0.88 * age', () => {
      expect(estimateMaxHR(30, 'FEMALE')).toBe(Math.round(206 - 0.88 * 30))
    })

    it('uses Tanaka for men: 208 - 0.7 * age', () => {
      expect(estimateMaxHR(30, 'MALE')).toBe(Math.round(208 - 0.7 * 30))
    })
  })
})
