// lib/agility-studio/sport-recommendations.ts
// Sport-specific drill recommendations for agility training

import type { SportType, AgilityDrillCategory, DevelopmentStage, AgilityDrill } from '@/types'

/**
 * Sport to agility focus mapping
 * Defines which agility categories are most important for each sport
 */
const sportAgilityFocus: Record<SportType, {
  primary: AgilityDrillCategory[]
  secondary: AgilityDrillCategory[]
  description: string
}> = {
  FOOTBALL: {
    primary: ['COD', 'REACTIVE_AGILITY'],
    secondary: ['SPEED_ACCELERATION', 'FOOTWORK'],
    description: 'Quick direction changes, reactive movements to opponents'
  },
  BASKETBALL: {
    primary: ['COD', 'PLYOMETRICS'],
    secondary: ['FOOTWORK', 'REACTIVE_AGILITY'],
    description: 'Explosive jumping, defensive slides, quick cuts'
  },
  HANDBALL: {
    primary: ['COD', 'SPEED_ACCELERATION'],
    secondary: ['PLYOMETRICS', 'REACTIVE_AGILITY'],
    description: 'Fast breaks, defensive transitions, jump shots'
  },
  ICE_HOCKEY: {
    primary: ['SPEED_ACCELERATION', 'COD'],
    secondary: ['REACTIVE_AGILITY', 'BALANCE'],
    description: 'Quick starts and stops, pivots, edge work translation'
  },
  FLOORBALL: {
    primary: ['COD', 'REACTIVE_AGILITY'],
    secondary: ['SPEED_ACCELERATION', 'FOOTWORK'],
    description: 'Quick transitions, defensive positioning'
  },
  TENNIS: {
    primary: ['COD', 'FOOTWORK'],
    secondary: ['SPEED_ACCELERATION', 'REACTIVE_AGILITY'],
    description: 'Split step, recovery runs, lateral movement'
  },
  BADMINTON: {
    primary: ['FOOTWORK', 'SPEED_ACCELERATION'],
    secondary: ['COD', 'REACTIVE_AGILITY'],
    description: 'Court coverage, lunges, quick direction changes'
  },
  SQUASH: {
    primary: ['COD', 'FOOTWORK'],
    secondary: ['SPEED_ACCELERATION', 'REACTIVE_AGILITY'],
    description: 'Movement to corners, T-position recovery'
  },
  PADEL: {
    primary: ['FOOTWORK', 'COD'],
    secondary: ['REACTIVE_AGILITY', 'SPEED_ACCELERATION'],
    description: 'Wall play positioning, court coverage'
  },
  ATHLETICS: {
    primary: ['SPEED_ACCELERATION', 'PLYOMETRICS'],
    secondary: ['COD', 'BALANCE'],
    description: 'Start mechanics, power development'
  },
  SWIMMING: {
    primary: ['PLYOMETRICS', 'BALANCE'],
    secondary: ['SPEED_ACCELERATION', 'FOOTWORK'],
    description: 'Start explosiveness, turn mechanics'
  },
  TRIATHLON: {
    primary: ['SPEED_ACCELERATION', 'BALANCE'],
    secondary: ['PLYOMETRICS', 'FOOTWORK'],
    description: 'Transition efficiency, run mechanics'
  },
  CROSS_COUNTRY_SKIING: {
    primary: ['BALANCE', 'SPEED_ACCELERATION'],
    secondary: ['PLYOMETRICS', 'FOOTWORK'],
    description: 'Stability, pole push power'
  },
  ORIENTEERING: {
    primary: ['BALANCE', 'FOOTWORK'],
    secondary: ['COD', 'SPEED_ACCELERATION'],
    description: 'Terrain navigation, obstacle handling'
  },
  CYCLING: {
    primary: ['BALANCE', 'PLYOMETRICS'],
    secondary: ['SPEED_ACCELERATION', 'FOOTWORK'],
    description: 'Sprint power, criterium handling'
  },
  ROWING: {
    primary: ['PLYOMETRICS', 'BALANCE'],
    secondary: ['SPEED_ACCELERATION', 'FOOTWORK'],
    description: 'Leg drive power, catch timing'
  },
  GENERAL: {
    primary: ['COD', 'SPEED_ACCELERATION'],
    secondary: ['PLYOMETRICS', 'FOOTWORK', 'REACTIVE_AGILITY', 'BALANCE'],
    description: 'General athletic development'
  }
}

