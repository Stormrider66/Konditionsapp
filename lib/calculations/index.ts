// lib/calculations/index.ts
import { Test, Client, TestCalculations } from '@/types'
import { logger } from '@/lib/logger'
import { calculateBMI, calculateAge } from './basic'
import {
  calculateAerobicThreshold,
  calculateAnaerobicThreshold,
  calculateAerobicThresholdWithOverride,
  calculateAnaerobicThresholdWithOverride,
  calculateDmaxForVisualization,
  detectLT2Unified
} from './thresholds'
import { calculateTrainingZones } from './zones'
import { calculateAllEconomy } from './economy'
import { identifyVO2max } from './vo2max'
import { calculateCyclingData, calculateStageWattsPerKg } from './cycling'
import { convertToLactateData, classifyAthleteProfile } from './elite-threshold-detection'

/**
 * Manual threshold overrides set by test leader
 */
export interface ManualThresholdOverrides {
  manualLT1Lactate?: number | null
  manualLT1Intensity?: number | null
  manualLT2Lactate?: number | null
  manualLT2Intensity?: number | null
}

export async function performAllCalculations(
  test: Test & ManualThresholdOverrides,
  client: Client
): Promise<TestCalculations> {
  const stages = test.testStages.sort((a, b) => a.sequence - b.sequence)
  const age = calculateAge(client.birthDate)

  // Grundläggande
  const bmi = calculateBMI(client.weight, client.height)

  // Max-värden
  const maxHR = Math.max(...stages.map((s) => s.heartRate))
  const maxLactate = Math.max(...stages.map((s) => s.lactate))
  const vo2max = identifyVO2max(stages) || 0

  // Check for manual overrides from test leader
  const lt1Override = (test.manualLT1Lactate && test.manualLT1Intensity)
    ? { lactate: test.manualLT1Lactate, intensity: test.manualLT1Intensity }
    : null

  const lt2Override = (test.manualLT2Lactate && test.manualLT2Intensity)
    ? { lactate: test.manualLT2Lactate, intensity: test.manualLT2Intensity }
    : null

  if (lt1Override || lt2Override) {
    logger.debug('Manual threshold overrides detected', {
      lt1Override: lt1Override ? { lactate: lt1Override.lactate, intensity: lt1Override.intensity } : null,
      lt2Override: lt2Override ? { lactate: lt2Override.lactate, intensity: lt2Override.intensity } : null
    })
  }

  // Trösklar - use override functions that check for manual values first
  let aerobicThreshold = calculateAerobicThresholdWithOverride(stages, lt1Override)
  let anaerobicThreshold = calculateAnaerobicThresholdWithOverride(stages, lt2Override)

  if (!aerobicThreshold || !anaerobicThreshold) {
    throw new Error('Kunde inte beräkna tröskelvärden')
  }

  // Sanity check: LT1 (aerobic) should always be at lower intensity than LT2 (anaerobic)
  // If not, something went wrong - likely Standard D-max found LT1 instead of LT2
  if (aerobicThreshold.value >= anaerobicThreshold.value) {
    logger.warn('Threshold sanity check failed - LT1 >= LT2 detected, swapping thresholds', {
      lt1: { value: aerobicThreshold.value, unit: aerobicThreshold.unit },
      lt2: { value: anaerobicThreshold.value, unit: anaerobicThreshold.unit },
      action: 'D-max result becomes LT1, using unified LT2 detection'
    })

    const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence)

    // The D-max result (currently labeled as anaerobic) is actually the FIRST turnpoint (LT1)
    const dmaxLT1 = { ...anaerobicThreshold }
    dmaxLT1.lactate = anaerobicThreshold.lactate || 0

    // Classify athlete profile for unified LT2 detection
    const lactateData = convertToLactateData(sortedStages)
    const profile = classifyAthleteProfile(lactateData)

    // Use unified LT2 detection with 3-method hierarchy:
    // 1. Modified D-max (Bishop) - Primary
    // 2. Exponential Rise Detection - Fallback
    // 3. Baseline + 1.0 mmol/L - Last resort
    const unifiedLT2 = detectLT2Unified(sortedStages, profile)

    if (unifiedLT2) {
      // Swap: D-max result becomes aerobic (LT1), unified detection becomes anaerobic (LT2)
      aerobicThreshold = {
        heartRate: dmaxLT1.heartRate,
        value: dmaxLT1.value,
        unit: dmaxLT1.unit,
        lactate: dmaxLT1.lactate,
        percentOfMax: 0,
        method: 'DMAX_LT1' // Indicates D-max found LT1
      } as typeof aerobicThreshold

      anaerobicThreshold = {
        heartRate: unifiedLT2.heartRate,
        value: unifiedLT2.value,
        unit: unifiedLT2.unit,
        lactate: unifiedLT2.lactate,
        percentOfMax: 0,
        method: unifiedLT2.method // MOD_DMAX, EXPONENTIAL_RISE, or BASELINE_PLUS_1.0
      } as typeof anaerobicThreshold

      logger.debug('Thresholds swapped successfully', {
        lt1: { value: aerobicThreshold.value, unit: aerobicThreshold.unit, lactate: aerobicThreshold.lactate, source: 'D-max' },
        lt2: { value: anaerobicThreshold.value, unit: anaerobicThreshold.unit, lactate: anaerobicThreshold.lactate, method: unifiedLT2.method }
      })
    } else {
      logger.warn('Unified LT2 detection failed - keeping original thresholds')
    }
  }

  // Uppdatera procent av max
  aerobicThreshold.percentOfMax = Math.round((aerobicThreshold.heartRate / maxHR) * 100)
  anaerobicThreshold.percentOfMax = Math.round((anaerobicThreshold.heartRate / maxHR) * 100)

  // Always calculate D-max for visualization (separate from threshold selection)
  // This ensures the D-max chart is shown even when another method is used for thresholds
  const dmaxVisualization = calculateDmaxForVisualization(stages)

  // Träningszoner (använder nytt 3-nivå system: laktattest > fälttest > %HRmax)
  const zoneResult = calculateTrainingZones(
    client,
    maxHR,
    aerobicThreshold,
    anaerobicThreshold,
    test.testType
  )
  const trainingZones = zoneResult.zones

  // Logga varning om estimerade zoner används
  if (zoneResult.confidence === 'LOW' && zoneResult.warning) {
    logger.warn('Zone calculation using estimated zones', { warning: zoneResult.warning, confidence: 'LOW' })
  } else if (zoneResult.confidence === 'HIGH') {
    logger.debug('Zone calculation using individualized zones from lactate test', { confidence: 'HIGH' })
  }

  // Ekonomi (endast för löpning)
  let economyData
  if (test.testType === 'RUNNING') {
    economyData = calculateAllEconomy(stages, client.gender)
  }

  // Cykeldata (endast för cykling)
  let cyclingData
  if (test.testType === 'CYCLING') {
    cyclingData = calculateCyclingData(
      stages,
      anaerobicThreshold,
      client.weight,
      age,
      client.gender
    )

    // Beräkna watt/kg för alla stages
    const stagesWithWattsPerKg = calculateStageWattsPerKg(stages, client.weight)
    // Uppdatera stages med watt/kg (muterar test objektet)
    test.testStages = stagesWithWattsPerKg
  }

  return {
    bmi,
    aerobicThreshold,
    anaerobicThreshold,
    trainingZones,
    vo2max,
    maxHR,
    maxLactate,
    economyData,
    cyclingData,
    dmaxVisualization,
  }
}

// Re-export viktiga funktioner
export * from './basic'
export * from './thresholds'
export * from './zones'
export * from './economy'
export * from './vo2max'
export * from './cycling'
export * from './save-dmax'
export * from './race-predictions'
// Export vdot.ts functions except calculateVDOT (already exported from race-predictions)
export {
  getEquivalentRaceTimes,
  getTrainingPaces,
  generateVDOTEntry,
  findVDOTFromRaceTime,
  categorizeVDOT,
  estimateVDOTImprovement,
  compareVDOT,
  validateRacePerformance,
  type VDOTEntry,
  type VDOTCategory,
  type VDOTCategoryInfo,
} from './vdot'
export * from './environmental'
export * from './elite-threshold-detection'
