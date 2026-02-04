/**
 * Coach Earnings API
 *
 * GET /api/coach/earnings - Get earnings summary and history
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getCoachEarningsSummary, getCoachEarningsHistory } from '@/lib/coach/revenue-share'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') as 'PENDING' | 'PAID_OUT' | undefined

    // Get earnings summary and history in parallel
    const [summary, history] = await Promise.all([
      getCoachEarningsSummary(user.id),
      getCoachEarningsHistory(user.id, { page, limit, status }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        summary,
        earnings: history.earnings,
        pagination: history.pagination,
      },
    })
  } catch (error) {
    logger.error('Failed to fetch coach earnings', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
