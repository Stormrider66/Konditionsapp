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
import type { AgilityDrill, AgilityDrillCategory, SportType } from '@/types'

// Mock drill data for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockDrill = (overrides: Partial<AgilityDrill> = {}): AgilityDrill => {
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
    primarySports: [],
    difficultyLevel: 3,
    videoUrl: null,
    animationUrl: null,
    diagramUrl: null,
    coachId: null,
    isSystemDrill: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

describe('getPrimaryFocus', () => {
  it('should return primary focus for team sports', () => {
    const footballFocus = getPrimaryFocus('TEAM_FOOTBALL')
    expect(footballFocus).toContain('COD')
    expect(footballFocus).toContain('REACTIVE_AGILITY')

    const basketballFocus = getPrimaryFocus('TEAM_BASKETBALL')
    expect(basketballFocus).toContain('COD')
    expect(basketballFocus).toContain('PLYOMETRICS')
  })

  it('should return primary focus for racket sports', () => {
    const tennisFocus = getPrimaryFocus('TENNIS')
    expect(tennisFocus).toContain('COD')
    expect(tennisFocus).toContain('FOOTWORK')

    const padelFocus = getPrimaryFocus('PADEL')
    expect(padelFocus).toContain('FOOTWORK')
    expect(padelFocus).toContain('COD')
  })

  it('should return primary focus for endurance sports', () => {
    const runningFocus = getPrimaryFocus('RUNNING')
    expect(runningFocus).toContain('SPEED_ACCELERATION')
    expect(runningFocus).toContain('PLYOMETRICS')

    const cyclingFocus = getPrimaryFocus('CYCLING')
    expect(cyclingFocus).toContain('BALANCE')
    expect(cyclingFocus).toContain('PLYOMETRICS')
  })

  it('should return general focus for unsupported sports', () => {
    // GENERAL_FITNESS sport should work
    const generalFocus = getPrimaryFocus('GENERAL_FITNESS')
    expect(generalFocus).toContain('COD')
    expect(generalFocus).toContain('SPEED_ACCELERATION')
  })

  it('should return non-empty array for all supported sports', () => {
    const sports: SportType[] = [
      'TEAM_FOOTBALL', 'TEAM_BASKETBALL', 'TEAM_HANDBALL', 'TEAM_ICE_HOCKEY', 'TEAM_FLOORBALL',
      'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
      'RUNNING', 'SWIMMING', 'TRIATHLON', 'SKIING',
      'CYCLING', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH'
    ]

    sports.forEach(sport => {
      const focus = getPrimaryFocus(sport)
      expect(focus.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('getAllFocusAreas', () => {
  it('should return both primary and secondary focus areas', () => {
    const footballFocus = getAllFocusAreas('TEAM_FOOTBALL')

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
    const footballDesc = getSportDescription('TEAM_FOOTBALL')
    expect(footballDesc).toContain('direction')

    const swimmingDesc = getSportDescription('SWIMMING')
    expect(swimmingDesc.toLowerCase()).toContain('start')
  })

  it('should return non-empty string for all sports', () => {
    const sports: SportType[] = [
      'TEAM_FOOTBALL', 'TEAM_BASKETBALL', 'TEAM_HANDBALL', 'TENNIS', 'RUNNING'
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

    const recommended = getRecommendedDrills(drills, 'TEAM_FOOTBALL')

    // TEAM_FOOTBALL focus: COD, REACTIVE_AGILITY, SPEED_ACCELERATION, FOOTWORK
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

    const fundamentalsDrills = getRecommendedDrills(drills, 'TEAM_FOOTBALL', 'FUNDAMENTALS')
    expect(fundamentalsDrills.map(d => d.id)).toContain('1')
    expect(fundamentalsDrills.map(d => d.id)).not.toContain('2')

    const eliteDrills = getRecommendedDrills(drills, 'TEAM_FOOTBALL', 'ELITE')
    expect(eliteDrills.map(d => d.id)).not.toContain('1')
    expect(eliteDrills.map(d => d.id)).toContain('2')
  })

  it('should prioritize sport-specific drills', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', primarySports: ['TEAM_FOOTBALL'], difficultyLevel: 3 }),
      createMockDrill({ id: '2', category: 'COD', primarySports: ['GENERAL_FITNESS'], difficultyLevel: 3 }),
      createMockDrill({ id: '3', category: 'COD', primarySports: [], difficultyLevel: 3 })
    ]

    const recommended = getRecommendedDrills(drills, 'TEAM_FOOTBALL')

    // Sport-specific drill should come first
    expect(recommended[0].primarySports).toContain('TEAM_FOOTBALL')
  })

  it('should sort by difficulty level within categories', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', primarySports: ['TEAM_FOOTBALL'], difficultyLevel: 5 }),
      createMockDrill({ id: '2', category: 'COD', primarySports: ['TEAM_FOOTBALL'], difficultyLevel: 1 }),
      createMockDrill({ id: '3', category: 'COD', primarySports: ['TEAM_FOOTBALL'], difficultyLevel: 3 })
    ]

    const recommended = getRecommendedDrills(drills, 'TEAM_FOOTBALL')

    // All have same sport priority, so sorted by difficulty
    expect(recommended[0].difficultyLevel).toBe(1)
    expect(recommended[1].difficultyLevel).toBe(3)
    expect(recommended[2].difficultyLevel).toBe(5)
  })

  it('should return empty array when no drills match', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'BALANCE' }) // Not in football focus
    ]

    const recommended = getRecommendedDrills(drills, 'TEAM_FOOTBALL')
    expect(recommended).toHaveLength(0)
  })
})

