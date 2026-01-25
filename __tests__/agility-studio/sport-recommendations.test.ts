/**
 * Tests for Agility Studio Sport Recommendations
 *
 * Tests the following functions:
 * - getPrimaryFocus - Get primary agility focus for a sport
 * - getAllFocusAreas - Get all focus areas for a sport
 * - getSportDescription - Get sport-specific description
 * - getRecommendedDrills - Get recommended drills for sport/stage
 * - getWorkoutFocusRecommendations - Get workout phase recommendations
 * - getCategoryDistribution - Get category distribution for a workout
 */

import { describe, it, expect } from 'vitest'
import {
  getPrimaryFocus,
  getAllFocusAreas,
  getSportDescription,
  getRecommendedDrills,
  getWorkoutFocusRecommendations,
  getCategoryDistribution
} from '@/lib/agility-studio/sport-recommendations'
import type { AgilityDrill, AgilityDrillCategory } from '@/types'

// The sport-recommendations utility uses internal sport identifiers
// that differ from the exported SportType. Use type assertion for testing.
type InternalSportType =
  | 'FOOTBALL' | 'BASKETBALL' | 'HANDBALL' | 'ICE_HOCKEY' | 'FLOORBALL'
  | 'TENNIS' | 'BADMINTON' | 'SQUASH' | 'PADEL'
  | 'ATHLETICS' | 'SWIMMING' | 'TRIATHLON' | 'CROSS_COUNTRY_SKIING'
  | 'ORIENTEERING' | 'CYCLING' | 'ROWING' | 'GENERAL'

// Helper type for mock drill overrides that accepts internal sport types
type MockDrillOverrides = Omit<Partial<AgilityDrill>, 'primarySports'> & {
  primarySports?: InternalSportType[]
}

// Mock drill data for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockDrill = (overrides: MockDrillOverrides = {}): AgilityDrill => {
  const { primarySports, ...rest } = overrides
  return {
    id: 'drill-1',
    name: 'Test Drill',
    nameSv: 'Test Övning',
    description: 'Test description',
    descriptionSv: 'Test beskrivning',
    category: 'COD',
    requiredEquipment: [],
    optionalEquipment: [],
    distanceMeters: 10,
    durationSeconds: null,
    defaultReps: null,
    defaultSets: null,
    restSeconds: null,
    minDevelopmentStage: 'FUNDAMENTALS',
    maxDevelopmentStage: 'ELITE',
    primarySports: (primarySports || []) as AgilityDrill['primarySports'],
    difficultyLevel: 3,
    videoUrl: null,
    animationUrl: null,
    diagramUrl: null,
    coachId: null,
    isSystemDrill: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest
  }
}

