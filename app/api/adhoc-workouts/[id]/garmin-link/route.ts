/**
 * Ad-Hoc ↔ Garmin Activity Link Management
 *
 * PUT  /api/adhoc-workouts/[id]/garmin-link - Manually link to a Garmin activity
 * DELETE /api/adhoc-workouts/[id]/garmin-link - Unlink from Garmin activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { linkAdHocToGarmin, unlinkAdHocFromGarmin } from '@/lib/training/adhoc-garmin-matcher'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

const linkSchema = z.object({
  garminActivityId: z.string(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const validation = linkSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: t(locale, 'garminActivityId is required', 'garminActivityId krävs') }, { status: 400 })
    }

    // Verify ownership of ad-hoc workout
    const adHoc = await prisma.adHocWorkout.findUnique({
      where: { id },
      select: { athleteId: true, garminActivityId: true },
    })
    if (!adHoc || adHoc.athleteId !== clientId) {
      return NextResponse.json({ error: t(locale, 'Not found', 'Hittades inte') }, { status: 404 })
    }
    if (adHoc.garminActivityId) {
      return NextResponse.json({ error: t(locale, 'Already linked to a Garmin activity', 'Redan kopplat till en Garmin-aktivitet') }, { status: 409 })
    }

    // Verify ownership of Garmin activity
    const garmin = await prisma.garminActivity.findUnique({
      where: { id: validation.data.garminActivityId },
      select: { clientId: true },
    })
    if (!garmin || garmin.clientId !== clientId) {
      return NextResponse.json({ error: t(locale, 'Garmin activity not found', 'Garmin-aktiviteten hittades inte') }, { status: 404 })
    }

    await linkAdHocToGarmin(id, validation.data.garminActivityId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error linking ad-hoc to Garmin:', error)
    return NextResponse.json({ error: t(locale, 'Failed to link', 'Kunde inte koppla') }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    const adHoc = await prisma.adHocWorkout.findUnique({
      where: { id },
      select: { athleteId: true, garminActivityId: true },
    })
    if (!adHoc || adHoc.athleteId !== clientId) {
      return NextResponse.json({ error: t(locale, 'Not found', 'Hittades inte') }, { status: 404 })
    }
    if (!adHoc.garminActivityId) {
      return NextResponse.json({ error: t(locale, 'Not linked to any Garmin activity', 'Inte kopplat till någon Garmin-aktivitet') }, { status: 400 })
    }

    await unlinkAdHocFromGarmin(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unlinking ad-hoc from Garmin:', error)
    return NextResponse.json({ error: t(locale, 'Failed to unlink', 'Kunde inte ta bort kopplingen') }, { status: 500 })
  }
}