describe('getWorkoutFocusRecommendations', () => {
  it('should return warmup, main, and cooldown phases', () => {
    const recommendations = getWorkoutFocusRecommendations('TEAM_FOOTBALL')

    expect(recommendations).toHaveProperty('warmup')
    expect(recommendations).toHaveProperty('main')
    expect(recommendations).toHaveProperty('cooldown')
  })

  it('should include footwork and balance in warmup for all sports', () => {
    const sports: SportType[] = ['TEAM_FOOTBALL', 'TENNIS', 'RUNNING']

    sports.forEach(sport => {
      const recommendations = getWorkoutFocusRecommendations(sport)
      expect(recommendations.warmup).toContain('FOOTWORK')
      expect(recommendations.warmup).toContain('BALANCE')
    })
  })

  it('should include sport primary focus in main phase', () => {
    const footballRecs = getWorkoutFocusRecommendations('TEAM_FOOTBALL')
    const footballPrimary = getPrimaryFocus('TEAM_FOOTBALL')

    // Main should include primary focus areas
    footballPrimary.forEach(category => {
      expect(footballRecs.main).toContain(category)
    })
  })

  it('should include balance and footwork in cooldown', () => {
    const recommendations = getWorkoutFocusRecommendations('TEAM_BASKETBALL')

    expect(recommendations.cooldown).toContain('BALANCE')
    expect(recommendations.cooldown).toContain('FOOTWORK')
  })
})

describe('getCategoryDistribution', () => {
  it('should distribute drills across primary and secondary categories', () => {
    const distribution = getCategoryDistribution('TEAM_FOOTBALL', 10)

    // Should have distribution for primary categories (COD, REACTIVE_AGILITY)
    expect(distribution['COD']).toBeGreaterThan(0)
    expect(distribution['REACTIVE_AGILITY']).toBeGreaterThan(0)
  })

  it('should allocate roughly 60% to primary categories', () => {
    const distribution = getCategoryDistribution('TEAM_FOOTBALL', 10)
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
    const sports: SportType[] = ['TEAM_FOOTBALL', 'TEAM_BASKETBALL', 'TENNIS', 'RUNNING', 'GENERAL_FITNESS']

    sports.forEach(sport => {
      const distribution = getCategoryDistribution(sport, 8)
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
      expect(total).toBeGreaterThanOrEqual(8)
    })
  })
})