/**
 * Get the primary agility focus for a sport
 */
export function getPrimaryFocus(sport: SportType): AgilityDrillCategory[] {
  return sportAgilityFocus[sport]?.primary || sportAgilityFocus.GENERAL.primary
}

/**
 * Get all agility focus areas for a sport (primary + secondary)
 */
export function getAllFocusAreas(sport: SportType): AgilityDrillCategory[] {
  const focus = sportAgilityFocus[sport] || sportAgilityFocus.GENERAL
  return [...focus.primary, ...focus.secondary]
}

/**
 * Get sport-specific description
 */
export function getSportDescription(sport: SportType): string {
  return sportAgilityFocus[sport]?.description || sportAgilityFocus.GENERAL.description
}

/**
 * Get recommended drills for a specific sport and development stage
 */
export function getRecommendedDrills(
  drills: AgilityDrill[],
  sport: SportType,
  developmentStage?: DevelopmentStage
): AgilityDrill[] {
  const focusAreas = getAllFocusAreas(sport)
  const stageOrder: DevelopmentStage[] = [
    'FUNDAMENTALS',
    'LEARNING_TO_TRAIN',
    'TRAINING_TO_TRAIN',
    'TRAINING_TO_COMPETE',
    'TRAINING_TO_WIN',
    'ELITE'
  ]

  return drills
    .filter(drill => {
      // Filter by category
      if (!focusAreas.includes(drill.category)) {
        return false
      }

      // Filter by development stage if provided
      if (developmentStage) {
        const minIndex = stageOrder.indexOf(drill.minDevelopmentStage)
        const maxIndex = stageOrder.indexOf(drill.maxDevelopmentStage)
        const requestedIndex = stageOrder.indexOf(developmentStage)

        if (requestedIndex < minIndex || requestedIndex > maxIndex) {
          return false
        }
      }

      // Filter by sport association if the drill has specific sports
      if (drill.primarySports && drill.primarySports.length > 0) {
        if (!drill.primarySports.includes(sport) && !drill.primarySports.includes('GENERAL')) {
          // De-prioritize but don't exclude completely
          return true
        }
      }

      return true
    })
    .sort((a, b) => {
      // Prioritize drills that specifically target this sport
      const aHasSport = a.primarySports?.includes(sport) ? 0 : 1
      const bHasSport = b.primarySports?.includes(sport) ? 0 : 1
      if (aHasSport !== bHasSport) return aHasSport - bHasSport

      // Then by primary vs secondary category
      const aIsPrimary = sportAgilityFocus[sport]?.primary.includes(a.category) ? 0 : 1
      const bIsPrimary = sportAgilityFocus[sport]?.primary.includes(b.category) ? 0 : 1
      if (aIsPrimary !== bIsPrimary) return aIsPrimary - bIsPrimary

      // Then by difficulty
      return a.difficultyLevel - b.difficultyLevel
    })
}

/**
 * Get workout focus recommendations based on sport
 */
export function getWorkoutFocusRecommendations(sport: SportType): {
  warmup: AgilityDrillCategory[]
  main: AgilityDrillCategory[]
  cooldown: AgilityDrillCategory[]
} {
  const focus = sportAgilityFocus[sport] || sportAgilityFocus.GENERAL

  return {
    warmup: ['FOOTWORK', 'BALANCE'],
    main: [...focus.primary, ...focus.secondary.slice(0, 1)],
    cooldown: ['BALANCE', 'FOOTWORK']
  }
}

/**
 * Get drill category distribution recommendations for a workout
 */
export function getCategoryDistribution(
  sport: SportType,
  totalDrills: number
): Record<AgilityDrillCategory, number> {
  const focus = sportAgilityFocus[sport] || sportAgilityFocus.GENERAL

  // Primary categories get 60%, secondary get 40%
  const primaryCount = Math.ceil(totalDrills * 0.6)
  const secondaryCount = totalDrills - primaryCount

  const distribution: Record<string, number> = {}

  // Distribute primary
  focus.primary.forEach((cat, i) => {
    distribution[cat] = Math.ceil(primaryCount / focus.primary.length)
  })

  // Distribute secondary
  focus.secondary.forEach((cat, i) => {
    distribution[cat] = (distribution[cat] || 0) + Math.ceil(secondaryCount / focus.secondary.length)
  })

  return distribution as Record<AgilityDrillCategory, number>
}
