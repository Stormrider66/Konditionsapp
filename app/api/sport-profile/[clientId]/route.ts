// app/api/sport-profile/[clientId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { SportType, Prisma } from '@prisma/client'
import { validateTargets } from '@/lib/training/intensity-targets'
import { estimateFitnessLevel, type FitnessEstimationInput, type ExperienceLevel } from '@/lib/training/fitness-estimation'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{
    clientId: string
  }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// Helper to calculate fitness estimate from profile data
function calculateFitnessEstimate(data: {
  biometrics?: { restingHR?: number | null; maxHR?: number | null; watchVO2maxEstimate?: number | null } | null
  recentRaceTime?: { distance: string; timeMinutes: number } | null
  runningExperience?: string | null
  cyclingExperience?: string | null
}) {
  const input: FitnessEstimationInput = {}

  // Add biometrics if available
  if (data.biometrics) {
    if (data.biometrics.restingHR) input.restingHR = data.biometrics.restingHR
    if (data.biometrics.maxHR) input.maxHR = data.biometrics.maxHR
    if (data.biometrics.watchVO2maxEstimate) input.watchVO2maxEstimate = data.biometrics.watchVO2maxEstimate
  }

  // Add race time if available
  if (data.recentRaceTime?.distance && data.recentRaceTime?.timeMinutes) {
    input.recentRaceTime = {
      distance: data.recentRaceTime.distance as FitnessEstimationInput['recentRaceTime'] extends { distance: infer D } ? D : never,
      timeMinutes: data.recentRaceTime.timeMinutes,
    }
  }

  // Add experience level (prefer running, then cycling)
  const experience = data.runningExperience || data.cyclingExperience
  if (experience && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'].includes(experience)) {
    input.experienceLevel = experience as ExperienceLevel
  }

  // Only calculate if we have some data
  if (Object.keys(input).length > 0) {
    return estimateFitnessLevel(input)
  }

  return null
}

// Biometrics schema for fitness estimation
const biometricsSchema = z.object({
  restingHR: z.number().min(30).max(120).nullable().optional(),
  maxHR: z.number().min(140).max(230).nullable().optional(),
  watchVO2maxEstimate: z.number().min(20).max(90).nullable().optional(),
  watchBrand: z.string().nullable().optional(),
}).optional()

// Recent race time schema for VDOT calculation
const recentRaceTimeSchema = z.object({
  distance: z.enum(['1500M', '1_MILE', '3K', '5K', '10K', 'HALF_MARATHON', 'MARATHON']),
  timeMinutes: z.number().min(1).max(600), // 1 minute to 10 hours
}).optional()

// Validation schema for updating sport profile
// Using z.any() for JSON fields as they're stored as Prisma Json type
const updateSportProfileSchema = z.object({
  primarySport: z.nativeEnum(SportType).optional(),
  secondarySports: z.array(z.nativeEnum(SportType)).optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingStep: z.number().optional(),
  runningSettings: z.any().optional(),
  cyclingSettings: z.any().optional(),
  skiingSettings: z.any().optional(),
  triathlonSettings: z.any().optional(),
  hyroxSettings: z.any().optional(),
  generalFitnessSettings: z.any().optional(),
  functionalFitnessSettings: z.any().optional(),
  swimmingSettings: z.any().optional(),
  ergometerSettings: z.any().optional(),
  hockeySettings: z.any().optional(),
  footballSettings: z.any().optional(),
  handballSettings: z.any().optional(),
  floorballSettings: z.any().optional(),
  basketballSettings: z.any().optional(),
  volleyballSettings: z.any().optional(),
  tennisSettings: z.any().optional(),
  padelSettings: z.any().optional(),
  equipment: z.any().optional(),
  weeklyAvailability: z.any().optional(),
  preferredSessionLength: z.number().min(15).max(300).optional(),
  currentGoal: z.string().optional(),
  targetDate: z.string().optional().nullable(),
  targetMetric: z.any().optional(),
  themePreferences: z.any().optional(), // { appTheme: 'FITAPP_DARK' | 'MINIMALIST_WHITE', pdfTheme: '...' }
  biometrics: biometricsSchema, // Heart rate data for fitness estimation
  recentRaceTime: recentRaceTimeSchema, // Recent race result for VDOT calculation
  runningExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  cyclingExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  swimmingExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  strengthExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  activeStandardProgram: z.string().optional().nullable(),
  hasCustomProgram: z.boolean().optional(),
})

