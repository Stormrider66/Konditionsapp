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
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RequestBody {
  wodId: string
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { user, clientId } = resolved
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:wod:repeat', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: RequestBody = await request.json()
    const { wodId } = body

    if (!wodId) {
      return NextResponse.json(
        { error: t(locale, 'wodId is required', 'wodId krävs') },
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
        { error: t(locale, 'Original WOD not found', 'Originalpasset hittades inte') },
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
      message: t(locale, 'WOD duplicated successfully', 'Dagens pass har kopierats'),
    })
  } catch (error) {
    logger.error('WOD repeat error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to repeat WOD', 'Kunde inte upprepa dagens pass') },
      { status: 500 }
    )
  }
}
