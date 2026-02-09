/**
 * Ergometer Zones API
 *
 * POST /api/ergometer-zones - Calculate and save training zones from threshold data
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/auth-utils'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { ErgometerType } from '@prisma/client'
import {
  calculateErgometerZones,
  calculateZonesFromCP,
  calculateZonesFromFTP,
  calculateZonesFrom2K,
  calculateZonesFrom1K,
  calculateZonesFromIntervalTest,
  calculateZonesFromMAP,
} from '@/lib/training-engine/ergometer'
import type { ZoneCalculationInput, ErgometerZoneResult } from '@/lib/training-engine/ergometer'
import { logError } from '@/lib/logger-console'

// Request schema for zone calculation
const calculateZonesSchema = z.object({
  clientId: z.string().uuid(),
  ergometerType: z.nativeEnum(ErgometerType),

  // Calculation method
  calculationMethod: z.enum(['CP', 'FTP', 'MAP', '2K_AVG', '1K_AVG', 'INTERVAL']),

  // Method-specific inputs
  // CP-based
  criticalPower: z.number().positive().optional(),
  wPrime: z.number().positive().optional(),

  // FTP-based
  avgPower20min: z.number().positive().optional(),
  ftpCorrectionFactor: z.number().min(0.85).max(1.0).default(0.95),

  // MAP-based
  mapWatts: z.number().positive().optional(),

  // TT-based
  avgPower2K: z.number().positive().optional(),
  avgPower1K: z.number().positive().optional(),

  // Interval-based
  avgIntervalPower: z.number().positive().optional(),
  intervalConsistency: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).optional(),

  // Optional inputs for all methods
  peakPower: z.number().positive().optional(),
  hrAtThreshold: z.number().positive().optional(),

  // Source tracking
  sourceThresholdId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const validationResult = calculateZonesSchema.safeParse(body)

    if (!validationResult.success) {
      return errorResponse(
        'Invalid request body',
        400,
        validationResult.error.flatten()
      )
    }

    const data = validationResult.data

    const hasAccess = await canAccessClient(user.id, data.clientId)
    if (!hasAccess) {
      return errorResponse('Client not found or access denied', 404)
    }

    // Calculate zones based on method
    let zoneResult: ErgometerZoneResult

    switch (data.calculationMethod) {
      case 'CP':
        if (!data.criticalPower || !data.wPrime) {
          return errorResponse('criticalPower and wPrime are required for CP-based calculation', 400)
        }
        zoneResult = calculateZonesFromCP(
          data.criticalPower,
          data.wPrime,
          data.peakPower,
          data.ergometerType
        )
        break

      case 'FTP':
        if (!data.avgPower20min) {
          return errorResponse('avgPower20min is required for FTP-based calculation', 400)
        }
        zoneResult = calculateZonesFromFTP(
          data.avgPower20min,
          data.ftpCorrectionFactor,
          data.ergometerType,
          data.peakPower
        )
        break

      case 'MAP':
        if (!data.mapWatts) {
          return errorResponse('mapWatts is required for MAP-based calculation', 400)
        }
        zoneResult = calculateZonesFromMAP(data.mapWatts, data.ergometerType)
        break

      case '2K_AVG':
        if (!data.avgPower2K) {
          return errorResponse('avgPower2K is required for 2K-based calculation', 400)
        }
        zoneResult = calculateZonesFrom2K(data.avgPower2K, data.ergometerType)
        break

      case '1K_AVG':
        if (!data.avgPower1K) {
          return errorResponse('avgPower1K is required for 1K-based calculation', 400)
        }
        zoneResult = calculateZonesFrom1K(data.avgPower1K, data.ergometerType)
        break

      case 'INTERVAL':
        if (!data.avgIntervalPower || !data.intervalConsistency) {
          return errorResponse('avgIntervalPower and intervalConsistency are required for interval-based calculation', 400)
        }
        zoneResult = calculateZonesFromIntervalTest(
          data.avgIntervalPower,
          data.intervalConsistency,
          data.ergometerType
        )
        break

      default:
        return errorResponse('Invalid calculation method', 400)
    }

    // If HR at threshold provided, recalculate with HR zones
    if (data.hrAtThreshold && zoneResult.zones) {
      // HR zones are already calculated in the zone functions when hrAtThreshold is provided
      // But we need to pass it through the main calculator for that
      const inputWithHR: ZoneCalculationInput = {
        ergometerType: data.ergometerType,
        thresholdMethod: data.calculationMethod === '2K_AVG' || data.calculationMethod === '1K_AVG'
          ? '2K_AVG'
          : data.calculationMethod,
        thresholdValue: getThresholdValue(data),
        wPrime: data.wPrime,
        peakPower: data.peakPower,
        hrAtThreshold: data.hrAtThreshold,
      }
      zoneResult = calculateErgometerZones(inputWithHR)
    }

    // Delete existing zones for this client + ergometer type
    await prisma.ergometerZone.deleteMany({
      where: {
        clientId: data.clientId,
        ergometerType: data.ergometerType,
      },
    })

    // Create new zones
    const createdZones = await Promise.all(
      zoneResult.zones.map(zone =>
        prisma.ergometerZone.create({
          data: {
            clientId: data.clientId,
            ergometerType: data.ergometerType,
            zone: zone.zone,
            name: zone.name,
            nameSwedish: zone.nameSwedish || getSwedishZoneName(zone.name),
            powerMin: zone.powerMin,
            powerMax: zone.powerMax,
            percentMin: zone.percentMin,
            percentMax: zone.percentMax,
            paceMin: zone.paceMin,
            paceMax: zone.paceMax,
            hrMin: zone.hrMin,
            hrMax: zone.hrMax,
            description: zone.description || '',
            typicalDuration: zone.typicalDuration,
            sourceThresholdId: data.sourceThresholdId || '',
            calculationMethod: `${data.calculationMethod}_BASED`,
          },
        })
      )
    )

    return successResponse(
      {
        zones: createdZones,
        zoneModel: zoneResult.zoneModel,
        source: zoneResult.source,
        recommendations: zoneResult.recommendations,
      },
      undefined,
      201
    )
  } catch (error) {
    logError('Error calculating ergometer zones:', error)
    return errorResponse('Failed to calculate ergometer zones', 500)
  }
}

// ==================== HELPER FUNCTIONS ====================

function getThresholdValue(data: z.infer<typeof calculateZonesSchema>): number {
  switch (data.calculationMethod) {
    case 'CP':
      return data.criticalPower || 0
    case 'FTP':
      return Math.round((data.avgPower20min || 0) * (data.ftpCorrectionFactor || 0.95))
    case 'MAP':
      return data.mapWatts || 0
    case '2K_AVG':
      return Math.round((data.avgPower2K || 0) * 0.92)
    case '1K_AVG':
      return Math.round((data.avgPower1K || 0) * 0.86)
    case 'INTERVAL':
      const factor = data.intervalConsistency === 'EXCELLENT' ? 0.97
        : data.intervalConsistency === 'GOOD' ? 0.95
        : data.intervalConsistency === 'FAIR' ? 0.92
        : 0.90
      return Math.round((data.avgIntervalPower || 0) * factor)
    default:
      return 0
  }
}

function getSwedishZoneName(englishName: string): string {
  const translations: Record<string, string> = {
    'Recovery': 'Återhämtning',
    'Endurance': 'Uthållighet',
    'Tempo': 'Tempo',
    'Threshold': 'Tröskel',
    'VO2max': 'VO2max',
    'Anaerobic': 'Anaerob',
  }
  return translations[englishName] || englishName
}
