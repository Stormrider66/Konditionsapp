/**
 * ACWR Warnings API
 *
 * GET /api/training-load/warnings
 *
 * Returns ACWR (Acute:Chronic Workload Ratio) warnings for athletes at risk of injury.
 *
 * Risk Zones:
 * - CRITICAL: ACWR ≥2.0 (very high injury risk)
 * - DANGER: ACWR 1.5-2.0 (high injury risk)
 * - CAUTION: ACWR 1.3-1.5 (moderate injury risk)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only coaches can access ACWR warnings
    if (dbUser.role !== 'COACH') {
      return NextResponse.json(
        { error: 'Access denied. Coach role required.' },
        { status: 403 }
      )
    }

    // Get all athletes for this coach
    const athletes = await prisma.client.findMany({
      where: {
        userId: dbUser.id,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const athleteIds = athletes.map(a => a.id)

    // Get most recent training load for each athlete
    const recentLoads = await prisma.trainingLoad.findMany({
      where: {
        clientId: {
          in: athleteIds,
        },
      },
      orderBy: {
        date: 'desc',
      },
      distinct: ['clientId'],
    })

    // Filter for warnings (ACWR ≥1.3)
    const warnings = recentLoads
      .filter(load => load.acwr !== null && load.acwr >= 1.3)
      .map(load => {
        const athlete = athletes.find(a => a.id === load.clientId)!
        const acwr = load.acwr!

        // Determine risk level
        let risk: 'CRITICAL' | 'DANGER' | 'CAUTION'
        let recommendedAction: string

        if (acwr >= 2.0) {
          risk = 'CRITICAL'
          recommendedAction =
            'Omedelbar vila rekommenderas. Träningen måste minskas kraftigt (50-70%) eller pausas helt tills ACWR < 1.5.'
        } else if (acwr >= 1.5) {
          risk = 'DANGER'
          recommendedAction =
            'Minska träningsvolym/intensitet med 40-50%. Lägg till extra återhämtningsdag. Undvik höga intensiteter.'
        } else {
          risk = 'CAUTION'
          recommendedAction =
            'Minska träningsvolym/intensitet med 20-30%. Övervaka noga. Öka fokus på återhämtning och sömn.'
        }

        return {
          id: load.id,
          clientId: load.clientId,
          clientName: athlete.name,
          acwr: acwr,
          acwrZone: load.acwrZone,
          risk,
          date: load.date,
          recommendedAction,
          acuteLoad: load.acuteLoad,
          chronicLoad: load.chronicLoad,
        }
      })
      .sort((a, b) => {
        // Sort by risk level first (CRITICAL → DANGER → CAUTION)
        const riskOrder = { CRITICAL: 0, DANGER: 1, CAUTION: 2 }
        if (riskOrder[a.risk] !== riskOrder[b.risk]) {
          return riskOrder[a.risk] - riskOrder[b.risk]
        }
        // Then by ACWR descending (highest first)
        return b.acwr - a.acwr
      })

    // Summary statistics
    const summary = {
      total: warnings.length,
      critical: warnings.filter(w => w.risk === 'CRITICAL').length,
      danger: warnings.filter(w => w.risk === 'DANGER').length,
      caution: warnings.filter(w => w.risk === 'CAUTION').length,
      averageACWR:
        warnings.length > 0
          ? warnings.reduce((sum, w) => sum + w.acwr, 0) / warnings.length
          : 0,
    }

    return NextResponse.json({
      success: true,
      warnings,
      summary,
    })
  } catch (error) {
    logger.error('Error fetching ACWR warnings', {}, error)
    return NextResponse.json(
      {
        error: 'Failed to fetch ACWR warnings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
