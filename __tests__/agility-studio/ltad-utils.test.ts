/**
 * Tests for Agility Studio LTAD (Long-Term Athlete Development) Utilities
 *
 * Tests the following functions:
 * - getDevelopmentStageFromAge - Estimate stage from birth date
 * - getAgeRangeForStage - Get min/max ages for a stage
 * - getStageDescription - Get stage description
 * - filterDrillsByStage - Filter drills for a stage
 * - getTrainingGuidelines - Get guidelines for a stage
 * - isDrillAppropriateForAge - Check if drill is appropriate for age
 * - getRecommendedCategories - Get recommended categories for a stage
 * - getSessionDurationRange - Get duration recommendations
 * - getWeeklyFrequency - Get weekly frequency recommendations
 * - sortDrillsByStageAppropriateness - Sort drills by stage fit
 * - getMaturationConsiderations - Get maturation considerations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDevelopmentStageFromAge,
  getAgeRangeForStage,
  getStageDescription,
  filterDrillsByStage,
  getTrainingGuidelines,
  isDrillAppropriateForAge,
  getRecommendedCategories,
  getSessionDurationRange,
  getWeeklyFrequency,
  sortDrillsByStageAppropriateness,
  getMaturationConsiderations
} from '@/lib/agility-studio/ltad-utils'
import type { AgilityDrill, DevelopmentStage } from '@/types'

// Mock drill data for testing
const createMockDrill = (overrides: Partial<AgilityDrill> = {}): AgilityDrill => ({
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
})

// Helper to create a birth date for a specific age
const createBirthDateForAge = (age: number): Date => {
  const now = new Date()
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate())
}

describe('getDevelopmentStageFromAge', () => {
  it('should return FUNDAMENTALS for ages under 9', () => {
    expect(getDevelopmentStageFromAge(createBirthDateForAge(6))).toBe('FUNDAMENTALS')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(8))).toBe('FUNDAMENTALS')
  })

  it('should return LEARNING_TO_TRAIN for ages 9-11', () => {
    expect(getDevelopmentStageFromAge(createBirthDateForAge(9))).toBe('LEARNING_TO_TRAIN')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(10))).toBe('LEARNING_TO_TRAIN')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(11))).toBe('LEARNING_TO_TRAIN')
  })

  it('should return TRAINING_TO_TRAIN for ages 12-15', () => {
    expect(getDevelopmentStageFromAge(createBirthDateForAge(12))).toBe('TRAINING_TO_TRAIN')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(14))).toBe('TRAINING_TO_TRAIN')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(15))).toBe('TRAINING_TO_TRAIN')
  })

  it('should return TRAINING_TO_COMPETE for ages 16-17', () => {
    expect(getDevelopmentStageFromAge(createBirthDateForAge(16))).toBe('TRAINING_TO_COMPETE')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(17))).toBe('TRAINING_TO_COMPETE')
  })

  it('should return TRAINING_TO_WIN for ages 18-24', () => {
    expect(getDevelopmentStageFromAge(createBirthDateForAge(18))).toBe('TRAINING_TO_WIN')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(22))).toBe('TRAINING_TO_WIN')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(24))).toBe('TRAINING_TO_WIN')
  })

  it('should return ELITE for ages 25+', () => {
    expect(getDevelopmentStageFromAge(createBirthDateForAge(25))).toBe('ELITE')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(30))).toBe('ELITE')
    expect(getDevelopmentStageFromAge(createBirthDateForAge(40))).toBe('ELITE')
  })

  it('should accept string dates', () => {
    const birthDate = createBirthDateForAge(14).toISOString()
    expect(getDevelopmentStageFromAge(birthDate)).toBe('TRAINING_TO_TRAIN')
  })
})

describe('getAgeRangeForStage', () => {
  it('should return correct range for FUNDAMENTALS', () => {
    const range = getAgeRangeForStage('FUNDAMENTALS')
    expect(range.min).toBe(6)
    expect(range.max).toBe(9)
  })

  it('should return correct range for LEARNING_TO_TRAIN', () => {
    const range = getAgeRangeForStage('LEARNING_TO_TRAIN')
    expect(range.min).toBe(9)
    expect(range.max).toBe(12)
  })

  it('should return correct range for TRAINING_TO_TRAIN', () => {
    const range = getAgeRangeForStage('TRAINING_TO_TRAIN')
    expect(range.min).toBe(12)
    expect(range.max).toBe(16)
  })

  it('should return correct range for TRAINING_TO_COMPETE', () => {
    const range = getAgeRangeForStage('TRAINING_TO_COMPETE')
    expect(range.min).toBe(16)
    expect(range.max).toBe(18)
  })

  it('should return correct range for TRAINING_TO_WIN', () => {
    const range = getAgeRangeForStage('TRAINING_TO_WIN')
    expect(range.min).toBe(18)
    expect(range.max).toBe(25)
  })

  it('should return correct range for ELITE', () => {
    const range = getAgeRangeForStage('ELITE')
    expect(range.min).toBe(25)
    expect(range.max).toBe(99)
  })
})

describe('getStageDescription', () => {
  it('should return description for each stage', () => {
    const stages: DevelopmentStage[] = [
      'FUNDAMENTALS', 'LEARNING_TO_TRAIN', 'TRAINING_TO_TRAIN',
      'TRAINING_TO_COMPETE', 'TRAINING_TO_WIN', 'ELITE'
    ]

    stages.forEach(stage => {
      const description = getStageDescription(stage)
      expect(description.length).toBeGreaterThan(20)
    })
  })

  it('should mention fun for FUNDAMENTALS', () => {
    const description = getStageDescription('FUNDAMENTALS')
    expect(description.toLowerCase()).toContain('fun')
  })

  it('should mention technique for LEARNING_TO_TRAIN', () => {
    const description = getStageDescription('LEARNING_TO_TRAIN')
    expect(description.toLowerCase()).toContain('technique')
  })
})

describe('filterDrillsByStage', () => {
  it('should filter drills appropriate for a stage', () => {
    const drills = [
      createMockDrill({
        id: '1',
        minDevelopmentStage: 'FUNDAMENTALS',
        maxDevelopmentStage: 'LEARNING_TO_TRAIN'
      }),
      createMockDrill({
        id: '2',
        minDevelopmentStage: 'TRAINING_TO_TRAIN',
        maxDevelopmentStage: 'ELITE'
      }),
      createMockDrill({
        id: '3',
        minDevelopmentStage: 'FUNDAMENTALS',
        maxDevelopmentStage: 'ELITE'
      })
    ]

    const fundamentalsResults = filterDrillsByStage(drills, 'FUNDAMENTALS')
    expect(fundamentalsResults).toHaveLength(2)
    expect(fundamentalsResults.map(d => d.id)).toContain('1')
    expect(fundamentalsResults.map(d => d.id)).toContain('3')
    expect(fundamentalsResults.map(d => d.id)).not.toContain('2')
  })

  it('should include drills where stage is within range', () => {
    const drills = [
      createMockDrill({
        id: '1',
        minDevelopmentStage: 'LEARNING_TO_TRAIN',
        maxDevelopmentStage: 'TRAINING_TO_COMPETE'
      })
    ]

    expect(filterDrillsByStage(drills, 'TRAINING_TO_TRAIN')).toHaveLength(1)
    expect(filterDrillsByStage(drills, 'FUNDAMENTALS')).toHaveLength(0)
    expect(filterDrillsByStage(drills, 'TRAINING_TO_WIN')).toHaveLength(0)
  })

  it('should return empty array when no drills match', () => {
    const drills = [
      createMockDrill({
        id: '1',
        minDevelopmentStage: 'ELITE',
        maxDevelopmentStage: 'ELITE'
      })
    ]

    expect(filterDrillsByStage(drills, 'FUNDAMENTALS')).toHaveLength(0)
  })
})

describe('getTrainingGuidelines', () => {
  it('should return guidelines for each stage', () => {
    const stages: DevelopmentStage[] = [
      'FUNDAMENTALS', 'LEARNING_TO_TRAIN', 'TRAINING_TO_TRAIN',
      'TRAINING_TO_COMPETE', 'TRAINING_TO_WIN', 'ELITE'
    ]

    stages.forEach(stage => {
      const guidelines = getTrainingGuidelines(stage)
      expect(guidelines).toHaveProperty('volumeGuidance')
      expect(guidelines).toHaveProperty('intensityGuidance')
      expect(guidelines).toHaveProperty('focusAreas')
      expect(guidelines).toHaveProperty('restRatio')
      expect(guidelines).toHaveProperty('sessionDuration')
      expect(guidelines).toHaveProperty('sessionsPerWeek')
      expect(guidelines).toHaveProperty('keyConsiderations')
    })
  })

  it('should have lower intensity for younger stages', () => {
    const fundamentals = getTrainingGuidelines('FUNDAMENTALS')
    expect(fundamentals.intensityGuidance.toLowerCase()).toContain('playful')

    const elite = getTrainingGuidelines('ELITE')
    expect(elite.intensityGuidance.toLowerCase()).toContain('high')
  })

  it('should have shorter session duration for younger stages', () => {
    const fundamentals = getTrainingGuidelines('FUNDAMENTALS')
    const elite = getTrainingGuidelines('ELITE')

    expect(fundamentals.sessionDuration.max).toBeLessThanOrEqual(elite.sessionDuration.max)
  })

  it('should have appropriate focus areas for each stage', () => {
    const fundamentals = getTrainingGuidelines('FUNDAMENTALS')
    expect(fundamentals.focusAreas).toContain('FOOTWORK')
    expect(fundamentals.focusAreas).toContain('BALANCE')

    const trainingToWin = getTrainingGuidelines('TRAINING_TO_WIN')
    expect(trainingToWin.focusAreas).toContain('REACTIVE_AGILITY')
  })
})

describe('isDrillAppropriateForAge', () => {
  it('should return true when drill is appropriate for age', () => {
    const drill = createMockDrill({
      minDevelopmentStage: 'LEARNING_TO_TRAIN',
      maxDevelopmentStage: 'TRAINING_TO_TRAIN'
    })

    // Age 10 = LEARNING_TO_TRAIN
    expect(isDrillAppropriateForAge(drill, createBirthDateForAge(10))).toBe(true)
    // Age 14 = TRAINING_TO_TRAIN
    expect(isDrillAppropriateForAge(drill, createBirthDateForAge(14))).toBe(true)
  })

  it('should return false when drill is not appropriate for age', () => {
    const drill = createMockDrill({
      minDevelopmentStage: 'TRAINING_TO_COMPETE',
      maxDevelopmentStage: 'ELITE'
    })

    // Age 10 = LEARNING_TO_TRAIN, drill is for older athletes
    expect(isDrillAppropriateForAge(drill, createBirthDateForAge(10))).toBe(false)
  })

  it('should work with string dates', () => {
    const drill = createMockDrill({
      minDevelopmentStage: 'FUNDAMENTALS',
      maxDevelopmentStage: 'ELITE'
    })

    const birthDateString = createBirthDateForAge(15).toISOString()
    expect(isDrillAppropriateForAge(drill, birthDateString)).toBe(true)
  })
})

describe('getRecommendedCategories', () => {
  it('should return age-appropriate categories', () => {
    const fundamentals = getRecommendedCategories('FUNDAMENTALS')
    expect(fundamentals).toContain('FOOTWORK')
    expect(fundamentals).toContain('BALANCE')

    const trainingToWin = getRecommendedCategories('TRAINING_TO_WIN')
    expect(trainingToWin).toContain('REACTIVE_AGILITY')
    expect(trainingToWin).toContain('SPEED_ACCELERATION')
  })

  it('should return non-empty array for all stages', () => {
    const stages: DevelopmentStage[] = [
      'FUNDAMENTALS', 'LEARNING_TO_TRAIN', 'TRAINING_TO_TRAIN',
      'TRAINING_TO_COMPETE', 'TRAINING_TO_WIN', 'ELITE'
    ]

    stages.forEach(stage => {
      const categories = getRecommendedCategories(stage)
      expect(categories.length).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('getSessionDurationRange', () => {
  it('should return min and max duration for each stage', () => {
    const stages: DevelopmentStage[] = [
      'FUNDAMENTALS', 'LEARNING_TO_TRAIN', 'TRAINING_TO_TRAIN',
      'TRAINING_TO_COMPETE', 'TRAINING_TO_WIN', 'ELITE'
    ]

    stages.forEach(stage => {
      const range = getSessionDurationRange(stage)
      expect(range.min).toBeGreaterThan(0)
      expect(range.max).toBeGreaterThan(range.min)
    })
  })

  it('should have shorter sessions for younger athletes', () => {
    const fundamentals = getSessionDurationRange('FUNDAMENTALS')
    const trainingToWin = getSessionDurationRange('TRAINING_TO_WIN')

    expect(fundamentals.max).toBeLessThan(trainingToWin.max)
  })
})

describe('getWeeklyFrequency', () => {
  it('should return min and max frequency for each stage', () => {
    const stages: DevelopmentStage[] = [
      'FUNDAMENTALS', 'LEARNING_TO_TRAIN', 'TRAINING_TO_TRAIN',
      'TRAINING_TO_COMPETE', 'TRAINING_TO_WIN', 'ELITE'
    ]

    stages.forEach(stage => {
      const freq = getWeeklyFrequency(stage)
      expect(freq.min).toBeGreaterThanOrEqual(1)
      expect(freq.max).toBeGreaterThanOrEqual(freq.min)
    })
  })

  it('should have lower frequency for younger athletes', () => {
    const fundamentals = getWeeklyFrequency('FUNDAMENTALS')
    const trainingToWin = getWeeklyFrequency('TRAINING_TO_WIN')

    expect(fundamentals.max).toBeLessThanOrEqual(trainingToWin.max)
  })
})

describe('sortDrillsByStageAppropriateness', () => {
  it('should prioritize drills centered around the requested stage', () => {
    const drills = [
      createMockDrill({
        id: '1',
        minDevelopmentStage: 'FUNDAMENTALS',
        maxDevelopmentStage: 'ELITE' // Wide range, center at index 2.5
      }),
      createMockDrill({
        id: '2',
        minDevelopmentStage: 'TRAINING_TO_TRAIN',
        maxDevelopmentStage: 'TRAINING_TO_COMPETE' // Center at index 2.5
      }),
      createMockDrill({
        id: '3',
        minDevelopmentStage: 'ELITE',
        maxDevelopmentStage: 'ELITE' // Only for ELITE, center at 5
      })
    ]

    const sorted = sortDrillsByStageAppropriateness(drills, 'TRAINING_TO_TRAIN')

    // Both drills 1 and 2 have same center distance from TRAINING_TO_TRAIN (index 2)
    // Drill 3 (center at 5) should be last since it's furthest from index 2
    expect(sorted[sorted.length - 1].id).toBe('3')
    // Drills 1 and 2 should be before drill 3
    expect(['1', '2']).toContain(sorted[0].id)
    expect(['1', '2']).toContain(sorted[1].id)
  })

  it('should not modify the original array', () => {
    const drills = [
      createMockDrill({ id: '1', minDevelopmentStage: 'ELITE', maxDevelopmentStage: 'ELITE' }),
      createMockDrill({ id: '2', minDevelopmentStage: 'FUNDAMENTALS', maxDevelopmentStage: 'FUNDAMENTALS' })
    ]

    const original = [...drills]
    sortDrillsByStageAppropriateness(drills, 'TRAINING_TO_TRAIN')

    expect(drills[0].id).toBe(original[0].id)
  })
})

describe('getMaturationConsiderations', () => {
  it('should return considerations for each stage', () => {
    const stages: DevelopmentStage[] = [
      'FUNDAMENTALS', 'LEARNING_TO_TRAIN', 'TRAINING_TO_TRAIN',
      'TRAINING_TO_COMPETE', 'TRAINING_TO_WIN', 'ELITE'
    ]

    stages.forEach(stage => {
      const considerations = getMaturationConsiderations(stage)
      expect(considerations.length).toBeGreaterThan(0)
      expect(considerations[0].length).toBeGreaterThan(10)
    })
  })

  it('should mention PHV for TRAINING_TO_TRAIN stage', () => {
    const considerations = getMaturationConsiderations('TRAINING_TO_TRAIN')
    const mentionsPHV = considerations.some(c =>
      c.toLowerCase().includes('phv') || c.toLowerCase().includes('peak height velocity')
    )
    expect(mentionsPHV).toBe(true)
  })

  it('should mention injury prevention for ELITE stage', () => {
    const considerations = getMaturationConsiderations('ELITE')
    const mentionsInjury = considerations.some(c =>
      c.toLowerCase().includes('injury')
    )
    expect(mentionsInjury).toBe(true)
  })

  it('should mention fun for FUNDAMENTALS stage', () => {
    const considerations = getMaturationConsiderations('FUNDAMENTALS')
    const mentionsFun = considerations.some(c =>
      c.toLowerCase().includes('fun') || c.toLowerCase().includes('play')
    )
    expect(mentionsFun).toBe(true)
  })
})
