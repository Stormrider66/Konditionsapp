import { describe, it, expect } from 'vitest'
import {
  estimateFitnessLevel,
  estimateVO2maxFromVDOT,
  estimateVO2maxFromRestingHR,
  calculateVDOTFromRaceTime,
  getFitnessLevelFromVO2max,
  getThresholdPercentsForFitness,
  getEstimatedZonesForAthlete,
  getFitnessLevelDisplayName,
  getConfidenceDisplayName,
  FITNESS_LEVEL_THRESHOLDS
} from '../fitness-estimation'
import type { FitnessLevel } from '@/types'

describe('Fitness Level Estimation', () => {
  describe('estimateFitnessLevel', () => {
    describe('Priority 1: VDOT-based estimation', () => {
      it('should estimate ELITE level from high VDOT', () => {
        const result = estimateFitnessLevel({
          currentVDOT: 70
        })

        expect(result.level).toBe('ELITE')
        expect(result.confidence).toBe('HIGH')
        expect(result.source).toBe('VDOT')
        expect(result.estimatedVO2max).toBeCloseTo(66.5, 1) // 70 * 0.95
      })

      it('should estimate RECREATIONAL level from moderate VDOT', () => {
        const result = estimateFitnessLevel({
          currentVDOT: 45
        })

        expect(result.level).toBe('RECREATIONAL')
        expect(result.confidence).toBe('HIGH')
        expect(result.source).toBe('VDOT')
        expect(result.estimatedVO2max).toBeCloseTo(42.75, 1) // 45 * 0.95
      })

      it('should estimate UNTRAINED level from low VDOT', () => {
        const result = estimateFitnessLevel({
          currentVDOT: 30
        })

        expect(result.level).toBe('UNTRAINED')
        expect(result.confidence).toBe('HIGH')
        expect(result.source).toBe('VDOT')
      })

      it('should prioritize VDOT over other sources', () => {
        const result = estimateFitnessLevel({
          currentVDOT: 65,
          experienceLevel: 'BEGINNER',  // Should be ignored
          restingHR: 80,                 // Should be ignored
          age: 35
        })

        expect(result.source).toBe('VDOT')
        expect(result.confidence).toBe('HIGH')
        expect(result.level).toBe('WELL_TRAINED')
      })
    })

    describe('Priority 2: Race time-based estimation', () => {
      it('should estimate fitness from 5K race time', () => {
        const result = estimateFitnessLevel({
          recentRaceTime: {
            distance: '5K',
            timeMinutes: 20  // 20-minute 5K
          }
        })

        expect(result.confidence).toBe('HIGH')
        expect(result.source).toBe('RACE_TIME')
        expect(result.estimatedVO2max).toBeGreaterThan(40)
      })

      it('should estimate fitness from marathon time', () => {
        const result = estimateFitnessLevel({
          recentRaceTime: {
            distance: 'MARATHON',
            timeMinutes: 180  // 3-hour marathon
          }
        })

        expect(result.confidence).toBe('HIGH')
        expect(result.source).toBe('RACE_TIME')
        expect(result.estimatedVO2max).toBeDefined()
      })

      it('should estimate fitness from half marathon time', () => {
        const result = estimateFitnessLevel({
          recentRaceTime: {
            distance: 'HALF_MARATHON',
            timeMinutes: 90  // 1:30 half marathon
          }
        })

        expect(result.confidence).toBe('HIGH')
        expect(result.source).toBe('RACE_TIME')
      })
    })

    describe('Priority 3: Experience-based estimation', () => {
      it('should estimate BEGINNER fitness from beginner experience', () => {
        const result = estimateFitnessLevel({
          experienceLevel: 'BEGINNER'
        })

        expect(result.level).toBe('BEGINNER')
        expect(result.confidence).toBe('MEDIUM')
        expect(result.source).toBe('EXPERIENCE')
        expect(result.estimatedVO2max).toBe(38)
      })

      it('should estimate RECREATIONAL fitness from intermediate experience', () => {
        const result = estimateFitnessLevel({
          experienceLevel: 'INTERMEDIATE'
        })

        expect(result.level).toBe('RECREATIONAL')
        expect(result.confidence).toBe('MEDIUM')
        expect(result.estimatedVO2max).toBe(45)
      })

      it('should estimate TRAINED fitness from advanced experience', () => {
        const result = estimateFitnessLevel({
          experienceLevel: 'ADVANCED'
        })

        expect(result.level).toBe('TRAINED')
        expect(result.confidence).toBe('MEDIUM')
        expect(result.estimatedVO2max).toBe(52)
      })

      it('should estimate WELL_TRAINED fitness from elite experience', () => {
        const result = estimateFitnessLevel({
          experienceLevel: 'ELITE'
        })

        expect(result.level).toBe('WELL_TRAINED')
        expect(result.confidence).toBe('MEDIUM')
        expect(result.estimatedVO2max).toBe(60)
      })

      it('should adjust estimate based on weekly training hours', () => {
        const lowVolume = estimateFitnessLevel({
          experienceLevel: 'INTERMEDIATE',
          weeklyTrainingHours: 2
        })

        const highVolume = estimateFitnessLevel({
          experienceLevel: 'INTERMEDIATE',
          weeklyTrainingHours: 12
        })

        expect(highVolume.estimatedVO2max).toBeGreaterThan(lowVolume.estimatedVO2max!)
        expect(highVolume.source).toBe('COMBINED')
        expect(lowVolume.source).toBe('COMBINED')
      })
    })

    describe('Priority 4: Resting HR-based estimation', () => {
      it('should estimate fitness from low resting HR (fit athlete)', () => {
        const result = estimateFitnessLevel({
          restingHR: 45,
          age: 30,
          gender: 'MALE'
        })

        expect(result.confidence).toBe('LOW')
        expect(result.source).toBe('RESTING_HR')
        expect(result.estimatedVO2max).toBeGreaterThan(55) // Low RHR = high VO2max
        expect(result.level).toBe('WELL_TRAINED')
      })

      it('should estimate fitness from high resting HR (untrained)', () => {
        const result = estimateFitnessLevel({
          restingHR: 80,
          age: 30,
          gender: 'MALE'
        })

        expect(result.confidence).toBe('LOW')
        expect(result.source).toBe('RESTING_HR')
        expect(result.estimatedVO2max).toBeLessThan(40)
      })

      it('should account for age in resting HR estimation', () => {
        const young = estimateFitnessLevel({
          restingHR: 60,
          age: 25,
          gender: 'MALE'
        })

        const older = estimateFitnessLevel({
          restingHR: 60,
          age: 55,
          gender: 'MALE'
        })

        // Older athlete with same RHR should have lower estimated VO2max
        // (because their maxHR is lower)
        expect(older.estimatedVO2max).toBeLessThan(young.estimatedVO2max!)
      })
    })

    describe('Default fallback', () => {
      it('should return RECREATIONAL with LOW confidence when no data', () => {
        const result = estimateFitnessLevel({})

        expect(result.level).toBe('RECREATIONAL')
        expect(result.confidence).toBe('LOW')
        expect(result.estimatedVO2max).toBeNull()
      })
    })
  })

  describe('VO2max Estimation Functions', () => {
    describe('estimateVO2maxFromVDOT', () => {
      it('should estimate VO2max as 95% of VDOT', () => {
        expect(estimateVO2maxFromVDOT(50)).toBeCloseTo(47.5, 1)
        expect(estimateVO2maxFromVDOT(60)).toBeCloseTo(57, 1)
        expect(estimateVO2maxFromVDOT(70)).toBeCloseTo(66.5, 1)
      })
    })

    describe('estimateVO2maxFromRestingHR', () => {
      it('should estimate VO2max using Uth formula', () => {
        // Uth formula: VO2max = 15.3 × (HRmax / HRrest)
        // For a 30-year-old male: HRmax ≈ 208 - 0.7*30 = 187
        // With RHR 60: VO2max ≈ 15.3 × (187/60) ≈ 47.7
        const result = estimateVO2maxFromRestingHR(60, 30, 'MALE')
        expect(result).toBeCloseTo(47.7, 0)
      })

      it('should give higher VO2max for lower resting HR', () => {
        const lowRHR = estimateVO2maxFromRestingHR(45, 30, 'MALE')
        const highRHR = estimateVO2maxFromRestingHR(75, 30, 'MALE')

        expect(lowRHR).toBeGreaterThan(highRHR)
      })

      it('should use Gulati formula for females', () => {
        // Gulati: HRmax = 206 - 0.88 * age
        // For 30-year-old female: HRmax ≈ 206 - 26.4 = 179.6
        const result = estimateVO2maxFromRestingHR(60, 30, 'FEMALE')
        expect(result).toBeCloseTo(45.8, 0)
      })
    })

    describe('calculateVDOTFromRaceTime', () => {
      it('should calculate reasonable VDOT for 5K times', () => {
        // 20-minute 5K is a decent recreational time
        const vdot = calculateVDOTFromRaceTime('5K', 20)
        expect(vdot).toBeGreaterThan(35)
        expect(vdot).toBeLessThan(60)
      })

      it('should give higher VDOT for faster times', () => {
        const fast = calculateVDOTFromRaceTime('5K', 18)
        const slow = calculateVDOTFromRaceTime('5K', 25)

        expect(fast).toBeGreaterThan(slow)
      })

      it('should calculate VDOT for 10K', () => {
        const vdot = calculateVDOTFromRaceTime('10K', 45)
        expect(vdot).toBeGreaterThan(30)
        expect(vdot).toBeLessThan(60)
      })
    })
  })

  describe('Fitness Level Classification', () => {
    describe('getFitnessLevelFromVO2max', () => {
      it('should classify UNTRAINED for VO2max < 35', () => {
        expect(getFitnessLevelFromVO2max(30)).toBe('UNTRAINED')
        expect(getFitnessLevelFromVO2max(34)).toBe('UNTRAINED')
      })

      it('should classify BEGINNER for VO2max 35-40', () => {
        expect(getFitnessLevelFromVO2max(35)).toBe('BEGINNER')
        expect(getFitnessLevelFromVO2max(39)).toBe('BEGINNER')
      })

      it('should classify RECREATIONAL for VO2max 40-50', () => {
        expect(getFitnessLevelFromVO2max(40)).toBe('RECREATIONAL')
        expect(getFitnessLevelFromVO2max(49)).toBe('RECREATIONAL')
      })

      it('should classify TRAINED for VO2max 50-55', () => {
        expect(getFitnessLevelFromVO2max(50)).toBe('TRAINED')
        expect(getFitnessLevelFromVO2max(54)).toBe('TRAINED')
      })

      it('should classify WELL_TRAINED for VO2max 55-65', () => {
        expect(getFitnessLevelFromVO2max(55)).toBe('WELL_TRAINED')
        expect(getFitnessLevelFromVO2max(64)).toBe('WELL_TRAINED')
      })

      it('should classify ELITE for VO2max >= 65', () => {
        expect(getFitnessLevelFromVO2max(65)).toBe('ELITE')
        expect(getFitnessLevelFromVO2max(80)).toBe('ELITE')
      })
    })

    describe('getThresholdPercentsForFitness', () => {
      it('should return narrow Zone 2 for UNTRAINED', () => {
        const thresholds = getThresholdPercentsForFitness('UNTRAINED')

        expect(thresholds.lt1PercentHRmax).toBe(58)
        expect(thresholds.lt2PercentHRmax).toBe(78)
        // Zone 2 width = 78 - 58 = 20%
      })

      it('should return moderate Zone 2 for RECREATIONAL', () => {
        const thresholds = getThresholdPercentsForFitness('RECREATIONAL')

        expect(thresholds.lt1PercentHRmax).toBe(68)
        expect(thresholds.lt2PercentHRmax).toBe(84)
        // Zone 2 width = 84 - 68 = 16%
      })

      it('should return wide Zone 2 for ELITE', () => {
        const thresholds = getThresholdPercentsForFitness('ELITE')

        expect(thresholds.lt1PercentHRmax).toBe(78)
        expect(thresholds.lt2PercentHRmax).toBe(93)
        // Zone 2 width = 93 - 78 = 15%
      })

      it('should have progressive thresholds from UNTRAINED to ELITE', () => {
        const levels: FitnessLevel[] = [
          'UNTRAINED', 'BEGINNER', 'RECREATIONAL', 'TRAINED', 'WELL_TRAINED', 'ELITE'
        ]

        let prevLT1 = 0
        let prevLT2 = 0

        for (const level of levels) {
          const thresholds = getThresholdPercentsForFitness(level)

          // LT1 should increase as fitness improves
          expect(thresholds.lt1PercentHRmax).toBeGreaterThan(prevLT1)
          // LT2 should increase as fitness improves
          expect(thresholds.lt2PercentHRmax).toBeGreaterThan(prevLT2)

          prevLT1 = thresholds.lt1PercentHRmax
          prevLT2 = thresholds.lt2PercentHRmax
        }
      })
    })
  })

  describe('FITNESS_LEVEL_THRESHOLDS constants', () => {
    it('should have valid VO2max ranges', () => {
      expect(FITNESS_LEVEL_THRESHOLDS.UNTRAINED.vo2maxMax).toBe(35)
      expect(FITNESS_LEVEL_THRESHOLDS.BEGINNER.vo2maxMin).toBe(35)
      expect(FITNESS_LEVEL_THRESHOLDS.BEGINNER.vo2maxMax).toBe(40)
      expect(FITNESS_LEVEL_THRESHOLDS.ELITE.vo2maxMin).toBe(65)
    })

    it('should have valid LT1/LT2 percentages', () => {
      const levels = Object.keys(FITNESS_LEVEL_THRESHOLDS) as FitnessLevel[]

      for (const level of levels) {
        const thresholds = FITNESS_LEVEL_THRESHOLDS[level]

        expect(thresholds.lt1Percent).toBeGreaterThan(50)
        expect(thresholds.lt1Percent).toBeLessThan(85)
        expect(thresholds.lt2Percent).toBeGreaterThan(70)
        expect(thresholds.lt2Percent).toBeLessThan(100)
        expect(thresholds.lt2Percent).toBeGreaterThan(thresholds.lt1Percent)
      }
    })
  })

  describe('getEstimatedZonesForAthlete', () => {
    it('should return 5 training zones', () => {
      const result = getEstimatedZonesForAthlete({
        age: 35,
        gender: 'MALE',
        experienceLevel: 'INTERMEDIATE'
      })

      expect(result.zones).toHaveLength(5)
      expect(result.zones[0].zone).toBe(1)
      expect(result.zones[4].zone).toBe(5)
    })

    it('should include fitness estimate in result', () => {
      const result = getEstimatedZonesForAthlete({
        age: 30,
        gender: 'MALE',
        currentVDOT: 55
      })

      expect(result.fitnessEstimate).toBeDefined()
      expect(result.fitnessEstimate.level).toBe('TRAINED')
      expect(result.fitnessEstimate.confidence).toBe('HIGH')
    })

    it('should add warning for beginners about narrow Zone 2', () => {
      const result = getEstimatedZonesForAthlete({
        age: 35,
        gender: 'MALE',
        experienceLevel: 'BEGINNER'
      })

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('smal'))).toBe(true)
    })

    it('should add warning for untrained athletes', () => {
      const result = getEstimatedZonesForAthlete({
        age: 45,
        gender: 'FEMALE',
        currentVDOT: 28  // Very low VDOT
      })

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('gång/löp'))).toBe(true)
    })

    it('should add low confidence warning when no good data', () => {
      const result = getEstimatedZonesForAthlete({
        age: 35,
        gender: 'MALE'
        // No VDOT, race time, or experience level
      })

      expect(result.fitnessEstimate.confidence).toBe('LOW')
      expect(result.warnings.some(w => w.includes('låg säkerhet'))).toBe(true)
    })

    it('should use provided maxHR', () => {
      const result = getEstimatedZonesForAthlete({
        age: 35,
        gender: 'MALE',
        maxHR: 190,
        experienceLevel: 'INTERMEDIATE'
      })

      // Zone 5 max should be the provided maxHR
      const zone5 = result.zones.find(z => z.zone === 5)
      expect(zone5?.hrMax).toBe(190)
    })

    it('should estimate maxHR when not provided', () => {
      const result = getEstimatedZonesForAthlete({
        age: 40,
        gender: 'MALE',
        experienceLevel: 'INTERMEDIATE'
      })

      // Expected maxHR for 40-year-old male: 208 - 0.7*40 = 180
      const zone5 = result.zones.find(z => z.zone === 5)
      expect(zone5?.hrMax).toBeGreaterThanOrEqual(175)
      expect(zone5?.hrMax).toBeLessThanOrEqual(185)
    })

    it('should produce different zones for different fitness levels', () => {
      const beginner = getEstimatedZonesForAthlete({
        age: 35,
        gender: 'MALE',
        maxHR: 185,
        experienceLevel: 'BEGINNER'
      })

      const elite = getEstimatedZonesForAthlete({
        age: 35,
        gender: 'MALE',
        maxHR: 185,
        currentVDOT: 70  // Elite VDOT
      })

      // Zone 2 should be different
      const beginnerZ2 = beginner.zones.find(z => z.zone === 2)
      const eliteZ2 = elite.zones.find(z => z.zone === 2)

      // Elite should have higher Zone 2 ceiling (higher LT1)
      expect(eliteZ2?.hrMax).toBeGreaterThan(beginnerZ2?.hrMax!)
    })

    it('should have non-overlapping zone boundaries', () => {
      const result = getEstimatedZonesForAthlete({
        age: 30,
        gender: 'FEMALE',
        experienceLevel: 'ADVANCED'
      })

      for (let i = 0; i < result.zones.length - 1; i++) {
        expect(result.zones[i].hrMax).toBeLessThanOrEqual(result.zones[i + 1].hrMin + 1)
      }
    })
  })

  describe('Display Helpers', () => {
    describe('getFitnessLevelDisplayName', () => {
      it('should return Swedish names for all levels', () => {
        expect(getFitnessLevelDisplayName('UNTRAINED')).toBe('Otränad')
        expect(getFitnessLevelDisplayName('BEGINNER')).toBe('Nybörjare')
        expect(getFitnessLevelDisplayName('RECREATIONAL')).toBe('Motionär')
        expect(getFitnessLevelDisplayName('TRAINED')).toBe('Tränad')
        expect(getFitnessLevelDisplayName('WELL_TRAINED')).toBe('Vältränad')
        expect(getFitnessLevelDisplayName('ELITE')).toBe('Elit')
      })
    })

    describe('getConfidenceDisplayName', () => {
      it('should return Swedish names for confidence levels', () => {
        expect(getConfidenceDisplayName('HIGH')).toBe('Hög')
        expect(getConfidenceDisplayName('MEDIUM')).toBe('Medel')
        expect(getConfidenceDisplayName('LOW')).toBe('Låg')
      })
    })
  })

  describe('Accordion Effect Validation', () => {
    it('should demonstrate narrow Zone 2 for untrained athletes', () => {
      const result = getEstimatedZonesForAthlete({
        age: 40,
        gender: 'MALE',
        maxHR: 180,
        currentVDOT: 28  // Untrained
      })

      const zone2 = result.zones.find(z => z.zone === 2)
      const zone2Width = zone2!.hrMax - zone2!.hrMin

      // Zone 2 should be relatively narrow for untrained
      expect(zone2Width).toBeLessThan(25)
    })

    it('should demonstrate wide Zone 2 for elite athletes', () => {
      const result = getEstimatedZonesForAthlete({
        age: 28,
        gender: 'MALE',
        maxHR: 190,
        currentVDOT: 75  // Elite
      })

      const zone2 = result.zones.find(z => z.zone === 2)
      const zone2Width = zone2!.hrMax - zone2!.hrMin

      // Zone 2 should be reasonable width for elite (at least 10 bpm)
      // Elite has higher LT1 which creates a usable Zone 2 range
      expect(zone2Width).toBeGreaterThanOrEqual(10)
    })

    it('should show LT1 % increasing with fitness', () => {
      const untrained = estimateFitnessLevel({ currentVDOT: 28 })
      const recreational = estimateFitnessLevel({ currentVDOT: 45 })
      const elite = estimateFitnessLevel({ currentVDOT: 75 })

      expect(recreational.lt1PercentHRmax).toBeGreaterThan(untrained.lt1PercentHRmax)
      expect(elite.lt1PercentHRmax).toBeGreaterThan(recreational.lt1PercentHRmax)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero VDOT gracefully', () => {
      const result = estimateFitnessLevel({
        currentVDOT: 0,
        experienceLevel: 'INTERMEDIATE'  // Should fall back to this
      })

      expect(result.source).toBe('EXPERIENCE')
    })

    it('should handle very young age', () => {
      const result = getEstimatedZonesForAthlete({
        age: 16,
        gender: 'MALE',
        experienceLevel: 'BEGINNER'
      })

      expect(result.zones).toHaveLength(5)
      // Should still produce valid zones
      result.zones.forEach(zone => {
        expect(zone.hrMin).toBeGreaterThan(0)
        expect(zone.hrMax).toBeGreaterThan(zone.hrMin)
      })
    })

    it('should handle very old age', () => {
      const result = getEstimatedZonesForAthlete({
        age: 75,
        gender: 'FEMALE',
        experienceLevel: 'INTERMEDIATE'
      })

      expect(result.zones).toHaveLength(5)
      // MaxHR should be lower for older athlete
      const zone5 = result.zones.find(z => z.zone === 5)
      expect(zone5?.hrMax).toBeLessThan(160)
    })

    it('should handle very fast race times', () => {
      const result = estimateFitnessLevel({
        recentRaceTime: {
          distance: '5K',
          timeMinutes: 14  // World-class time
        }
      })

      expect(result.level).toBe('ELITE')
      expect(result.confidence).toBe('HIGH')
    })

    it('should handle very slow race times', () => {
      const result = estimateFitnessLevel({
        recentRaceTime: {
          distance: '5K',
          timeMinutes: 45  // Very slow
        }
      })

      expect(result.level).toBe('UNTRAINED')
      expect(result.confidence).toBe('HIGH')
    })
  })
})
