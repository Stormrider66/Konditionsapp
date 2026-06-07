/**
 * Exercise Favorites API
 *
 * GET  /api/exercises/favorites - Get user's favorite exercise IDs
 * POST /api/exercises/favorites - Toggle favorite on/off
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import {
  getStrengthStudioExerciseWhereInput,
  isStrengthStudioSurface,
} from '@/lib/strength/exercise-library-surface'

export async function GET(request?: NextRequest) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, user.language)

    const surface = request ? new URL(request.url).searchParams.get('surface') : null
    const favorites = await prisma.exerciseFavorite.findMany({
      where: {
        userId: user.id,
        ...(isStrengthStudioSurface(surface) ? { exercise: getStrengthStudioExerciseWhereInput() } : {}),
      },
      select: { exerciseId: true },
    })

    return NextResponse.json({
      success: true,
      data: favorites.map((f) => f.exerciseId),
    })
  } catch (error) {
    logger.error('Error fetching exercise favorites', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch favorites', 'Kunde inte hämta favoriter') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const { exerciseId } = body

    if (!exerciseId || typeof exerciseId !== 'string') {
      return NextResponse.json(
        { error: t(locale, 'exerciseId is required', 'exerciseId krävs') },
        { status: 400 }
      )
    }

    // Check if already favorited
    const existing = await prisma.exerciseFavorite.findUnique({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId,
        },
      },
    })

    if (existing) {
      // Remove favorite
      await prisma.exerciseFavorite.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({
        success: true,
        favorited: false,
      })
    } else {
      // Add favorite
      await prisma.exerciseFavorite.create({
        data: {
          userId: user.id,
          exerciseId,
        },
      })
      return NextResponse.json({
        success: true,
        favorited: true,
      })
    }
  } catch (error) {
    logger.error('Error toggling exercise favorite', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to toggle favorite', 'Kunde inte ändra favorit') },
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
