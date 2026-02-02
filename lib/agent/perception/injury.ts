/**
 * Injury Perception Module
 *
 * Collects and analyzes injury and restriction data.
 */

import { prisma } from '@/lib/prisma'
import type { InjuryData, ActiveInjury, Restriction } from '../types'

/**
 * Perceive injury and restriction data for an athlete
 */
export async function perceiveInjury(clientId: string): Promise<InjuryData> {
  // Get active injury assessments
  const injuries = await prisma.injuryAssessment.findMany({
    where: {
      clientId,
      status: { in: ['ACUTE', 'SUBACUTE', 'CHRONIC'] },
    },
    orderBy: { date: 'desc' },
  })

  // Get active training restrictions
  const restrictions = await prisma.trainingRestriction.findMany({
    where: {
      clientId,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
  })

  // Get acute injury reports
  const acuteReports = await prisma.acuteInjuryReport.findMany({
    where: {
      clientId,
      status: { in: ['REPORTED', 'ACKNOWLEDGED'] },
    },
    orderBy: { reportDate: 'desc' },
    take: 5,
  })

  // Map injuries to our format
  const activeInjuries: ActiveInjury[] = injuries.map((injury) => ({
    id: injury.id,
    bodyPart: injury.bodyPart || 'Unknown',
    severity: mapPainToSeverity(injury.painLevel),
    painLevel: injury.painLevel ?? 0,
    startDate: injury.date,
  }))

  // Add acute reports that might not be in assessments yet
  for (const report of acuteReports) {
    if (!activeInjuries.some((i) => i.id === report.id)) {
      activeInjuries.push({
        id: report.id,
        bodyPart: report.bodyPart || 'Unknown',
        severity: mapPainToSeverity(report.initialSeverity),
        painLevel: report.initialSeverity ?? 0,
        startDate: report.reportDate,
      })
    }
  }

  // Map restrictions
  const activeRestrictions: Restriction[] = restrictions.map((r) => ({
    id: r.id,
    type: mapRestrictionType(r.type),
    description: r.description || r.type,
    expiresAt: r.endDate,
  }))

  return {
    hasActiveInjury: activeInjuries.length > 0,
    hasRestrictions: activeRestrictions.length > 0,
    activeInjuries,
    restrictions: activeRestrictions,
  }
}

/**
 * Get the highest pain level from recent injuries
 */
export async function getHighestPainLevel(clientId: string): Promise<number> {
  // Check injury assessments
  const injury = await prisma.injuryAssessment.findFirst({
    where: {
      clientId,
      status: { in: ['ACUTE', 'SUBACUTE'] },
    },
    orderBy: { painLevel: 'desc' },
    select: { painLevel: true },
  })

  // Check acute injury reports
  const acuteReport = await prisma.acuteInjuryReport.findFirst({
    where: {
      clientId,
      status: { in: ['REPORTED', 'ACKNOWLEDGED'] },
    },
    orderBy: { initialSeverity: 'desc' },
    select: { initialSeverity: true },
  })

  // Check daily check-ins for soreness/pain
  const checkIn = await prisma.dailyCheckIn.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
    select: { soreness: true },
  })

  const painLevels = [
    injury?.painLevel ?? 0,
    acuteReport?.initialSeverity ?? 0,
    checkIn?.soreness ?? 0,
  ]

  return Math.max(...painLevels)
}

/**
 * Check if there are restrictions affecting a specific workout type
 */
export async function hasRestrictionForWorkoutType(
  clientId: string,
  workoutType: string
): Promise<boolean> {
  const restrictions = await prisma.trainingRestriction.findMany({
    where: {
      clientId,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
  })

  // Check if any restriction affects this workout type
  for (const restriction of restrictions) {
    const type = restriction.type
    const affectedTypes = restriction.affectedWorkoutTypes || []

    // Check if workout type is in the affected types list
    if (affectedTypes.includes(workoutType)) {
      return true
    }

    // Check running-specific restrictions
    if (workoutType === 'RUNNING' && type === 'NO_RUNNING') {
      return true
    }

    // Check specific exercise restrictions
    if (type === 'SPECIFIC_EXERCISES') {
      const exercises = restriction.affectedExerciseIds as string[] | null
      if (exercises?.some((e) => e.toLowerCase().includes(workoutType.toLowerCase()))) {
        return true
      }
    }

    // Check body part restrictions
    const bodyParts = restriction.bodyParts || []
    if (workoutType === 'RUNNING' && bodyParts.some((p) => ['KNEE', 'ANKLE', 'HIP', 'FOOT'].includes(p))) {
      return true
    }
    if (workoutType === 'STRENGTH' && (type === 'NO_UPPER_BODY' || type === 'NO_LOWER_BODY')) {
      return true
    }
  }

  return false
}

/**
 * Get injury trend (is athlete recovering or worsening?)
 */
export async function getInjuryTrend(
  clientId: string,
  injuryId: string
): Promise<'IMPROVING' | 'STABLE' | 'WORSENING' | 'UNKNOWN'> {
  const assessments = await prisma.injuryAssessment.findMany({
    where: { clientId, id: injuryId },
    orderBy: { date: 'desc' },
    take: 3,
    select: { painLevel: true, date: true },
  })

  if (assessments.length < 2) {
    return 'UNKNOWN'
  }

  const recent = assessments[0].painLevel ?? 0
  const previous = assessments[1].painLevel ?? 0

  if (recent < previous - 1) return 'IMPROVING'
  if (recent > previous + 1) return 'WORSENING'
  return 'STABLE'
}

// Helper functions
function mapPainToSeverity(painLevel: number | null): 'MILD' | 'MODERATE' | 'SEVERE' {
  if (painLevel === null || painLevel <= 3) return 'MILD'
  if (painLevel <= 6) return 'MODERATE'
  return 'SEVERE'
}

function mapRestrictionType(
  type: string | null
): 'INTENSITY' | 'VOLUME' | 'EXERCISE' | 'BODY_PART' {
  if (!type) return 'EXERCISE'
  const upper = type.toUpperCase()
  if (upper.includes('INTENSITY')) return 'INTENSITY'
  if (upper.includes('VOLUME')) return 'VOLUME'
  if (upper.includes('BODY') || upper.includes('PART')) return 'BODY_PART'
  return 'EXERCISE'
}
