/**
 * Athlete Context Builder for AI Chat
 *
 * Builds context from the athlete's OWN data for AI conversations.
 * This is a simplified version specifically for athlete self-service AI chat.
 */

import { prisma } from '@/lib/prisma'
import { buildVideoAnalysisContext } from '@/lib/ai/sport-context/video-analysis'
import { testQualityReviewBlocksProgram, usableTestQualityReviewWhere } from '@/lib/testing/test-quality-review'
import { painAlertOutcomeLabel } from '@/lib/coach/pain-alert-outcomes'
import type { VideoAnalysis } from '@/lib/ai/sport-context/types'
import { SportType, AgentActionStatus } from '@prisma/client'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface MealLogData {
  date: Date
  mealType: string
  description: string | null
  calories: number | null
  proteinGrams: number | null
  carbsGrams: number | null
  fatGrams: number | null
}

interface NutritionGoalData {
  goalType: string
  targetWeightKg: number | null
  weeklyChangeKg: number | null
  macroProfile: string | null
  customProteinPerKg: number | null
  customProteinPercent: number | null
  customCarbsPercent: number | null
  customFatPercent: number | null
}

interface DietaryPreferencesData {
  dietaryStyle: string | null
  allergies: unknown
  intolerances: unknown
  dislikedFoods: unknown
}

interface DailyCheckInData {
  date: Date
  readinessScore: number | null
  hrv: number | null
  restingHR: number | null
  sleepQuality: number | null
  sleepHours: number | null
  soreness: number
  fatigue: number
  mood: number
  stress: number
  motivation: number
  notes: string | null
}

interface WorkoutLogData {
  id: string
  completedAt: Date | null
  duration: number | null
  distance: number | null
  avgHR: number | null
  perceivedEffort: number | null
  notes: string | null
  workout: {
    name: string
    type: string
    description: string | null
  } | null
}

interface ThresholdJson {
  hr?: number
  value?: number
  unit?: string
}

interface TestData {
  id: string
  testDate: Date
  testType: string
  maxHR: number | null
  vo2max: number | null
  qualityReviewStatus?: string | null
  aerobicThreshold: ThresholdJson | null
  anaerobicThreshold: ThresholdJson | null
  trainingZones: unknown
}

interface RaceResultData {
  raceName: string | null
  distance: string
  timeFormatted: string
  raceDate: Date
  vdot: number | null
}

interface InjuryData {
  injuryType: string | null
  painLocation: string | null
  status: string
  painLevel: number
  phase: string | null
  createdAt: Date
}

interface PainFollowUpData {
  createdAt: Date
  status: string
  message: string
  resolutionOutcome: string | null
  actionNote: string | null
  followUpAt: Date | null
  resolvedAt: Date | null
  actionedAt: Date | null
  snoozedUntil: Date | null
}

interface TrainingLoadData {
  date: Date
  acuteLoad: number | null
  chronicLoad: number | null
  acwr: number | null
  acwrZone: string | null
  injuryRisk: string | null
}

interface AgentActionData {
  id: string
  actionType: string
  reasoning: string
  status: string
  confidence: string
  targetDate: Date | null
  createdAt: Date
}

interface AthleteProfileData {
  trainingBackground: string | null
  longTermAmbitions: string | null
  seasonalFocus: string | null
  personalMotivations: string | null
  trainingPreferences: string | null
  constraints: string | null
  dietaryNotes: string | null
}

/**
 * Build comprehensive context from athlete's own data
 */