// GET /api/sport-profile/[clientId] - Get sport profile for a client
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const locale = resolveRequestLocale(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }

    const { clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    const sportProfile = await prisma.sportProfile.findUnique({
      where: { clientId },
    })

    if (!sportProfile) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Sport profile not found', 'Sportprofilen hittades inte'), data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sportProfile,
    })
  } catch (error) {
    logger.error('Error fetching sport profile', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch sport profile', 'Misslyckades med att hämta sportprofil') },
      { status: 500 }
    )
  }
}

// PUT /api/sport-profile/[clientId] - Update sport profile
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const locale = resolveRequestLocale(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }

    const { clientId } = await params
    const body = await request.json()

    const validation = updateSportProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Validation failed', 'Valideringen misslyckades'),
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    // Check if profile exists
    const existingProfile = await prisma.sportProfile.findUnique({
      where: { clientId },
    })

    if (!existingProfile) {
      // Create profile if it doesn't exist (upsert behavior)
      const sportProfile = await prisma.sportProfile.create({
        data: {
          clientId,
          primarySport: data.primarySport || 'RUNNING',
          secondarySports: data.secondarySports || [],
          onboardingCompleted: data.onboardingCompleted || false,
          onboardingStep: data.onboardingStep || 0,
          runningSettings: data.runningSettings,
          cyclingSettings: data.cyclingSettings,
          skiingSettings: data.skiingSettings,
          triathlonSettings: data.triathlonSettings,
          hyroxSettings: data.hyroxSettings,
          generalFitnessSettings: data.generalFitnessSettings,
          functionalFitnessSettings: data.functionalFitnessSettings,
          swimmingSettings: data.swimmingSettings,
          ergometerSettings: data.ergometerSettings,
          hockeySettings: data.hockeySettings,
          footballSettings: data.footballSettings,
          handballSettings: data.handballSettings,
          floorballSettings: data.floorballSettings,
          basketballSettings: data.basketballSettings,
          volleyballSettings: data.volleyballSettings,
          tennisSettings: data.tennisSettings,
          padelSettings: data.padelSettings,
          equipment: data.equipment,
          weeklyAvailability: data.weeklyAvailability,
          preferredSessionLength: data.preferredSessionLength,
          currentGoal: data.currentGoal,
          targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
          targetMetric: data.targetMetric,
          themePreferences: data.themePreferences,
          biometrics: data.biometrics,
          recentRaceTime: data.recentRaceTime,
          runningExperience: data.runningExperience,
          cyclingExperience: data.cyclingExperience,
          swimmingExperience: data.swimmingExperience,
          strengthExperience: data.strengthExperience,
          activeStandardProgram: data.activeStandardProgram,
          hasCustomProgram: data.hasCustomProgram,
        },
      })

      // Calculate and store fitness estimate
      const fitnessEstimate = calculateFitnessEstimate({
        biometrics: data.biometrics,
        recentRaceTime: data.recentRaceTime,
        runningExperience: data.runningExperience,
        cyclingExperience: data.cyclingExperience,
      })

      if (fitnessEstimate) {
        await prisma.sportProfile.update({
          where: { clientId },
          data: { fitnessEstimate: fitnessEstimate as unknown as Prisma.InputJsonValue },
        })
        logger.info('Calculated fitness estimate for new profile', { clientId, level: fitnessEstimate.level })
      }

      return NextResponse.json({
        success: true,
        data: { ...sportProfile, fitnessEstimate },
        message: t(locale, 'Sport profile created successfully', 'Sportprofilen har skapats'),
      })
    }

    // Update existing profile
    const sportProfile = await prisma.sportProfile.update({
      where: { clientId },
      data: {
        ...(data.primarySport && { primarySport: data.primarySport }),
        ...(data.secondarySports !== undefined && { secondarySports: data.secondarySports }),
        ...(data.onboardingCompleted !== undefined && { onboardingCompleted: data.onboardingCompleted }),
        ...(data.onboardingStep !== undefined && { onboardingStep: data.onboardingStep }),
        ...(data.runningSettings !== undefined && { runningSettings: data.runningSettings }),
        ...(data.cyclingSettings !== undefined && { cyclingSettings: data.cyclingSettings }),
        ...(data.skiingSettings !== undefined && { skiingSettings: data.skiingSettings }),
        ...(data.triathlonSettings !== undefined && { triathlonSettings: data.triathlonSettings }),
        ...(data.hyroxSettings !== undefined && { hyroxSettings: data.hyroxSettings }),
        ...(data.generalFitnessSettings !== undefined && { generalFitnessSettings: data.generalFitnessSettings }),
        ...(data.functionalFitnessSettings !== undefined && { functionalFitnessSettings: data.functionalFitnessSettings }),
        ...(data.swimmingSettings !== undefined && { swimmingSettings: data.swimmingSettings }),
        ...(data.ergometerSettings !== undefined && { ergometerSettings: data.ergometerSettings }),
        ...(data.hockeySettings !== undefined && { hockeySettings: data.hockeySettings }),
        ...(data.footballSettings !== undefined && { footballSettings: data.footballSettings }),
        ...(data.handballSettings !== undefined && { handballSettings: data.handballSettings }),
        ...(data.floorballSettings !== undefined && { floorballSettings: data.floorballSettings }),
        ...(data.basketballSettings !== undefined && { basketballSettings: data.basketballSettings }),
        ...(data.volleyballSettings !== undefined && { volleyballSettings: data.volleyballSettings }),
        ...(data.tennisSettings !== undefined && { tennisSettings: data.tennisSettings }),
        ...(data.padelSettings !== undefined && { padelSettings: data.padelSettings }),
        ...(data.equipment !== undefined && { equipment: data.equipment }),
        ...(data.weeklyAvailability !== undefined && { weeklyAvailability: data.weeklyAvailability }),
        ...(data.preferredSessionLength !== undefined && { preferredSessionLength: data.preferredSessionLength }),
        ...(data.currentGoal !== undefined && { currentGoal: data.currentGoal }),
        ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
        ...(data.targetMetric !== undefined && { targetMetric: data.targetMetric }),
        ...(data.themePreferences !== undefined && { themePreferences: data.themePreferences }),
        ...(data.biometrics !== undefined && { biometrics: data.biometrics }),
        ...(data.recentRaceTime !== undefined && { recentRaceTime: data.recentRaceTime }),
        ...(data.runningExperience !== undefined && { runningExperience: data.runningExperience }),
        ...(data.cyclingExperience !== undefined && { cyclingExperience: data.cyclingExperience }),
        ...(data.swimmingExperience !== undefined && { swimmingExperience: data.swimmingExperience }),
        ...(data.strengthExperience !== undefined && { strengthExperience: data.strengthExperience }),
        ...(data.activeStandardProgram !== undefined && { activeStandardProgram: data.activeStandardProgram }),
        ...(data.hasCustomProgram !== undefined && { hasCustomProgram: data.hasCustomProgram }),
      },
    })

    // Recalculate fitness estimate if relevant data was updated
    const shouldRecalculate =
      data.biometrics !== undefined ||
      data.recentRaceTime !== undefined ||
      data.runningExperience !== undefined ||
      data.cyclingExperience !== undefined

    let fitnessEstimate = null
    if (shouldRecalculate) {
      // Get the latest profile data for calculation
      const updatedProfile = await prisma.sportProfile.findUnique({
        where: { clientId },
        select: {
          biometrics: true,
          recentRaceTime: true,
          runningExperience: true,
          cyclingExperience: true,
        },
      })

      if (updatedProfile) {
        fitnessEstimate = calculateFitnessEstimate({
          biometrics: updatedProfile.biometrics as { restingHR?: number | null; maxHR?: number | null; watchVO2maxEstimate?: number | null } | null,
          recentRaceTime: updatedProfile.recentRaceTime as { distance: string; timeMinutes: number } | null,
          runningExperience: updatedProfile.runningExperience,
          cyclingExperience: updatedProfile.cyclingExperience,
        })

        if (fitnessEstimate) {
          await prisma.sportProfile.update({
            where: { clientId },
            data: { fitnessEstimate: fitnessEstimate as unknown as Prisma.InputJsonValue },
          })
          logger.info('Recalculated fitness estimate', { clientId, level: fitnessEstimate.level })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: fitnessEstimate ? { ...sportProfile, fitnessEstimate } : sportProfile,
      message: t(locale, 'Sport profile updated successfully', 'Sportprofilen har uppdaterats'),
    })
  } catch (error) {
    logger.error('Error updating sport profile', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update sport profile', 'Misslyckades med att uppdatera sportprofil') },
      { status: 500 }
    )
  }
}

