/**
 * Hidden Exercises API
 *
 * GET  /api/exercises/hidden - Get user's hidden exercise IDs
 * POST /api/exercises/hidden - Toggle hidden on/off
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export async function GET(request?: NextRequest) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, user.language)

    try {
      const hidden = await prisma.hiddenExercise.findMany({
        where: { userId: user.id },
        select: { exerciseId: true },
      })
      return NextResponse.json({
        success: true,
        data: hidden.map((h) => h.exerciseId),
      })
    } catch {
      // Table may not exist yet — return empty list
      return NextResponse.json({ success: true, data: [] })
    }
  } catch (error) {
    logger.error('Error fetching hidden exercises', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch hidden exercises', 'Kunde inte hämta dolda övningar') },
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

    const existing = await prisma.hiddenExercise.findUnique({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId,
        },
      },
    })

    if (existing) {
      await prisma.hiddenExercise.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({ success: true, hidden: false })
    } else {
      await prisma.hiddenExercise.create({
        data: { userId: user.id, exerciseId },
      })
      return NextResponse.json({ success: true, hidden: true })
    }
  } catch (error) {
    logger.error('Error toggling hidden exercise', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to toggle hidden exercise', 'Kunde inte ändra dold övning') },
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