export async function buildAthleteOwnContext(clientId: string): Promise<string> {
  // Fetch all athlete data in parallel (use allSettled so one failing query doesn't kill all context)
  const results = await Promise.allSettled([
    // Basic client info
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        // GDPR: name intentionally excluded - not sent to AI providers
        gender: true,
        birthDate: true,
        height: true,
        weight: true,
        aiInstructions: true,
        user: {
          select: {
            language: true,
          },
        },
      },
    }),

    // Sport profile (explicit select to avoid errors from new columns not yet in production DB)
    prisma.sportProfile.findUnique({
      where: { clientId },
      select: {
        primarySport: true,
        secondarySports: true,
        runningSettings: true,
        cyclingSettings: true,
        swimmingSettings: true,
        runningExperience: true,
        cyclingExperience: true,
        swimmingExperience: true,
        weeklyAvailability: true,
        preferredSessionLength: true,
        equipment: true,
      },
    }),

    // Recent tests (expanded to 10)
    prisma.test.findMany({
      where: {
        clientId,
        ...usableTestQualityReviewWhere,
      },
      orderBy: { testDate: 'desc' },
      take: 10,
      select: {
        id: true,
        testDate: true,
        testType: true,
        maxHR: true,
        vo2max: true,
        qualityReviewStatus: true,
        aerobicThreshold: true,
        anaerobicThreshold: true,
        trainingZones: true,
      },
    }),

    // Recent workouts (last 10)
    prisma.workoutLog.findMany({
      where: {
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        completedAt: true,
        duration: true,
        distance: true,
        avgHR: true,
        perceivedEffort: true,
        notes: true,
        workout: {
          select: {
            name: true,
            type: true,
            description: true,
          },
        },
      },
    }),

    // Daily check-ins (last 7)
    prisma.dailyCheckIn.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 7,
      select: {
        date: true,
        readinessScore: true,
        hrv: true,
        restingHR: true,
        sleepQuality: true,
        sleepHours: true,
        soreness: true,
        fatigue: true,
        mood: true,
        stress: true,
        motivation: true,
        notes: true,
      },
    }),

    // Active training program
    prisma.trainingProgram.findFirst({
      where: { clientId, isActive: true },
      select: {
        name: true,
        goalRace: true,
        goalDate: true,
        startDate: true,
        endDate: true,
        isActive: true,
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            weekNumber: true,
            phase: true,
            days: {
              select: {
                dayNumber: true,
                workouts: {
                  select: {
                    name: true,
                    type: true,
                    duration: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    // Race results (last 5)
    prisma.raceResult.findMany({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      take: 5,
      select: {
        raceName: true,
        distance: true,
        timeFormatted: true,
        raceDate: true,
        vdot: true,
      },
    }),

    // Active injuries
    prisma.injuryAssessment.findMany({
      where: {
        clientId,
        status: { not: 'FULLY_RECOVERED' },
      },
      select: {
        injuryType: true,
        painLocation: true,
        status: true,
        painLevel: true,
        phase: true,
        createdAt: true,
      },
    }),

    // Recent pain follow-ups from coach alert resolution
    prisma.coachAlert.findMany({
      where: {
        clientId,
        alertType: 'PAIN_MENTION',
        status: { in: ['RESOLVED', 'ACTIONED', 'SNOOZED'] },
      },
      orderBy: [
        { resolvedAt: 'desc' },
        { actionedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5,
      select: {
        createdAt: true,
        status: true,
        message: true,
        resolutionOutcome: true,
        actionNote: true,
        followUpAt: true,
        resolvedAt: true,
        actionedAt: true,
        snoozedUntil: true,
      },
    }),

    // Strava activities (last 14 days)
    prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { startDate: 'desc' },
      take: 20,
      select: {
        name: true,
        type: true,
        startDate: true,
        distance: true,
        movingTime: true,
        averageHeartrate: true,
        tss: true,
      },
    }),

    // Garmin/daily metrics (last 7 days)
    prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { date: 'desc' },
      take: 7,
      select: {
        date: true,
        sleepHours: true,
        sleepQuality: true,
        hrvRMSSD: true,
        restingHR: true,
        wellnessScore: true,
        readinessScore: true,
      },
    }),

    // Training load (ACWR) - latest ACWR_SUMMARY row (workout rows don't
    // carry the EWMA fields and would mask the values)
    prisma.trainingLoad.findFirst({
      where: { clientId, source: 'ACWR_SUMMARY' },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        acuteLoad: true,
        chronicLoad: true,
        acwr: true,
        acwrZone: true,
        injuryRisk: true,
      },
    }),

    // Strength sessions (last 5 assigned)
    prisma.strengthSessionAssignment.findMany({
      where: { athleteId: clientId },
      orderBy: { assignedDate: 'desc' },
      take: 5,
      select: {
        id: true,
        assignedDate: true,
        session: {
          select: {
            name: true,
            phase: true,
            exercises: true,
          },
        },
      },
    }),

    // Agent actions (pending and recent)
    prisma.agentAction.findMany({
      where: {
        clientId,
        status: {
          in: [AgentActionStatus.PROPOSED, AgentActionStatus.AUTO_APPLIED],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        actionType: true,
        reasoning: true,
        status: true,
        confidence: true,
        targetDate: true,
        createdAt: true,
      },
    }),

    // Athlete account with self-description
    prisma.athleteAccount.findUnique({
      where: { clientId },
      select: {
        trainingBackground: true,
        longTermAmbitions: true,
        seasonalFocus: true,
        personalMotivations: true,
        trainingPreferences: true,
        constraints: true,
        dietaryNotes: true,
      },
    }),

    // Total planned workouts (last 30 days) for compliance rate
    prisma.workout.count({
      where: {
        day: {
          week: {
            program: { clientId, isActive: true },
          },
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Completed workouts (last 30 days) for compliance rate
    prisma.workoutLog.count({
      where: {
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Longest run from Strava (last 8 weeks) for auto-calculating longest run
    prisma.stravaActivity.findFirst({
      where: {
        clientId,
        type: { in: ['Run', 'run', 'RUNNING'] },
        startDate: {
          gte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { distance: 'desc' },
      select: {
        distance: true,
        movingTime: true,
        startDate: true,
        averageHeartrate: true,
      },
    }),

    // Recent meals (last 7 days) for nutrition context
    prisma.mealLog.findMany({
      where: {
        clientId,
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        mealType: true,
        description: true,
        calories: true,
        proteinGrams: true,
        carbsGrams: true,
        fatGrams: true,
      },
    }),

    // Nutrition goal
    prisma.nutritionGoal.findUnique({
      where: { clientId },
      select: {
        goalType: true,
        targetWeightKg: true,
        weeklyChangeKg: true,
        macroProfile: true,
        customProteinPerKg: true,
        customProteinPercent: true,
        customCarbsPercent: true,
        customFatPercent: true,
      },
    }),

    // Dietary preferences
    prisma.dietaryPreferences.findUnique({
      where: { clientId },
      select: {
        dietaryStyle: true,
        allergies: true,
        intolerances: true,
        dislikedFoods: true,
      },
    }),

    // Recent video and pose analyses. Do not fetch raw landmark frames here;
    // the AI context only needs compact biomechanical findings.
    prisma.videoAnalysis.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        videoType: true,
        cameraAngle: true,
        formScore: true,
        issuesDetected: true,
        recommendations: true,
        aiPoseAnalysis: true,
        runningGaitAnalysis: {
          select: {
            id: true,
            cadence: true,
            groundContactTime: true,
            verticalOscillation: true,
            strideLength: true,
            footStrikePattern: true,
            asymmetryPercent: true,
            leftContactTime: true,
            rightContactTime: true,
            injuryRiskLevel: true,
            injuryRiskScore: true,
            injuryRiskFactors: true,
            runningEfficiency: true,
            energyLeakages: true,
            coachingCues: true,
            drillRecommendations: true,
            overallScore: true,
            summary: true,
          },
        },
      },
    }),
  ])

  // Unwrap allSettled results — failed queries become null/0/[] instead of crashing
  const v = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === 'fulfilled' ? r.value : fallback
  const client = v(results[0], null)
  const sportProfile = v(results[1], null)
  const recentTests = v(results[2], [] as never[])
  const recentWorkouts = v(results[3], [] as never[])
  const dailyCheckIns = v(results[4], [] as never[])
  const activeProgram = v(results[5], null)
  const races = v(results[6], [] as never[])
  const injuries = v(results[7], [] as never[])
  const painFollowUps = v(results[8], [] as never[])
  const stravaActivities = v(results[9], [] as never[])
  const dailyMetrics = v(results[10], [] as never[])
  const trainingLoad = v(results[11], null)
  const strengthSessions = v(results[12], [] as never[])
  const agentActions = v(results[13], [] as never[])
  const athleteAccount = v(results[14], null)
  const totalPlannedWorkouts = v(results[15], 0)
  const completedWorkouts = v(results[16], 0)
  const longestStravaRun = v(results[17], null)
  const recentMeals = v(results[18], [] as never[])
  const nutritionGoal = v(results[19], null)
  const dietaryPreferences = v(results[20], null)
  const videoAnalyses = v(results[21], [] as never[])

  if (!client) {
    return 'No athlete data found.'
  }

  const locale: AppLocale = client.user.language === 'sv' ? 'sv' : 'en'

  // Build context string
  let context = ''

  // Profile section
  context += buildProfileContext(client, locale)

  // Coach AI instructions for this athlete (condition-aware coaching)
  if (client.aiInstructions) {
    context += `## ${t(locale, 'COACH INSTRUCTIONS FOR AI', 'COACH-INSTRUKTIONER FÖR AI')}\n${client.aiInstructions}\n\n`
  }

  // Athlete self-description section (NEW)
  if (athleteAccount) {
    context += buildAthleteProfileContext(
      athleteAccount as AthleteProfileData,
      sportProfile ?? undefined,
      locale,
    )
  }

  // Sport profile section
  if (sportProfile) {
    context += buildSportProfileContext(sportProfile, locale)
  }

  // Auto-calculated longest run (from Strava, last 8 weeks)
  // Only add if the sport profile doesn't already have a manual longestRun
  const runSettings = sportProfile?.runningSettings as { longestRun?: number } | null
  if (!runSettings?.longestRun && longestStravaRun?.distance) {
    const distKm = (longestStravaRun.distance / 1000).toFixed(1)
    const timeMin = longestStravaRun.movingTime ? Math.round(longestStravaRun.movingTime / 60) : null
    const date = formatDate(longestStravaRun.startDate, locale)
    let line = `## ${t(locale, 'LONGEST RUN (last 8 weeks, Strava)', 'LÄNGSTA LÖPPASS (senaste 8 veckorna, Strava)')}\n`
    line += `- **${t(locale, 'Distance', 'Distans')}**: ${distKm} km`
    if (timeMin) line += ` (${timeMin} min)`
    if (longestStravaRun.averageHeartrate) line += ` | ${t(locale, 'Avg HR', 'Snittpuls')}: ${Math.round(longestStravaRun.averageHeartrate)} bpm`
    line += ` | ${t(locale, 'Date', 'Datum')}: ${date}\n\n`
    context += line
  }

  // Training load / ACWR section (NEW)
  if (trainingLoad) {
    context += buildTrainingLoadContext(trainingLoad as TrainingLoadData, locale)
  }

  // Compliance rate (NEW)
  if (totalPlannedWorkouts > 0) {
    context += buildComplianceContext(completedWorkouts, totalPlannedWorkouts, locale)
  }

  // Readiness and wellness section
  if (dailyCheckIns.length > 0) {
    context += buildReadinessContext(dailyCheckIns as DailyCheckInData[], locale)
  }

  // Recent tests section (expanded to 10)
  if (recentTests.length > 0) {
    context += buildTestContext(recentTests as TestData[], locale)
  }

  // Active program section
  if (activeProgram) {
    context += buildProgramContext(activeProgram, locale)
  }

  // Recent workouts section
  if (recentWorkouts.length > 0) {
    context += buildWorkoutHistoryContext(recentWorkouts as WorkoutLogData[], locale)
  }

  // Strength training section (NEW)
  if (strengthSessions.length > 0) {
    context += buildStrengthContext(strengthSessions, locale)
  }

  // Agent actions section (NEW)
  if (agentActions.length > 0) {
    context += buildAgentActionsContext(agentActions as AgentActionData[], locale)
  }

  // Race results section
  if (races.length > 0) {
    context += buildRaceContext(races as RaceResultData[], locale)
  }

  // Injuries section
  if (injuries.length > 0) {
    context += buildInjuryContext(injuries as InjuryData[], locale)
  }

  if (painFollowUps.length > 0) {
    context += buildPainFollowUpContext(painFollowUps as PainFollowUpData[], locale)
  }

  // Video/pose findings are important context for linking technique, mobility,
  // asymmetry, pain patterns, and training-load decisions.
  if (videoAnalyses.length > 0) {
    context += buildVideoAnalysisContext(videoAnalyses as unknown as VideoAnalysis[], locale)
  }

  // Nutrition context
  if (recentMeals.length > 0 || nutritionGoal || dietaryPreferences) {
    context += buildNutritionContext(
      recentMeals as MealLogData[],
      nutritionGoal as NutritionGoalData | null,
      dietaryPreferences as DietaryPreferencesData | null,
      locale,
    )
  }

  // Integration data section
  const integrationData = buildIntegrationSummary(stravaActivities, dailyMetrics, locale)
  if (integrationData) {
    context += integrationData
  }

  return context
}

function buildProfileContext(client: {
  gender: string | null
  birthDate: Date | null
  height: number | null
  weight: number | null
}, locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'MY PROFILE', 'MIN PROFIL')}\n`

  // Calculate age
  if (client.birthDate) {
    const age = Math.floor(
      (Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )
    context += `- **${t(locale, 'Age', 'Ålder')}**: ${age} ${t(locale, 'years', 'år')}\n`
  }

  if (client.gender) {
    const gender = client.gender === 'MALE' ? t(locale, 'Male', 'Man') : t(locale, 'Female', 'Kvinna')
    context += `- **${t(locale, 'Gender', 'Kön')}**: ${gender}\n`
  }

  if (client.height) {
    context += `- **${t(locale, 'Height', 'Längd')}**: ${client.height} cm\n`
  }

  if (client.weight) {
    context += `- **${t(locale, 'Weight', 'Vikt')}**: ${client.weight} kg\n`
  }

  return context + '\n'
}

function buildSportProfileContext(sportProfile: {
  primarySport: SportType
  secondarySports: SportType[] | null
  runningSettings: unknown
  cyclingSettings: unknown
  swimmingSettings: unknown
  runningExperience: string | null
  cyclingExperience: string | null
  swimmingExperience: string | null
  weeklyAvailability: unknown
  preferredSessionLength: number | null
}, locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'SPORT PROFILE', 'SPORTPROFIL')}\n`

  const sportNames: Record<AppLocale, Record<SportType, string>> = {
    en: {
    RUNNING: 'Running',
    CYCLING: 'Cycling',
    SWIMMING: 'Swimming',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    SKIING: 'Cross-country skiing',
    GENERAL_FITNESS: 'General fitness',
    FUNCTIONAL_FITNESS: 'Functional fitness',
    STRENGTH: 'Strength training',
    TEAM_FOOTBALL: 'Football',
    TEAM_ICE_HOCKEY: 'Ice hockey',
    TEAM_HANDBALL: 'Handball',
    TEAM_FLOORBALL: 'Floorball',
    TEAM_BASKETBALL: 'Basketball',
    TEAM_VOLLEYBALL: 'Volleyball',
    TENNIS: 'Tennis',
    PADEL: 'Padel',
    NUTRITION: 'Nutrition',
  },
  sv: {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    SKIING: 'Längdskidor',
    GENERAL_FITNESS: 'Allmän fitness',
    FUNCTIONAL_FITNESS: 'Funktionell fitness',
    STRENGTH: 'Styrketräning',
    TEAM_FOOTBALL: 'Fotboll',
    TEAM_ICE_HOCKEY: 'Ishockey',
    TEAM_HANDBALL: 'Handboll',
    TEAM_FLOORBALL: 'Innebandy',
    TEAM_BASKETBALL: 'Basket',
    TEAM_VOLLEYBALL: 'Volleyboll',
    TENNIS: 'Tennis',
    PADEL: 'Padel',
    NUTRITION: 'Kost & Nutrition',
  },
  }
  const sportLabel = (sport: SportType) => sportNames[locale][sport]

  context += `- **${t(locale, 'Primary sport', 'Primär idrott')}**: ${sportLabel(sportProfile.primarySport)}\n`

  if (sportProfile.secondarySports && sportProfile.secondarySports.length > 0) {
    const secondary = sportProfile.secondarySports.map((s) => sportLabel(s)).join(', ')
    context += `- **${t(locale, 'Secondary sports', 'Sekundära idrotter')}**: ${secondary}\n`
  }

  // Experience levels
  const experiences: string[] = []
  if (sportProfile.runningExperience) {
    experiences.push(`${t(locale, 'Running', 'Löpning')}: ${sportProfile.runningExperience}`)
  }
  if (sportProfile.cyclingExperience) {
    experiences.push(`${t(locale, 'Cycling', 'Cykling')}: ${sportProfile.cyclingExperience}`)
  }
  if (sportProfile.swimmingExperience) {
    experiences.push(`${t(locale, 'Swimming', 'Simning')}: ${sportProfile.swimmingExperience}`)
  }
  if (experiences.length > 0) {
    context += `- **${t(locale, 'Experience level', 'Erfarenhetsnivå')}**: ${experiences.join(', ')}\n`
  }

  // Sport-specific settings
  const runSettings = sportProfile.runningSettings as { weeklyVolume?: number; targetRace?: string } | null
  if (runSettings) {
    if (runSettings.weeklyVolume) {
      context += `- **${t(locale, 'Weekly volume (running)', 'Veckovolym (löpning)')}**: ${runSettings.weeklyVolume} km\n`
    }
    if (runSettings.targetRace) {
      context += `- **${t(locale, 'Target race', 'Mållopp')}**: ${runSettings.targetRace}\n`
    }
  }

  const cycSettings = sportProfile.cyclingSettings as { currentFtp?: number } | null
  if (cycSettings?.currentFtp) {
    context += `- **FTP**: ${cycSettings.currentFtp} W\n`
  }

  const swimSettings = sportProfile.swimmingSettings as { currentCss?: string } | null
  if (swimSettings?.currentCss) {
    context += `- **CSS**: ${swimSettings.currentCss}/100m\n`
  }

  // Weekly availability
  const availability = sportProfile.weeklyAvailability as Record<string, { available: boolean; maxHours?: number }> | null
  if (availability) {
    const dayNames: Record<AppLocale, Record<string, string>> = {
      en: {
        monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
        thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
      },
      sv: {
        monday: 'Måndag', tuesday: 'Tisdag', wednesday: 'Onsdag',
        thursday: 'Torsdag', friday: 'Fredag', saturday: 'Lördag', sunday: 'Söndag',
      },
    }
    const availableDays = Object.entries(availability)
      .filter(([, v]) => v.available)
      .map(([day, v]) => {
        const name = dayNames[locale][day] || day
        return v.maxHours ? `${name} (max ${v.maxHours}h)` : name
      })
    if (availableDays.length > 0) {
      context += `- **${t(locale, 'Available training days', 'Tillgängliga träningsdagar')}**: ${availableDays.join(', ')}\n`
      context += `- **${t(locale, 'Training days/week', 'Träningsdagar/vecka')}**: ${availableDays.length}\n`
    }
  }

  if (sportProfile.preferredSessionLength) {
    context += `- **${t(locale, 'Preferred session length', 'Föredragen passlängd')}**: ${sportProfile.preferredSessionLength} ${t(locale, 'minutes', 'minuter')}\n`
  }

  return context + '\n'
}

function buildReadinessContext(checkIns: DailyCheckInData[], locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'READINESS & RECOVERY (last 7 days)', 'BEREDSKAP & ÅTERHÄMTNING (senaste 7 dagarna)')}\n`

  // Latest check-in
  const latest = checkIns[0]
  if (latest) {
    context += `\n### ${t(locale, 'Latest check-in', 'Senaste incheckning')} (${formatDate(latest.date, locale)})\n`
    if (latest.readinessScore !== null) {
      context += `- **${t(locale, 'Readiness score', 'Beredskapspoäng')}**: ${latest.readinessScore.toFixed(1)}/10\n`
    }
    if (latest.sleepHours !== null) {
      context += `- **${t(locale, 'Sleep', 'Sömn')}**: ${latest.sleepHours.toFixed(1)} ${t(locale, 'hours', 'timmar')}`
      if (latest.sleepQuality !== null) {
        context += ` (${t(locale, 'quality', 'kvalitet')}: ${latest.sleepQuality}/10)`
      }
      context += '\n'
    }
    if (latest.hrv !== null) {
      context += `- **HRV**: ${latest.hrv.toFixed(0)} ms\n`
    }
    if (latest.restingHR !== null) {
      context += `- **${t(locale, 'Resting HR', 'Vila-puls')}**: ${latest.restingHR} bpm\n`
    }
    context += `- **${t(locale, 'Fatigue', 'Trötthet')}**: ${latest.fatigue}/10\n`
    context += `- **${t(locale, 'Muscle soreness', 'Muskelömhet')}**: ${latest.soreness}/10\n`
    context += `- **Stress**: ${latest.stress}/10\n`
    context += `- **Motivation**: ${latest.motivation}/10\n`
  }

  // Calculate averages
  const avgReadiness = average(checkIns.map((c) => c.readinessScore))
  const avgSleep = average(checkIns.map((c) => c.sleepHours))
  const avgHRV = average(checkIns.map((c) => c.hrv))

  if (avgReadiness !== null || avgSleep !== null || avgHRV !== null) {
    context += `\n### ${t(locale, 'Weekly averages', 'Veckogenomsnitt')}\n`
    if (avgReadiness !== null) {
      context += `- **${t(locale, 'Readiness', 'Beredskap')}**: ${avgReadiness.toFixed(1)}/10\n`
    }
    if (avgSleep !== null) {
      context += `- **${t(locale, 'Sleep', 'Sömn')}**: ${avgSleep.toFixed(1)} ${t(locale, 'hours/night', 'timmar/natt')}\n`
    }
    if (avgHRV !== null) {
      context += `- **HRV**: ${avgHRV.toFixed(0)} ms\n`
    }
  }

  return context + '\n'
}

function buildTestContext(tests: TestData[], locale: AppLocale = 'en'): string {
  const latest = tests.find((test) => !testQualityReviewBlocksProgram(test))
  if (!latest) return ''

  let context = `## ${t(locale, 'TEST RESULTS', 'TESTRESULTAT')}\n`

  context += `\n### ${t(locale, 'Latest test', 'Senaste test')} (${formatDate(latest.testDate, locale)})\n`
  context += `- **${t(locale, 'Test type', 'Testtyp')}**: ${latest.testType}\n`

  if (latest.vo2max) {
    context += `- **VO2max**: ${latest.vo2max.toFixed(1)} ml/kg/min\n`
  }
  if (latest.maxHR) {
    context += `- **${t(locale, 'Max HR', 'Max-puls')}**: ${latest.maxHR} bpm\n`
  }
  // Access threshold data from JSON objects
  const aerobicThreshold = latest.aerobicThreshold as ThresholdJson | null
  const anaerobicThreshold = latest.anaerobicThreshold as ThresholdJson | null

  if (aerobicThreshold?.hr) {
    context += `- **${t(locale, 'Aerobic threshold (LT1)', 'Aerob tröskel (LT1)')}**: ${aerobicThreshold.hr} bpm`
    if (aerobicThreshold.value) {
      context += ` @ ${aerobicThreshold.value.toFixed(1)} ${aerobicThreshold.unit || 'km/h'}`
    }
    context += '\n'
  }
  if (anaerobicThreshold?.hr) {
    context += `- **${t(locale, 'Anaerobic threshold (LT2)', 'Anaerob tröskel (LT2)')}**: ${anaerobicThreshold.hr} bpm`
    if (anaerobicThreshold.value) {
      context += ` @ ${anaerobicThreshold.value.toFixed(1)} ${anaerobicThreshold.unit || 'km/h'}`
    }
    context += '\n'
  }

  return context + '\n'
}

function buildProgramContext(program: {
  name: string
  goalRace: string | null
  goalDate: Date | null
  startDate: Date
  endDate: Date | null
  isActive: boolean
  weeks: {
    weekNumber: number
    phase: string | null
    days: {
      dayNumber: number
      workouts: {
        name: string
        type: string
        duration: number | null
        description: string | null
      }[]
    }[]
  }[]
}, locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'ACTIVE TRAINING PROGRAM', 'AKTIVT TRÄNINGSPROGRAM')}\n`

  context += `- **Program**: ${program.name}\n`
  if (program.goalRace) {
    context += `- **${t(locale, 'Goal', 'Mål')}**: ${program.goalRace}\n`
  }
  if (program.goalDate) {
    context += `- **${t(locale, 'Goal date', 'Måldatum')}**: ${formatDate(program.goalDate, locale)}\n`
  }
  context += `- **Period**: ${formatDate(program.startDate, locale)}`
  if (program.endDate) {
    context += ` - ${formatDate(program.endDate, locale)}`
  }
  context += '\n'
  context += `- **${t(locale, 'Total weeks', 'Totalt antal veckor')}**: ${program.weeks.length}\n`

  // Find current week
  const today = new Date()
  const programStart = new Date(program.startDate)
  const weeksSinceStart = Math.floor(
    (today.getTime() - programStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  const currentWeekNum = Math.min(Math.max(weeksSinceStart + 1, 1), program.weeks.length)

  context += `- **${t(locale, 'Current week', 'Nuvarande vecka')}**: ${currentWeekNum}\n`

  // Current week's phase
  const currentWeek = program.weeks.find((w) => w.weekNumber === currentWeekNum)
  if (currentWeek?.phase) {
    context += `- **${t(locale, 'Phase', 'Fas')}**: ${currentWeek.phase}\n`
  }

  // This week's workouts
  if (currentWeek) {
    context += `\n### ${t(locale, "This week's workouts", 'Denna veckas pass')}\n`
    const dayNames = locale === 'sv'
      ? ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    for (const day of currentWeek.days) {
      for (const workout of day.workouts) {
        context += `- **${dayNames[day.dayNumber]}**: ${workout.name} (${workout.type})`
        if (workout.duration) {
          context += ` - ${workout.duration} min`
        }
        context += '\n'
      }
    }
  }

  return context + '\n'
}

