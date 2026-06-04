import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import {
  strengthSessionAccessWhere,
} from '@/lib/strength/session-business-scope'
import {
  agilityWorkoutAccessWhere,
  cardioSessionAccessWhere,
  hybridWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const workoutTypeSchema = z.enum(['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY'])

export async function GET(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const businessScope = await resolveWorkoutBusinessScope(user.id, req)

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 })
    }

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const parsedType = workoutTypeSchema.safeParse(searchParams.get('type') || 'STRENGTH')
    if (!parsedType.success) {
      return NextResponse.json({ error: t(locale, 'Invalid workout type', 'Ogiltig passtyp') }, { status: 400 })
    }

    const search = searchParams.get('search')?.trim()
    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}
    if (parsedType.data === 'STRENGTH') {
      const workouts = await prisma.strengthSession.findMany({
        where: { AND: [strengthSessionAccessWhere(user.id, businessScope.businessId), searchWhere] },
        select: { id: true, name: true, description: true, estimatedDuration: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      })
      return NextResponse.json({ workouts })
    }

    if (parsedType.data === 'CARDIO') {
      const workouts = await prisma.cardioSession.findMany({
        where: { AND: [cardioSessionAccessWhere(user.id, businessScope.businessId), searchWhere] },
        select: { id: true, name: true, description: true, totalDuration: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      })
      return NextResponse.json({ workouts })
    }

    if (parsedType.data === 'HYBRID') {
      const workouts = await prisma.hybridWorkout.findMany({
        where: { AND: [hybridWorkoutAccessWhere(user.id, businessScope.businessId), searchWhere] },
        select: { id: true, name: true, description: true, timeCap: true, updatedAt: true },
        orderBy: [{ isBenchmark: 'desc' }, { updatedAt: 'desc' }],
        take: 30,
      })
      return NextResponse.json({ workouts })
    }

    const workouts = await prisma.agilityWorkout.findMany({
      where: { AND: [agilityWorkoutAccessWhere(user.id, businessScope.businessId), searchWhere] },
      select: { id: true, name: true, description: true, totalDuration: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    })
    return NextResponse.json({ workouts })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error loading team event workout options:', error)
    return NextResponse.json({ error: t(locale, 'Failed to load workout options', 'Kunde inte hämta passalternativ') }, { status: 500 })
  }
}