describe('getPrimaryFocus', () => {
  it('should return primary focus for team sports', () => {
    const footballFocus = getPrimaryFocus('FOOTBALL')
    expect(footballFocus).toContain('COD')
    expect(footballFocus).toContain('REACTIVE_AGILITY')

    const basketballFocus = getPrimaryFocus('BASKETBALL')
    expect(basketballFocus).toContain('COD')
    expect(basketballFocus).toContain('PLYOMETRICS')
  })

  it('should return primary focus for racket sports', () => {
    const tennisFocus = getPrimaryFocus('TENNIS')
    expect(tennisFocus).toContain('COD')
    expect(tennisFocus).toContain('FOOTWORK')

    const badmintonFocus = getPrimaryFocus('BADMINTON')
    expect(badmintonFocus).toContain('FOOTWORK')
    expect(badmintonFocus).toContain('SPEED_ACCELERATION')
  })

  it('should return primary focus for endurance sports', () => {
    const athleticsFocus = getPrimaryFocus('ATHLETICS')
    expect(athleticsFocus).toContain('SPEED_ACCELERATION')
    expect(athleticsFocus).toContain('PLYOMETRICS')

    const cyclingFocus = getPrimaryFocus('CYCLING')
    expect(cyclingFocus).toContain('BALANCE')
    expect(cyclingFocus).toContain('PLYOMETRICS')
  })

  it('should return general focus for unknown sports', () => {
    // GENERAL sport should work
    const generalFocus = getPrimaryFocus('GENERAL')
    expect(generalFocus).toContain('COD')
    expect(generalFocus).toContain('SPEED_ACCELERATION')
  })

  it('should return non-empty array for all supported sports', () => {
    const sports: InternalSportType[] = [
      'FOOTBALL', 'BASKETBALL', 'HANDBALL', 'ICE_HOCKEY', 'FLOORBALL',
      'TENNIS', 'BADMINTON', 'SQUASH', 'PADEL',
      'ATHLETICS', 'SWIMMING', 'TRIATHLON', 'CROSS_COUNTRY_SKIING',
      'ORIENTEERING', 'CYCLING', 'ROWING', 'GENERAL'
    ]

    sports.forEach(sport => {
      const focus = getPrimaryFocus(sport)
      expect(focus.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('getAllFocusAreas', () => {
  it('should return both primary and secondary focus areas', () => {
    const footballFocus = getAllFocusAreas('FOOTBALL')

    // Should have both primary (COD, REACTIVE_AGILITY) and secondary (SPEED_ACCELERATION, FOOTWORK)
    expect(footballFocus).toContain('COD')
    expect(footballFocus).toContain('REACTIVE_AGILITY')
    expect(footballFocus).toContain('SPEED_ACCELERATION')
    expect(footballFocus).toContain('FOOTWORK')
  })

  it('should return more categories than primary focus alone', () => {
    const primary = getPrimaryFocus('TENNIS')
    const all = getAllFocusAreas('TENNIS')

    expect(all.length).toBeGreaterThan(primary.length)
  })
})

describe('getSportDescription', () => {
  it('should return description for each sport', () => {
    const footballDesc = getSportDescription('FOOTBALL')
    expect(footballDesc).toContain('direction')

    const swimmingDesc = getSportDescription('SWIMMING')
    expect(swimmingDesc.toLowerCase()).toContain('start')
  })

  it('should return non-empty string for all sports', () => {
    const sports: InternalSportType[] = [
      'FOOTBALL', 'BASKETBALL', 'HANDBALL', 'TENNIS', 'ATHLETICS'
    ]

    sports.forEach(sport => {
      const desc = getSportDescription(sport)
      expect(desc.length).toBeGreaterThan(10)
    })
  })
})

describe('getRecommendedDrills', () => {
  it('should filter drills by sport focus areas', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD' }),
      createMockDrill({ id: '2', category: 'REACTIVE_AGILITY' }),
      createMockDrill({ id: '3', category: 'BALANCE' }) // Not primary for football
    ]

    const recommended = getRecommendedDrills(drills, 'FOOTBALL')

    // FOOTBALL focus: COD, REACTIVE_AGILITY, SPEED_ACCELERATION, FOOTWORK
    // BALANCE is not in the focus areas
    expect(recommended.map(d => d.id)).toContain('1')
    expect(recommended.map(d => d.id)).toContain('2')
    expect(recommended.map(d => d.id)).not.toContain('3')
  })

  it('should filter by development stage', () => {
    const drills = [
      createMockDrill({
        id: '1',
        category: 'COD',
        minDevelopmentStage: 'FUNDAMENTALS',
        maxDevelopmentStage: 'LEARNING_TO_TRAIN'
      }),
      createMockDrill({
        id: '2',
        category: 'COD',
        minDevelopmentStage: 'TRAINING_TO_TRAIN',
        maxDevelopmentStage: 'ELITE'
      })
    ]

    const fundamentalsDrills = getRecommendedDrills(drills, 'FOOTBALL', 'FUNDAMENTALS')
    expect(fundamentalsDrills.map(d => d.id)).toContain('1')
    expect(fundamentalsDrills.map(d => d.id)).not.toContain('2')

    const eliteDrills = getRecommendedDrills(drills, 'FOOTBALL', 'ELITE')
    expect(eliteDrills.map(d => d.id)).not.toContain('1')
    expect(eliteDrills.map(d => d.id)).toContain('2')
  })

  it('should prioritize sport-specific drills', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', primarySports: ['FOOTBALL'], difficultyLevel: 3 }),
      createMockDrill({ id: '2', category: 'COD', primarySports: ['GENERAL'], difficultyLevel: 3 }),
      createMockDrill({ id: '3', category: 'COD', primarySports: [], difficultyLevel: 3 })
    ]

    const recommended = getRecommendedDrills(drills, 'FOOTBALL')

    // Sport-specific drill should come first
    expect(recommended[0].primarySports).toContain('FOOTBALL')
  })

  it('should sort by difficulty level within categories', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', primarySports: ['FOOTBALL'], difficultyLevel: 5 }),
      createMockDrill({ id: '2', category: 'COD', primarySports: ['FOOTBALL'], difficultyLevel: 1 }),
      createMockDrill({ id: '3', category: 'COD', primarySports: ['FOOTBALL'], difficultyLevel: 3 })
    ]

    const recommended = getRecommendedDrills(drills, 'FOOTBALL')

    // All have same sport priority, so sorted by difficulty
    expect(recommended[0].difficultyLevel).toBe(1)
    expect(recommended[1].difficultyLevel).toBe(3)
    expect(recommended[2].difficultyLevel).toBe(5)
  })

  it('should return empty array when no drills match', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'BALANCE' }) // Not in football focus
    ]

    const recommended = getRecommendedDrills(drills, 'FOOTBALL')
    expect(recommended).toHaveLength(0)
  })
})

