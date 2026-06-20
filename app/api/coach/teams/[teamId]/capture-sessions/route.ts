import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { createTeamCaptureSession } from '@/lib/team-capture/service'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

const createSchema = z.object({
  teamEventId: z.string().uuid().nullable().optional(),
  broadcastId: z.string().uuid().nullable().optional(),
  workoutType: z.string().max(40).nullable().optional(),
  workoutId: z.string().max(120).nullable().optional(),
  workoutName: z.string().max(160).nullable().optional(),
  name: z.string().max(160).nullable().optional(),
  participantIds: z.array(z.string().uuid()).max(80).optional(),
  laneCount: z.number().int().min(1).max(12).optional(),
  roundCount: z.number().int().min(1).max(30).optional(),
  bikeCalories: z.number().int().min(1).max(200).optional(),
  rowCalories: z.number().int().min(1).max(200).optional(),
  runDistanceMeters: z.number().int().min(10).max(5000).optional(),
  restBetweenRoundsSeconds: z.number().int().min(0).max(600).optional(),
  estimatedBikeSeconds: z.number().int().min(10).max(900).optional(),
  estimatedRowSeconds: z.number().int().min(10).max(900).optional(),
  estimatedRunSeconds: z.number().int().min(5).max(900).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)
    const body = await request.json().catch(() => ({}))
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid capture session', 'Ogiltigt fångstpass'), details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const session = await createTeamCaptureSession(user.id, {
      teamId,
      businessSlug: scope.businessSlug,
      ...parsed.data,
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Team or participants not found', 'Lag eller spelare hittades inte') },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: session }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create team capture session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to create capture session', 'Kunde inte skapa fångstpass') },
      { status: 500 },
    )
  }
}
