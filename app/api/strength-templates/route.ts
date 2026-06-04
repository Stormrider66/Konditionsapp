// app/api/strength-templates/route.ts
/**
 * Strength Training Templates API
 *
 * Allows coaches to save workout sessions as reusable templates:
 * - Save complete workouts with all exercises
 * - Retrieve saved templates
 * - Filter by phase, category, difficulty
 * - Apply template to create new workout
 *
 * Templates include:
 * - Exercise selection with sets/reps/load
 * - Strength phase (AA, MS, Power, etc.)
 * - Duration and estimated difficulty
 * - Notes and coaching cues
 *
 * Endpoints:
 * - GET /api/strength-templates - List all templates
 * - POST /api/strength-templates - Create new template from workout
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma, StrengthPhase, SportType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET - List all strength templates
 */
export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const searchParams = request.nextUrl.searchParams

    // Filters
    const phase = searchParams.get('phase')
    const targetSport = searchParams.get('targetSport')
    const targetGoal = searchParams.get('targetGoal')

    // Build where clause - show user's own templates + public + system templates
    const where: Prisma.StrengthTemplateWhereInput = {
      OR: [
        { coachId: user.id },
        { isPublic: true },
        { isSystemTemplate: true },
      ],
    }

    if (phase && phase !== 'ALL') {
      where.phase = phase as StrengthPhase
    }

    if (targetSport && targetSport !== 'ALL') {
      where.targetSport = targetSport as SportType
    }

    if (targetGoal && targetGoal !== 'ALL') {
      where.targetGoal = targetGoal
    }

    const templates = await prisma.strengthTemplate.findMany({
      where,
      orderBy: [
        { isSystemTemplate: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        coach: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      templates,
      count: templates.length,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Error fetching templates', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

/**
 * POST - Create new template from workout
 */
export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const body = await request.json()

    const {
      name,
      description,
      phase,
      durationWeeks,
      sessionsPerWeek,
      level,
      targetSport,
      targetGoal,
      sessions,
      progressionRules,
      isPublic,
    } = body

    // Validation
    if (!name || !sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: t(locale, 'name and sessions are required', 'name och sessions krävs') },
        { status: 400 }
      )
    }

    const template = await prisma.strengthTemplate.create({
      data: {
        name,
        description,
        phase: phase || 'ANATOMICAL_ADAPTATION',
        durationWeeks: durationWeeks || 4,
        sessionsPerWeek: sessionsPerWeek || 2,
        level: level || 'LEVEL_1',
        targetSport,
        targetGoal,
        sessions,
        progressionRules,
        coachId: user.id,
        isPublic: isPublic || false,
        isSystemTemplate: false,
        usageCount: 0,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Error creating template', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
