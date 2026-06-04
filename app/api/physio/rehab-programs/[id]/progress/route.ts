// app/api/physio/rehab-programs/[id]/progress/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const logProgressSchema = z.object({
  exercisesCompleted: z.array(z.string().uuid()).default([]),
  completionPercent: z.number().min(0).max(100).optional(),
  painDuring: z.number().int().min(0).max(10).optional(),
  painAfter: z.number().int().min(0).max(10).optional(),
  difficultyRating: z.number().int().min(1).max(5).optional(), // 1-5 how difficult
  notes: z.string().optional(),
  wantsPhysioContact: z.boolean().default(false),
})

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/physio/rehab-programs/[id]/progress
 * Get progress logs for a rehab program
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id: programId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check if program exists
    const program = await prisma.rehabProgram.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: t(locale, 'Rehab program not found', 'Rehabprogrammet hittades inte') }, { status: 404 })
    }

    // Check access
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (program.physioUserId === user.id) {
      hasAccess = true
    } else if (user.role === 'ATHLETE') {
      hasAccess = await canAccessClient(user.id, program.clientId)
    } else {
      hasAccess = await canAccessClient(user.id, program.clientId)
    }

    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    const [logs, total] = await Promise.all([
      prisma.rehabProgressLog.findMany({
        where: { programId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.rehabProgressLog.count({ where: { programId } }),
    ])

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching progress logs:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch progress logs', 'Kunde inte hämta progressloggar') },
      { status: 500 }
    )
  }
}

/**
 * POST /api/physio/rehab-programs/[id]/progress
 * Log progress for a rehab program (can be done by physio or athlete)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id: programId } = await params
    const body = await request.json()
    const validatedData = logProgressSchema.parse(body)

    // Check if program exists
    const program = await prisma.rehabProgram.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: t(locale, 'Rehab program not found', 'Rehabprogrammet hittades inte') }, { status: 404 })
    }

    // Check access - physio, coach, or the athlete themselves
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (program.physioUserId === user.id) {
      hasAccess = true
    } else if (user.role === 'ATHLETE') {
      hasAccess = await canAccessClient(user.id, program.clientId)
    } else {
      hasAccess = await canAccessClient(user.id, program.clientId)
    }

    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    const progressLog = await prisma.rehabProgressLog.create({
      data: {
        programId,
        clientId: program.clientId,
        exercisesCompleted: validatedData.exercisesCompleted,
        completionPercent: validatedData.completionPercent,
        painDuring: validatedData.painDuring,
        painAfter: validatedData.painAfter,
        difficultyRating: validatedData.difficultyRating,
        notes: validatedData.notes,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Check if we need to notify physio (pain exceeded or contact requested)
    const painExceeded =
      (validatedData.painDuring !== undefined && validatedData.painDuring > program.acceptablePainDuring) ||
      (validatedData.painAfter !== undefined && validatedData.painAfter > program.acceptablePainAfter)

    if (painExceeded || validatedData.wantsPhysioContact) {
      try {
        // Get recipient/client info for notification copy
        const [client, physioUser] = await Promise.all([
          prisma.client.findUnique({
            where: { id: program.clientId },
            select: { name: true },
          }),
          program.physioUserId
            ? prisma.user.findUnique({
              where: { id: program.physioUserId },
              select: { language: true },
            })
            : null,
        ])
        const notificationLocale = getUserLocale(physioUser?.language ?? user.language)
        const athleteName = client?.name || t(notificationLocale, 'Athlete', 'Atlet')

        const title = painExceeded
          ? t(
            notificationLocale,
            `Pain exceeded threshold - ${athleteName}`,
            `Smärta överskred gränsvärde - ${athleteName}`
          )
          : t(
            notificationLocale,
            `${athleteName} wants to contact you`,
            `${athleteName} vill kontakta dig`
          )
        const message = t(
          notificationLocale,
          `Rehab program: ${program.name}. Pain during: ${validatedData.painDuring ?? '-'}/10, after: ${validatedData.painAfter ?? '-'}/10.`,
          `Rehabprogram: ${program.name}. Smärta under: ${validatedData.painDuring ?? '-'}/10, efter: ${validatedData.painAfter ?? '-'}/10.`
        )

        await prisma.aINotification.create({
          data: {
            clientId: program.clientId,
            notificationType: 'REHAB_PROGRESS_ALERT',
            title,
            message,
            priority: painExceeded ? 'HIGH' : 'MEDIUM',
            contextData: {
              programId: program.id,
              programName: program.name,
              progressLogId: progressLog.id,
              painDuring: validatedData.painDuring,
              painAfter: validatedData.painAfter,
              acceptablePainDuring: program.acceptablePainDuring,
              acceptablePainAfter: program.acceptablePainAfter,
              wantsContact: validatedData.wantsPhysioContact,
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })

        logger.info('Rehab progress alert created', {
          programId,
          painExceeded,
          wantsContact: validatedData.wantsPhysioContact,
        })
      } catch (notifyError) {
        logger.error('Failed to create rehab progress notification', { programId }, notifyError)
        // Don't fail the progress log if notification fails
      }
    }

    return NextResponse.json(progressLog, { status: 201 })
  } catch (error) {
    console.error('Error logging progress:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to log progress', 'Kunde inte logga progress') },
      { status: 500 }
    )
  }
}
