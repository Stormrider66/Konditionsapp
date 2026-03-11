/**
 * Latest Nutrition Wrapped API
 *
 * GET /api/nutrition/wrapped/latest
 *
 * Returns the most recent wrapped summary for the current athlete.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const latest = await prisma.nutritionWrapped.findFirst({
      where: { clientId: resolved.clientId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json({
      success: true,
      wrapped: latest,
    })
  } catch (error) {
    logger.error('Error fetching latest wrapped', {}, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