function buildWorkoutHistoryContext(workouts: WorkoutLogData[], locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'RECENT COMPLETED WORKOUTS', 'SENASTE GENOMFÖRDA PASS')}\n`

  for (const log of workouts.slice(0, 5)) {
    const date = log.completedAt ? formatDate(log.completedAt, locale) : t(locale, 'Unknown date', 'Okänt datum')
    const name = log.workout?.name || t(locale, 'Workout', 'Träningspass')
    const type = log.workout?.type || ''

    context += `\n### ${name} (${date})\n`
    if (type) context += `- **${t(locale, 'Type', 'Typ')}**: ${type}\n`
    if (log.duration) context += `- **${t(locale, 'Duration', 'Tid')}**: ${log.duration} min\n`
    if (log.distance) context += `- **${t(locale, 'Distance', 'Distans')}**: ${log.distance.toFixed(1)} km\n`
    if (log.avgHR) context += `- **${t(locale, 'Avg HR', 'Snitt-puls')}**: ${log.avgHR} bpm\n`
    if (log.perceivedEffort) context += `- **RPE**: ${log.perceivedEffort}/10\n`
    if (log.notes) context += `- **${t(locale, 'Notes', 'Anteckningar')}**: ${log.notes}\n`
  }

  return context + '\n'
}

