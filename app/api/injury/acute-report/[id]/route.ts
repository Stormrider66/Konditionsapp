// app/api/injury/acute-report/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient, canAccessAthleteAsPhysio, resolveAthleteClientId } from '@/lib/auth-utils'
import { z } from 'zod'
import { canAccessCoachPlatform, canAccessPhysioPlatform } from '@/lib/user-capabilities'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const updateAcuteReportSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'REVIEWED', 'IN_TREATMENT', 'RESOLVED', 'REFERRED']).optional(),
  urgency: z.enum(['EMERGENCY', 'URGENT', 'MODERATE', 'LOW']).optional(),
  description: z.string().optional(),
  immediateCareGiven: z.string().optional(),
  iceApplied: z.boolean().optional(),
  removedFromPlay: z.boolean().optional(),
  ambulanceCalled: z.boolean().optional(),
  referralNeeded: z.boolean().optional(),
  referralType: z.string().optional(),
  referralUrgency: z.string().optional(),
  notes: z.string().optional(),
  physioNotes: z.string().optional(),
  coachNotified: z.boolean().optional(),
  physioNotified: z.boolean().optional(),
})

/**
 * GET /api/injury/acute-report/[id]
 * Get a specific acute injury report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    locale = resolveRequestLocale(request, user?.language)
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { id } = await params

    const report = await prisma.acuteInjuryReport.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            birthDate: true,
            gender: true,
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
            bodyPart: true,
            phase: true,
            painLevel: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json({ error: t(locale, 'Report not found', 'Rapporten hittades inte') }, { status: 404 })
    }

    // Check access
    const [hasCoachAccess, hasPhysioAccess] = await Promise.all([
      canAccessCoachPlatform(user.id),
      canAccessPhysioPlatform(user.id),
    ])
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (hasPhysioAccess) {
      hasAccess = await canAccessAthleteAsPhysio(user.id, report.clientId)
    } else if (hasCoachAccess) {
      hasAccess = await canAccessClient(user.id, report.clientId)
    } else if (user.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      hasAccess = resolved?.clientId === report.clientId
    }

    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error fetching acute injury report:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch acute injury report', 'Kunde inte hämta akut skaderapport') },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/injury/acute-report/[id]
 * Update an acute injury report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    locale = resolveRequestLocale(request, user?.language)
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateAcuteReportSchema.parse(body)

    // Check if report exists
    const existingReport = await prisma.acuteInjuryReport.findUnique({
      where: { id },
    })

    if (!existingReport) {
      return NextResponse.json({ error: t(locale, 'Report not found', 'Rapporten hittades inte') }, { status: 404 })
    }

    // Check access
    const [hasCoachAccess, hasPhysioAccess] = await Promise.all([
      canAccessCoachPlatform(user.id),
      canAccessPhysioPlatform(user.id),
    ])
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (hasPhysioAccess) {
      hasAccess = await canAccessAthleteAsPhysio(user.id, existingReport.clientId)
    } else if (hasCoachAccess) {
      hasAccess = await canAccessClient(user.id, existingReport.clientId)
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'You do not have permission to update this report', 'Du har inte behörighet att uppdatera den här rapporten') },
        { status: 403 }
      )
    }

    // Build update data with notification timestamps
    const updateData: Record<string, unknown> = { ...validatedData }

    if (validatedData.coachNotified && !existingReport.coachNotified) {
      updateData.coachNotifiedAt = new Date()
    }

    if (validatedData.physioNotified && !existingReport.physioNotified) {
      updateData.physioNotifiedAt = new Date()
    }

    const report = await prisma.acuteInjuryReport.update({
      where: { id },
      data: updateData,
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
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
          },
        },
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error updating acute injury report:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to update acute injury report', 'Kunde inte uppdatera akut skaderapport') },
      { status: 500 }
    )
  }
}
