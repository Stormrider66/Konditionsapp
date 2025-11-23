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
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Modality = 'DWR' | 'XC_SKIING' | 'ALTERG' | 'AIR_BIKE' | 'CYCLING' | 'ROWING' | 'ELLIPTICAL' | 'SWIMMING'

interface ModalityPreferences {
  preferredOrder: Modality[] // [1st choice, 2nd choice, 3rd choice, ...]
  equipment: {
    hasBike: boolean
    hasPoolAccess: boolean
    hasAlterG: boolean
    hasAirBike: boolean
    hasElliptical: boolean
    hasRowingMachine: boolean
    hasXCSkiAccess: boolean
  }
  limitations: string // Free text: "Doesn't like swimming", "Left shoulder injury prevents rowing"
  injuryOverrides: {
    [injuryType: string]: Modality // e.g., "PLANTAR_FASCIITIS": "CYCLING" (override default DWR)
  }
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
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId

    // Get athlete profile
    const profile = await prisma.athleteProfile.findUnique({
      where: { clientId },
      select: {
        crossTrainingPreferences: true,
      },
    })

    if (!profile || !profile.crossTrainingPreferences) {
      // Return default preferences
      return NextResponse.json({
        clientId,
        preferences: DEFAULT_PREFERENCES,
        isDefault: true,
      })
    }

    // Parse JSON preferences
    const preferences = profile.crossTrainingPreferences as ModalityPreferences

    return NextResponse.json({
      clientId,
      preferences,
      isDefault: false,
    })
  } catch (error: any) {
    console.error('Error fetching cross-training preferences:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId
    const body = await request.json()

    const {
      preferredOrder,
      equipment,
      limitations,
      injuryOverrides,
    } = body as Partial<ModalityPreferences>

    // Validation
    if (preferredOrder) {
      // Validate modalities are valid
      const validModalities: Modality[] = ['DWR', 'XC_SKIING', 'ALTERG', 'AIR_BIKE', 'CYCLING', 'ROWING', 'ELLIPTICAL', 'SWIMMING']
      const invalidModalities = preferredOrder.filter(
        (m) => !validModalities.includes(m)
      )
      if (invalidModalities.length > 0) {
        return NextResponse.json(
          { error: `Invalid modalities: ${invalidModalities.join(', ')}` },
          { status: 400 }
        )
      }

      // Validate no duplicates
      const uniqueModalities = new Set(preferredOrder)
      if (uniqueModalities.size !== preferredOrder.length) {
        return NextResponse.json(
          { error: 'Preferred order contains duplicate modalities' },
          { status: 400 }
        )
      }
    }

    // Get existing preferences or use defaults
    const existingProfile = await prisma.athleteProfile.findUnique({
      where: { clientId },
      select: { crossTrainingPreferences: true },
    })

    const existingPreferences = (existingProfile?.crossTrainingPreferences ||
      DEFAULT_PREFERENCES) as ModalityPreferences

    // Merge with existing preferences
    const updatedPreferences: ModalityPreferences = {
      preferredOrder: preferredOrder || existingPreferences.preferredOrder,
      equipment: equipment
        ? { ...existingPreferences.equipment, ...equipment }
        : existingPreferences.equipment,
      limitations: limitations !== undefined ? limitations : existingPreferences.limitations,
      injuryOverrides: injuryOverrides
        ? { ...existingPreferences.injuryOverrides, ...injuryOverrides }
        : existingPreferences.injuryOverrides,
    }

    // Upsert athlete profile with updated preferences
    const profile = await prisma.athleteProfile.upsert({
      where: { clientId },
      create: {
        clientId,
        categorization: 'INTERMEDIATE', // Default
        crossTrainingPreferences: updatedPreferences as any,
      },
      update: {
        crossTrainingPreferences: updatedPreferences as any,
      },
    })

    return NextResponse.json({
      clientId,
      preferences: updatedPreferences,
      message: 'Cross-training preferences updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating cross-training preferences:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