function buildRaceContext(races: RaceResultData[], locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'RACE RESULTS', 'TÄVLINGSRESULTAT')}\n`

  for (const race of races) {
    const name = race.raceName || race.distance
    context += `- **${name}** (${formatDate(race.raceDate, locale)}): ${race.timeFormatted}`
    if (race.vdot) {
      context += ` (VDOT: ${race.vdot.toFixed(1)})`
    }
    context += '\n'
  }

  return context + '\n'
}

function buildInjuryContext(injuries: InjuryData[], locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'ACTIVE INJURIES/RESTRICTIONS', 'AKTIVA SKADOR/BEGRÄNSNINGAR')}\n`

  for (const injury of injuries) {
    const location = injury.painLocation || t(locale, 'Unspecified', 'Ospecificerad')
    const type = injury.injuryType || t(locale, 'Injury', 'Skada')
    context += `- **${location}** (${type})\n`
    context += `  - Status: ${injury.status}\n`
    context += `  - ${t(locale, 'Pain level', 'Smärtnivå')}: ${injury.painLevel}/10\n`
    if (injury.phase) {
      context += `  - ${t(locale, 'Phase', 'Fas')}: ${injury.phase}\n`
    }
  }

  context += `\n⚠️ *${t(locale, 'Adapt training recommendations based on these injuries.', 'Anpassa träningsrekommendationer baserat på dessa skador.')}*\n`

  return context + '\n'
}

