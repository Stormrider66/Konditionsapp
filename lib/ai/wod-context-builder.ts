/**
 * WOD Context Builder
 *
 * Fast context gathering for Workout of the Day generation.
 * Optimized for < 500ms response time using parallel Prisma queries.
 */

import { prisma } from '@/lib/prisma'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import type { WODAthleteContext, WODEquipment, WODUsageStats } from '@/types/wod'
import { WOD_USAGE_LIMITS } from '@/types/wod'
import { getRestrictionsForWOD } from '@/lib/training-restrictions'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import type { WODDataPolicy } from '@/types/wod'

type AppLocale = 'en' | 'sv'

function wodText(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// ============================================
// LOCATION EQUIPMENT FETCHING
// ============================================

/**
 * Get equipment available at the athlete's preferred location
 * Falls back to the business's primary location, then any location
 */
async function getLocationEquipment(clientId: string): Promise<WODAthleteContext['locationEquipment']> {
  // First, find the athlete's account with preferred location
  const athleteAccount = await prisma.athleteAccount.findFirst({
    where: {
      client: { id: clientId }
    },
    select: {
      userId: true,
      preferredLocationId: true,
    }
  })

  if (!athleteAccount) {
    return null
  }

  // Get business membership
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId: athleteAccount.userId,
      isActive: true,
    },
    select: {
      businessId: true,
    }
  })

  if (!membership) {
    return null
  }

  // Equipment select fields (reused for both queries)
  const equipmentSelect = {
    id: true,
    name: true,
    equipment: {
      where: { isAvailable: true },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            nameSv: true,
            category: true,
            enablesExercises: true,
          }
        }
      }
    }
  } as const

  let location: { id: string; name: string; equipment: Array<{
    quantity: number;
    isAvailable: boolean;
    equipment: {
      id: string;
      name: string;
      nameSv: string | null;
      category: string;
      enablesExercises: string[];
    }
  }> } | null = null

  // Try athlete's preferred location first
  if (athleteAccount.preferredLocationId) {
    location = await prisma.location.findFirst({
      where: {
        id: athleteAccount.preferredLocationId,
        businessId: membership.businessId, // Security: must be in same business
        isActive: true,
      },
      select: equipmentSelect,
    })
  }

  // Fall back to business's primary location, then any active location
  if (!location) {
    location = await prisma.location.findFirst({
      where: {
        businessId: membership.businessId,
        isActive: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' }
      ],
      select: equipmentSelect,
    })
  }

  if (!location || location.equipment.length === 0) {
    return null
  }

  return {
    locationId: location.id,
    locationName: location.name,
    equipment: location.equipment.map(le => ({
      id: le.equipment.id,
      name: le.equipment.name,
      nameSv: le.equipment.nameSv,
      category: le.equipment.category,
      quantity: le.quantity,
      isAvailable: le.isAvailable,
      enablesExercises: le.equipment.enablesExercises,
    }))
  }
}

// ============================================
// MAIN CONTEXT BUILDER
// ============================================

/**
 * Gather all necessary athlete context for WOD generation
 * Uses parallel queries for optimal performance
 */
