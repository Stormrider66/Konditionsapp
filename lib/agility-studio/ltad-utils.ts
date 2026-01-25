// lib/agility-studio/ltad-utils.ts
// Long-Term Athlete Development (LTAD) utilities for youth agility training

import type { DevelopmentStage, AgilityDrill, AgilityDrillCategory } from '@/types'
import { differenceInYears } from 'date-fns'

/**
 * Age ranges for each development stage
 */
const stageAgeRanges: Record<DevelopmentStage, { min: number; max: number; description: string }> = {
  FUNDAMENTALS: {
    min: 6,
    max: 9,
    description: 'Active Start / FUNdamentals - Focus on fun, movement literacy, and basic skills'
  },
  LEARNING_TO_TRAIN: {
    min: 9,
    max: 12,
    description: 'Learning to Train - Skill acquisition window, technique emphasis'
  },
  TRAINING_TO_TRAIN: {
    min: 12,
    max: 16,
    description: 'Training to Train - Building aerobic base, sport-specific skills'
  },
  TRAINING_TO_COMPETE: {
    min: 16,
    max: 18,
    description: 'Training to Compete - Competition focus, position-specific training'
  },
  TRAINING_TO_WIN: {
    min: 18,
    max: 25,
    description: 'Training to Win - Peak performance preparation, maximizing potential'
  },
  ELITE: {
    min: 25,
    max: 99,
    description: 'Active for Life / Elite - Performance maintenance and longevity'
  }
}

/**
 * Training guidelines per development stage
 */
const trainingGuidelines: Record<DevelopmentStage, {
  volumeGuidance: string
  intensityGuidance: string
  focusAreas: AgilityDrillCategory[]
  restRatio: string
  sessionDuration: { min: number; max: number }
  sessionsPerWeek: { min: number; max: number }
  keyConsiderations: string[]
}> = {
  FUNDAMENTALS: {
    volumeGuidance: 'Low volume, high variety',
    intensityGuidance: 'Playful, non-competitive',
    focusAreas: ['FOOTWORK', 'BALANCE', 'COD'],
    restRatio: '1:3 work:rest or more',
    sessionDuration: { min: 20, max: 30 },
    sessionsPerWeek: { min: 1, max: 2 },
    keyConsiderations: [
      'Keep it fun and game-based',
      'No specialization',
      'Develop fundamental movement skills',
      'Use age-appropriate equipment',
      'Focus on coordination and body awareness'
    ]
  },
  LEARNING_TO_TRAIN: {
    volumeGuidance: 'Moderate volume, structured variety',
    intensityGuidance: 'Moderate, technique-focused',
    focusAreas: ['COD', 'FOOTWORK', 'SPEED_ACCELERATION', 'BALANCE'],
    restRatio: '1:2 to 1:3 work:rest',
    sessionDuration: { min: 30, max: 45 },
    sessionsPerWeek: { min: 2, max: 3 },
    keyConsiderations: [
      'Critical window for skill learning',
      'Emphasize proper technique over speed',
      'Introduce basic reactive drills',
      'Multi-sport participation encouraged',
      'Avoid early specialization'
    ]
  },
  TRAINING_TO_TRAIN: {
    volumeGuidance: 'Progressive volume increase',
    intensityGuidance: 'Moderate to high, building capacity',
    focusAreas: ['COD', 'REACTIVE_AGILITY', 'SPEED_ACCELERATION', 'PLYOMETRICS'],
    restRatio: '1:2 work:rest',
    sessionDuration: { min: 45, max: 60 },
    sessionsPerWeek: { min: 2, max: 4 },
    keyConsiderations: [
      'Peak Height Velocity (PHV) considerations',
      'Adjust training around growth spurts',
      'Build aerobic and anaerobic base',
      'Introduce sport-specific patterns',
      'Monitor for overuse injuries'
    ]
  },
  TRAINING_TO_COMPETE: {
    volumeGuidance: 'Sport-specific volume',
    intensityGuidance: 'High intensity, competition prep',
    focusAreas: ['REACTIVE_AGILITY', 'COD', 'SPEED_ACCELERATION', 'PLYOMETRICS'],
    restRatio: '1:1.5 to 1:2 work:rest',
    sessionDuration: { min: 45, max: 75 },
    sessionsPerWeek: { min: 2, max: 4 },
    keyConsiderations: [
      'Position-specific agility patterns',
      'Competition simulation',
      'Integrate with sport practice',
      'Periodization becomes critical',
      'Mental preparation training'
    ]
  },
  TRAINING_TO_WIN: {
    volumeGuidance: 'Optimized for competition',
    intensityGuidance: 'Peak performance intensities',
    focusAreas: ['REACTIVE_AGILITY', 'SPEED_ACCELERATION', 'COD', 'PLYOMETRICS'],
    restRatio: '1:1 to 1:1.5 work:rest',
    sessionDuration: { min: 45, max: 90 },
    sessionsPerWeek: { min: 2, max: 5 },
    keyConsiderations: [
      'Event-specific preparation',
      'Recovery optimization',
      'Advanced reactive scenarios',
      'Competition peaking strategies',
      'Injury prevention focus'
    ]
  },
  ELITE: {
    volumeGuidance: 'Individualized, maintenance-focused',
    intensityGuidance: 'High quality, managed load',
    focusAreas: ['REACTIVE_AGILITY', 'COD', 'SPEED_ACCELERATION', 'BALANCE'],
    restRatio: '1:1.5 work:rest',
    sessionDuration: { min: 30, max: 60 },
    sessionsPerWeek: { min: 2, max: 4 },
    keyConsiderations: [
      'Maintain peak capabilities',
      'Injury prevention priority',
      'Smart load management',
      'Address individual weaknesses',
      'Longevity focus'
    ]
  }
}