function buildPainFollowUpContext(followUps: PainFollowUpData[], locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'RECENT PAIN FOLLOW-UPS', 'SENASTE SMÄRTUPPFÖLJNINGAR')}\n`

  for (const followUp of followUps) {
    const actionDate = followUp.resolvedAt ?? followUp.actionedAt ?? followUp.createdAt
    context += `- **${formatDate(actionDate, locale)}**: ${painAlertOutcomeLabel(followUp.resolutionOutcome)}`
    context += ` (${followUp.status})\n`
    context += `  - ${followUp.message}\n`
    if (followUp.actionNote) {
      context += `  - ${t(locale, 'Coach note', 'Coachanteckning')}: ${followUp.actionNote}\n`
    }
    if (followUp.followUpAt) {
      context += `  - ${t(locale, 'Follow-up date', 'Uppföljningsdatum')}: ${formatDate(followUp.followUpAt, locale)}\n`
    }
    if (followUp.snoozedUntil && followUp.status === 'SNOOZED') {
      context += `  - ${t(locale, 'Snoozed until', 'Pausad till')}: ${formatDate(followUp.snoozedUntil, locale)}\n`
    }
  }

  context += `\n${t(locale, 'Use these coach decisions when adjusting load, intensity, and recovery.', 'Använd dessa coachbeslut vid justering av belastning, intensitet och återhämtning.')}\n`

  return context + '\n'
}

function buildIntegrationSummary(
  stravaActivities: {
    name: string
    type: string
    startDate: Date
    distance: number | null
    movingTime: number | null
    averageHeartrate: number | null
    tss: number | null
  }[],
  dailyMetrics: {
    date: Date
    sleepHours: number | null
    sleepQuality: number | null
    hrvRMSSD: number | null
    restingHR: number | null
    wellnessScore: number | null
    readinessScore: number | null
  }[],
  locale: AppLocale = 'en'
): string {
  let context = ''

  // Strava summary
  if (stravaActivities.length > 0) {
    context += `## ${t(locale, 'STRAVA ACTIVITIES (last 14 days)', 'STRAVA-AKTIVITETER (senaste 14 dagarna)')}\n`

    const totalDistance = stravaActivities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000
    const totalTime = stravaActivities.reduce((sum, a) => sum + (a.movingTime || 0), 0) / 60
    const totalTSS = stravaActivities.reduce((sum, a) => sum + (a.tss || 0), 0)

    context += `- **${t(locale, 'Activity count', 'Antal aktiviteter')}**: ${stravaActivities.length}\n`
    context += `- **${t(locale, 'Total distance', 'Total distans')}**: ${totalDistance.toFixed(1)} km\n`
    context += `- **${t(locale, 'Total time', 'Total tid')}**: ${Math.round(totalTime)} ${t(locale, 'minutes', 'minuter')}\n`
    if (totalTSS > 0) {
      context += `- **Total TSS**: ${Math.round(totalTSS)}\n`
    }

    // Latest 3 activities
    context += `\n### ${t(locale, 'Latest activities', 'Senaste aktiviteter')}\n`
    for (const activity of stravaActivities.slice(0, 3)) {
      const dist = activity.distance ? (activity.distance / 1000).toFixed(1) : '-'
      const time = activity.movingTime ? Math.round(activity.movingTime / 60) : '-'
      context += `- ${formatDate(activity.startDate, locale)}: ${activity.name} (${activity.type}) - ${dist} km, ${time} min\n`
    }

    context += '\n'
  }

  // Garmin/daily metrics summary
  if (dailyMetrics.length > 0) {
    context += `## ${t(locale, 'GARMIN DATA (last week)', 'GARMIN-DATA (senaste veckan)')}\n`

    const avgSleep = average(dailyMetrics.map((m) => m.sleepHours))
    const avgHRV = average(dailyMetrics.map((m) => m.hrvRMSSD))
    const avgRHR = average(dailyMetrics.map((m) => m.restingHR))
    const avgReadiness = average(dailyMetrics.map((m) => m.readinessScore))
    const avgWellness = average(dailyMetrics.map((m) => m.wellnessScore))

    if (avgSleep !== null) {
      context += `- **${t(locale, 'Average sleep', 'Genomsnittlig sömn')}**: ${avgSleep.toFixed(1)} ${t(locale, 'hours/night', 'timmar/natt')}\n`
    }
    if (avgHRV !== null) {
      context += `- **${t(locale, 'Average HRV', 'Genomsnittlig HRV')}**: ${avgHRV.toFixed(0)} ms\n`
    }
    if (avgRHR !== null) {
      context += `- **${t(locale, 'Average resting HR', 'Genomsnittlig vila-puls')}**: ${avgRHR.toFixed(0)} bpm\n`
    }
    if (avgReadiness !== null) {
      context += `- **${t(locale, 'Average readiness', 'Genomsnittlig beredskap')}**: ${avgReadiness.toFixed(1)}/10\n`
    }
    if (avgWellness !== null) {
      context += `- **${t(locale, 'Average wellness', 'Genomsnittlig välmående')}**: ${avgWellness.toFixed(1)}/10\n`
    }

    context += '\n'
  }

  return context
}

