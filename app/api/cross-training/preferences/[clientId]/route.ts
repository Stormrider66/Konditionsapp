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
import { logger } from '@/lib/logger'

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
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // Check if athlete profile exists
    const profile = await prisma.athleteProfile.findUnique({
      where: { clientId },
      select: { id: true },
    })

    // crossTrainingPreferences field not yet added to schema
    // Return default preferences for now
    return NextResponse.json({
      clientId,
      preferences: DEFAULT_PREFERENCES,
      isDefault: true,
    })
  } catch (error: unknown) {
    logger.error('Error fetching cross-training preferences', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // crossTrainingPreferences field not yet added to schema
    // Return not implemented for now
    return NextResponse.json(
      { error: 'Cross-training preferences storage not yet implemented' },
      { status: 501 }
    )
  } catch (error: unknown) {
    logger.error('Error updating cross-training preferences', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
