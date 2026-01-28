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
    const aerobicDmax = (aerobicThreshold as any).method === 'DMAX' || (aerobicThreshold as any).method === 'MOD_DMAX'
    const anaerobicDmax = (anaerobicThreshold as any).method === 'DMAX' || (anaerobicThreshold as any).method === 'MOD_DMAX'

    // Prepare data - store both LT1 and LT2 in one record
    const thresholdData: any = {
      testId,
      testDate,

      // LT1 (Aerobic) data
      lt1Intensity: aerobicThreshold.value,
      lt1Lactate: aerobicThreshold.lactate,
      lt1Hr: aerobicThreshold.heartRate,
      lt1Method: aerobicDmax ? (aerobicThreshold as any).method : 'LINEAR_INTERPOLATION',

      // LT2 (Anaerobic) data
      lt2Intensity: anaerobicThreshold.value,
      lt2Lactate: anaerobicThreshold.lactate,
      lt2Hr: anaerobicThreshold.heartRate,

      // Primary method (use D-max if either threshold used it)
      method: anaerobicDmax ? (anaerobicThreshold as any).method : (aerobicDmax ? (aerobicThreshold as any).method : 'LINEAR_INTERPOLATION'),

      // Confidence (use highest confidence if available)
      confidence: anaerobicDmax ? (anaerobicThreshold as any).confidence : (aerobicDmax ? (aerobicThreshold as any).confidence : 'MEDIUM'),
    }

    // If D-max was used for anaerobic threshold, save D-max specific data
    if (anaerobicDmax) {
      const lt2 = anaerobicThreshold as any
      thresholdData.r2 = lt2.r2
      thresholdData.dmaxIntensity = lt2.value
      thresholdData.dmaxLactate = lt2.lactate
      thresholdData.dmaxHr = lt2.heartRate

      if (lt2.coefficients) {
        thresholdData.polynomialCoeffs = {
          a: lt2.coefficients.a,
          b: lt2.coefficients.b,
          c: lt2.coefficients.c,
          d: lt2.coefficients.d
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
