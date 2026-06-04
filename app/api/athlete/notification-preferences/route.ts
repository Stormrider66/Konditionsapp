/**
 * Athlete AI Notification Preferences API
 *
 * GET /api/athlete/notification-preferences - Get preferences
 * PUT /api/athlete/notification-preferences - Update preferences
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, resolved.user.language)
    const { clientId } = resolved

    // Get or create default preferences
    let preferences = await prisma.aINotificationPreferences.findUnique({
      where: { clientId },
    })

    if (!preferences) {
      // Return defaults without creating
      preferences = {
        id: '',
        clientId,
        morningBriefingEnabled: true,
        preWorkoutNudgeEnabled: true,
        postWorkoutCheckEnabled: true,
        patternAlertsEnabled: true,
        milestoneAlertsEnabled: true,
        weatherAlertsEnabled: false,
        morningBriefingTime: '07:00',
        preWorkoutLeadTime: 120,
        timezone: 'Europe/Stockholm',
        verbosityLevel: 'NORMAL',
        motivationStyle: 'BALANCED',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json({ error: t(locale, 'Failed to fetch preferences', 'Kunde inte hämta inställningar') }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, resolved.user.language)
    const { clientId } = resolved

    const body = await request.json()

    // Validate and extract allowed fields
    const allowedFields = [
      'morningBriefingEnabled',
      'preWorkoutNudgeEnabled',
      'postWorkoutCheckEnabled',
      'patternAlertsEnabled',
      'milestoneAlertsEnabled',
      'weatherAlertsEnabled',
      'morningBriefingTime',
      'preWorkoutLeadTime',
      'timezone',
      'verbosityLevel',
      'motivationStyle',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Upsert preferences
    const preferences = await prisma.aINotificationPreferences.upsert({
      where: { clientId },
      update: updateData,
      create: {
        clientId,
        ...updateData,
      },
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json({ error: t(locale, 'Failed to update preferences', 'Kunde inte uppdatera inställningar') }, { status: 500 })
  }
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
