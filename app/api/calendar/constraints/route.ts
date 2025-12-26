/**
 * Calendar Constraints API
 *
 * GET /api/calendar/constraints - Get calendar constraints for program generation
 *
 * Returns blocked dates, reduced dates, altitude periods, and illness recovery periods
 * for a given date range. Used by AI program generation to create calendar-aware programs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  getCalendarConstraints,
  calculateAvailability,
} from '@/lib/calendar/availability-calculator'
import { buildCalendarContext, shouldUseCalendarConstraints } from '@/lib/ai/calendar-context-builder'

/**
 * GET /api/calendar/constraints
 *
 * Query params:
 * - clientId: Required - The athlete's client ID
 * - startDate: Required - Start date for the constraint check (ISO format)
 * - endDate: Required - End date for the constraint check (ISO format)
 * - includeContext: Optional - Include human-readable context for AI prompts
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const { searchParams } = new URL(request.url)

    const clientId = searchParams.get('clientId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const includeContext = searchParams.get('includeContext') === 'true'

    if (!clientId || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: clientId, startDate, endDate' },
        { status: 400 }
      )
    }

    // Verify access to this client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      )
    }

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)

    // Get constraints
    const constraints = await getCalendarConstraints(clientId, startDate, endDate)
    const availability = await calculateAvailability(clientId, startDate, endDate)
    const recommendation = await shouldUseCalendarConstraints(clientId, startDate, endDate)

    // Build response
    const response: {
      constraints: typeof constraints
      availability: {
        totalDays: number
        availableCount: number
        blockedCount: number
        reducedCount: number
        availablePercent: number
      }
      recommendation: typeof recommendation
      context?: string
    } = {
      constraints,
      availability: {
        totalDays: availability.totalDays,
        availableCount: availability.availableCount,
        blockedCount: availability.blockedCount,
        reducedCount: availability.reducedCount,
        availablePercent: Math.round(
          (availability.availableCount / availability.totalDays) * 100
        ),
      },
      recommendation,
    }

    // Include AI context if requested
    if (includeContext) {
      const calendarContext = await buildCalendarContext(clientId, startDate, endDate)
      response.context = calendarContext.contextText
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Calendar constraints error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get calendar constraints' },
      { status: 500 }
    )
  }
}
