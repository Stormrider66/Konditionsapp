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
import { z } from 'zod'

const linkSchema = z.object({
  garminActivityId: z.string(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const body = await request.json()
    const validation = linkSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'garminActivityId is required' }, { status: 400 })
    }

    // Verify ownership of ad-hoc workout
    const adHoc = await prisma.adHocWorkout.findUnique({
      where: { id },
      select: { athleteId: true, garminActivityId: true },
    })
    if (!adHoc || adHoc.athleteId !== clientId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (adHoc.garminActivityId) {
      return NextResponse.json({ error: 'Already linked to a Garmin activity' }, { status: 409 })
    }

    // Verify ownership of Garmin activity
    const garmin = await prisma.garminActivity.findUnique({
      where: { id: validation.data.garminActivityId },
      select: { clientId: true },
    })
    if (!garmin || garmin.clientId !== clientId) {
      return NextResponse.json({ error: 'Garmin activity not found' }, { status: 404 })
    }

    await linkAdHocToGarmin(id, validation.data.garminActivityId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error linking ad-hoc to Garmin:', error)
    return NextResponse.json({ error: 'Failed to link' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const adHoc = await prisma.adHocWorkout.findUnique({
      where: { id },
      select: { athleteId: true, garminActivityId: true },
    })
    if (!adHoc || adHoc.athleteId !== clientId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!adHoc.garminActivityId) {
      return NextResponse.json({ error: 'Not linked to any Garmin activity' }, { status: 400 })
    }

    await unlinkAdHocFromGarmin(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unlinking ad-hoc from Garmin:', error)
    return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 })
  }
}
