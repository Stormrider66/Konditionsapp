/**
 * Training Summary API
 *
 * Retrieves weekly or monthly training summaries for an athlete.
 * Summaries are pre-calculated and stored for efficient trend analysis.
 *
 * GET /api/athlete/training-summary?period=week|month&count=12
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  getRecentWeeklySummaries,
  getRecentMonthlySummaries,
} from '@/lib/training/summary-calculator'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const period = searchParams.get('period') || 'week'
    const count = parseInt(searchParams.get('count') || '12', 10)

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    if (count < 1 || count > 52) {
      return NextResponse.json({ error: 'count must be between 1 and 52' }, { status: 400 })
    }

    // Verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === user.id
    const isAthlete = client.athleteAccount?.userId === user.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (period === 'month') {
      const summaries = await getRecentMonthlySummaries(clientId, count)
      return NextResponse.json({
        period: 'month',
        count: summaries.length,
        summaries,
      })
    } else {
      const summaries = await getRecentWeeklySummaries(clientId, count)
      return NextResponse.json({
        period: 'week',
        count: summaries.length,
        summaries,
      })
    }
  } catch (error) {
    logger.error('Error fetching training summaries', {}, error)
    return NextResponse.json({ error: 'Failed to fetch training summaries' }, { status: 500 })
  }
}
