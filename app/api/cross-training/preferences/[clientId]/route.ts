// app/api/cross-training/preferences/[clientId]/route.ts
/**
 * Cross-Training Modality Preferences API
 *
 * GET /api/cross-training/preferences/:clientId - Get athlete's modality preferences
 * POST /api/cross-training/preferences/:clientId - Set/update modality preferences
 *
 * Allows coaches to configure:
 * - Preferred modality order (1st, 2nd, 3rd choice)
 * - Equipment availability (bike, pool, AlterG, elliptical, rowing machine)
 * - Dislikes/limitations
 * - Injury-specific overrides
 *
 * Stored in AthleteProfile model (extends existing profile)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type Modality = 'DWR' | 'XC_SKIING' | 'ALTERG' | 'AIR_BIKE' | 'CYCLING' | 'ROWING' | 'ELLIPTICAL' | 'SWIMMING'

// Use Record type for Prisma JSON compatibility
type ModalityPreferences = {
  preferredOrder: Modality[]
  equipment: Record<string, boolean>
  limitations: string
  injuryOverrides: Record<string, Modality>
}

// Default preferences if none set
const DEFAULT_PREFERENCES: ModalityPreferences = {
  preferredOrder: ['DWR', 'XC_SKIING', 'CYCLING', 'SWIMMING'],
  equipment: {
    hasBike: true,
    hasPoolAccess: true,
    hasAlterG: false,
    hasAirBike: false,
    hasElliptical: false,
    hasRowingMachine: false,
    hasXCSkiAccess: false,
  },
  limitations: '',
  injuryOverrides: {},
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await requireAuth()
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get athlete profile with cross-training preferences
    const profile = await prisma.athleteProfile.findUnique({
      where: { clientId },
      select: {
        id: true,
        crossTrainingPreferences: true,
      },
    })

    if (!profile) {
      // Return default preferences if no profile exists
      return NextResponse.json({
        clientId,
        preferences: DEFAULT_PREFERENCES,
        isDefault: true,
      })
    }

    // Return stored preferences or defaults
    const preferences = profile.crossTrainingPreferences as ModalityPreferences | null
    return NextResponse.json({
      clientId,
      preferences: preferences || DEFAULT_PREFERENCES,
      isDefault: !preferences,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await requireAuth()
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { clientId } = await params
    const body = await request.json()

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate the preferences structure
    // Support both shapes:
    // - { preferences: {...} } (API-style)
    // - { ... } (client sends the preferences object directly)
    const preferences =
      body && typeof body === 'object' && 'preferences' in body ? (body as any).preferences : body

    if (!preferences) {
      return NextResponse.json(
        { error: 'Missing preferences in request body' },
        { status: 400 }
      )
    }

    // Merge with defaults for any missing fields
    const mergedPreferences: ModalityPreferences = {
      preferredOrder: preferences.preferredOrder || DEFAULT_PREFERENCES.preferredOrder,
      equipment: {
        ...DEFAULT_PREFERENCES.equipment,
        ...preferences.equipment,
      },
      limitations: preferences.limitations ?? DEFAULT_PREFERENCES.limitations,
      injuryOverrides: {
        ...DEFAULT_PREFERENCES.injuryOverrides,
        ...preferences.injuryOverrides,
      },
    }

    // Validate preferredOrder contains valid modalities
    const validModalities: Modality[] = ['DWR', 'XC_SKIING', 'ALTERG', 'AIR_BIKE', 'CYCLING', 'ROWING', 'ELLIPTICAL', 'SWIMMING']
    const invalidModalities = mergedPreferences.preferredOrder.filter(m => !validModalities.includes(m))
    if (invalidModalities.length > 0) {
      return NextResponse.json(
        { error: `Invalid modalities: ${invalidModalities.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if athlete profile exists
    const existingProfile = await prisma.athleteProfile.findUnique({
      where: { clientId },
      select: { id: true },
    })

    if (!existingProfile) {
      // Create profile with preferences if it doesn't exist
      await prisma.athleteProfile.create({
        data: {
          clientId,
          category: 'RECREATIONAL', // Default category
          crossTrainingPreferences: mergedPreferences,
        },
      })
    } else {
      // Update existing profile
      await prisma.athleteProfile.update({
        where: { clientId },
        data: {
          crossTrainingPreferences: mergedPreferences,
        },
      })
    }

    logger.info('Cross-training preferences updated', { clientId })

    return NextResponse.json({
      clientId,
      preferences: mergedPreferences,
      isDefault: false,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
