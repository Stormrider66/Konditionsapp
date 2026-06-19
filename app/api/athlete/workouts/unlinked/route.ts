/**
 * Unlinked Workouts API
 *
 * GET - Returns ad-hoc workouts without a Garmin link and
 *       Garmin activities without an ad-hoc link (last 14 days).
 *       Includes match suggestions with confidence scores.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import { areTypesCompatible } from '@/lib/training/activity-deduplication'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
    locale = resolveRequestLocale(request, user.language)
    if (!clientId) return NextResponse.json({ unlinkedAdHocs: [], unlinkedGarmin: [], suggestions: [] })

    const since = subDays(new Date(), 14)

    // Unlinked ad-hoc workouts (no Garmin link)
    const unlinkedAdHocs = await prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        garminActivityId: null,
        status: { in: ['CONFIRMED', 'READY_FOR_REVIEW'] },
        inputType: { notIn: ['STRAVA_IMPORT', 'GARMIN_IMPORT', 'CONCEPT2_IMPORT'] },
        workoutDate: { gte: since },
      },
      select: {
        id: true,
        workoutName: true,
        workoutDate: true,
        parsedType: true,
        parsedStructure: true,
        inputType: true,
        status: true,
      },
      orderBy: { workoutDate: 'desc' },
      take: 50,
    })

    // Unlinked Garmin activities (no ad-hoc link)
    const unlinkedGarmin = await prisma.garminActivity.findMany({
      where: {
        clientId,
        adHocWorkout: null,
        cardioSessionLog: null,
        hybridWorkoutLog: null,
        startDate: { gte: since },
      },
      select: {
        id: true,
        name: true,
        type: true,
        startDate: true,
        duration: true,
        distance: true,
        averageHeartrate: true,
        maxHeartrate: true,
        calories: true,
        mappedType: true,
        deviceName: true,
      },
      orderBy: { startDate: 'desc' },
      take: 50,
    })

    // Generate match suggestions
    const suggestions: {
      adHocId: string
      garminId: string
      confidence: number
      reasons: string[]
    }[] = []

    for (const adHoc of unlinkedAdHocs) {
      for (const garmin of unlinkedGarmin) {
        const result = scorePair(adHoc, garmin, locale)
        if (result.confidence > 0.3) {
          suggestions.push({
            adHocId: adHoc.id,
            garminId: garmin.id,
            confidence: result.confidence,
            reasons: result.reasons,
          })
        }
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence)

    return NextResponse.json({
      unlinkedAdHocs,
      unlinkedGarmin,
      suggestions: suggestions.slice(0, 20),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json({ error: t(locale, 'Failed to fetch unlinked workouts', 'Kunde inte hämta okopplade pass') }, { status: 500 })
  }
}

// ─── Scoring ────────────────────────────────────────────────────────────

interface AdHocItem {
  workoutDate: Date
  parsedType: string | null
  parsedStructure: unknown
}

interface GarminItem {
  startDate: Date
  type: string
  duration: number | null
  mappedType: string | null
}

function scorePair(
  adHoc: AdHocItem,
  garmin: GarminItem,
  locale: AppLocale
): { confidence: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Same day
  const adHocDay = new Date(adHoc.workoutDate).toISOString().slice(0, 10)
  const garminDay = new Date(garmin.startDate).toISOString().slice(0, 10)

  if (adHocDay !== garminDay) return { confidence: 0, reasons: [] }
  score += 0.3
  reasons.push(t(locale, 'Same day', 'Samma dag'))

  // Time proximity (within 2 hours)
  const timeDiff = Math.abs(
    new Date(adHoc.workoutDate).getTime() - new Date(garmin.startDate).getTime()
  )
  if (timeDiff < 2 * 60 * 60 * 1000) {
    score += 0.25
    reasons.push(t(locale, 'Close in time', 'Nära i tid'))
  } else if (timeDiff < 6 * 60 * 60 * 1000) {
    score += 0.1
    reasons.push(t(locale, 'Same half-day', 'Samma halvdag'))
  }

  // Type compatibility
  const adHocType = adHoc.parsedType || 'OTHER'
  const garminType = garmin.mappedType || garmin.type || 'OTHER'
  if (areTypesCompatible(adHocType, garminType)) {
    score += 0.25
    reasons.push(t(locale, 'Matching type', 'Matchande typ'))
  }

  // Duration match (if available)
  const parsed = adHoc.parsedStructure as { duration?: number } | null
  if (parsed?.duration && garmin.duration) {
    const adHocDuration = parsed.duration * 60 // minutes → seconds
    const ratio = Math.abs(adHocDuration - garmin.duration) / Math.max(adHocDuration, garmin.duration)
    if (ratio < 0.2) {
      score += 0.2
      reasons.push(t(locale, 'Similar duration', 'Liknande duration'))
    }
  }

  return { confidence: Math.min(score, 1), reasons }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
