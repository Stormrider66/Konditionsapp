/**
 * Workout Merge/Link API
 *
 * POST - Manually link an ad-hoc workout to a Garmin activity
 * DELETE - Unlink an ad-hoc workout from its Garmin activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { prisma } from '@/lib/prisma'
import { linkAdHocToGarmin, unlinkAdHocFromGarmin } from '@/lib/training/adhoc-garmin-matcher'
import { z } from 'zod'

const linkSchema = z.object({
  adHocId: z.string(),
  garminId: z.string(),
})

const unlinkSchema = z.object({
  adHocId: z.string(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = resolveRequestLocale(req, user.language)
    if (!clientId) return NextResponse.json({ error: t(locale, 'No client', 'Ingen klient') }, { status: 400 })

    const body = await req.json()
    const { adHocId, garminId } = linkSchema.parse(body)

    // Verify ownership
    const adHoc = await prisma.adHocWorkout.findFirst({
      where: { id: adHocId, athleteId: clientId },
    })
    if (!adHoc) return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })

    const garmin = await prisma.garminActivity.findFirst({
      where: { id: garminId, clientId },
    })
    if (!garmin) return NextResponse.json({ error: t(locale, 'Garmin activity not found', 'Garmin-aktiviteten hittades inte') }, { status: 404 })

    // Check not already linked
    if (adHoc.garminActivityId) {
      return NextResponse.json({ error: t(locale, 'Already linked', 'Redan länkad') }, { status: 409 })
    }

    await linkAdHocToGarmin(adHocId, garminId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Merge error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to link workout', 'Kunde inte länka passet') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = resolveRequestLocale(req, user.language)
    if (!clientId) return NextResponse.json({ error: t(locale, 'No client', 'Ingen klient') }, { status: 400 })

    const body = await req.json()
    const { adHocId } = unlinkSchema.parse(body)

    // Verify ownership
    const adHoc = await prisma.adHocWorkout.findFirst({
      where: { id: adHocId, athleteId: clientId },
    })
    if (!adHoc) return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })

    if (!adHoc.garminActivityId) {
      return NextResponse.json({ error: t(locale, 'Not linked', 'Inte länkad') }, { status: 400 })
    }

    await unlinkAdHocFromGarmin(adHocId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Unlink error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to unlink workout', 'Kunde inte ta bort länken från passet') }, { status: 500 })
  }
}