function buildAthleteProfileContext(
  profile: AthleteProfileData,
  sportProfile?: {
    runningSettings: unknown
    equipment: unknown
    preferredSessionLength: number | null
  },
  locale: AppLocale = 'en'
): string {
  const fields = [
    { key: 'trainingBackground', label: t(locale, 'Training background', 'Träningsbakgrund') },
    { key: 'longTermAmbitions', label: t(locale, 'Long-term ambitions', 'Långsiktiga ambitioner') },
    { key: 'seasonalFocus', label: t(locale, 'Focus this season', 'Fokus denna säsong') },
    { key: 'personalMotivations', label: t(locale, 'What motivates me', 'Vad motiverar mig') },
    { key: 'trainingPreferences', label: t(locale, 'Training preferences', 'Träningspreferenser') },
    { key: 'constraints', label: t(locale, 'Constraints', 'Begränsningar') },
    { key: 'dietaryNotes', label: t(locale, 'Diet & nutrition', 'Kost & näring') },
  ] as const

  const filledFields = fields.filter((f) => profile[f.key])

  // Check if there is any structured sport-profile data
  const settings = (sportProfile?.runningSettings ?? {}) as Record<string, unknown>
  const equipmentObj = sportProfile?.equipment as Record<string, boolean> | null
  const hasStructuredData = !!(
    (settings.preferredWorkoutTypes as string[] | undefined)?.length ||
    settings.favoriteExercises ||
    settings.weakPoints ||
    settings.strongPoints ||
    settings.injuriesLimitations ||
    settings.areasToAvoid ||
    settings.workoutVarietyPreference ||
    settings.feedbackStyle ||
    settings.additionalNotes ||
    (equipmentObj && Object.values(equipmentObj).some(Boolean))
  )

  if (filledFields.length === 0 && !hasStructuredData) {
    return ''
  }

  let context = `## ${t(locale, "ATHLETE'S OWN REFLECTIONS", 'ATLETENS EGNA REFLEKTIONER')}\n`

  for (const field of filledFields) {
    context += `\n### ${field.label}\n${profile[field.key]}\n`
  }

  // Structured fields from SportProfile
  if (hasStructuredData) {
    context += `\n### ${t(locale, 'Training preferences (structured)', 'Träningspreferenser (strukturerad)')}\n`

    const workoutTypes = settings.preferredWorkoutTypes as string[] | undefined
    if (workoutTypes?.length) {
      context += `- **${t(locale, 'Preferred workout types', 'Föredragna passtyper')}**: ${workoutTypes.join(', ')}\n`
    }
    if (settings.favoriteExercises) {
      context += `- **${t(locale, 'Favorite exercises', 'Favoritövningar')}**: ${settings.favoriteExercises}\n`
    }
    if (settings.preferredTimeOfDay) {
      context += `- **${t(locale, 'Preferred training time', 'Föredragen träningstid')}**: ${settings.preferredTimeOfDay}\n`
    }
    if (equipmentObj) {
      const available = Object.entries(equipmentObj).filter(([, v]) => v).map(([k]) => k)
      if (available.length > 0) {
        context += `- **${t(locale, 'Available equipment', 'Tillgänglig utrustning')}**: ${available.join(', ')}\n`
      }
    }
    if (settings.weakPoints) {
      context += `- **${t(locale, 'Weaknesses/improvement areas', 'Svagheter/förbättringsområden')}**: ${settings.weakPoints}\n`
    }
    if (settings.strongPoints) {
      context += `- **${t(locale, 'Strengths', 'Styrkor')}**: ${settings.strongPoints}\n`
    }
    if (settings.injuriesLimitations) {
      context += `- **${t(locale, 'Injuries/limitations', 'Skador/begränsningar')}**: ${settings.injuriesLimitations}\n`
    }
    if (settings.areasToAvoid) {
      context += `- **${t(locale, 'Avoid exercises/movements', 'Undvik övningar/rörelser')}**: ${settings.areasToAvoid}\n`
    }
    if (settings.workoutVarietyPreference) {
      context += `- **${t(locale, 'Variety preference', 'Variationspreferens')}**: ${settings.workoutVarietyPreference}\n`
    }
    if (settings.feedbackStyle) {
      context += `- **${t(locale, 'Feedback style', 'Feedbackstil')}**: ${settings.feedbackStyle}\n`
    }
    if (settings.additionalNotes) {
      context += `- **${t(locale, 'Other notes', 'Övriga anteckningar')}**: ${settings.additionalNotes}\n`
    }
  }

  return context + '\n'
}

