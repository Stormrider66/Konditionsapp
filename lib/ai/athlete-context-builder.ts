/**
 * Athlete Context Builder for AI Chat
 *
 * Builds context from the athlete's OWN data for AI conversations.
 * This is a simplified version specifically for athlete self-service AI chat.
 */

import { prisma } from '@/lib/prisma'
import { SportType } from '@prisma/client'

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

    // Recent tests (last 3)
    prisma.test.findMany({
      where: { clientId },
      orderBy: { testDate: 'desc' },
      take: 3,
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
  ])

  if (!client) {
    return 'Ingen atletdata hittades.'
  }

  // Build context string
  let context = ''

  // Profile section
  context += buildProfileContext(client)

  // Sport profile section
  if (sportProfile) {
    context += buildSportProfileContext(sportProfile)
  }

  // Readiness and wellness section
  if (dailyCheckIns.length > 0) {
    context += buildReadinessContext(dailyCheckIns as DailyCheckInData[])
  }

  // Recent tests section
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

// Helper functions
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('sv-SE')
}

function average(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
