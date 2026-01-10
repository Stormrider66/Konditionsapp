/**
 * Athlete AI Notification Preferences API
 *
 * GET /api/athlete/notification-preferences - Get preferences
 * PUT /api/athlete/notification-preferences - Update preferences
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    // Get or create default preferences
    let preferences = await prisma.aINotificationPreferences.findUnique({
      where: { clientId: athleteAccount.clientId },
    })

    if (!preferences) {
      // Return defaults without creating
      preferences = {
        id: '',
        clientId: athleteAccount.clientId,
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
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

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
      where: { clientId: athleteAccount.clientId },
      update: updateData,
      create: {
        clientId: athleteAccount.clientId,
        ...updateData,
      },
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
