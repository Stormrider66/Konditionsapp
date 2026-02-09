/**
 * Client Ergometer Zones API
 *
 * GET /api/ergometer-zones/[clientId] - Get all training zones for a client
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/auth-utils'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { ErgometerType } from '@prisma/client'
import { formatPace, isConcept2 } from '@/lib/training-engine/ergometer'
import { logError } from '@/lib/logger-console'

// Query params schema
const querySchema = z.object({
  ergometerType: z.nativeEnum(ErgometerType).optional(),
  includeFormatted: z.coerce.boolean().default(true),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await requireAuth()
    const { clientId } = await params
    const { searchParams } = new URL(request.url)
    const queryResult = querySchema.safeParse(Object.fromEntries(searchParams))

    if (!queryResult.success) {
      return errorResponse(
        'Invalid query parameters',
        400,
        queryResult.error.flatten()
      )
    }

    const { ergometerType, includeFormatted } = queryResult.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return errorResponse('Client not found or access denied', 404)
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
      },
    })

    if (!client) {
      return errorResponse('Client not found or access denied', 404)
    }

    // Build where clause
    const where: Record<string, unknown> = {
      clientId,
    }

    if (ergometerType) {
      where.ergometerType = ergometerType
    }

    // Fetch zones
    const zones = await prisma.ergometerZone.findMany({
      where,
      orderBy: [
        { ergometerType: 'asc' },
        { zone: 'asc' },
      ],
    })

    // Group zones by ergometer type
    const zonesByErgometer: Record<string, typeof zones> = {}
    for (const zone of zones) {
      if (!zonesByErgometer[zone.ergometerType]) {
        zonesByErgometer[zone.ergometerType] = []
      }
      zonesByErgometer[zone.ergometerType].push(zone)
    }

    // Format zones for display if requested
    let formattedZones: Record<string, FormattedZone[]> | undefined
    if (includeFormatted) {
      formattedZones = {}
      for (const [ergType, ergZones] of Object.entries(zonesByErgometer)) {
        formattedZones[ergType] = ergZones.map(z => formatZoneForDisplay(z, ergType as ErgometerType))
      }
    }

    // Get related threshold info
    const thresholds = await prisma.ergometerThreshold.findMany({
      where: {
        clientId,
        valid: true,
        OR: ergometerType
          ? [{ ergometerType }]
          : [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
      },
      select: {
        ergometerType: true,
        criticalPower: true,
        ftp: true,
        mapWatts: true,
        testDate: true,
        sourceMethod: true,
      },
    })

    const thresholdsByErgometer: Record<string, typeof thresholds[0]> = {}
    for (const threshold of thresholds) {
      thresholdsByErgometer[threshold.ergometerType] = threshold
    }

    // Generate zone usage recommendations
    const recommendations = generateZoneUsageRecommendations(zonesByErgometer)

    return successResponse({
      client,
      zones,
      zonesByErgometer,
      formattedZones,
      thresholdsByErgometer,
      recommendations,
      coverage: {
        hasZones: zones.length > 0,
        ergometerTypesCovered: Object.keys(zonesByErgometer) as ErgometerType[],
        zoneCountByErgometer: Object.fromEntries(
          Object.entries(zonesByErgometer).map(([k, v]) => [k, v.length])
        ),
      },
    })
  } catch (error) {
    logError('Error fetching ergometer zones:', error)
    return errorResponse('Failed to fetch ergometer zones', 500)
  }
}

// ==================== FORMATTING ====================

interface FormattedZone {
  zone: number
  name: string
  nameSwedish: string
  powerRange: string
  paceRange?: string
  hrRange?: string
  description: string
  typicalDuration?: string
  percentRange: string
  color: string
}

function formatZoneForDisplay(
  zone: {
    zone: number
    name: string
    nameSwedish: string
    powerMin: number
    powerMax: number
    paceMin: number | null
    paceMax: number | null
    hrMin: number | null
    hrMax: number | null
    description: string
    typicalDuration: string | null
    percentMin: number
    percentMax: number
  },
  ergometerType: ErgometerType
): FormattedZone {
  const formatted: FormattedZone = {
    zone: zone.zone,
    name: zone.name,
    nameSwedish: zone.nameSwedish,
    powerRange: `${zone.powerMin}-${zone.powerMax}W`,
    description: zone.description,
    typicalDuration: zone.typicalDuration || undefined,
    percentRange: `${zone.percentMin}-${zone.percentMax}%`,
    color: getZoneColor(zone.zone),
  }

  // Add pace for Concept2 machines
  if (isConcept2(ergometerType) && zone.paceMin !== null && zone.paceMax !== null) {
    formatted.paceRange = `${formatPace(zone.paceMin)}-${formatPace(zone.paceMax)}/500m`
  }

  // Add HR range if available
  if (zone.hrMin !== null && zone.hrMax !== null) {
    formatted.hrRange = `${zone.hrMin}-${zone.hrMax}bpm`
  }

  return formatted
}

function getZoneColor(zone: number): string {
  const colors: Record<number, string> = {
    1: '#22c55e', // Green - Recovery
    2: '#3b82f6', // Blue - Endurance
    3: '#eab308', // Yellow - Tempo
    4: '#f97316', // Orange - Threshold
    5: '#ef4444', // Red - VO2max
    6: '#a855f7', // Purple - Anaerobic
  }
  return colors[zone] || '#6b7280'
}

// ==================== RECOMMENDATIONS ====================

function generateZoneUsageRecommendations(
  zonesByErgometer: Record<string, Array<{ zone: number; name: string; powerMin: number; powerMax: number }>>
): string[] {
  const recommendations: string[] = []

  const ergometerCount = Object.keys(zonesByErgometer).length

  if (ergometerCount === 0) {
    recommendations.push('No zones calculated. Complete an ergometer test to generate training zones.')
    return recommendations
  }

  // Zone distribution guidance
  recommendations.push(
    'Zone distribution for conditioning: 80% Zone 1-2, 5% Zone 3, 15% Zone 4-5'
  )

  // Ergometer-specific tips
  for (const [ergType, zones] of Object.entries(zonesByErgometer)) {
    if (zones.length < 6) {
      recommendations.push(`${ergType}: Only ${zones.length} zones defined. Consider recalculating zones.`)
      continue
    }

    const z4 = zones.find(z => z.zone === 4)
    if (z4) {
      switch (ergType) {
        case 'CONCEPT2_ROW':
          recommendations.push(`Rowing threshold: ${z4.powerMin}-${z4.powerMax}W. Key intervals: 4×1000m, 8×500m at Z4.`)
          break
        case 'CONCEPT2_SKIERG':
          recommendations.push(`SkiErg threshold: ${z4.powerMin}-${z4.powerMax}W. Key intervals: 10×1min, 5×2min at Z4.`)
          break
        case 'CONCEPT2_BIKEERG':
          recommendations.push(`BikeErg threshold: ${z4.powerMin}-${z4.powerMax}W. Similar to cycling intervals.`)
          break
        case 'WATTBIKE':
          recommendations.push(`Wattbike threshold: ${z4.powerMin}-${z4.powerMax}W. FTP intervals: 2×20min, 3×15min at Z4.`)
          break
        case 'ASSAULT_BIKE':
          recommendations.push(`Air bike threshold: ${z4.powerMin}-${z4.powerMax}W. HYROX prep: 10×1min on/1min off at Z4-5.`)
          break
      }
    }
  }

  // Cross-training guidance if multiple ergometers
  if (ergometerCount > 1) {
    recommendations.push(
      'With multiple ergometers: Rotate modalities to reduce overuse while maintaining zone targets.'
    )
  }

  return recommendations
}
