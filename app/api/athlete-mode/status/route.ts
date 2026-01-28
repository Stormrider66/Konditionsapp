// app/api/athlete-mode/status/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { canUseAthleteMode, getCoachSelfAthleteClient, isAthleteModeActive } from '@/lib/athlete-mode'
import { logger } from '@/lib/logger'

/**
 * GET /api/athlete-mode/status
 * Check if user has an athlete profile and current athlete mode status
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only COACH and ADMIN can use athlete mode
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({
        success: true,
        data: {
          canUseAthleteMode: false,
          hasAthleteProfile: false,
          isAthleteModeActive: false,
          athleteProfile: null,
        },
      })
    }

    const [hasProfile, athleteProfile, isActive] = await Promise.all([
      canUseAthleteMode(user.id),
      getCoachSelfAthleteClient(user.id),
      isAthleteModeActive(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        canUseAthleteMode: hasProfile,
        hasAthleteProfile: hasProfile,
        isAthleteModeActive: isActive && hasProfile,
        athleteProfile,
      },
    })
  } catch (error) {
    logger.error('Error checking athlete mode status', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to check athlete mode status' },
      { status: 500 }
    )
  }
}