function buildTrainingLoadContext(load: TrainingLoadData, locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, 'TRAINING LOAD (ACWR)', 'TRÄNINGSBELASTNING (ACWR)')}\n`

  if (load.acuteLoad !== null) {
    context += `- **${t(locale, 'Acute load (7 days)', 'Akut belastning (7 dagar)')}**: ${load.acuteLoad.toFixed(0)}\n`
  }
  if (load.chronicLoad !== null) {
    context += `- **${t(locale, 'Chronic load (28 days)', 'Kronisk belastning (28 dagar)')}**: ${load.chronicLoad.toFixed(0)}\n`
  }
  if (load.acwr !== null) {
    context += `- **${t(locale, 'ACWR ratio', 'ACWR-kvot')}**: ${load.acwr.toFixed(2)}\n`
  }
  if (load.acwrZone) {
    const zoneTranslations: Record<AppLocale, Record<string, string>> = {
      en: {
        DETRAINING: 'Detraining (too low)',
        OPTIMAL: 'Optimal',
        CAUTION: 'Caution',
        DANGER: 'Danger',
        CRITICAL: 'Critical',
      },
      sv: {
        DETRAINING: 'Avträning (för låg)',
        OPTIMAL: 'Optimal',
        CAUTION: 'Varning',
        DANGER: 'Fara',
        CRITICAL: 'Kritisk',
      },
    }
    context += `- **${t(locale, 'Load zone', 'Belastningszon')}**: ${zoneTranslations[locale][load.acwrZone] || load.acwrZone}\n`
  }
  if (load.injuryRisk) {
    const riskTranslations: Record<AppLocale, Record<string, string>> = {
      en: {
        LOW: 'Low',
        MODERATE: 'Moderate',
        HIGH: 'High',
        VERY_HIGH: 'Very high',
      },
      sv: {
        LOW: 'Låg',
        MODERATE: 'Måttlig',
        HIGH: 'Hög',
        VERY_HIGH: 'Mycket hög',
      },
    }
    context += `- **${t(locale, 'Injury risk', 'Skaderisk')}**: ${riskTranslations[locale][load.injuryRisk] || load.injuryRisk}\n`
  }

  // Add guidance based on ACWR
  if (load.acwr !== null) {
    if (load.acwr < 0.8) {
      context += `\n⚠️ *${t(locale, 'ACWR is low - the athlete may be undertrained or in a recovery phase.', 'ACWR är låg - atleten kan vara undertränad eller i återhämtningsfas.')}*\n`
    } else if (load.acwr >= 0.8 && load.acwr <= 1.3) {
      context += `\n✅ *${t(locale, 'ACWR is in the optimal zone - good balance between load and recovery.', 'ACWR är i optimal zon - bra balans mellan belastning och återhämtning.')}*\n`
    } else if (load.acwr > 1.3 && load.acwr <= 1.5) {
      context += `\n⚠️ *${t(locale, 'ACWR is elevated - be careful about increasing load further.', 'ACWR är förhöjd - var försiktig med att öka belastningen ytterligare.')}*\n`
    } else if (load.acwr > 1.5) {
      context += `\n🚨 *${t(locale, 'ACWR is critically high - recommend rest or reduced training.', 'ACWR är kritiskt hög - rekommendera vila eller reducerad träning.')}*\n`
    }
  }

  return context + '\n'
}

function buildComplianceContext(completed: number, planned: number, locale: AppLocale = 'en'): string {
  const rate = planned > 0 ? (completed / planned) * 100 : 0

  let context = `## ${t(locale, 'TRAINING COMPLIANCE (last 30 days)', 'TRÄNINGSEFTERLEVNAD (senaste 30 dagarna)')}\n`
  context += `- **${t(locale, 'Completed workouts', 'Genomförda pass')}**: ${completed} ${t(locale, 'of', 'av')} ${planned} ${t(locale, 'planned', 'planerade')}\n`
  context += `- **${t(locale, 'Compliance rate', 'Efterlevnadsgrad')}**: ${rate.toFixed(0)}%\n`

  if (rate >= 90) {
    context += `\n✅ *${t(locale, 'Excellent compliance - the athlete follows the program very well.', 'Utmärkt efterlevnad - atleten följer programmet mycket väl.')}*\n`
  } else if (rate >= 70) {
    context += `\n👍 *${t(locale, 'Good compliance - the athlete broadly follows the program.', 'Bra efterlevnad - atleten följer programmet i stort.')}*\n`
  } else if (rate >= 50) {
    context += `\n⚠️ *${t(locale, 'Moderate compliance - the athlete misses some sessions.', 'Måttlig efterlevnad - atleten missar en del pass.')}*\n`
  } else {
    context += `\n🚨 *${t(locale, 'Low compliance - the athlete struggles to follow the program. Consider adjusting it.', 'Låg efterlevnad - atleten har svårt att följa programmet. Överväg att anpassa.')}*\n`
  }

  return context + '\n'
}

function buildStrengthContext(
  sessions: {
    id: string
    assignedDate: Date
    session: {
      name: string
      phase: string
      exercises: unknown
    }
  }[],
  locale: AppLocale = 'en'
): string {
  let context = `## ${t(locale, 'STRENGTH TRAINING', 'STYRKETRÄNING')}\n`

  const phaseTranslations: Record<AppLocale, Record<string, string>> = {
    en: {
      ANATOMICAL_ADAPTATION: 'Anatomical adaptation',
      MAX_STRENGTH: 'Max strength',
      POWER: 'Power/explosiveness',
      STRENGTH_ENDURANCE: 'Strength endurance',
      MAINTENANCE: 'Maintenance',
    },
    sv: {
      ANATOMICAL_ADAPTATION: 'Anatomisk anpassning',
      MAX_STRENGTH: 'Maxstyrka',
      POWER: 'Power/Explosivitet',
      STRENGTH_ENDURANCE: 'Styrkeuthållighet',
      MAINTENANCE: 'Underhåll',
    },
  }

  for (const assignment of sessions.slice(0, 3)) {
    const phase = phaseTranslations[locale][assignment.session.phase] || assignment.session.phase
    context += `\n### ${assignment.session.name} (${formatDate(assignment.assignedDate, locale)})\n`
    context += `- **${t(locale, 'Phase', 'Fas')}**: ${phase}\n`

    // Count exercises
    const exercises = assignment.session.exercises as Array<{ exerciseName?: string }> | null
    if (exercises && Array.isArray(exercises)) {
      context += `- **${t(locale, 'Exercise count', 'Antal övningar')}**: ${exercises.length}\n`
      const exerciseNames = exercises
        .slice(0, 5)
        .map((e) => e.exerciseName || t(locale, 'Unknown', 'Okänd'))
        .join(', ')
      context += `- **${t(locale, 'Exercises', 'Övningar')}**: ${exerciseNames}${exercises.length > 5 ? '...' : ''}\n`
    }
  }

  return context + '\n'
}

