/**
 * WOD Context Builder
 *
 * Fast context gathering for Workout of the Day generation.
 * Optimized for < 500ms response time using parallel Prisma queries.
 */

import { prisma } from '@/lib/prisma'
import { subDays, startOfWeek, endOfWeek } from 'date-fns'
import type { WODAthleteContext, WODEquipment, WODUsageStats } from '@/types/wod'
import { WOD_USAGE_LIMITS } from '@/types/wod'
import { getRestrictionsForWOD } from '@/lib/training-restrictions'

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
export async function buildWODContext(clientId: string): Promise<WODAthleteContext | null> {
  const now = new Date()
  const fourDaysAgo = subDays(now, 4)

  // Parallel fetch all context data
  const [
    client,
    sportProfile,
    athleteProfile,
    latestMetrics,
    activeInjuries,
    recentWorkoutLogs,
    weeklyTrainingLoad,
    locationEquipment,
    trainingRestrictions,
  ] = await Promise.all([
    // 1. Basic client info
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
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

    // 7. Weekly training load
    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: subDays(now, 7) },
      },
      select: {
        dailyLoad: true,
      },
    }),

    // 8. Location equipment (enterprise feature)
    getLocationEquipment(clientId),

    // 9. Active training restrictions (physio system)
    getRestrictionsForWOD(clientId),
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

  // Calculate weekly TSS
  const weeklyTSS = weeklyTrainingLoad.reduce((sum, load) => sum + (load.dailyLoad || 0), 0)

  // Determine ACWR zone (simplified - uses weekly TSS thresholds)
  const acwrZone = calculateACWRZone(weeklyTSS)

  // Extract equipment from sport settings
  const availableEquipment = extractEquipment(sportProfile)

  // Get experience level
  const experienceLevel = getExperienceLevel(sportProfile, athleteProfile)

  // Map recent workouts to context format
  const recentWorkouts = recentWorkoutLogs.map(log => ({
    type: log.workout.type,
    date: log.completedAt!,
    intensity: log.workout.intensity,
    muscleGroups: log.workout.segments
      .map(s => s.exercise?.muscleGroup)
      .filter((g): g is string => !!g),
  }))

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
    readinessScore: latestMetrics?.readinessScore ?? null,
    fatigueLevel: latestCheckIn?.fatigue ?? null,
    sorenessLevel: latestCheckIn?.soreness ?? null,
    sleepQuality: latestCheckIn?.sleepQuality ?? null,

    // Training load
    weeklyTSS,
    acwrZone,

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
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Count WODs generated this week
  const weeklyCount = await prisma.aIGeneratedWOD.count({
    where: {
      clientId,
      createdAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  })

  // Get limit for tier
  const tierKey = subscriptionTier.toUpperCase() as keyof typeof WOD_USAGE_LIMITS
  const weeklyLimit = WOD_USAGE_LIMITS[tierKey] ?? WOD_USAGE_LIMITS.FREE
  const isUnlimited = weeklyLimit === -1

  // Calculate remaining
  const remaining = isUnlimited ? Infinity : Math.max(0, weeklyLimit - weeklyCount)

  // Next reset is next Monday
  const resetDate = new Date(weekEnd)
  resetDate.setDate(resetDate.getDate() + 1)

  return {
    weeklyCount,
    weeklyLimit: isUnlimited ? -1 : weeklyLimit,
    remaining: isUnlimited ? -1 : remaining,
    isUnlimited,
    resetDate,
  }
}

/**
 * Check if athlete can generate a WOD (usage limit check)
 */
export async function canGenerateWOD(
  clientId: string,
  subscriptionTier: string
): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  const stats = await getWODUsageStats(clientId, subscriptionTier)

  if (stats.isUnlimited) {
    return { allowed: true, remaining: -1 }
  }

  if (stats.remaining <= 0) {
    return {
      allowed: false,
      reason: `Du har använt alla dina ${stats.weeklyLimit} WOD-pass denna vecka. Uppgradera för fler!`,
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
