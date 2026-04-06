/**
 * Workout Merge/Link API
 *
 * POST - Manually link an ad-hoc workout to a Garmin activity
 * DELETE - Unlink an ad-hoc workout from its Garmin activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
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

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()
    if (!clientId) return NextResponse.json({ error: 'No client' }, { status: 400 })

    const body = await req.json()
    const { adHocId, garminId } = linkSchema.parse(body)

    // Verify ownership
    const adHoc = await prisma.adHocWorkout.findFirst({
      where: { id: adHocId, athleteId: clientId },
    })
    if (!adHoc) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })

    const garmin = await prisma.garminActivity.findFirst({
      where: { id: garminId, clientId },
    })
    if (!garmin) return NextResponse.json({ error: 'Garmin activity not found' }, { status: 404 })

    // Check not already linked
    if (adHoc.garminActivityId) {
      return NextResponse.json({ error: 'Already linked' }, { status: 409 })
    }

    await linkAdHocToGarmin(adHocId, garminId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Merge error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()
    if (!clientId) return NextResponse.json({ error: 'No client' }, { status: 400 })

    const body = await req.json()
    const { adHocId } = unlinkSchema.parse(body)

    // Verify ownership
    const adHoc = await prisma.adHocWorkout.findFirst({
      where: { id: adHocId, athleteId: clientId },
    })
    if (!adHoc) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })

    if (!adHoc.garminActivityId) {
      return NextResponse.json({ error: 'Not linked' }, { status: 400 })
    }

    await unlinkAdHocFromGarmin(adHocId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Unlink error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
