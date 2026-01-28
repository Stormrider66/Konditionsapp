// lib/training-engine/generators/plyometric-calculator.ts
/**
 * Plyometric Contact Volume Calculator
 *
 * Scientific volume limits based on research:
 * - Beginner: 60-80 contacts (extensive only - LOW intensity)
 * - Intermediate: 100-120 contacts
 * - Advanced: 120-140 contacts
 * - Elite: 150-300 contacts
 *
 * HIGH intensity depth jumps: MAX 27 contacts per session
 *
 * Contact calculation:
 * - Bilateral jump: 1 contact per rep
 * - Unilateral jump: 1 contact per rep per leg
 * - Continuous jumps: 1 contact per rep
 */

import { PrismaClient, PlyometricIntensity } from '@prisma/client'

const prisma = new PrismaClient()

export interface PlyometricExercise {
  id: string
  name: string
  intensity: PlyometricIntensity
  sets: number
  reps: number
  contactsPerRep: number // From database
  isUnilateral: boolean // Counts both legs
  totalContacts: number // Calculated
}

export interface PlyometricSession {
  exercises: PlyometricExercise[]
  totalContacts: number
  intensityBreakdown: {
    low: number
    moderate: number
    high: number
  }
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  withinLimits: boolean
  recommendations: string[]
  warnings: string[]
}

/**
 * Contact volume limits by athlete level
 */
const CONTACT_LIMITS: Record<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE', {
  min: number
  max: number
  allowedIntensities: PlyometricIntensity[]
}> = {
  BEGINNER: { min: 60, max: 80, allowedIntensities: ['LOW'] },
  INTERMEDIATE: { min: 100, max: 120, allowedIntensities: ['LOW', 'MODERATE'] },
  ADVANCED: { min: 120, max: 140, allowedIntensities: ['LOW', 'MODERATE', 'HIGH'] },
  ELITE: { min: 150, max: 300, allowedIntensities: ['LOW', 'MODERATE', 'HIGH'] },
}

/**
 * Maximum contacts for HIGH intensity plyometrics (depth jumps)
 */
const MAX_HIGH_INTENSITY_CONTACTS = 27

/**
 * Calculate total contacts for a plyometric exercise
 *
 * @param sets - Number of sets
 * @param reps - Reps per set
 * @param contactsPerRep - Ground contacts per rep (from database)
 * @param isUnilateral - If true, multiply by 2 (both legs)
 * @returns Total contacts
 */
export function calculateContacts(
  sets: number,
  reps: number,
  contactsPerRep: number,
  isUnilateral: boolean
): number {
  const baseContacts = sets * reps * contactsPerRep
  return isUnilateral ? baseContacts * 2 : baseContacts
}

/**
 * Select plyometric exercises for a session
 *
 * @param athleteLevel - Athlete level
 * @param targetContacts - Target total contacts (optional, uses default range)
 * @param excludeExerciseIds - Exercises to exclude
 * @returns Plyometric session
 */
