/**
 * Client Ergometer Thresholds API
 *
 * GET /api/ergometer-thresholds/[clientId] - Get all thresholds for a client
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { ErgometerType } from '@prisma/client'
import { logError } from '@/lib/logger-console'

// Query params schema
const querySchema = z.object({
  ergometerType: z.nativeEnum(ErgometerType).optional(),
  includeExpired: z.coerce.boolean().default(false),
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

    const { ergometerType, includeExpired } = queryResult.data

    // Verify client exists and user has access
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
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
      valid: true,
    }

    if (ergometerType) {
      where.ergometerType = ergometerType
    }

    if (!includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ]
    }

    // Fetch thresholds
    const thresholds = await prisma.ergometerThreshold.findMany({
      where,
      orderBy: { testDate: 'desc' },
    })

    // Add status information to each threshold
    const thresholdsWithStatus = thresholds.map(threshold => {
      const now = new Date()
      const testDate = new Date(threshold.testDate)
      const expiresAt = threshold.expiresAt ? new Date(threshold.expiresAt) : null

      let status: 'CURRENT' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY'
      let daysUntilExpiration: number | null = null

      if (!expiresAt) {
        status = 'NO_EXPIRY'
      } else if (expiresAt < now) {
        status = 'EXPIRED'
        daysUntilExpiration = Math.round((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24)) * -1
      } else {
        daysUntilExpiration = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilExpiration <= 14) {
          status = 'EXPIRING_SOON'
        } else {
          status = 'CURRENT'
        }
      }

      const daysSinceTest = Math.round((now.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        ...threshold,
        status,
        daysUntilExpiration,
        daysSinceTest,
        recommendRetest: daysSinceTest > 42, // 6 weeks
      }
    })

    // Group by ergometer type for easy access
    const byErgometerType: Record<string, typeof thresholdsWithStatus[0]> = {}
    for (const threshold of thresholdsWithStatus) {
      byErgometerType[threshold.ergometerType] = threshold
    }

    // Generate overall recommendations
    const recommendations = generateOverallRecommendations(thresholdsWithStatus)

    return successResponse({
      client,
      thresholds: thresholdsWithStatus,
      byErgometerType,
      recommendations,
      coverage: {
        hasThresholds: thresholds.length > 0,
        ergometerTypesCovered: [...new Set(thresholds.map(t => t.ergometerType))],
        ergometerTypesWithExpiredThresholds: thresholdsWithStatus
          .filter(t => t.status === 'EXPIRED')
          .map(t => t.ergometerType),
        ergometerTypesNeedingRetest: thresholdsWithStatus
          .filter(t => t.recommendRetest || t.status === 'EXPIRING_SOON')
          .map(t => t.ergometerType),
      },
    })
  } catch (error) {
    logError('Error fetching ergometer thresholds:', error)
    return errorResponse('Failed to fetch ergometer thresholds', 500)
  }
}

// ==================== RECOMMENDATIONS ====================

interface ThresholdWithStatus {
  ergometerType: ErgometerType
  status: 'CURRENT' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY'
  recommendRetest: boolean
  sourceMethod: string
  confidence: string | null
  criticalPower: number | null
  ftp: number | null
}

function generateOverallRecommendations(thresholds: ThresholdWithStatus[]): string[] {
  const recommendations: string[] = []

  // Check for expired thresholds
  const expired = thresholds.filter(t => t.status === 'EXPIRED')
  if (expired.length > 0) {
    recommendations.push(
      `${expired.length} threshold(s) have expired: ${expired.map(t => t.ergometerType).join(', ')}. Retest recommended.`
    )
  }

  // Check for expiring soon
  const expiringSoon = thresholds.filter(t => t.status === 'EXPIRING_SOON')
  if (expiringSoon.length > 0) {
    recommendations.push(
      `${expiringSoon.length} threshold(s) expiring soon: ${expiringSoon.map(t => t.ergometerType).join(', ')}. Schedule retest.`
    )
  }

  // Check for low confidence
  const lowConfidence = thresholds.filter(t => t.confidence === 'LOW')
  if (lowConfidence.length > 0) {
    recommendations.push(
      `${lowConfidence.length} threshold(s) have low confidence. Consider retesting with better protocol execution.`
    )
  }

  // Suggest additional tests
  const allErgometerTypes: ErgometerType[] = ['WATTBIKE', 'CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG', 'ASSAULT_BIKE']
  const coveredTypes = new Set(thresholds.map(t => t.ergometerType))
  const uncoveredTypes = allErgometerTypes.filter(t => !coveredTypes.has(t))

  if (uncoveredTypes.length > 0 && uncoveredTypes.length < allErgometerTypes.length) {
    // Only suggest if they have some tests but not all
    recommendations.push(
      `Consider testing on: ${uncoveredTypes.join(', ')} for complete cross-training data.`
    )
  }

  // Recommend retest for old thresholds
  const needsRetest = thresholds.filter(t => t.recommendRetest && t.status !== 'EXPIRED')
  if (needsRetest.length > 0) {
    recommendations.push(
      `${needsRetest.length} threshold(s) are >6 weeks old. Consider retesting: ${needsRetest.map(t => t.ergometerType).join(', ')}`
    )
  }

  // Add positive feedback if all thresholds are current
  const allCurrent = thresholds.every(t => t.status === 'CURRENT' && !t.recommendRetest)
  if (allCurrent && thresholds.length > 0) {
    recommendations.push('All thresholds are current and valid. Training zones are reliable.')
  }

  return recommendations
}
