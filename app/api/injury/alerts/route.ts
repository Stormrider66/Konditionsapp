/**
 * Injury Alerts API
 *
 * GET /api/injury/alerts - Retrieve all injury alerts for coach
 *
 * Returns active injury assessments across all athletes with:
 * - Injury details and pain levels
 * - Workout modification counts
 * - Return-to-running protocol status
 * - Urgency classification
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/injury/alerts
 *
 * Fetch all injury alerts for authenticated coach
 */
export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    // Only coaches can access injury alerts
    if (dbUser.role !== 'COACH') {
      return NextResponse.json(
        { error: t(locale, 'Access denied. Coach role required.', 'Åtkomst nekad. Coachroll krävs.') },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ACTIVE' // ACTIVE, MONITORING, RESOLVED, ALL
    const clientId = searchParams.get('clientId') // Optional: filter by specific athlete

    // Build where clause
    const whereClause: Prisma.InjuryAssessmentWhereInput = {
      client: {
        userId: dbUser.id, // Only show alerts for this coach's athletes
      },
    }

    if (status !== 'ALL') {
      whereClause.status = status
    }

    if (clientId) {
      const hasAccess = await canAccessClient(dbUser.id, clientId)
      if (!hasAccess) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
      }
      whereClause.clientId = clientId
    }

    // Fetch injury assessments
    const injuryAssessments = await prisma.injuryAssessment.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { detectedAt: 'desc' }, // Most recent first
      ],
    })

    // For each injury, count modified workouts
    const alerts = await Promise.all(
      injuryAssessments.map(async injury => {
        // Count workouts modified in the past 14 days
        const modifiedWorkouts = await prisma.workout.count({
          where: {
            day: {
              week: {
                program: {
                  clientId: injury.clientId,
                },
              },
            },
            status: {
              in: ['CANCELLED', 'MODIFIED'],
            },
            updatedAt: {
              gte: injury.detectedAt,
            },
          },
        })

        // Get most recent daily check-in for this athlete
        const lastCheckIn = await prisma.dailyMetrics.findFirst({
          where: {
            clientId: injury.clientId,
          },
          orderBy: {
            date: 'desc',
          },
          select: {
            date: true,
            injuryPain: true,
          },
        })

        // Determine urgency based on pain level and status
        let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
        if (injury.painLevel >= 8) {
          urgency = 'CRITICAL'
        } else if (injury.painLevel >= 5) {
          urgency = 'HIGH'
        } else if (injury.painLevel >= 3) {
          urgency = 'MEDIUM'
        } else {
          urgency = 'LOW'
        }

        // Calculate estimated return weeks (simplified)
        const baselineWeeks: Record<string, number> = {
          PLANTAR_FASCIITIS: 4,
          ACHILLES_TENDINOPATHY: 6,
          IT_BAND_SYNDROME: 3,
          PATELLOFEMORAL_SYNDROME: 4,
          SHIN_SPLINTS: 4,
          STRESS_FRACTURE: 12,
          HAMSTRING_STRAIN: 3,
          CALF_STRAIN: 3,
          HIP_FLEXOR: 3,
        }

        let estimatedReturnWeeks = injury.injuryType ? (baselineWeeks[injury.injuryType] ?? 4) : 4

        // Adjust based on pain severity
        if (injury.painLevel > 7) estimatedReturnWeeks += 2
        else if (injury.painLevel > 5) estimatedReturnWeeks += 1

        return {
          id: injury.id,
          clientId: injury.clientId,
          clientName: injury.client.name,
          injuryType: injury.injuryType,
          painLevel: injury.painLevel,
          detectedAt: injury.detectedAt,
          status: injury.status,
          urgency,
          estimatedReturnWeeks,
          workoutsModified: modifiedWorkouts,
          lastCheckIn: lastCheckIn?.date,
          phase: injury.phase || undefined,
        }
      })
    )

    // Summary statistics
    const summary = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'ACTIVE').length,
      critical: alerts.filter(a => a.urgency === 'CRITICAL').length,
      high: alerts.filter(a => a.urgency === 'HIGH').length,
      totalWorkoutsModified: alerts.reduce((sum, a) => sum + a.workoutsModified, 0),
    }

    return NextResponse.json({
      success: true,
      alerts,
      summary,
    })
  } catch (error) {
    logger.error('Error fetching injury alerts', {}, error)
    return NextResponse.json(
      {
        error: t(locale, 'Failed to fetch injury alerts', 'Kunde inte hämta skadevarningar'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : t(locale, 'Unknown error', 'Okänt fel')),
      },
      { status: 500 }
    )
  }
}
