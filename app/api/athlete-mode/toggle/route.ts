// app/api/athlete-mode/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { canUseAthleteMode, ATHLETE_MODE_COOKIE } from '@/lib/athlete-mode'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'

/**
 * POST /api/athlete-mode/toggle
 * Toggle athlete mode on/off
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only COACH and ADMIN can toggle athlete mode
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only coaches and admins can use athlete mode' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { enabled, businessSlug } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    // If enabling, verify user has athlete profile
    if (enabled) {
      const hasProfile = await canUseAthleteMode(user.id)
      if (!hasProfile) {
        // Redirect to appropriate settings page based on business context
        const settingsPath = businessSlug
          ? `/${businessSlug}/coach/settings/athlete-profile`
          : '/coach/settings/athlete-profile'
        return NextResponse.json(
          {
            success: false,
            error: 'No athlete profile found. Please set up your athlete profile first.',
            redirectTo: settingsPath,
          },
          { status: 400 }
        )
      }
    }

    // Set or clear the cookie
    const cookieStore = await cookies()

    if (enabled) {
      cookieStore.set(ATHLETE_MODE_COOKIE, 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
      })
    } else {
      cookieStore.delete(ATHLETE_MODE_COOKIE)
    }

    logger.info('Athlete mode toggled', { userId: user.id, enabled, businessSlug })

    // Construct redirect path based on business context
    let redirectTo: string
    if (enabled) {
      redirectTo = businessSlug ? `/${businessSlug}/athlete/dashboard` : '/athlete/dashboard'
    } else {
      redirectTo = businessSlug ? `/${businessSlug}/coach/dashboard` : '/coach/dashboard'
    }

    return NextResponse.json({
      success: true,
      data: {
        athleteModeEnabled: enabled,
        redirectTo,
      },
    })
  } catch (error) {
    logger.error('Error toggling athlete mode', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle athlete mode' },
      { status: 500 }
    )
  }
}