/**
 * Estimate development stage from birth date
 * Note: This is a simplified estimation. Real LTAD assessment considers
 * biological maturation (PHV), not just chronological age.
 */
export function getDevelopmentStageFromAge(birthDate: Date | string): DevelopmentStage {
  const age = differenceInYears(new Date(), new Date(birthDate))

  if (age < 9) return 'FUNDAMENTALS'
  if (age < 12) return 'LEARNING_TO_TRAIN'
  if (age < 16) return 'TRAINING_TO_TRAIN'
  if (age < 18) return 'TRAINING_TO_COMPETE'
  if (age < 25) return 'TRAINING_TO_WIN'
  return 'ELITE'
}

/**
 * Get the age range for a development stage
 */
export function getAgeRangeForStage(stage: DevelopmentStage): { min: number; max: number } {
  return {
    min: stageAgeRanges[stage].min,
    max: stageAgeRanges[stage].max
  }
}

/**
 * Get the description for a development stage
 */
export function getStageDescription(stage: DevelopmentStage): string {
  return stageAgeRanges[stage].description
}

/**
 * Filter drills appropriate for a development stage
 */
export function filterDrillsByStage(
  drills: AgilityDrill[],
  stage: DevelopmentStage
): AgilityDrill[] {
  const stageOrder: DevelopmentStage[] = [
    'FUNDAMENTALS',
    'LEARNING_TO_TRAIN',
    'TRAINING_TO_TRAIN',
    'TRAINING_TO_COMPETE',
    'TRAINING_TO_WIN',
    'ELITE'
  ]

  const requestedIndex = stageOrder.indexOf(stage)

  return drills.filter(drill => {
    const minIndex = stageOrder.indexOf(drill.minDevelopmentStage)
    const maxIndex = stageOrder.indexOf(drill.maxDevelopmentStage)
    return requestedIndex >= minIndex && requestedIndex <= maxIndex
  })
}

/**
 * Get training guidelines for a development stage
 */
export function getTrainingGuidelines(stage: DevelopmentStage) {
  return trainingGuidelines[stage]
}

/**
 * Check if a drill is appropriate for a given age
 */