export async function selectPlyometricExercises(
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE',
  targetContacts?: number,
  excludeExerciseIds: string[] = []
): Promise<PlyometricSession> {
  const limits = CONTACT_LIMITS[athleteLevel]
  const target = targetContacts || Math.floor((limits.min + limits.max) / 2)

  const selectedExercises: PlyometricExercise[] = []
  let currentContacts = 0

  // Get available plyometric exercises
  const availableExercises = await prisma.exercise.findMany({
    where: {
      category: 'PLYOMETRIC',
      plyometricIntensity: { in: limits.allowedIntensities },
      isPublic: true,
      id: { notIn: excludeExerciseIds },
    },
    select: {
      id: true,
      name: true,
      plyometricIntensity: true,
      contactsPerRep: true,
      biomechanicalPillar: true,
    },
  })

  if (availableExercises.length === 0) {
    throw new Error(`No plyometric exercises available for ${athleteLevel} level`)
  }

  // Prioritize LOW intensity first, then MODERATE, then HIGH
  const sortedByIntensity = availableExercises.sort((a, b) => {
    const order = { LOW: 1, MODERATE: 2, HIGH: 3 }
    return order[a.plyometricIntensity!] - order[b.plyometricIntensity!]
  })

  // Select exercises until target contacts reached
  let highIntensityContacts = 0

  for (const ex of sortedByIntensity) {
    if (currentContacts >= target) break

    const contactsPerRep = ex.contactsPerRep || 1
    const isUnilateral = ex.biomechanicalPillar === 'UNILATERAL'

    // Determine sets and reps based on intensity
    let sets: number
    let reps: number

    if (ex.plyometricIntensity === 'HIGH') {
      // High intensity: Low volume (3-5 sets � 5-8 reps)
      sets = 4
      reps = 6

      const exerciseContacts = calculateContacts(sets, reps, contactsPerRep, isUnilateral)

      // Check HIGH intensity limit
      if (highIntensityContacts + exerciseContacts > MAX_HIGH_INTENSITY_CONTACTS) {
        continue // Skip this exercise, would exceed HIGH intensity limit
      }

      highIntensityContacts += exerciseContacts
    } else if (ex.plyometricIntensity === 'MODERATE') {
      // Moderate intensity: Medium volume (3-4 sets � 8-10 reps)
      sets = 3
      reps = 10
    } else {
      // Low intensity: Higher volume (3-4 sets � 10-15 reps)
      sets = 3
      reps = 12
    }

    const totalContacts = calculateContacts(sets, reps, contactsPerRep, isUnilateral)

    // Don't exceed target by too much
    if (currentContacts + totalContacts > target * 1.2) {
      // Adjust reps to fit
      const remainingContacts = target - currentContacts
      const adjustedReps = Math.floor(remainingContacts / (sets * contactsPerRep * (isUnilateral ? 2 : 1)))
      if (adjustedReps < 3) break // Too few reps, stop adding exercises

      reps = adjustedReps
    }

    const finalContacts = calculateContacts(sets, reps, contactsPerRep, isUnilateral)

    selectedExercises.push({
      id: ex.id,
      name: ex.name,
      intensity: ex.plyometricIntensity!,
      sets,
      reps,
      contactsPerRep,
      isUnilateral,
      totalContacts: finalContacts,
    })

    currentContacts += finalContacts

    // Limit to 3-4 exercises per session
    if (selectedExercises.length >= 4) break
  }

  // Calculate intensity breakdown
  const intensityBreakdown = {
    low: selectedExercises
      .filter((e) => e.intensity === 'LOW')
      .reduce((sum, e) => sum + e.totalContacts, 0),
    moderate: selectedExercises
      .filter((e) => e.intensity === 'MODERATE')
      .reduce((sum, e) => sum + e.totalContacts, 0),
    high: selectedExercises
      .filter((e) => e.intensity === 'HIGH')
      .reduce((sum, e) => sum + e.totalContacts, 0),
  }

  // Check if within limits
  const withinLimits = currentContacts >= limits.min && currentContacts <= limits.max

  // Generate recommendations and warnings
  const recommendations: string[] = []
  const warnings: string[] = []

  if (currentContacts < limits.min) {
    warnings.push(`Total contacts (${currentContacts}) below minimum (${limits.min}). Add more exercises.`)
  }

  if (currentContacts > limits.max) {
    warnings.push(`Total contacts (${currentContacts}) exceeds maximum (${limits.max}). Reduce volume.`)
  }

  if (intensityBreakdown.high > MAX_HIGH_INTENSITY_CONTACTS) {
    warnings.push(
      `HIGH intensity contacts (${intensityBreakdown.high}) exceed safe limit (${MAX_HIGH_INTENSITY_CONTACTS}).`
    )
  }

  if (athleteLevel === 'BEGINNER' && intensityBreakdown.high > 0) {
    warnings.push('Beginners should not perform HIGH intensity plyometrics. Remove depth jumps.')
  }

  if (athleteLevel === 'BEGINNER' && intensityBreakdown.moderate > 0) {
    recommendations.push('Beginners: Focus on LOW intensity (extensive) plyometrics only.')
  }

  if (withinLimits) {
    recommendations.push(`Excellent volume for ${athleteLevel} level: ${currentContacts} contacts.`)
  }

  // Rest day recommendation
  recommendations.push('Allow 48-72 hours recovery between plyometric sessions.')

  return {
    exercises: selectedExercises,
    totalContacts: currentContacts,
    intensityBreakdown,
    athleteLevel,
    withinLimits,
    recommendations,
    warnings,
  }
}

/**
 * Validate if adding an exercise would exceed contact limits
 *
 * @param currentSession - Current session
 * @param newExercise - Exercise to add
 * @returns Validation result
 */
