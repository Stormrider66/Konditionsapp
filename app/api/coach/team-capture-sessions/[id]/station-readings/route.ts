import { NextRequest, NextResponse } from 'next/server'
import { TeamCaptureMachineType } from '@prisma/client'
import { z } from 'zod'

import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { recordTeamCaptureStationReadings } from '@/lib/team-capture/service'

interface RouteContext {
  params: Promise<{ id: string }>
}

const readingSchema = z.object({
  timestamp: z.string().datetime().optional(),
  offsetSec: z.number().int().min(0).max(172_800).optional(),
  source: z.string().max(80).optional(),
  deviceId: z.string().max(200).optional(),
  power: z.number().finite().min(0).max(3000).optional(),
  cadence: z.number().finite().min(0).max(300).optional(),
  strokeRate: z.number().finite().min(0).max(120).optional(),
  paceSecPer500m: z.number().finite().min(1).max(3600).optional(),
  distanceMeters: z.number().finite().min(0).optional(),
  calories: z.number().finite().min(0).optional(),
  heartRate: z.number().finite().min(0).max(255).optional(),
  raw: z.record(z.unknown()).optional(),
})

const bodySchema = z.object({
  stationId: z.string().uuid().optional(),
  laneNumber: z.number().int().min(1).max(12).optional(),
  machineType: z.nativeEnum(TeamCaptureMachineType).optional(),
  receiverName: z.string().max(120).optional(),
  deviceName: z.string().max(200).optional(),
  deviceId: z.string().max(200).optional(),
  readings: z.array(readingSchema).min(1).max(500),
}).refine((value) => value.stationId || (value.laneNumber && value.machineType), {
  message: 'stationId or laneNumber + machineType required',
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await context.params
    const scope = getRequestedBusinessScope(request)
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid station readings', 'Ogiltiga stationsmätningar'), details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const result = await recordTeamCaptureStationReadings(user.id, id, parsed.data, scope.businessSlug)
    if (!result) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Station not found', 'Stationen hittades inte') },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    logger.error('Failed to save station readings', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to save station readings', 'Kunde inte spara stationsmätningar') },
      { status: 500 },
    )
  }
}
