/**
 * WOD Repeat API
 *
 * POST /api/ai/wod/repeat - Duplicate a completed WOD for repeating
 *
 * Creates a new WOD entry with the same workout data but fresh status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

interface RequestBody {
  wodId: string
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

    const rateLimited = await rateLimitJsonResponse('ai:wod:repeat', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: RequestBody = await request.json()
    const { wodId } = body

    if (!wodId) {
      return NextResponse.json(
        { error: 'wodId is required' },
        { status: 400 }
      )
    }

    // Fetch the original WOD
    const originalWOD = await prisma.aIGeneratedWOD.findFirst({
      where: {
        id: wodId,
        clientId,
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
        clientId,
        mode: originalWOD.mode,
        requestedDuration: originalWOD.requestedDuration,
        equipment: originalWOD.equipment,
        title: originalWOD.title,
        subtitle: originalWOD.subtitle,
        description: originalWOD.description,
        workoutJson: originalWOD.workoutJson as Prisma.InputJsonValue ?? Prisma.JsonNull,
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
    logger.error('WOD repeat error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to repeat WOD' },
      { status: 500 }
    )
  }
}