export async function buildWODContext(clientId: string, locale: AppLocale = 'en'): Promise<WODAthleteContext | null> {
  const now = new Date()
  const fourDaysAgo = subDays(now, 4)
  const sevenDaysAgo = subDays(now, 7)

  // Parallel fetch all context data
  const [
    client,
    sportProfile,
    athleteProfile,
    latestMetrics,
    activeInjuries,
    recentWorkoutLogs,
    recentAdHocWorkouts,
    recentCompletedWODs,
    weeklyTrainingLoad,
    integrationTokens,
    locationEquipment,
    trainingRestrictions,
  ] = await Promise.all([
    // 1. Basic client info
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        aiInstructions: true,
        preferredRecoverySource: true,
      },
    }),

    // 2. Sport profile (primary sport, equipment, goals)
    prisma.sportProfile.findUnique({
      where: { clientId },
      select: {
        primarySport: true,
        runningExperience: true,
        cyclingExperience: true,
        swimmingExperience: true,
        strengthExperience: true,
        currentGoal: true,
        weeklyAvailability: true,
        runningSettings: true,
        cyclingSettings: true,
        generalFitnessSettings: true,
      },
    }),

    // 3. Athlete profile (category, baselines)
    prisma.athleteProfile.findUnique({
      where: { clientId },
      select: {
        category: true,
        currentVDOT: true,
        lt2HeartRate: true,
        hasLactateMeter: true,
        hasHRVMonitor: true,
        crossTrainingPreferences: true,
      },
    }),

    // 4. Latest daily metrics (readiness, fatigue, soreness)
    prisma.dailyMetrics.findFirst({
      where: {
        clientId,
        date: { gte: subDays(now, 1) },
      },
      orderBy: { date: 'desc' },
      select: {
        readinessScore: true,
        wellnessScore: true,
        date: true,
        factorScores: true,
      },
    }),

    // 5. Active injuries
    prisma.injuryAssessment.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      select: {
        injuryType: true,
        painLocation: true,
        painLevel: true,
      },
    }),

    // 6. Recent workout logs (last 4 days)
    prisma.workoutLog.findMany({
      where: {
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
        completedAt: { gte: fourDaysAgo },
        completed: true,
      },
      select: {
        completedAt: true,
        perceivedEffort: true,
        workout: {
          select: {
            type: true,
            intensity: true,
            segments: {
              select: {
                exercise: {
                  select: {
                    muscleGroup: true,
                    biomechanicalPillar: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    }),

    prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        status: 'CONFIRMED',
        workoutDate: { gte: fourDaysAgo },
      },
      select: {
        workoutDate: true,
        workoutName: true,
        parsedType: true,
        parsedStructure: true,
        garminActivityId: true,
      },
      orderBy: { workoutDate: 'desc' },
      take: 10,
    }),

    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId,
        status: 'COMPLETED',
        completedAt: { gte: fourDaysAgo },
      },
      select: {
        title: true,
        workoutType: true,
        intensityAdjusted: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    }),

    // 7. Weekly training load
    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: sevenDaysAgo },
      },
      select: {
        dailyLoad: true,
      },
    }),

    // 8. Connected integrations for AI data-source policy
    prisma.integrationToken.findMany({
      where: {
        clientId,
        type: { in: ['GARMIN', 'OURA'] },
        syncEnabled: true,
      },
      select: {
        type: true,
      },
    }),

    // 9. Location equipment (enterprise feature)
    getLocationEquipment(clientId),

    // 10. Active training restrictions (physio system)
    getRestrictionsForWOD(clientId, locale),
  ])

  if (!client) {
    return null
  }

  // Get latest daily check-in for fatigue/soreness
  const latestCheckIn = await prisma.dailyCheckIn.findFirst({
    where: {
      clientId,
      date: { gte: subDays(now, 1) },
    },
    orderBy: { date: 'desc' },
    select: {
      fatigue: true,
      soreness: true,
      sleepQuality: true,
      sleepHours: true,
    },
  })

  const recoverySource = resolveWODRecoverySource(
    client.preferredRecoverySource,
    integrationTokens.map((token) => token.type)
  )
  const dataPolicy = buildWODDataPolicy({
    garminConnected: integrationTokens.some((token) => token.type === 'GARMIN'),
    recoverySource,
  })
  const redactReadiness = dataPolicy.withheldSignals.includes('readiness')
  const redactTrainingLoad = dataPolicy.withheldSignals.includes('training_load')

  // Calculate weekly TSS. If Garmin is connected, the aggregate load may include
  // Garmin-derived activity imports, so cloud-AI context receives a redacted value.
  const rawWeeklyTSS = weeklyTrainingLoad.reduce((sum, load) => sum + (load.dailyLoad || 0), 0)
  const weeklyTSS = redactTrainingLoad ? 0 : rawWeeklyTSS

  // Determine ACWR zone (simplified - uses weekly TSS thresholds)
  const acwrZone = redactTrainingLoad ? 'OPTIMAL' : calculateACWRZone(weeklyTSS)

  // Extract equipment from sport settings
  const availableEquipment = extractEquipment(sportProfile)

  // Get experience level
  const experienceLevel = getExperienceLevel(sportProfile, athleteProfile)

  // Map recent workouts to context format
  const recentProgramWorkouts = recentWorkoutLogs.map(log => ({
    source: 'program' as const,
    name: undefined,
    type: log.workout.type,
    date: log.completedAt!,
    intensity: log.workout.intensity,
    muscleGroups: log.workout.segments
      .map(s => s.exercise?.muscleGroup)
      .filter((g): g is string => !!g),
  }))

  const recentAdHocItems = recentAdHocWorkouts
    .filter((workout) => !dataPolicy.garminConnected || !workout.garminActivityId)
    .map((workout) => {
      const parsed = workout.parsedStructure as ParsedWorkout | null
      const distanceKm = getParsedWorkoutDistanceKm(parsed)
      return {
        source: 'adhoc' as const,
        name: parsed?.name || workout.workoutName || undefined,
        type: parsed?.type || workout.parsedType || 'OTHER',
        date: workout.workoutDate,
        intensity: parsed?.intensity || 'MODERATE',
        muscleGroups: [
          ...(parsed?.strengthExercises?.map((exercise) => exercise.exerciseName).slice(0, 2) || []),
          ...(distanceKm ? [`${distanceKm.toFixed(1)} km`] : []),
        ],
      }
    })

  const recentWODItems = recentCompletedWODs
    .filter((wod) => wod.completedAt)
    .map((wod) => ({
      source: 'wod' as const,
      name: wod.title,
      type: mapWODWorkoutType(wod.workoutType),
      date: wod.completedAt as Date,
      intensity: mapWODIntensity(wod.intensityAdjusted),
      muscleGroups: [],
    }))

  const recentWorkouts = [...recentProgramWorkouts, ...recentAdHocItems, ...recentWODItems]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10)

  // Map injuries
  const injuries = activeInjuries.map(injury => ({
    type: injury.injuryType || 'UNKNOWN',
    painLevel: injury.painLevel || 0,
    affectedArea: injury.painLocation || 'UNKNOWN',
  }))

  return {
    clientId,
    athleteName: client.name,
    primarySport: sportProfile?.primarySport || 'RUNNING',
    experienceLevel,

    // Readiness
    readinessScore: redactReadiness ? null : latestMetrics?.readinessScore ?? null,
    fatigueLevel: latestCheckIn?.fatigue ?? null,
    sorenessLevel: latestCheckIn?.soreness ?? null,
    sleepQuality: latestCheckIn?.sleepQuality ?? null,

    // Training load
    weeklyTSS,
    acwrZone,
    dataPolicy,

    // Injuries
    activeInjuries: injuries,

    // Recent training
    recentWorkouts,

    // Goals and preferences
    currentGoal: sportProfile?.currentGoal ?? undefined,
    availableEquipment,
    preferredDuration: 45, // Default

    // Location-based equipment (enterprise feature)
    locationEquipment,

    // AI-specific coaching instructions
    aiInstructions: client.aiInstructions ?? undefined,

    // Training restrictions (physio system)
    trainingRestrictions,
  }
}