export function validateExerciseAddition(
  currentSession: PlyometricSession,
  newExercise: PlyometricExercise
): {
  canAdd: boolean
  reason: string
  newTotal: number
} {
  const limits = CONTACT_LIMITS[currentSession.athleteLevel]
  const newTotal = currentSession.totalContacts + newExercise.totalContacts

  // Check total contacts limit
  if (newTotal > limits.max) {
    return {
      canAdd: false,
      reason: `Would exceed maximum contacts (${limits.max}). New total: ${newTotal}`,
      newTotal,
    }
  }

  // Check HIGH intensity limit
  if (newExercise.intensity === 'HIGH') {
    const newHighTotal = currentSession.intensityBreakdown.high + newExercise.totalContacts
    if (newHighTotal > MAX_HIGH_INTENSITY_CONTACTS) {
      return {
        canAdd: false,
        reason: `Would exceed HIGH intensity limit (${MAX_HIGH_INTENSITY_CONTACTS}). New high total: ${newHighTotal}`,
        newTotal,
      }
    }
  }

  // Check intensity allowed for level
  if (!limits.allowedIntensities.includes(newExercise.intensity)) {
    return {
      canAdd: false,
      reason: `${newExercise.intensity} intensity not allowed for ${currentSession.athleteLevel} level`,
      newTotal,
    }
  }

  return {
    canAdd: true,
    reason: 'Exercise can be added safely',
    newTotal,
  }
}

/**
 * Calculate cumulative weekly plyometric volume
 *
 * @param clientId - Athlete ID
 * @param weekStartDate - Start of week
 * @returns Weekly contacts and status
 */
export async function calculateWeeklyPlyometricVolume(
  clientId: string,
  weekStartDate: Date
): Promise<{
  totalContacts: number
  sessionsThisWeek: number
  recommendation: string
}> {
  const weekEnd = new Date(weekStartDate)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Get plyometric sessions this week
  const sessions = await prisma.strengthTrainingSession.findMany({
    where: {
      clientId,
      date: {
        gte: weekStartDate,
        lt: weekEnd,
      },
      totalContacts: { not: null },
    },
    select: {
      totalContacts: true,
    },
  })

  const totalContacts = sessions.reduce((sum, s) => sum + (s.totalContacts || 0), 0)
  const sessionsThisWeek = sessions.length

  let recommendation = ''
  if (sessionsThisWeek >= 3) {
    recommendation = 'Maximum 2-3 plyometric sessions per week. Consider rest.'
  } else if (totalContacts > 300) {
    recommendation = 'Weekly volume exceeds 300 contacts. High injury risk.'
  } else if (totalContacts > 200) {
    recommendation = 'Good weekly volume. Monitor for fatigue.'
  } else {
    recommendation = 'Volume within safe limits.'
  }

  return {
    totalContacts,
    sessionsThisWeek,
    recommendation,
  }
}

/**
 * Get plyometric progression path
 *
 * Beginner � Intermediate � Advanced � Elite
 *
 * @param athleteLevel - Current level
 * @param weeksInPhase - Weeks at current level
 * @returns Progression recommendation
 */
export function getPlyometricProgression(
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE',
  weeksInPhase: number
): {
  shouldProgress: boolean
  nextLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' | null
  reasoning: string
} {
  const minWeeksAtLevel = {
    BEGINNER: 6, // 6 weeks minimum before progressing
    INTERMEDIATE: 8,
    ADVANCED: 12,
    ELITE: 999, // No progression beyond elite
  }

  const minWeeks = minWeeksAtLevel[athleteLevel]

  if (weeksInPhase < minWeeks) {
    return {
      shouldProgress: false,
      nextLevel: null,
      reasoning: `Continue ${athleteLevel} level (${weeksInPhase}/${minWeeks} weeks completed)`,
    }
  }

  const progression: Record<string, 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'> = {
    BEGINNER: 'INTERMEDIATE',
    INTERMEDIATE: 'ADVANCED',
    ADVANCED: 'ELITE',
  }

  const nextLevel = progression[athleteLevel] || null

  if (!nextLevel) {
    return {
      shouldProgress: false,
      nextLevel: null,
      reasoning: 'Elite level reached. Maintain current volume.',
    }
  }

  return {
    shouldProgress: true,
    nextLevel,
    reasoning: `Ready to progress from ${athleteLevel} to ${nextLevel} after ${weeksInPhase} weeks.`,
  }
}

/**
 * TypeScript types
 */
export interface PlyometricPrescription {
  exercises: PlyometricExercise[]
  totalContacts: number
  sessionDuration: number // minutes
  requiredEquipment: string[]
  safetyNotes: string[]
}
