/**
 * Ergometer Threshold API
 *
 * POST /api/ergometer-thresholds - Calculate and save threshold from test data
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { ErgometerType } from '@prisma/client'
import { logError } from '@/lib/logger-console'

// Request schema for threshold calculation
const calculateThresholdSchema = z.object({
  clientId: z.string().uuid(),
  ergometerType: z.nativeEnum(ErgometerType),
  sourceTestId: z.string().uuid().optional(),
  sourceMethod: z.enum(['CP_MODEL', 'FTP_TEST', 'MAP_RAMP', 'TT_BASED', 'INTERVAL_TEST', 'MANUAL']),

  // Critical Power Model
  criticalPower: z.number().positive().optional(),
  wPrime: z.number().positive().optional(),

  // FTP-based
  ftp: z.number().positive().optional(),
  ftpCorrectionFactor: z.number().min(0.85).max(1.0).optional(),

  // MAP-based
  mapWatts: z.number().positive().optional(),

  // Peak Power
  peakPower: z.number().positive().optional(),
  peakPowerDuration: z.enum(['6S', '30S']).optional(),

  // HR at threshold
  thresholdHR: z.number().positive().optional(),

  testDate: z.string().datetime().or(z.date()),
  confidence: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const validationResult = calculateThresholdSchema.safeParse(body)

    if (!validationResult.success) {
      return errorResponse(
        'Invalid request body',
        400,
        validationResult.error.flatten()
      )
    }

    const data = validationResult.data

    // Verify client exists and user has access
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        userId: user.id,
      },
    })

    if (!client) {
      return errorResponse('Client not found or access denied', 404)
    }

    // If sourceTestId provided, verify it exists
    if (data.sourceTestId) {
      const test = await prisma.ergometerFieldTest.findFirst({
        where: {
          id: data.sourceTestId,
          clientId: data.clientId,
        },
      })

      if (!test) {
        return errorResponse('Source test not found', 404)
      }
    }

    // Validate that required fields are provided based on source method
    const validationErrors = validateThresholdData(data)
    if (validationErrors.length > 0) {
      return errorResponse('Missing required threshold data', 400, { errors: validationErrors })
    }

    // Calculate expiration date (8-12 weeks from test date)
    const testDate = new Date(data.testDate)
    const expiresAt = new Date(testDate)
    expiresAt.setDate(expiresAt.getDate() + 56) // 8 weeks default

    // Upsert threshold (replace existing for same client + ergometer type)
    const threshold = await prisma.ergometerThreshold.upsert({
      where: {
        clientId_ergometerType: {
          clientId: data.clientId,
          ergometerType: data.ergometerType,
        },
      },
      update: {
        sourceTestId: data.sourceTestId,
        sourceMethod: data.sourceMethod,
        criticalPower: data.criticalPower,
        wPrime: data.wPrime,
        ftp: data.ftp,
        ftpCorrectionFactor: data.ftpCorrectionFactor,
        mapWatts: data.mapWatts,
        peakPower: data.peakPower,
        peakPowerDuration: data.peakPowerDuration,
        thresholdHR: data.thresholdHR,
        testDate: testDate,
        expiresAt: expiresAt,
        confidence: data.confidence,
        valid: true,
        updatedAt: new Date(),
      },
      create: {
        clientId: data.clientId,
        ergometerType: data.ergometerType,
        sourceTestId: data.sourceTestId,
        sourceMethod: data.sourceMethod,
        criticalPower: data.criticalPower,
        wPrime: data.wPrime,
        ftp: data.ftp,
        ftpCorrectionFactor: data.ftpCorrectionFactor,
        mapWatts: data.mapWatts,
        peakPower: data.peakPower,
        peakPowerDuration: data.peakPowerDuration,
        thresholdHR: data.thresholdHR,
        testDate: testDate,
        expiresAt: expiresAt,
        confidence: data.confidence,
        valid: true,
      },
    })

    // Generate recommendations
    const recommendations = generateThresholdRecommendations(threshold)

    return successResponse(
      {
        threshold,
        recommendations,
        expirationInfo: {
          expiresAt,
          daysUntilExpiration: Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          suggestRetestAfter: new Date(testDate.getTime() + 42 * 24 * 60 * 60 * 1000), // 6 weeks
        },
      },
      undefined,
      201
    )
  } catch (error) {
    logError('Error calculating ergometer threshold:', error)
    return errorResponse('Failed to calculate ergometer threshold', 500)
  }
}

// ==================== VALIDATION ====================

function validateThresholdData(data: z.infer<typeof calculateThresholdSchema>): string[] {
  const errors: string[] = []

  switch (data.sourceMethod) {
    case 'CP_MODEL':
      if (!data.criticalPower) errors.push('criticalPower is required for CP_MODEL')
      if (!data.wPrime) errors.push('wPrime is required for CP_MODEL')
      break

    case 'FTP_TEST':
      if (!data.ftp) errors.push('ftp is required for FTP_TEST')
      break

    case 'MAP_RAMP':
      if (!data.mapWatts) errors.push('mapWatts is required for MAP_RAMP')
      break

    case 'TT_BASED':
    case 'INTERVAL_TEST':
      // At least one threshold metric should be provided
      if (!data.criticalPower && !data.ftp && !data.mapWatts) {
        errors.push('At least one threshold metric (criticalPower, ftp, or mapWatts) is required')
      }
      break

    case 'MANUAL':
      // At least one value should be provided
      if (!data.criticalPower && !data.ftp && !data.mapWatts && !data.peakPower) {
        errors.push('At least one threshold metric is required for manual entry')
      }
      break
  }

  return errors
}

// ==================== RECOMMENDATIONS ====================

interface ThresholdRecord {
  criticalPower: number | null
  wPrime: number | null
  ftp: number | null
  mapWatts: number | null
  peakPower: number | null
  sourceMethod: string
  confidence: string | null
}

function generateThresholdRecommendations(threshold: ThresholdRecord): string[] {
  const recommendations: string[] = []

  // Add primary threshold info
  if (threshold.criticalPower) {
    recommendations.push(`Critical Power: ${threshold.criticalPower}W - sustainable for ~30-60 minutes`)
  }

  if (threshold.wPrime) {
    const wPrimeKJ = (threshold.wPrime / 1000).toFixed(1)
    recommendations.push(`W' (Anaerobic capacity): ${wPrimeKJ}kJ - available for work above CP`)
  }

  if (threshold.ftp) {
    recommendations.push(`FTP: ${threshold.ftp}W - sustainable for ~1 hour`)
  }

  if (threshold.mapWatts) {
    recommendations.push(`MAP: ${threshold.mapWatts}W - maximal aerobic power (~4-6 min duration)`)
  }

  // Training suggestions based on method
  switch (threshold.sourceMethod) {
    case 'CP_MODEL':
      recommendations.push('CP model provides accurate threshold and capacity data for interval prescription')
      break
    case 'FTP_TEST':
      recommendations.push('Consider a CP test for more detailed anaerobic capacity assessment')
      break
    case 'MAP_RAMP':
      recommendations.push('MAP-based zones work well for high-intensity training prescription')
      break
    case 'INTERVAL_TEST':
      recommendations.push('Interval-derived threshold is an estimate. Consider TT or CP test for validation.')
      break
    case 'MANUAL':
      recommendations.push('Manual entry. Validate with standardized testing when possible.')
      break
  }

  // Confidence-based suggestions
  if (threshold.confidence === 'LOW') {
    recommendations.push('Low confidence result. Retest recommended for reliable training zones.')
  } else if (threshold.confidence === 'MEDIUM') {
    recommendations.push('Moderate confidence. Zones are usable but consider validation test.')
  }

  return recommendations
}
