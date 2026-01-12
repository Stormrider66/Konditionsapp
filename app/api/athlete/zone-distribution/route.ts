/**
 * API Route: Zone Distribution
 *
 * GET - Retrieve aggregated HR zone distribution for a client
 *
 * Query params:
 * - clientId: Client ID
 * - period: 'week' | 'month' | 'year' | 'custom'
 * - startDate: ISO date (for custom period)
 * - endDate: ISO date (for custom period)
 * - count: number of periods to return (default 1)
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getAggregatedZoneDistribution } from '@/lib/integrations/zone-distribution-service'

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
    const period = searchParams.get('period') || 'week'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const count = parseInt(searchParams.get('count') || '1', 10)

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

    // Calculate date ranges
    const results: Array<{
      periodStart: Date
      periodEnd: Date
      zone1Minutes: number
      zone2Minutes: number
      zone3Minutes: number
      zone4Minutes: number
      zone5Minutes: number
      totalMinutes: number
      activityCount: number
      polarizationRatio: number | null
    }> = []

    const now = new Date()

    for (let i = 0; i < count; i++) {
      let startDate: Date
      let endDate: Date

      switch (period) {
        case 'week':
          // Get Monday of i weeks ago
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - startDate.getDay() + 1 - i * 7)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 6)
          endDate.setHours(23, 59, 59, 999)
          break

        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
          break

        case 'year':
          const targetYear = now.getFullYear() - i
          startDate = new Date(targetYear, 0, 1)
          endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
          break

        case 'custom':
          if (!startDateParam || !endDateParam) {
            return NextResponse.json(
              { error: 'startDate and endDate required for custom period' },
              { status: 400 }
            )
          }
          startDate = new Date(startDateParam)
          endDate = new Date(endDateParam)
          break

        default:
          return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
      }

      const distribution = await getAggregatedZoneDistribution(clientId, startDate, endDate)

      // Calculate polarization ratio (Z1+Z2 / total)
      const easyMinutes = distribution.zone1Minutes + distribution.zone2Minutes
      const polarizationRatio = distribution.totalMinutes > 0
        ? Math.round((easyMinutes / distribution.totalMinutes) * 1000) / 10
        : null

      results.push({
        periodStart: startDate,
        periodEnd: endDate,
        ...distribution,
        polarizationRatio,
      })
    }

    return NextResponse.json({
      clientId,
      period,
      distributions: results,
    })
  } catch (error) {
    console.error('Zone distribution API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
