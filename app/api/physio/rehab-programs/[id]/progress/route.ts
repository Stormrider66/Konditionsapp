// app/api/physio/rehab-programs/[id]/progress/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const logProgressSchema = z.object({
  exercisesCompleted: z.array(z.string().uuid()).default([]),
  exercisesCompletedCount: z.number().int().min(0).optional(), // Alternative: count instead of IDs
  exercisesSkipped: z.number().int().min(0).default(0),
  painDuring: z.number().int().min(0).max(10).optional(),
  painAfter: z.number().int().min(0).max(10).optional(),
  difficulty: z.enum(['TOO_EASY', 'APPROPRIATE', 'TOO_HARD']).optional(),
  overallFeeling: z.enum(['GOOD', 'NEUTRAL', 'BAD']).optional(),
  notes: z.string().optional(),
  exerciseNotes: z.record(z.string()).optional(), // exerciseId -> notes
  wantsPhysioContact: z.boolean().default(false),
})

/**
 * GET /api/physio/rehab-programs/[id]/progress
 * Get progress logs for a rehab program
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: programId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check if program exists
    const program = await prisma.rehabProgram.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: 'Rehab program not found' }, { status: 404 })
    }

    // Check access
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = program.physioUserId === user.id || await canAccessAthleteAsPhysio(user.id, program.clientId)
    } else if (user.role === 'COACH') {
      const client = await prisma.client.findUnique({
        where: { id: program.clientId },
        select: { userId: true },
      })
      hasAccess = client?.userId === user.id
    } else if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })
      hasAccess = athleteAccount?.clientId === program.clientId
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const [logs, total] = await Promise.all([
      prisma.rehabProgressLog.findMany({
        where: { programId },
        include: {
          loggedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { loggedAt: 'desc' },
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
      { error: 'Failed to fetch progress logs' },
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
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: programId } = await params
    const body = await request.json()
    const validatedData = logProgressSchema.parse(body)

    // Check if program exists
    const program = await prisma.rehabProgram.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: 'Rehab program not found' }, { status: 404 })
    }

    // Check access - physio, coach, or the athlete themselves
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = program.physioUserId === user.id || await canAccessAthleteAsPhysio(user.id, program.clientId)
    } else if (user.role === 'COACH') {
      const client = await prisma.client.findUnique({
        where: { id: program.clientId },
        select: { userId: true },
      })
      hasAccess = client?.userId === user.id
    } else if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })
      hasAccess = athleteAccount?.clientId === program.clientId
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const progressLog = await prisma.rehabProgressLog.create({
      data: {
        programId,
        loggedById: user.id,
        exercisesCompleted: validatedData.exercisesCompleted,
        painDuring: validatedData.painDuring,
        painAfter: validatedData.painAfter,
        difficulty: validatedData.difficulty,
        overallFeeling: validatedData.overallFeeling,
        notes: validatedData.notes,
        exerciseNotes: validatedData.exerciseNotes,
      },
      include: {
        loggedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // Check if we need to notify physio (pain exceeded, bad feeling, or contact requested)
    const painExceeded =
      (validatedData.painDuring !== undefined && validatedData.painDuring > program.acceptablePainDuring) ||
      (validatedData.painAfter !== undefined && validatedData.painAfter > program.acceptablePainAfter)

    if (painExceeded || validatedData.wantsPhysioContact || validatedData.overallFeeling === 'BAD') {
      try {
        // Get client info for notification
        const client = await prisma.client.findUnique({
          where: { id: program.clientId },
          select: { name: true },
        })

        await prisma.aINotification.create({
          data: {
            clientId: program.clientId,
            notificationType: 'REHAB_PROGRESS_ALERT',
            title: painExceeded
              ? `Smärta överskred gränsvärde - ${client?.name || 'Atlet'}`
              : validatedData.wantsPhysioContact
              ? `${client?.name || 'Atlet'} vill kontakta dig`
              : `${client?.name || 'Atlet'} rapporterade dåligt pass`,
            message: `Rehabprogram: ${program.name}. Smärta under: ${validatedData.painDuring ?? '-'}/10, efter: ${validatedData.painAfter ?? '-'}/10.${validatedData.overallFeeling ? ` Känsla: ${validatedData.overallFeeling}.` : ''}`,
            priority: painExceeded ? 'HIGH' : 'MEDIUM',
            contextData: {
              programId: program.id,
              programName: program.name,
              progressLogId: progressLog.id,
              painDuring: validatedData.painDuring,
              painAfter: validatedData.painAfter,
              acceptablePainDuring: program.acceptablePainDuring,
              acceptablePainAfter: program.acceptablePainAfter,
              overallFeeling: validatedData.overallFeeling,
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
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to log progress' },
      { status: 500 }
    )
  }
}