export function isDrillAppropriateForAge(drill: AgilityDrill, birthDate: Date | string): boolean {
  const stage = getDevelopmentStageFromAge(birthDate)
  const stageOrder: DevelopmentStage[] = [
    'FUNDAMENTALS',
    'LEARNING_TO_TRAIN',
    'TRAINING_TO_TRAIN',
    'TRAINING_TO_COMPETE',
    'TRAINING_TO_WIN',
    'ELITE'
  ]

  const requestedIndex = stageOrder.indexOf(stage)
  const minIndex = stageOrder.indexOf(drill.minDevelopmentStage)
  const maxIndex = stageOrder.indexOf(drill.maxDevelopmentStage)

  return requestedIndex >= minIndex && requestedIndex <= maxIndex
}

/**
 * Get recommended drill categories for a development stage
 */
export function getRecommendedCategories(stage: DevelopmentStage): AgilityDrillCategory[] {
  return trainingGuidelines[stage].focusAreas
}

/**
 * Get session duration recommendations for a stage
 */
export function getSessionDurationRange(stage: DevelopmentStage): { min: number; max: number } {
  return trainingGuidelines[stage].sessionDuration
}

/**
 * Get weekly frequency recommendations for a stage
 */
export function getWeeklyFrequency(stage: DevelopmentStage): { min: number; max: number } {
  return trainingGuidelines[stage].sessionsPerWeek
}

/**
 * Sort drills by appropriateness for a stage
 * Drills designed specifically for the stage rank higher
 */
export function sortDrillsByStageAppropriateness(
  drills: AgilityDrill[],
  stage: DevelopmentStage
): AgilityDrill[] {
  const stageOrder: DevelopmentStage[] = [
    'FUNDAMENTALS',
    'LEARNING_TO_TRAIN',
    'TRAINING_TO_TRAIN',
    'TRAINING_TO_COMPETE',
    'TRAINING_TO_WIN',
    'ELITE'
  ]

  const requestedIndex = stageOrder.indexOf(stage)

  return [...drills].sort((a, b) => {
    // Drills where the requested stage is in the middle of their range are most appropriate
    const aMinIndex = stageOrder.indexOf(a.minDevelopmentStage)
    const aMaxIndex = stageOrder.indexOf(a.maxDevelopmentStage)
    const bMinIndex = stageOrder.indexOf(b.minDevelopmentStage)
    const bMaxIndex = stageOrder.indexOf(b.maxDevelopmentStage)

    // Calculate how centered the requested stage is in each drill's range
    const aCenter = (aMinIndex + aMaxIndex) / 2
    const bCenter = (bMinIndex + bMaxIndex) / 2

    const aDistance = Math.abs(requestedIndex - aCenter)
    const bDistance = Math.abs(requestedIndex - bCenter)

    return aDistance - bDistance
  })
}

/**
 * Get maturation considerations for training
 */
export function getMaturationConsiderations(stage: DevelopmentStage): string[] {
  const considerations: Record<DevelopmentStage, string[]> = {
    FUNDAMENTALS: [
      'Focus on overall athleticism, not agility-specific training',
      'Use games and play to develop movement',
      'Avoid repetitive stress on growth plates'
    ],
    LEARNING_TO_TRAIN: [
      'Critical window for neuromuscular development',
      'Technique over intensity',
      'Watch for early growth spurts starting'
    ],
    TRAINING_TO_TRAIN: [
      'Peak Height Velocity typically occurs (girls ~12, boys ~14)',
      'Reduce plyometric volume during rapid growth',
      'Temporarily reduced coordination is normal',
      'Risk of Osgood-Schlatter and Sever\'s disease',
      'Adjust training to growth phase'
    ],
    TRAINING_TO_COMPETE: [
      'Post-PHV strength gains accelerate',
      'Can increase training intensity',
      'Monitor for overuse injuries'
    ],
    TRAINING_TO_WIN: [
      'Fully mature musculoskeletal system',
      'Can handle maximal training loads',
      'Individual recovery needs vary'
    ],
    ELITE: [
      'Focus on injury prevention',
      'Address accumulated wear and tear',
      'Smart load management essential'
    ]
  }

  return considerations[stage]
}