// ============================================
// USAGE TRACKING
// ============================================

/**
 * Get WOD usage statistics for an athlete
 */
export async function getWODUsageStats(
  clientId: string,
  subscriptionTier: string
): Promise<WODUsageStats> {
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const tierKey = subscriptionTier.toUpperCase() as keyof typeof WOD_USAGE_LIMITS
  const dailyLimit = WOD_USAGE_LIMITS[tierKey] ?? WOD_USAGE_LIMITS.FREE
  const isUnlimited = dailyLimit === -1

  // Count WODs generated today. Paid tiers are unlimited, but the count is
  // still useful for diagnostics and future UX.
  const dailyCount = await prisma.aIGeneratedWOD.count({
    where: {
      clientId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  })

  const remaining = isUnlimited ? -1 : Math.max(0, dailyLimit - dailyCount)

  const resetDate = new Date(dayEnd)
  resetDate.setMilliseconds(resetDate.getMilliseconds() + 1)

  return {
    dailyCount,
    dailyLimit: isUnlimited ? -1 : dailyLimit,
    remaining,
    isUnlimited,
    resetDate,
    period: isUnlimited ? 'unlimited' : 'day',
  }
}

/**
 * Check if athlete can generate a WOD (usage limit check)
 */
export async function canGenerateWOD(
  clientId: string,
  subscriptionTier: string,
  locale: AppLocale = 'en'
): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  const stats = await getWODUsageStats(clientId, subscriptionTier)

  if (stats.isUnlimited) {
    return { allowed: true, remaining: -1 }
  }

  if (stats.remaining <= 0) {
    return {
      allowed: false,
      reason: wodText(
        locale,
        `You have used all ${stats.dailyLimit} of your free WOD sessions today. Try again tomorrow or upgrade for more.`,
        `Du har använt alla dina ${stats.dailyLimit} kostnadsfria WOD-pass idag. Försök igen imorgon eller uppgradera för fler.`
      ),
      remaining: 0,
    }
  }

  return { allowed: true, remaining: stats.remaining }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate ACWR zone based on weekly TSS
 * Simplified version - actual ACWR uses 7-day vs 28-day rolling average
 */
function calculateACWRZone(weeklyTSS: number): WODAthleteContext['acwrZone'] {
  // These thresholds are approximations
  // Real ACWR = Acute (7-day) / Chronic (28-day) training load
  if (weeklyTSS < 200) return 'DETRAINING'
  if (weeklyTSS < 600) return 'OPTIMAL'
  if (weeklyTSS < 800) return 'CAUTION'
  if (weeklyTSS < 1000) return 'DANGER'
  return 'CRITICAL'
}

function resolveWODRecoverySource(
  preferredRecoverySource: string | null | undefined,
  connectedTypes: string[]
): 'GARMIN' | 'OURA' | null {
  const connected = new Set(connectedTypes)
  const preferred = preferredRecoverySource || 'AUTO'

  if (preferred !== 'AUTO' && connected.has(preferred)) {
    return preferred as 'GARMIN' | 'OURA'
  }
  if (connected.has('OURA')) return 'OURA'
  if (connected.has('GARMIN')) return 'GARMIN'
  return null
}

function buildWODDataPolicy(input: {
  garminConnected: boolean
  recoverySource: 'GARMIN' | 'OURA' | null
}): WODDataPolicy {
  if (!input.garminConnected) {
    return {
      mode: 'standard',
      garminConnected: false,
      cloudAiGarminDataAllowed: false,
      withheldSignals: [],
      notice: 'Standard WOD context. No Garmin connection detected.',
    }
  }

  const withheldSignals: WODDataPolicy['withheldSignals'] = [
    'training_load',
    'recent_garmin_workouts',
  ]
  if (input.recoverySource === 'GARMIN') {
    withheldSignals.push('readiness')
  }

  return {
    mode: 'garmin_redacted',
    garminConnected: true,
    cloudAiGarminDataAllowed: false,
    withheldSignals,
    notice: 'Garmin-connected athlete: Garmin-origin signals are withheld from cloud AI prompts.',
  }
}

/**
 * Extract available equipment from sport profile settings
 */
function extractEquipment(sportProfile: {
  runningSettings?: unknown
  cyclingSettings?: unknown
  generalFitnessSettings?: unknown
} | null): WODEquipment[] {
  const equipment: WODEquipment[] = ['none'] // Always available

  if (!sportProfile) return equipment

  // Check general fitness settings for equipment
  const gfSettings = sportProfile.generalFitnessSettings as {
    availableEquipment?: string[]
  } | null

  if (gfSettings?.availableEquipment) {
    for (const item of gfSettings.availableEquipment) {
      const mapped = mapEquipmentName(item)
      if (mapped && !equipment.includes(mapped)) {
        equipment.push(mapped)
      }
    }
  }

  // Check cycling settings for bike/trainer
  const cyclingSettings = sportProfile.cyclingSettings as {
    bikeTypes?: string[]
    hasIndoorTrainer?: boolean
  } | null

  if (cyclingSettings?.bikeTypes?.length || cyclingSettings?.hasIndoorTrainer) {
    if (!equipment.includes('bike')) equipment.push('bike')
  }

  return equipment
}

/**
 * Map equipment names from settings to WODEquipment type
 */
function mapEquipmentName(name: string): WODEquipment | null {
  const lowered = name.toLowerCase()

  if (lowered.includes('dumbbell') || lowered.includes('hantel')) return 'dumbbells'
  if (lowered.includes('barbell') || lowered.includes('skivstång')) return 'barbell'
  if (lowered.includes('kettlebell')) return 'kettlebell'
  if (lowered.includes('band') || lowered.includes('gummi')) return 'resistance_band'
  if (lowered.includes('pull') || lowered.includes('räcke')) return 'pull_up_bar'
  if (lowered.includes('treadmill') || lowered.includes('löpband')) return 'treadmill'
  if (lowered.includes('bike') || lowered.includes('cykel')) return 'bike'
  if (lowered.includes('row') || lowered.includes('rodd')) return 'rower'
  if (lowered.includes('ski')) return 'skierg'

  return null
}

function mapWODWorkoutType(type: string | null): string {
  switch (type) {
    case 'cardio':
      return 'CARDIO'
    case 'mixed':
      return 'HYBRID'
    case 'core':
      return 'CORE'
    case 'strength':
    default:
      return 'STRENGTH'
  }
}

function mapWODIntensity(intensity: string | null): string {
  if (!intensity) return 'MODERATE'

  const normalized = intensity.toLowerCase()
  if (normalized.includes('recovery')) return 'RECOVERY'
  if (normalized.includes('easy') || normalized.includes('light')) return 'EASY'
  if (normalized.includes('threshold')) return 'THRESHOLD'
  if (normalized.includes('max')) return 'MAX'
  return 'MODERATE'
}

/**
 * Get experience level from profile data
 */
function getExperienceLevel(
  sportProfile: { runningExperience?: string | null } | null,
  athleteProfile: { category?: string | null } | null
): string {
  // Prefer athlete profile category
  if (athleteProfile?.category) {
    return athleteProfile.category
  }

  // Fall back to sport-specific experience
  if (sportProfile?.runningExperience) {
    return sportProfile.runningExperience
  }

  return 'RECREATIONAL' // Default
}

// ============================================
// QUICK CONTEXT (for streaming response metadata)
// ============================================

/**
 * Get minimal context for immediate response (before full AI generation)
 */
export async function getQuickContext(clientId: string): Promise<{
  athleteName: string
  readinessScore: number | null
  primarySport: string
} | null> {
  const [client, sportProfile, latestMetrics] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    }),
    prisma.sportProfile.findUnique({
      where: { clientId },
      select: { primarySport: true },
    }),
    prisma.dailyMetrics.findFirst({
      where: { clientId },
      orderBy: { date: 'desc' },
      select: { readinessScore: true },
    }),
  ])

  if (!client) return null

  return {
    athleteName: client.name,
    readinessScore: latestMetrics?.readinessScore ?? null,
    primarySport: sportProfile?.primarySport || 'RUNNING',
  }
}