// Validation schema for intensity targets
const intensityTargetsSchema = z.object({
  easyPercent: z.number().min(0).max(100),
  moderatePercent: z.number().min(0).max(100),
  hardPercent: z.number().min(0).max(100),
  methodology: z.enum(['POLARIZED', 'THRESHOLD_FOCUSED', 'PYRAMIDAL', 'BALANCED', 'HIGH_INTENSITY', 'CUSTOM']).optional(),
  label: z.string().optional(),
})

// PATCH schema for partial updates. Each field is independent — clients send
// only the slice they want to change.
const patchSportProfileSchema = z.object({
  sport: z.nativeEnum(SportType).optional(),
  intensityTargets: intensityTargetsSchema.optional(),
  lifestyleActivity: z.enum(['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE']).optional(),
}).refine(
  (val) => val.intensityTargets !== undefined || val.lifestyleActivity !== undefined,
  { message: 'Provide intensityTargets or lifestyleActivity to update' }
)

// PATCH /api/sport-profile/[clientId] - Partial update for specific sport settings
// Used for updating intensity targets (per-sport JSON) and the lifestyle/NEAT
// activity level (top-level enum on the SportProfile).
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const locale = resolveRequestLocale(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }

    const { clientId } = await params
    const body = await request.json()

    const validation = patchSportProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Validation failed', 'Valideringen misslyckades'),
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { sport, intensityTargets, lifestyleActivity } = validation.data

    // Intensity targets: percentages must sum to 100 and a sport must be specified
    if (intensityTargets) {
      if (!sport) {
        return NextResponse.json(
          { success: false, error: t(locale, 'sport is required when updating intensityTargets', 'sport krävs när intensityTargets uppdateras') },
          { status: 400 }
        )
      }
      if (!validateTargets(intensityTargets)) {
        return NextResponse.json(
          { success: false, error: t(locale, 'Intensity percentages must sum to 100', 'Intensitetsprocent måste summera till 100') },
          { status: 400 }
        )
      }
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    // Get current sport profile
    const existingProfile = await prisma.sportProfile.findUnique({
      where: { clientId },
    })

    if (!existingProfile) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Sport profile not found', 'Sportprofilen hittades inte') },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (intensityTargets && sport) {
      // Map sport type to settings field name
      const settingsFieldMap: Record<SportType, keyof typeof existingProfile> = {
        RUNNING: 'runningSettings',
        CYCLING: 'cyclingSettings',
        SKIING: 'skiingSettings',
        SWIMMING: 'swimmingSettings',
        TRIATHLON: 'triathlonSettings',
        HYROX: 'hyroxSettings',
        GENERAL_FITNESS: 'generalFitnessSettings',
        FUNCTIONAL_FITNESS: 'functionalFitnessSettings',
        STRENGTH: 'generalFitnessSettings', // Use general fitness for strength
        TEAM_FOOTBALL: 'footballSettings',
        TEAM_ICE_HOCKEY: 'hockeySettings',
        TEAM_HANDBALL: 'handballSettings',
        TEAM_FLOORBALL: 'floorballSettings',
        TEAM_BASKETBALL: 'basketballSettings',
        TEAM_VOLLEYBALL: 'volleyballSettings',
        TENNIS: 'tennisSettings',
        PADEL: 'padelSettings',
        NUTRITION: 'generalFitnessSettings', // Fallback — nutrition users have no sport-specific settings
      }

      const settingsField = settingsFieldMap[sport]
      if (!settingsField) {
        return NextResponse.json(
          { success: false, error: t(locale, 'Invalid sport type', 'Ogiltig sporttyp') },
          { status: 400 }
        )
      }

      // Merge with current sport settings JSON
      const currentSettings = (existingProfile[settingsField] as Record<string, unknown>) || {}
      updateData[settingsField] = { ...currentSettings, intensityTargets }
    }

    if (lifestyleActivity) {
      updateData.lifestyleActivity = lifestyleActivity
    }

    const sportProfile = await prisma.sportProfile.update({
      where: { clientId },
      data: updateData,
    })

    logger.info('Updated sport profile', {
      clientId,
      ...(intensityTargets ? { sport, intensityTargets } : {}),
      ...(lifestyleActivity ? { lifestyleActivity } : {}),
    })

    return NextResponse.json({
      success: true,
      data: sportProfile,
      message: t(locale, 'Sport profile updated successfully', 'Sportprofilen har uppdaterats'),
    })
  } catch (error) {
    logger.error('Error updating sport profile', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update sport profile', 'Misslyckades med att uppdatera sportprofil') },
      { status: 500 }
    )
  }
}
