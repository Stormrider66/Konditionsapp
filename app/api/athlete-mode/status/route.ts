// app/api/athlete-mode/status/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { canUseAthleteMode, getCoachSelfAthleteClient, isAthleteModeActive } from '@/lib/athlete-mode'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform, canAccessPhysioPlatform, getPreferredProfessionalPortal } from '@/lib/user-capabilities'

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

    const [coachAccess, physioAccess] = await Promise.all([
      canAccessCoachPlatform(user.id),
      canAccessPhysioPlatform(user.id),
    ])

    if (!coachAccess && !physioAccess) {
      return NextResponse.json({
        success: true,
        data: {
          canUseAthleteMode: false,
          hasAthleteProfile: false,
          isAthleteModeActive: false,
          athleteProfile: null,
          businessSlug: null,
        },
      })
    }

    const [hasProfile, athleteProfile, isActive, businessMembership, preferredPortal] = await Promise.all([
      canUseAthleteMode(user.id),
      getCoachSelfAthleteClient(user.id),
      isAthleteModeActive(),
      // Get the coach's primary business (first active membership)
      prisma.businessMember.findFirst({
        where: { userId: user.id },
        include: { business: { select: { slug: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      getPreferredProfessionalPortal(user.id),
    ])

    return NextResponse.json({
      success: true,
      data: {
        canUseAthleteMode: true,
        hasAthleteProfile: hasProfile,
        isAthleteModeActive: isActive && hasProfile,
        athleteProfile,
        businessSlug: businessMembership?.business?.slug || null,
        preferredPortal,
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