describe('getWorkoutFocusRecommendations', () => {
  it('should return warmup, main, and cooldown phases', () => {
    const recommendations = getWorkoutFocusRecommendations('FOOTBALL')

    expect(recommendations).toHaveProperty('warmup')
    expect(recommendations).toHaveProperty('main')
    expect(recommendations).toHaveProperty('cooldown')
  })

  it('should include footwork and balance in warmup for all sports', () => {
    const sports: InternalSportType[] = ['FOOTBALL', 'TENNIS', 'ATHLETICS']

    sports.forEach(sport => {
      const recommendations = getWorkoutFocusRecommendations(sport)
      expect(recommendations.warmup).toContain('FOOTWORK')
      expect(recommendations.warmup).toContain('BALANCE')
    })
  })

  it('should include sport primary focus in main phase', () => {
    const footballRecs = getWorkoutFocusRecommendations('FOOTBALL')
    const footballPrimary = getPrimaryFocus('FOOTBALL')

    // Main should include primary focus areas
    footballPrimary.forEach(category => {
      expect(footballRecs.main).toContain(category)
    })
  })

  it('should include balance and footwork in cooldown', () => {
    const recommendations = getWorkoutFocusRecommendations('BASKETBALL')

    expect(recommendations.cooldown).toContain('BALANCE')
    expect(recommendations.cooldown).toContain('FOOTWORK')
  })
})

describe('getCategoryDistribution', () => {
  it('should distribute drills across primary and secondary categories', () => {
    const distribution = getCategoryDistribution('FOOTBALL', 10)

    // Should have distribution for primary categories (COD, REACTIVE_AGILITY)
    expect(distribution['COD']).toBeGreaterThan(0)
    expect(distribution['REACTIVE_AGILITY']).toBeGreaterThan(0)
  })

  it('should allocate roughly 60% to primary categories', () => {
    const distribution = getCategoryDistribution('FOOTBALL', 10)
    const primaryCategories: AgilityDrillCategory[] = ['COD', 'REACTIVE_AGILITY']

    const primaryTotal = primaryCategories.reduce((sum, cat) => sum + (distribution[cat] || 0), 0)

    // Should be approximately 60% (6 of 10 drills)
    expect(primaryTotal).toBeGreaterThanOrEqual(5)
    expect(primaryTotal).toBeLessThanOrEqual(7)
  })

  it('should handle small total drill counts', () => {
    const distribution = getCategoryDistribution('TENNIS', 4)

    // Should still have some distribution
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
    expect(total).toBeGreaterThanOrEqual(4)
  })

  it('should work for all sports', () => {
    const sports: InternalSportType[] = ['FOOTBALL', 'BASKETBALL', 'TENNIS', 'ATHLETICS', 'GENERAL']

    sports.forEach(sport => {
      const distribution = getCategoryDistribution(sport, 8)
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
      expect(total).toBeGreaterThanOrEqual(8)
    })
  })
})
