/**
 * Specific Week Training Summary API
 *
 * GET - Retrieve a specific week's summary
 * POST - Force recalculation of a specific week's summary
 *
 * URL: /api/athlete/training-summary/[weekStart]
 * weekStart format: YYYY-MM-DD (Monday of the week)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import {
  saveWeeklySummary,
  saveMonthlySummary,
} from '@/lib/training/summary-calculator'

interface RouteParams {
  params: Promise<{ weekStart: string }>
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weekStart: weekStartParam } = await context.params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    // Parse and validate date
    const weekStart = new Date(weekStartParam)
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch the specific week's summary
    const summary = await prisma.weeklyTrainingSummary.findUnique({
      where: {
        clientId_weekStart: { clientId, weekStart },
      },
    })

    if (!summary) {
      return NextResponse.json(
        { error: 'Summary not found for this week', weekStart: weekStartParam },
        { status: 404 }
      )
    }

    return NextResponse.json(summary)
  } catch (error) {
    logger.error('Error fetching weekly summary', {}, error)
    return NextResponse.json({ error: 'Failed to fetch weekly summary' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weekStart: weekStartParam } = await context.params
    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required in body' }, { status: 400 })
    }

    // Parse and validate date
    const weekStart = new Date(weekStartParam)
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Force recalculation of the week
    const summaryId = await saveWeeklySummary(clientId, weekStart)

    // Also update the month's summary
    const month = weekStart.getMonth() + 1
    const year = weekStart.getFullYear()
    await saveMonthlySummary(clientId, month, year)

    // Fetch and return the updated summary
    const summary = await prisma.weeklyTrainingSummary.findUnique({
      where: { id: summaryId },
    })

    return NextResponse.json({
      success: true,
      message: 'Summary recalculated successfully',
      summary,
    })
  } catch (error) {
    logger.error('Error recalculating weekly summary', {}, error)
    return NextResponse.json({ error: 'Failed to recalculate summary' }, { status: 500 })
  }
}
