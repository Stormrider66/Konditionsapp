/**
 * WOD Repeat API
 *
 * POST /api/ai/wod/repeat - Duplicate a completed WOD for repeating
 *
 * Creates a new WOD entry with the same workout data but fresh status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface RequestBody {
  wodId: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAthlete()
    const body: RequestBody = await request.json()
    const { wodId } = body

    if (!wodId) {
      return NextResponse.json(
        { error: 'wodId is required' },
        { status: 400 }
      )
    }

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    // Fetch the original WOD
    const originalWOD = await prisma.aIGeneratedWOD.findFirst({
      where: {
        id: wodId,
        clientId: athleteAccount.clientId,
      },
    })

    if (!originalWOD) {
      return NextResponse.json(
        { error: 'Original WOD not found' },
        { status: 404 }
      )
    }

    // Create a new WOD with the same workout data
    const newWOD = await prisma.aIGeneratedWOD.create({
      data: {
        clientId: athleteAccount.clientId,
        mode: originalWOD.mode,
        requestedDuration: originalWOD.requestedDuration,
        equipment: originalWOD.equipment,
        title: originalWOD.title,
        subtitle: originalWOD.subtitle,
        description: originalWOD.description,
        workoutJson: originalWOD.workoutJson,
        coachNotes: originalWOD.coachNotes,
        readinessAtGeneration: null, // Will be different this time
        intensityAdjusted: null,
        guardrailsApplied: [],
        primarySport: originalWOD.primarySport,
        status: 'GENERATED',
        // No startedAt, completedAt, sessionRPE, exerciseLogs, actualDuration
        tokensUsed: 0, // No new tokens used
        generationTimeMs: 0,
        modelUsed: 'repeat',
      },
    })

    return NextResponse.json({
      success: true,
      newWodId: newWOD.id,
      message: 'WOD duplicated successfully',
    })
  } catch (error) {
    console.error('WOD repeat error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to repeat WOD' },
      { status: 500 }
    )
  }
}
