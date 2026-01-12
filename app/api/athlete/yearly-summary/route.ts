/**
 * API Route: Yearly Training Summary
 *
 * GET - Retrieve yearly training summaries for a client
 *
 * Query params:
 * - clientId: Client ID
 * - year: Specific year (optional, defaults to current year)
 * - count: Number of years to return (default 3)
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { saveYearlySummary, getRecentYearlySummaries } from '@/lib/training/summary-calculator'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const yearParam = searchParams.get('year')
    const count = parseInt(searchParams.get('count') || '3', 10)

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Verify access to client
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

    // If specific year requested
    if (yearParam) {
      const year = parseInt(yearParam, 10)

      // Check if summary exists
      let summary = await prisma.yearlySummary.findUnique({
        where: {
          clientId_year: { clientId, year },
        },
      })

      // Calculate if not found or outdated (more than 1 day old)
      if (!summary || new Date().getTime() - summary.updatedAt.getTime() > 24 * 60 * 60 * 1000) {
        await saveYearlySummary(clientId, year)
        summary = await prisma.yearlySummary.findUnique({
          where: {
            clientId_year: { clientId, year },
          },
        })
      }

      return NextResponse.json({
        clientId,
        year,
        summary,
      })
    }

    // Return multiple years
    const summaries = await getRecentYearlySummaries(clientId, count)

    // If current year not in summaries, calculate it
    const currentYear = new Date().getFullYear()
    const hasCurrentYear = summaries.some(s => s.year === currentYear)

    if (!hasCurrentYear) {
      try {
        await saveYearlySummary(clientId, currentYear)
        const updatedSummaries = await getRecentYearlySummaries(clientId, count)
        return NextResponse.json({
          clientId,
          summaries: updatedSummaries,
        })
      } catch (error) {
        // Continue with existing summaries if calculation fails
        console.warn('Failed to calculate current year summary:', error)
      }
    }

    return NextResponse.json({
      clientId,
      summaries,
    })
  } catch (error) {
    console.error('Yearly summary API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Force recalculate yearly summary
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, year } = body

    if (!clientId || !year) {
      return NextResponse.json(
        { error: 'clientId and year are required' },
        { status: 400 }
      )
    }

    // Verify access to client
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

    // Recalculate
    const summaryId = await saveYearlySummary(clientId, year)
    const summary = await prisma.yearlySummary.findUnique({
      where: { id: summaryId },
    })

    return NextResponse.json({
      message: 'Yearly summary recalculated',
      summary,
    })
  } catch (error) {
    console.error('Yearly summary recalculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
