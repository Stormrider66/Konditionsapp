/**
 * Athlete Context Builder for AI Chat
 *
 * Builds context from the athlete's OWN data for AI conversations.
 * This is a simplified version specifically for athlete self-service AI chat.
 */

import { prisma } from '@/lib/prisma'
import { SportType, AgentActionStatus } from '@prisma/client'

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

interface IntegrationData {
  strava: {
    connected: boolean
    activityCount: number
    lastSync: Date | null
    weeklyDistance: number
    weeklyTSS: number
  }
  garmin: {
    connected: boolean
    lastSync: Date | null
    avgSleep: number | null
    avgHRV: number | null
    avgRHR: number | null
  }
}

interface TrainingLoadData {
  date: Date
  acuteLoad: number | null
  chronicLoad: number | null
  acwr: number | null
  acwrZone: string | null
  injuryRisk: string | null
}

interface StrengthSessionData {
  id: string
  name: string
  phase: string
  assignedDate: Date
  completed: boolean
  exercises: unknown
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
  // Fetch all athlete data in parallel
  const [
    client,
    sportProfile,
    recentTests,
    recentWorkouts,
    dailyCheckIns,
    activeProgram,
    races,
    injuries,
    stravaActivities,
    dailyMetrics,
    trainingLoad,
    strengthSessions,
    agentActions,
    athleteAccount,
    totalPlannedWorkouts,
    completedWorkouts,
  ] = await Promise.all([
    // Basic client info
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        gender: true,
        birthDate: true,
        height: true,
        weight: true,
      },
    }),

    // Sport profile
    prisma.sportProfile.findUnique({
      where: { clientId },
    }),

    // Recent tests (expanded to 10)
    prisma.test.findMany({
      where: { clientId },
      orderBy: { testDate: 'desc' },
      take: 10,
      select: {
        id: true,
        testDate: true,
        testType: true,
        maxHR: true,
        vo2max: true,
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

    // Training load (ACWR) - latest
    prisma.trainingLoad.findFirst({
      where: { clientId },
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
  ])

  if (!client) {
    return 'Ingen atletdata hittades.'
  }

  // Build context string
  let context = ''

  // Profile section
  context += buildProfileContext(client)

  // Athlete self-description section (NEW)
  if (athleteAccount) {
    context += buildAthleteProfileContext(athleteAccount as AthleteProfileData)
  }

  // Sport profile section
  if (sportProfile) {
    context += buildSportProfileContext(sportProfile)
  }

  // Training load / ACWR section (NEW)
  if (trainingLoad) {
    context += buildTrainingLoadContext(trainingLoad as TrainingLoadData)
  }

  // Compliance rate (NEW)
  if (totalPlannedWorkouts > 0) {
    context += buildComplianceContext(completedWorkouts, totalPlannedWorkouts)
  }

  // Readiness and wellness section
  if (dailyCheckIns.length > 0) {
    context += buildReadinessContext(dailyCheckIns as DailyCheckInData[])
  }

  // Recent tests section (expanded to 10)
  if (recentTests.length > 0) {
    context += buildTestContext(recentTests as TestData[])
  }

  // Active program section
  if (activeProgram) {
    context += buildProgramContext(activeProgram)
  }

  // Recent workouts section
  if (recentWorkouts.length > 0) {
    context += buildWorkoutHistoryContext(recentWorkouts as WorkoutLogData[])
  }

  // Strength training section (NEW)
  if (strengthSessions.length > 0) {
    context += buildStrengthContext(strengthSessions)
  }

  // Agent actions section (NEW)
  if (agentActions.length > 0) {
    context += buildAgentActionsContext(agentActions as AgentActionData[])
  }

  // Race results section
  if (races.length > 0) {
    context += buildRaceContext(races as RaceResultData[])
  }

  // Injuries section
  if (injuries.length > 0) {
    context += buildInjuryContext(injuries as InjuryData[])
  }

  // Integration data section
  const integrationData = buildIntegrationSummary(stravaActivities, dailyMetrics)
  if (integrationData) {
    context += integrationData
  }

  return context
}

function buildProfileContext(client: {
  name: string
  gender: string | null
  birthDate: Date | null
  height: number | null
  weight: number | null
}): string {
  let context = `## MIN PROFIL\n`

  // Calculate age
  if (client.birthDate) {
    const age = Math.floor(
      (Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )
    context += `- **Ålder**: ${age} år\n`
  }

  if (client.gender) {
    context += `- **Kön**: ${client.gender === 'MALE' ? 'Man' : 'Kvinna'}\n`
  }

  if (client.height) {
    context += `- **Längd**: ${client.height} cm\n`
  }

  if (client.weight) {
    context += `- **Vikt**: ${client.weight} kg\n`
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
}): string {
  let context = `## SPORTPROFIL\n`

  const sportNames: Record<SportType, string> = {
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
  }

  context += `- **Primär idrott**: ${sportNames[sportProfile.primarySport]}\n`

  if (sportProfile.secondarySports && sportProfile.secondarySports.length > 0) {
    const secondary = sportProfile.secondarySports.map((s) => sportNames[s]).join(', ')
    context += `- **Sekundära idrotter**: ${secondary}\n`
  }

  // Experience levels
  const experiences: string[] = []
  if (sportProfile.runningExperience) {
    experiences.push(`Löpning: ${sportProfile.runningExperience}`)
  }
  if (sportProfile.cyclingExperience) {
    experiences.push(`Cykling: ${sportProfile.cyclingExperience}`)
  }
  if (sportProfile.swimmingExperience) {
    experiences.push(`Simning: ${sportProfile.swimmingExperience}`)
  }
  if (experiences.length > 0) {
    context += `- **Erfarenhetsnivå**: ${experiences.join(', ')}\n`
  }

  // Sport-specific settings
  const runSettings = sportProfile.runningSettings as { weeklyVolume?: number; targetRace?: string } | null
  if (runSettings) {
    if (runSettings.weeklyVolume) {
      context += `- **Veckovolym (löpning)**: ${runSettings.weeklyVolume} km\n`
    }
    if (runSettings.targetRace) {
      context += `- **Mållopp**: ${runSettings.targetRace}\n`
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

  return context + '\n'
}

function buildReadinessContext(checkIns: DailyCheckInData[]): string {
  let context = `## BEREDSKAP & ÅTERHÄMTNING (senaste 7 dagarna)\n`

  // Latest check-in
  const latest = checkIns[0]
  if (latest) {
    context += `\n### Senaste incheckning (${formatDate(latest.date)})\n`
    if (latest.readinessScore !== null) {
      context += `- **Beredskapspoäng**: ${latest.readinessScore.toFixed(1)}/10\n`
    }
    if (latest.sleepHours !== null) {
      context += `- **Sömn**: ${latest.sleepHours.toFixed(1)} timmar`
      if (latest.sleepQuality !== null) {
        context += ` (kvalitet: ${latest.sleepQuality}/10)`
      }
      context += '\n'
    }
    if (latest.hrv !== null) {
      context += `- **HRV**: ${latest.hrv.toFixed(0)} ms\n`
    }
    if (latest.restingHR !== null) {
      context += `- **Vila-puls**: ${latest.restingHR} bpm\n`
    }
    context += `- **Trötthet**: ${latest.fatigue}/10\n`
    context += `- **Muskelömhet**: ${latest.soreness}/10\n`
    context += `- **Stress**: ${latest.stress}/10\n`
    context += `- **Motivation**: ${latest.motivation}/10\n`
  }

  // Calculate averages
  const avgReadiness = average(checkIns.map((c) => c.readinessScore))
  const avgSleep = average(checkIns.map((c) => c.sleepHours))
  const avgHRV = average(checkIns.map((c) => c.hrv))

  if (avgReadiness !== null || avgSleep !== null || avgHRV !== null) {
    context += `\n### Veckogenomsnitt\n`
    if (avgReadiness !== null) {
      context += `- **Beredskap**: ${avgReadiness.toFixed(1)}/10\n`
    }
    if (avgSleep !== null) {
      context += `- **Sömn**: ${avgSleep.toFixed(1)} timmar/natt\n`
    }
    if (avgHRV !== null) {
      context += `- **HRV**: ${avgHRV.toFixed(0)} ms\n`
    }
  }

  return context + '\n'
}

function buildTestContext(tests: TestData[]): string {
  let context = `## TESTRESULTAT\n`

  const latest = tests[0]
  if (latest) {
    context += `\n### Senaste test (${formatDate(latest.testDate)})\n`
    context += `- **Testtyp**: ${latest.testType}\n`

    if (latest.vo2max) {
      context += `- **VO2max**: ${latest.vo2max.toFixed(1)} ml/kg/min\n`
    }
    if (latest.maxHR) {
      context += `- **Max-puls**: ${latest.maxHR} bpm\n`
    }
    // Access threshold data from JSON objects
    const aerobicThreshold = latest.aerobicThreshold as ThresholdJson | null
    const anaerobicThreshold = latest.anaerobicThreshold as ThresholdJson | null

    if (aerobicThreshold?.hr) {
      context += `- **Aerob tröskel (LT1)**: ${aerobicThreshold.hr} bpm`
      if (aerobicThreshold.value) {
        context += ` @ ${aerobicThreshold.value.toFixed(1)} ${aerobicThreshold.unit || 'km/h'}`
      }
      context += '\n'
    }
    if (anaerobicThreshold?.hr) {
      context += `- **Anaerob tröskel (LT2)**: ${anaerobicThreshold.hr} bpm`
      if (anaerobicThreshold.value) {
        context += ` @ ${anaerobicThreshold.value.toFixed(1)} ${anaerobicThreshold.unit || 'km/h'}`
      }
      context += '\n'
    }
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
}): string {
  let context = `## AKTIVT TRÄNINGSPROGRAM\n`

  context += `- **Program**: ${program.name}\n`
  if (program.goalRace) {
    context += `- **Mål**: ${program.goalRace}\n`
  }
  if (program.goalDate) {
    context += `- **Måldatum**: ${formatDate(program.goalDate)}\n`
  }
  context += `- **Period**: ${formatDate(program.startDate)}`
  if (program.endDate) {
    context += ` - ${formatDate(program.endDate)}`
  }
  context += '\n'
  context += `- **Totalt antal veckor**: ${program.weeks.length}\n`

  // Find current week
  const today = new Date()
  const programStart = new Date(program.startDate)
  const weeksSinceStart = Math.floor(
    (today.getTime() - programStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  const currentWeekNum = Math.min(Math.max(weeksSinceStart + 1, 1), program.weeks.length)

  context += `- **Nuvarande vecka**: ${currentWeekNum}\n`

  // Current week's phase
  const currentWeek = program.weeks.find((w) => w.weekNumber === currentWeekNum)
  if (currentWeek?.phase) {
    context += `- **Fas**: ${currentWeek.phase}\n`
  }

  // This week's workouts
  if (currentWeek) {
    context += `\n### Denna veckas pass\n`
    const dayNames = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
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

function buildWorkoutHistoryContext(workouts: WorkoutLogData[]): string {
  let context = `## SENASTE GENOMFÖRDA PASS\n`

  for (const log of workouts.slice(0, 5)) {
    const date = log.completedAt ? formatDate(log.completedAt) : 'Okänt datum'
    const name = log.workout?.name || 'Träningspass'
    const type = log.workout?.type || ''

    context += `\n### ${name} (${date})\n`
    if (type) context += `- **Typ**: ${type}\n`
    if (log.duration) context += `- **Tid**: ${log.duration} min\n`
    if (log.distance) context += `- **Distans**: ${log.distance.toFixed(1)} km\n`
    if (log.avgHR) context += `- **Snitt-puls**: ${log.avgHR} bpm\n`
    if (log.perceivedEffort) context += `- **RPE**: ${log.perceivedEffort}/10\n`
    if (log.notes) context += `- **Anteckningar**: ${log.notes}\n`
  }

  return context + '\n'
}

function buildRaceContext(races: RaceResultData[]): string {
  let context = `## TÄVLINGSRESULTAT\n`

  for (const race of races) {
    const name = race.raceName || race.distance
    context += `- **${name}** (${formatDate(race.raceDate)}): ${race.timeFormatted}`
    if (race.vdot) {
      context += ` (VDOT: ${race.vdot.toFixed(1)})`
    }
    context += '\n'
  }

  return context + '\n'
}

function buildInjuryContext(injuries: InjuryData[]): string {
  let context = `## AKTIVA SKADOR/BEGRÄNSNINGAR\n`

  for (const injury of injuries) {
    const location = injury.painLocation || 'Ospecificerad'
    const type = injury.injuryType || 'Skada'
    context += `- **${location}** (${type})\n`
    context += `  - Status: ${injury.status}\n`
    context += `  - Smärtnivå: ${injury.painLevel}/10\n`
    if (injury.phase) {
      context += `  - Fas: ${injury.phase}\n`
    }
  }

  context += '\n⚠️ *Anpassa träningsrekommendationer baserat på dessa skador.*\n'

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
  }[]
): string {
  let context = ''

  // Strava summary
  if (stravaActivities.length > 0) {
    context += `## STRAVA-AKTIVITETER (senaste 14 dagarna)\n`

    const totalDistance = stravaActivities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000
    const totalTime = stravaActivities.reduce((sum, a) => sum + (a.movingTime || 0), 0) / 60
    const totalTSS = stravaActivities.reduce((sum, a) => sum + (a.tss || 0), 0)

    context += `- **Antal aktiviteter**: ${stravaActivities.length}\n`
    context += `- **Total distans**: ${totalDistance.toFixed(1)} km\n`
    context += `- **Total tid**: ${Math.round(totalTime)} minuter\n`
    if (totalTSS > 0) {
      context += `- **Total TSS**: ${Math.round(totalTSS)}\n`
    }

    // Latest 3 activities
    context += `\n### Senaste aktiviteter\n`
    for (const activity of stravaActivities.slice(0, 3)) {
      const dist = activity.distance ? (activity.distance / 1000).toFixed(1) : '-'
      const time = activity.movingTime ? Math.round(activity.movingTime / 60) : '-'
      context += `- ${formatDate(activity.startDate)}: ${activity.name} (${activity.type}) - ${dist} km, ${time} min\n`
    }

    context += '\n'
  }

  // Garmin/daily metrics summary
  if (dailyMetrics.length > 0) {
    context += `## GARMIN-DATA (senaste veckan)\n`

    const avgSleep = average(dailyMetrics.map((m) => m.sleepHours))
    const avgHRV = average(dailyMetrics.map((m) => m.hrvRMSSD))
    const avgRHR = average(dailyMetrics.map((m) => m.restingHR))
    const avgReadiness = average(dailyMetrics.map((m) => m.readinessScore))
    const avgWellness = average(dailyMetrics.map((m) => m.wellnessScore))

    if (avgSleep !== null) {
      context += `- **Genomsnittlig sömn**: ${avgSleep.toFixed(1)} timmar/natt\n`
    }
    if (avgHRV !== null) {
      context += `- **Genomsnittlig HRV**: ${avgHRV.toFixed(0)} ms\n`
    }
    if (avgRHR !== null) {
      context += `- **Genomsnittlig vila-puls**: ${avgRHR.toFixed(0)} bpm\n`
    }
    if (avgReadiness !== null) {
      context += `- **Genomsnittlig beredskap**: ${avgReadiness.toFixed(1)}/10\n`
    }
    if (avgWellness !== null) {
      context += `- **Genomsnittlig välmående**: ${avgWellness.toFixed(1)}/10\n`
    }

    context += '\n'
  }

  return context
}

function buildAthleteProfileContext(profile: AthleteProfileData): string {
  const fields = [
    { key: 'trainingBackground', label: 'Träningsbakgrund' },
    { key: 'longTermAmbitions', label: 'Långsiktiga ambitioner' },
    { key: 'seasonalFocus', label: 'Fokus denna säsong' },
    { key: 'personalMotivations', label: 'Vad motiverar mig' },
    { key: 'trainingPreferences', label: 'Träningspreferenser' },
    { key: 'constraints', label: 'Begränsningar' },
    { key: 'dietaryNotes', label: 'Kost & näring' },
  ] as const

  const filledFields = fields.filter((f) => profile[f.key])

  if (filledFields.length === 0) {
    return ''
  }

  let context = `## ATLETENS EGNA REFLEKTIONER\n`

  for (const field of filledFields) {
    context += `\n### ${field.label}\n${profile[field.key]}\n`
  }

  return context + '\n'
}

function buildTrainingLoadContext(load: TrainingLoadData): string {
  let context = `## TRÄNINGSBELASTNING (ACWR)\n`

  if (load.acuteLoad !== null) {
    context += `- **Akut belastning (7 dagar)**: ${load.acuteLoad.toFixed(0)}\n`
  }
  if (load.chronicLoad !== null) {
    context += `- **Kronisk belastning (28 dagar)**: ${load.chronicLoad.toFixed(0)}\n`
  }
  if (load.acwr !== null) {
    context += `- **ACWR-kvot**: ${load.acwr.toFixed(2)}\n`
  }
  if (load.acwrZone) {
    const zoneTranslations: Record<string, string> = {
      DETRAINING: 'Avträning (för låg)',
      OPTIMAL: 'Optimal',
      CAUTION: 'Varning',
      DANGER: 'Fara',
      CRITICAL: 'Kritisk',
    }
    context += `- **Belastningszon**: ${zoneTranslations[load.acwrZone] || load.acwrZone}\n`
  }
  if (load.injuryRisk) {
    const riskTranslations: Record<string, string> = {
      LOW: 'Låg',
      MODERATE: 'Måttlig',
      HIGH: 'Hög',
      VERY_HIGH: 'Mycket hög',
    }
    context += `- **Skaderisk**: ${riskTranslations[load.injuryRisk] || load.injuryRisk}\n`
  }

  // Add guidance based on ACWR
  if (load.acwr !== null) {
    if (load.acwr < 0.8) {
      context += `\n⚠️ *ACWR är låg - atleten kan vara undertränad eller i återhämtningsfas.*\n`
    } else if (load.acwr >= 0.8 && load.acwr <= 1.3) {
      context += `\n✅ *ACWR är i optimal zon - bra balans mellan belastning och återhämtning.*\n`
    } else if (load.acwr > 1.3 && load.acwr <= 1.5) {
      context += `\n⚠️ *ACWR är förhöjd - var försiktig med att öka belastningen ytterligare.*\n`
    } else if (load.acwr > 1.5) {
      context += `\n🚨 *ACWR är kritiskt hög - rekommendera vila eller reducerad träning.*\n`
    }
  }

  return context + '\n'
}

function buildComplianceContext(completed: number, planned: number): string {
  const rate = planned > 0 ? (completed / planned) * 100 : 0

  let context = `## TRÄNINGSEFTERLEVNAD (senaste 30 dagarna)\n`
  context += `- **Genomförda pass**: ${completed} av ${planned} planerade\n`
  context += `- **Efterlevnadsgrad**: ${rate.toFixed(0)}%\n`

  if (rate >= 90) {
    context += `\n✅ *Utmärkt efterlevnad - atleten följer programmet mycket väl.*\n`
  } else if (rate >= 70) {
    context += `\n👍 *Bra efterlevnad - atleten följer programmet i stort.*\n`
  } else if (rate >= 50) {
    context += `\n⚠️ *Måttlig efterlevnad - atleten missar en del pass.*\n`
  } else {
    context += `\n🚨 *Låg efterlevnad - atleten har svårt att följa programmet. Överväg att anpassa.*\n`
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
  }[]
): string {
  let context = `## STYRKETRÄNING\n`

  const phaseTranslations: Record<string, string> = {
    ANATOMICAL_ADAPTATION: 'Anatomisk anpassning',
    MAX_STRENGTH: 'Maxstyrka',
    POWER: 'Power/Explosivitet',
    STRENGTH_ENDURANCE: 'Styrkeuthållighet',
    MAINTENANCE: 'Underhåll',
  }

  for (const assignment of sessions.slice(0, 3)) {
    const phase = phaseTranslations[assignment.session.phase] || assignment.session.phase
    context += `\n### ${assignment.session.name} (${formatDate(assignment.assignedDate)})\n`
    context += `- **Fas**: ${phase}\n`

    // Count exercises
    const exercises = assignment.session.exercises as Array<{ exerciseName?: string }> | null
    if (exercises && Array.isArray(exercises)) {
      context += `- **Antal övningar**: ${exercises.length}\n`
      const exerciseNames = exercises
        .slice(0, 5)
        .map((e) => e.exerciseName || 'Okänd')
        .join(', ')
      context += `- **Övningar**: ${exerciseNames}${exercises.length > 5 ? '...' : ''}\n`
    }
  }

  return context + '\n'
}

function buildAgentActionsContext(actions: AgentActionData[]): string {
  let context = `## AI-AGENTENS REKOMMENDATIONER\n`

  const actionTypeTranslations: Record<string, string> = {
    WORKOUT_INTENSITY_REDUCTION: 'Reducera intensitet',
    WORKOUT_DURATION_REDUCTION: 'Förkorta pass',
    WORKOUT_SKIP_RECOMMENDATION: 'Hoppa över pass',
    WORKOUT_SUBSTITUTION: 'Byt ut pass',
    REST_DAY_INJECTION: 'Lägg till vilodag',
    RECOVERY_ACTIVITY_SUGGESTION: 'Återhämtningsaktivitet',
    ESCALATE_TO_COACH: 'Eskalera till coach',
    CHECK_IN_NUDGE: 'Påminnelse',
  }

  const statusTranslations: Record<string, string> = {
    PROPOSED: 'Föreslagen',
    AUTO_APPLIED: 'Automatiskt tillämpad',
    ACCEPTED: 'Accepterad',
    REJECTED: 'Avvisad',
  }

  for (const action of actions) {
    const actionType = actionTypeTranslations[action.actionType] || action.actionType
    const status = statusTranslations[action.status] || action.status

    context += `\n### ${actionType}\n`
    context += `- **Status**: ${status}\n`
    context += `- **Motivering**: ${action.reasoning}\n`
    if (action.targetDate) {
      context += `- **Gäller**: ${formatDate(action.targetDate)}\n`
    }
  }

  context += `\n*Dessa är AI-agentens senaste förslag för att optimera träningen.*\n`

  return context + '\n'
}

// Helper functions
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('sv-SE')
}

function average(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