function buildAgentActionsContext(actions: AgentActionData[], locale: AppLocale = 'en'): string {
  let context = `## ${t(locale, "AI AGENT'S RECOMMENDATIONS", 'AI-AGENTENS REKOMMENDATIONER')}\n`

  const actionTypeTranslations: Record<AppLocale, Record<string, string>> = {
    en: {
      WORKOUT_INTENSITY_REDUCTION: 'Reduce intensity',
      WORKOUT_DURATION_REDUCTION: 'Shorten workout',
      WORKOUT_SKIP_RECOMMENDATION: 'Skip workout',
      WORKOUT_SUBSTITUTION: 'Replace workout',
      REST_DAY_INJECTION: 'Add rest day',
      RECOVERY_ACTIVITY_SUGGESTION: 'Recovery activity',
      ESCALATE_TO_COACH: 'Escalate to coach',
      CHECK_IN_NUDGE: 'Reminder',
    },
    sv: {
      WORKOUT_INTENSITY_REDUCTION: 'Reducera intensitet',
      WORKOUT_DURATION_REDUCTION: 'Förkorta pass',
      WORKOUT_SKIP_RECOMMENDATION: 'Hoppa över pass',
      WORKOUT_SUBSTITUTION: 'Byt ut pass',
      REST_DAY_INJECTION: 'Lägg till vilodag',
      RECOVERY_ACTIVITY_SUGGESTION: 'Återhämtningsaktivitet',
      ESCALATE_TO_COACH: 'Eskalera till coach',
      CHECK_IN_NUDGE: 'Påminnelse',
    },
  }

  const statusTranslations: Record<AppLocale, Record<string, string>> = {
    en: {
      PROPOSED: 'Proposed',
      AUTO_APPLIED: 'Automatically applied',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
    },
    sv: {
      PROPOSED: 'Föreslagen',
      AUTO_APPLIED: 'Automatiskt tillämpad',
      ACCEPTED: 'Accepterad',
      REJECTED: 'Avvisad',
    },
  }

  for (const action of actions) {
    const actionType = actionTypeTranslations[locale][action.actionType] || action.actionType
    const status = statusTranslations[locale][action.status] || action.status

    context += `\n### ${actionType}\n`
    context += `- **Status**: ${status}\n`
    context += `- **${t(locale, 'Reasoning', 'Motivering')}**: ${action.reasoning}\n`
    if (action.targetDate) {
      context += `- **${t(locale, 'Applies to', 'Gäller')}**: ${formatDate(action.targetDate, locale)}\n`
    }
  }

  context += `\n*${t(locale, "These are the AI agent's latest suggestions for optimizing training.", 'Dessa är AI-agentens senaste förslag för att optimera träningen.')}*\n`

  return context + '\n'
}

function buildNutritionContext(
  meals: MealLogData[],
  goal: NutritionGoalData | null,
  prefs: DietaryPreferencesData | null,
  locale: AppLocale = 'en',
): string {
  let context = `## ${t(locale, 'DIET & NUTRITION', 'KOST & NÄRING')}\n`

  // Dietary preferences
  if (prefs) {
    if (prefs.dietaryStyle) {
      context += `- **${t(locale, 'Diet style', 'Koststil')}**: ${prefs.dietaryStyle}\n`
    }
    const allergies = Array.isArray(prefs.allergies) ? prefs.allergies as string[] : []
    const intolerances = Array.isArray(prefs.intolerances) ? prefs.intolerances as string[] : []
    const dislikedFoods = Array.isArray(prefs.dislikedFoods) ? prefs.dislikedFoods as string[] : []
    if (allergies.length > 0) {
      context += `- **${t(locale, 'Allergies', 'Allergier')}**: ${allergies.join(', ')}\n`
    }
    if (intolerances.length > 0) {
      context += `- **${t(locale, 'Intolerances', 'Intoleranser')}**: ${intolerances.join(', ')}\n`
    }
    if (dislikedFoods.length > 0) {
      context += `- **${t(locale, 'Dislikes', 'Ogillar')}**: ${dislikedFoods.join(', ')}\n`
    }
  }

  // Nutrition goals
  if (goal) {
    const goalTypeLabels: Record<AppLocale, Record<string, string>> = {
      en: {
        WEIGHT_LOSS: 'Weight loss',
        WEIGHT_GAIN: 'Weight gain',
        MAINTAIN: 'Maintain weight',
        BODY_RECOMP: 'Body recomposition',
      },
      sv: {
        WEIGHT_LOSS: 'Viktnedgång',
        WEIGHT_GAIN: 'Viktuppgång',
        MAINTAIN: 'Bibehålla vikt',
        BODY_RECOMP: 'Kroppsrekomposition',
      },
    }
    context += `- **${t(locale, 'Goal', 'Mål')}**: ${goalTypeLabels[locale][goal.goalType] || goal.goalType}\n`
    if (goal.targetWeightKg) context += `- **${t(locale, 'Target weight', 'Målvikt')}**: ${goal.targetWeightKg} kg\n`
    if (goal.weeklyChangeKg) context += `- **${t(locale, 'Weekly change', 'Veckoförändring')}**: ${goal.weeklyChangeKg} kg/${t(locale, 'week', 'vecka')}\n`
    if (goal.macroProfile) context += `- **${t(locale, 'Macro profile', 'Makroprofil')}**: ${goal.macroProfile}\n`
    if (goal.customProteinPerKg) context += `- **${t(locale, 'Protein target', 'Proteinmål')}**: ${goal.customProteinPerKg} g/kg\n`
    if (goal.customProteinPercent || goal.customCarbsPercent || goal.customFatPercent) {
      const parts: string[] = []
      if (goal.customProteinPercent) parts.push(`P ${goal.customProteinPercent}%`)
      if (goal.customCarbsPercent) parts.push(`K ${goal.customCarbsPercent}%`)
      if (goal.customFatPercent) parts.push(`F ${goal.customFatPercent}%`)
      context += `- **${t(locale, 'Macro split', 'Makrofördelning')}**: ${parts.join(' / ')}\n`
    }
  }

  // Meal summary by day (last 7 days)
  if (meals.length > 0) {
    const byDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number; count: number }>()
    for (const meal of meals) {
      const dateStr = formatDate(meal.date, locale)
      const day = byDay.get(dateStr) || { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }
      day.calories += meal.calories ?? 0
      day.protein += meal.proteinGrams ?? 0
      day.carbs += meal.carbsGrams ?? 0
      day.fat += meal.fatGrams ?? 0
      day.count += 1
      byDay.set(dateStr, day)
    }

    context += `\n### ${t(locale, 'Meal log (last 7 days)', 'Måltidslogg (senaste 7 dagarna)')}\n`
    for (const [date, totals] of byDay) {
      context += `- **${date}**: ${Math.round(totals.calories)} kcal | P ${Math.round(totals.protein)}g | C ${Math.round(totals.carbs)}g | F ${Math.round(totals.fat)}g (${totals.count} ${t(locale, 'meals', 'måltider')})\n`
    }

    // Daily averages
    const days = byDay.size
    const totalCal = Array.from(byDay.values()).reduce((s, d) => s + d.calories, 0)
    const totalP = Array.from(byDay.values()).reduce((s, d) => s + d.protein, 0)
    const totalC = Array.from(byDay.values()).reduce((s, d) => s + d.carbs, 0)
    const totalF = Array.from(byDay.values()).reduce((s, d) => s + d.fat, 0)
    context += `\n### ${t(locale, 'Daily average', 'Dagligt genomsnitt')}\n`
    context += `- ${Math.round(totalCal / days)} kcal | P ${Math.round(totalP / days)}g | C ${Math.round(totalC / days)}g | F ${Math.round(totalF / days)}g\n`
  }

  return context + '\n'
}

// Helper functions
function formatDate(date: Date, locale: 'en' | 'sv' = 'en'): string {
  return new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
}

function average(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
