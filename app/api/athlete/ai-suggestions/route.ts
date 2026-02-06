/**
 * Athlete AI Suggestions API
 *
 * GET /api/athlete/ai-suggestions - Generate proactive AI suggestions
 *
 * Generates suggestions based on:
 * - Low readiness score
 * - Hard workout + low readiness
 * - Missing daily check-in
 * - Active injuries
 * - Poor sleep patterns
 * - Workout streaks (motivation)
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger-console'

interface Suggestion {
  type: string
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  action: { label: string; href: string } | null
}

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, clientId } = resolved
    const athleteId = user.id
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch data in parallel
    // Note: Using DailyMetrics model which is where DailyCheckInForm saves data
    const [
      latestCheckIn,
      recentCheckIns,
      todaysWorkout,
      activeInjuries,
      recentWorkoutLogs,
    ] = await Promise.all([
      // Latest check-in (today) - using DailyMetrics where form saves
      prisma.dailyMetrics.findFirst({
        where: {
          clientId,
          date: { gte: today },
        },
        orderBy: { date: 'desc' },
      }),

      // Recent check-ins (last 7 days) - using DailyMetrics
      prisma.dailyMetrics.findMany({
        where: {
          clientId,
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { date: 'desc' },
        take: 7,
      }),

      // Today's workout
      prisma.workout.findFirst({
        where: {
          day: {
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
            week: {
              program: {
                clientId,
                isActive: true,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          intensity: true,
          duration: true,
        },
      }),

      // Active injuries (excluding ones just created today - no need to remind immediately)
      prisma.injuryAssessment.findMany({
        where: {
          clientId,
          status: { not: 'FULLY_RECOVERED' },
          detectedAt: { lt: today }, // Only show injuries from before today
        },
        select: {
          painLocation: true,
          painLevel: true,
        },
      }),

      // Recent workout logs (for streak calculation)
      prisma.workoutLog.findMany({
        where: {
          athleteId,
          completedAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          },
          completed: true,
        },
        orderBy: { completedAt: 'desc' },
        select: {
          completedAt: true,
        },
      }),
    ])

    const suggestions: Suggestion[] = []

    // 1. Missing daily check-in
    const hasCheckedInToday = latestCheckIn !== null
    if (!hasCheckedInToday) {
      suggestions.push({
        type: 'check-in',
        priority: 'medium',
        title: 'Daglig incheckning',
        message: 'Du har inte gjort din dagliga incheckning. Den tar mindre än 2 minuter och hjälper oss anpassa din träning.',
        action: { label: 'Gör incheckning', href: '/athlete/check-in' },
      })
    }

    // 2. Low readiness warning
    if (latestCheckIn?.readinessScore && latestCheckIn.readinessScore < 5) {
      suggestions.push({
        type: 'readiness',
        priority: 'high',
        title: 'Låg beredskap',
        message: `Din beredskapspoäng är ${latestCheckIn.readinessScore.toFixed(1)}/10. Överväg lättare träning eller vila idag.`,
        action: null,
      })
    }

    // 3. Hard workout + low readiness
    if (
      todaysWorkout &&
      (todaysWorkout.intensity === 'INTERVAL' || todaysWorkout.intensity === 'THRESHOLD') &&
      latestCheckIn?.readinessScore &&
      latestCheckIn.readinessScore < 6
    ) {
      suggestions.push({
        type: 'workout-adjustment',
        priority: 'high',
        title: 'Intensivt pass planerat',
        message: `Du har "${todaysWorkout.name}" planerat, men din beredskap är låg. Överväg att kontakta din coach om anpassning.`,
        action: { label: 'Visa pass', href: `/athlete/workouts/${todaysWorkout.id}` },
      })
    }

    // 4. Active injury reminder
    if (activeInjuries.length > 0) {
      const highSeverity = activeInjuries.filter((i) => i.painLevel >= 7)
      if (highSeverity.length > 0) {
        suggestions.push({
          type: 'injury',
          priority: 'high',
          title: 'Skadestatus',
          message: `Du har ${highSeverity.length} allvarlig skada/begränsning. Glöm inte att rapportera förändringar till din coach.`,
          action: null,
        })
      } else if (activeInjuries.length > 0) {
        suggestions.push({
          type: 'injury',
          priority: 'medium',
          title: 'Aktiv skada',
          message: `Du har ${activeInjuries.length} aktiv skada/begränsning. Var uppmärksam under träning.`,
          action: null,
        })
      }
    }

    // 5. Poor sleep pattern
    if (recentCheckIns.length >= 3) {
      const sleepHours = recentCheckIns
        .map((c) => c.sleepHours)
        .filter((h): h is number => h !== null)

      if (sleepHours.length >= 3) {
        const avgSleep = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length
        if (avgSleep < 6.5) {
          suggestions.push({
            type: 'recovery',
            priority: 'medium',
            title: 'Sömnbrist',
            message: `Din genomsnittliga sömn senaste veckan är ${avgSleep.toFixed(1)} timmar. Prioritera sömn för bättre återhämtning och prestation.`,
            action: null,
          })
        }
      }
    }

    // 6. Workout streak motivation
    if (recentWorkoutLogs.length > 0) {
      const streak = calculateStreak(recentWorkoutLogs.map((l) => l.completedAt!))
      if (streak >= 7) {
        suggestions.push({
          type: 'motivation',
          priority: 'low',
          title: 'Imponerande!',
          message: `Du har tränat ${streak} dagar i rad! Fortsätt hålla i, men glöm inte återhämtning.`,
          action: null,
        })
      } else if (streak >= 3) {
        suggestions.push({
          type: 'motivation',
          priority: 'low',
          title: 'Bra jobbat!',
          message: `${streak} träningsdagar i rad! Du är på god väg mot dina mål.`,
          action: null,
        })
      }
    }

    // 7. Upcoming hard workout (next day warning)
    if (!todaysWorkout || todaysWorkout.intensity !== 'INTERVAL') {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      const tomorrowsWorkout = await prisma.workout.findFirst({
        where: {
          day: {
            date: {
              gte: tomorrow,
              lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
            },
            week: {
              program: {
                clientId,
                isActive: true,
              },
            },
          },
          intensity: 'INTERVAL',
        },
        select: {
          name: true,
        },
      })

      if (tomorrowsWorkout) {
        suggestions.push({
          type: 'preparation',
          priority: 'low',
          title: 'Förbered för imorgon',
          message: `Du har ett intensivt pass imorgon: "${tomorrowsWorkout.name}". Se till att få bra sömn och äta väl idag.`,
          action: null,
        })
      }
    }

    return NextResponse.json({
      success: true,
      suggestions,
      meta: {
        hasCheckedInToday,
        readinessScore: latestCheckIn?.readinessScore || null,
        todaysWorkout: todaysWorkout?.name || null,
        activeInjuries: activeInjuries.length,
      },
    })
  } catch (error) {
    logError('Error generating AI suggestions:', error)

    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

/**
 * Calculate workout streak (consecutive days with workouts)
 */
function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0

  // Sort dates descending
  const sortedDates = dates
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  // Normalize to date strings
  const dateStrings = new Set(
    sortedDates.map((d) => d.toISOString().split('T')[0])
  )

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let checkDate = today

  // Count consecutive days going back from today
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (dateStrings.has(dateStr)) {
      streak++
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
    } else {
      break
    }
  }

  return streak
}
