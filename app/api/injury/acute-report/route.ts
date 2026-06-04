// app/api/injury/acute-report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient, canAccessAthleteAsPhysio, resolveAthleteClientId, getPhysioAthletes } from '@/lib/auth-utils'
import { sendCareTeamNotification } from '@/lib/notifications/care-team'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { canAccessCoachPlatform, canAccessPhysioPlatform } from '@/lib/user-capabilities'
import {
  canClientReportInjuryToTeamPhysio,
  getAssignedPhysioUserIdsForClient,
  getMedicalNotificationRecipientIdsForClient,
} from '@/lib/medical/care-team-recipients'
import { sendAcuteInjuryExternalAlerts } from '@/lib/notifications/medical-external-alerts'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
  let locale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    locale = resolveRequestLocale(request, user?.language)
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const [hasCoachAccess, hasPhysioAccess] = await Promise.all([
      canAccessCoachPlatform(user.id),
      canAccessPhysioPlatform(user.id),
    ])

    // Build where clause based on role
    const where: Record<string, unknown> = {}

    if (hasPhysioAccess) {
      const assignedAthleteIds = await getPhysioAthletes(user.id)
      where.OR = [
        { reporterId: user.id },
        { physioNotified: true },
        ...(assignedAthleteIds.length > 0 ? [{ clientId: { in: assignedAthleteIds } }] : []),
      ]
    } else if (hasCoachAccess) {
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
        return NextResponse.json({ error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') }, { status: 404 })
      }
      where.clientId = resolved.clientId
    } else if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 })
    }

    if (clientId) {
      // Verify access to this client
      const hasAccess = user.role === 'ADMIN' ||
        (hasPhysioAccess && await canAccessAthleteAsPhysio(user.id, clientId)) ||
        (hasCoachAccess && await canAccessClient(user.id, clientId))
      if (!hasAccess) {
        return NextResponse.json(
          { error: t(locale, 'You do not have access to this athlete', 'Du har inte åtkomst till den här atleten') },
          { status: 403 }
        )
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
    logger.error('Error fetching acute injury reports', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch acute injury reports', 'Kunde inte hämta akuta skaderapporter') },
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
  let locale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    locale = resolveRequestLocale(request, user?.language)
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAcuteInjuryReportSchema.parse(body)
    const [hasCoachAccess, hasPhysioAccess] = await Promise.all([
      canAccessCoachPlatform(user.id),
      canAccessPhysioPlatform(user.id),
    ])

    // Verify access to the client
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (hasPhysioAccess) {
      hasAccess = await canAccessAthleteAsPhysio(user.id, validatedData.clientId)
    } else if (hasCoachAccess) {
      hasAccess = await canAccessClient(user.id, validatedData.clientId)
    } else if (user.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      hasAccess = resolved?.clientId === validatedData.clientId
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'You do not have access to report an injury for this athlete',
            'Du har inte åtkomst att rapportera en skada för den här atleten'
          ),
        },
        { status: 403 }
      )
    }

    if (user.role === 'ATHLETE') {
      const canReportToTeamPhysio = await canClientReportInjuryToTeamPhysio(validatedData.clientId)
      if (!canReportToTeamPhysio) {
        return NextResponse.json(
          {
            error: t(
              locale,
              'Injury reports are only available when your team has an assigned physio.',
              'Skaderapporter är bara tillgängliga när ditt lag har en tilldelad fysioterapeut.'
            ),
          },
          { status: 403 }
        )
      }
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
        // Skip coach notification when the reporter already has coach access.
        coachNotified: !hasCoachAccess,
        coachNotifiedAt: !hasCoachAccess ? new Date() : undefined,
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

    // Notify coach and assigned physios about the acute injury
    try {
      // Get the client's coach
      const client = await prisma.client.findUnique({
        where: { id: validatedData.clientId },
        select: {
          userId: true,
        },
      })
      const assignedPhysioIds = await getAssignedPhysioUserIdsForClient(validatedData.clientId)

      const priority = validatedData.urgency === 'EMERGENCY' || validatedData.urgency === 'URGENT'
        ? 'URGENT' as const
        : validatedData.urgency === 'MODERATE'
        ? 'HIGH' as const
        : 'NORMAL' as const

      const notifyRecipients = await getMedicalNotificationRecipientIdsForClient(
        validatedData.clientId,
        [user.id]
      )

      for (const recipientId of notifyRecipients) {
        await sendCareTeamNotification({
          type: 'RESTRICTION_CREATED',
          senderId: user.id,
          recipientId,
          clientId: validatedData.clientId,
          priority,
          contextData: {
            acuteReportId: report.id,
            bodyPart: validatedData.bodyPart,
            mechanism: validatedData.mechanism,
            urgency: validatedData.urgency,
            severity: validatedData.initialSeverity,
          },
        })
      }

      if (assignedPhysioIds.length > 0 || client?.userId) {
        await prisma.acuteInjuryReport.update({
          where: { id: report.id },
          data: {
            physioNotified: assignedPhysioIds.length > 0,
            physioNotifiedAt: assignedPhysioIds.length > 0 ? new Date() : undefined,
            coachNotified: Boolean(client?.userId),
            coachNotifiedAt: client?.userId ? new Date() : undefined,
          },
        })
      }

      await sendAcuteInjuryExternalAlerts({
        reportId: report.id,
        clientId: validatedData.clientId,
        reporterId: user.id,
        urgency: validatedData.urgency,
      })
    } catch (notifyError) {
      logger.error('Failed to send acute injury notifications', { reportId: report.id }, notifyError)
      // Don't block report creation if notification fails
    }

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    logger.error('Error creating acute injury report', {}, error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to create acute injury report', 'Kunde inte skapa akut skaderapport') },
      { status: 500 }
    )
  }
}
