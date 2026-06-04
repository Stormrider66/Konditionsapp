/**
 * Calendar Constraints API
 *
 * GET /api/calendar/constraints - Get calendar constraints for program generation
 *
 * Returns blocked dates, reduced dates, altitude periods, and illness recovery periods
 * for a given date range. Used by AI program generation to create calendar-aware programs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import {
  getCalendarConstraints,
  calculateAvailability,
} from '@/lib/calendar/availability-calculator'
import { buildCalendarContext, shouldUseCalendarConstraints } from '@/lib/ai/calendar-context-builder'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logError } from '@/lib/logger-console'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { searchParams } = new URL(request.url)

    const clientId = searchParams.get('clientId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const includeContext = searchParams.get('includeContext') === 'true'

    if (!clientId || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: t(locale, 'Missing required parameters: clientId, startDate, endDate', 'Obligatoriska parametrar saknas: clientId, startDate, endDate') },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') },
        { status: 404 }
      )
    }

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)

    // Get constraints
    const constraints = await getCalendarConstraints(clientId, startDate, endDate, locale)
    const availability = await calculateAvailability(clientId, startDate, endDate, locale)
    const recommendation = await shouldUseCalendarConstraints(clientId, startDate, endDate, locale)

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
      const calendarContext = await buildCalendarContext(clientId, startDate, endDate, locale)
      response.context = calendarContext.contextText
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Calendar constraints error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to get calendar constraints', 'Kunde inte hämta kalenderbegränsningar') },
      { status: 500 }
    )
  }
}
