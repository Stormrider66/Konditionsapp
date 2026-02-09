// app/api/injury/acute-report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient, canAccessAthleteAsPhysio, resolveAthleteClientId } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schema for creating an acute injury report
const createAcuteInjuryReportSchema = z.object({
  clientId: z.string().uuid(),
  incidentDate: z.string().datetime(),
  incidentTime: z.string().optional(),
  mechanism: z.enum(['CONTACT', 'NON_CONTACT', 'OVERUSE', 'UNKNOWN']),
  bodyPart: z.string().min(1),
  side: z.string().optional(),
  description: z.string().optional(),
  urgency: z.enum(['EMERGENCY', 'URGENT', 'MODERATE', 'LOW']).default('MODERATE'),
  initialSeverity: z.number().int().min(1).max(10).default(5),
  activityType: z.string().optional(),
  surfaceType: z.string().optional(),
  equipmentInvolved: z.string().optional(),
  immediateCareGiven: z.string().optional(),
  iceApplied: z.boolean().default(false),
  removedFromPlay: z.boolean().default(false),
  ambulanceCalled: z.boolean().default(false),
  referralNeeded: z.boolean().default(false),
  referralType: z.string().optional(),
  referralUrgency: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/injury/acute-report
 * List acute injury reports
 * For physios: shows all reports for assigned athletes
 * For coaches: shows reports for their athletes
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause based on role
    const where: Record<string, unknown> = {}

    if (user.role === 'PHYSIO') {
      // For physios, they can see reports they've been notified about or can access
      // For now, show reports they reported or where they have access to the client
      where.OR = [
        { reporterId: user.id },
        { physioNotified: true },
      ]
    } else if (user.role === 'COACH') {
      // Coaches see reports for their clients
      const coachClients = await prisma.client.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
      where.clientId = { in: coachClients.map(c => c.id) }
    } else if (user.role === 'ATHLETE') {
      // Athletes see their own reports
      const resolved = await resolveAthleteClientId()
      if (!resolved) {
        return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
      }
      where.clientId = resolved.clientId
    } else if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (clientId) {
      // Verify access to this client
      if (user.role === 'PHYSIO') {
        const hasAccess = await canAccessAthleteAsPhysio(user.id, clientId)
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'You do not have access to this athlete' },
            { status: 403 }
          )
        }
      } else if (user.role === 'COACH') {
        const hasAccess = await canAccessClient(user.id, clientId)
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'You do not have access to this athlete' },
            { status: 403 }
          )
        }
      }
      where.clientId = clientId
    }

    if (status) {
      where.status = status
    }

    if (urgency) {
      where.urgency = urgency
    }

    const [reports, total] = await Promise.all([
      prisma.acuteInjuryReport.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reporter: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          injury: {
            select: {
              id: true,
              injuryType: true,
              phase: true,
            },
          },
        },
        orderBy: [
          { urgency: 'asc' }, // EMERGENCY first
          { reportDate: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.acuteInjuryReport.count({ where }),
    ])

    return NextResponse.json({
      reports,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching acute injury reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch acute injury reports' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/injury/acute-report
 * Create a new acute injury report
 * Can be created by coaches, physios, or athletes
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAcuteInjuryReportSchema.parse(body)

    // Verify access to the client
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = await canAccessAthleteAsPhysio(user.id, validatedData.clientId)
    } else if (user.role === 'COACH') {
      hasAccess = await canAccessClient(user.id, validatedData.clientId)
    } else if (user.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      hasAccess = resolved?.clientId === validatedData.clientId
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to report an injury for this athlete' },
        { status: 403 }
      )
    }

    const report = await prisma.acuteInjuryReport.create({
      data: {
        reporterId: user.id,
        clientId: validatedData.clientId,
        incidentDate: new Date(validatedData.incidentDate),
        incidentTime: validatedData.incidentTime,
        mechanism: validatedData.mechanism,
        bodyPart: validatedData.bodyPart,
        side: validatedData.side,
        description: validatedData.description,
        urgency: validatedData.urgency,
        initialSeverity: validatedData.initialSeverity,
        activityType: validatedData.activityType,
        surfaceType: validatedData.surfaceType,
        equipmentInvolved: validatedData.equipmentInvolved,
        immediateCareGiven: validatedData.immediateCareGiven,
        iceApplied: validatedData.iceApplied,
        removedFromPlay: validatedData.removedFromPlay,
        ambulanceCalled: validatedData.ambulanceCalled,
        referralNeeded: validatedData.referralNeeded,
        referralType: validatedData.referralType,
        referralUrgency: validatedData.referralUrgency,
        notes: validatedData.notes,
        status: 'PENDING_REVIEW',
        // Notify coach if reporter is not the coach
        coachNotified: user.role !== 'COACH',
        coachNotifiedAt: user.role !== 'COACH' ? new Date() : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // TODO: Send notifications to assigned physios and coaches
    // This would be done through a notification service

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error creating acute injury report:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create acute injury report' },
      { status: 500 }
    )
  }
}
