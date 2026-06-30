/**
 * Coach Live HR Machine Push API
 *
 * POST - Push Wattbike/Concept2 live readings from a coach capture station.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { pushCoachPowerReading } from '@/lib/live-hr/reading-service'
import { resolveLocale, t, type AppLocale } from '@/lib/live-hr/api-locale'
import type { LiveHRMachineType, PushPowerReadingInput } from '@/lib/live-hr/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

function isMachineType(value: unknown): value is LiveHRMachineType {
  return (
    value === 'WATTBIKE' ||
    value === 'CONCEPT2_ROW' ||
    value === 'CONCEPT2_SKIERG' ||
    value === 'CONCEPT2_BIKEERG'
  )
}

function normalizeMachineHeartRate(value: unknown): number | undefined {
  if (value == null || value === 0) return undefined
  if (typeof value !== 'number' || value < 30 || value > 250) return Number.NaN
  return Math.round(value)
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params
    const body = await req.json()

    if (!body.clientId || typeof body.clientId !== 'string') {
      return NextResponse.json(
        { error: t(locale, 'clientId required', 'clientId är obligatoriskt') },
        { status: 400 }
      )
    }

    if (typeof body.power !== 'number' || body.power < 0 || body.power > 2500) {
      return NextResponse.json(
        { error: t(locale, 'Invalid power (0-2500 W)', 'Ogiltig effekt (0-2500 W)') },
        { status: 400 }
      )
    }

    const heartRate = normalizeMachineHeartRate(body.heartRate)

    if (Number.isNaN(heartRate)) {
      return NextResponse.json(
        { error: t(locale, 'Invalid heart rate (30-250 bpm)', 'Ogiltig puls (30-250 bpm)') },
        { status: 400 }
      )
    }

    const input: PushPowerReadingInput = {
      power: body.power,
      cadence: typeof body.cadence === 'number' ? body.cadence : undefined,
      heartRate,
      ergometerType: isMachineType(body.ergometerType) ? body.ergometerType : undefined,
      deviceId: typeof body.deviceId === 'string' ? body.deviceId : undefined,
      timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
    }

    const success = await pushCoachPowerReading(user.id, id, body.clientId, input)

    if (!success) {
      return NextResponse.json(
        { error: t(locale, 'Participant not found in active session', 'Deltagaren finns inte i ett aktivt pass') },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error pushing coach machine reading:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to push reading', 'Kunde inte skicka mätningen') },
      { status: 500 }
    )
  }
}
