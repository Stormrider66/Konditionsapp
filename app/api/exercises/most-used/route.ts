/**
 * Most Used Exercises API
 *
 * GET /api/exercises/most-used - Get exercise IDs ranked by usage frequency
 * Counts occurrences across the coach's StrengthSessions (exercises JSON field).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, user.language)

    // Fetch all strength sessions for this coach
    const sessions = await prisma.strengthSession.findMany({
      where: { coachId: user.id },
      select: {
        exercises: true,
        warmupData: true,
        prehabData: true,
        coreData: true,
        cooldownData: true,
      },
    })

    // Count exercise usage across all sessions
    const counts: Record<string, number> = {}

    for (const session of sessions) {
      // Main exercises
      const mainExercises = session.exercises as any[] | null
      if (Array.isArray(mainExercises)) {
        for (const ex of mainExercises) {
          if (ex.exerciseId) {
            counts[ex.exerciseId] = (counts[ex.exerciseId] || 0) + 1
          }
        }
      }

      // Section exercises (warmup, prehab, core, cooldown)
      for (const sectionData of [session.warmupData, session.prehabData, session.coreData, session.cooldownData]) {
        const section = sectionData as { exercises?: any[] } | null
        if (section?.exercises && Array.isArray(section.exercises)) {
          for (const ex of section.exercises) {
            if (ex.exerciseId) {
              counts[ex.exerciseId] = (counts[ex.exerciseId] || 0) + 1
            }
          }
        }
      }
    }

    // Sort by usage count descending, return top 50
    const ranked = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([exerciseId, count]) => ({ exerciseId, count }))

    return NextResponse.json({ success: true, data: ranked })
  } catch (error) {
    logger.error('Error fetching most-used exercises', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch most-used exercises', 'Kunde inte hämta mest använda övningar') },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}
