// lib/calculations/save-dmax.ts
import { prisma } from '@/lib/prisma'
import { Threshold } from '@/types'
import { logger } from '@/lib/logger'

/**
 * Save threshold calculation results to ThresholdCalculation model
 *
 * Stores both LT1 (aerobic) and LT2 (anaerobic) thresholds in a single record.
 * If D-max was used, includes polynomial coefficients, R², confidence scores, etc.
 */
export async function saveDmaxResults(
  testId: string,
  aerobicThreshold: Threshold,
  anaerobicThreshold: Threshold,
  testDate: Date
) {
  try {
    // Check if either threshold used D-max
    const aerobicDmax = aerobicThreshold.method === 'DMAX' || aerobicThreshold.method === 'MOD_DMAX'
    const anaerobicDmax = anaerobicThreshold.method === 'DMAX' || anaerobicThreshold.method === 'MOD_DMAX'

    // Prepare data - store both LT1 and LT2 in one record
    const thresholdData: {
      testId: string
      testDate: Date
      lt1Intensity: number
      lt1Lactate: number
      lt1Hr: number
      lt1Method: string
      lt2Intensity: number
      lt2Lactate: number
      lt2Hr: number
      method: string
      confidence: string
      r2?: number
      dmaxIntensity?: number
      dmaxLactate?: number
      dmaxHr?: number
      polynomialCoeffs?: { a: number; b: number; c: number; d: number }
    } = {
      testId,
      testDate,

      // LT1 (Aerobic) data
      lt1Intensity: aerobicThreshold.value,
      lt1Lactate: aerobicThreshold.lactate ?? 0,
      lt1Hr: aerobicThreshold.heartRate,
      lt1Method: aerobicDmax ? (aerobicThreshold.method ?? 'LINEAR_INTERPOLATION') : 'LINEAR_INTERPOLATION',

      // LT2 (Anaerobic) data
      lt2Intensity: anaerobicThreshold.value,
      lt2Lactate: anaerobicThreshold.lactate ?? 0,
      lt2Hr: anaerobicThreshold.heartRate,

      // Primary method (use D-max if either threshold used it)
      method: anaerobicDmax ? (anaerobicThreshold.method ?? 'LINEAR_INTERPOLATION') : (aerobicDmax ? (aerobicThreshold.method ?? 'LINEAR_INTERPOLATION') : 'LINEAR_INTERPOLATION'),

      // Confidence (use highest confidence if available)
      confidence: anaerobicDmax ? (anaerobicThreshold.confidence ?? 'MEDIUM') : (aerobicDmax ? (aerobicThreshold.confidence ?? 'MEDIUM') : 'MEDIUM'),
    }

    // If D-max was used for anaerobic threshold, save D-max specific data
    if (anaerobicDmax) {
      thresholdData.r2 = anaerobicThreshold.r2
      thresholdData.dmaxIntensity = anaerobicThreshold.value
      thresholdData.dmaxLactate = anaerobicThreshold.lactate
      thresholdData.dmaxHr = anaerobicThreshold.heartRate

      if (anaerobicThreshold.coefficients) {
        thresholdData.polynomialCoeffs = {
          a: anaerobicThreshold.coefficients.a,
          b: anaerobicThreshold.coefficients.b,
          c: anaerobicThreshold.coefficients.c,
          d: anaerobicThreshold.coefficients.d
        }
      }

      logger.debug('Saving D-max results for LT2 (anaerobic threshold)')
    }

    logger.debug('Saving threshold calculation', { testId, thresholdData })

    // Save to database
    const saved = await prisma.thresholdCalculation.create({
      data: thresholdData
    })

    logger.debug('Threshold calculation saved successfully', { savedId: saved.id })
    return saved
  } catch (error) {
    logger.error('Error saving threshold calculation', { testId }, error)
    // Don't throw - we don't want to fail the whole test save if this fails
    return null
  }
}

/**
 * Get D-max results for a test
 */
export async function getDmaxResults(testId: string) {
  try {
    const results = await prisma.thresholdCalculation.findMany({
      where: { testId },
      orderBy: { createdAt: 'desc' }
    })

    return results
  } catch (error) {
    logger.error('Error fetching D-max results', { testId }, error)
    return []
  }
}
