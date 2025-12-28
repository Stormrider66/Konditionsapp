// lib/calculations/index.ts
import { Test, Client, TestCalculations } from '@/types'
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
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║     MANUAL THRESHOLD OVERRIDES DETECTED                      ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    if (lt1Override) console.log(`LT1 override: ${lt1Override.lactate} mmol/L @ ${lt1Override.intensity}`)
    if (lt2Override) console.log(`LT2 override: ${lt2Override.lactate} mmol/L @ ${lt2Override.intensity}`)
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
    console.warn('╔══════════════════════════════════════════════════════════════╗')
    console.warn('║     THRESHOLD SANITY CHECK - LT1 >= LT2 DETECTED!           ║')
    console.warn('╚══════════════════════════════════════════════════════════════╝')
    console.warn(`LT1: ${aerobicThreshold.value} ${aerobicThreshold.unit}, LT2: ${anaerobicThreshold.value} ${anaerobicThreshold.unit}`)
    console.warn('For elite athletes, Standard D-max often finds LT1 instead of LT2.')
    console.warn('SWAPPING: D-max result becomes LT1, using UNIFIED LT2 DETECTION...')

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

      console.log('┌── SWAPPED THRESHOLDS ──────────────────────────────────────┐')
      console.log(`│ LT1 (from D-max): ${aerobicThreshold.value} ${aerobicThreshold.unit} @ ${aerobicThreshold.lactate} mmol/L`)
      console.log(`│ LT2 (${unifiedLT2.method}): ${anaerobicThreshold.value} ${anaerobicThreshold.unit} @ ${anaerobicThreshold.lactate} mmol/L`)
      console.log('└─────────────────────────────────────────────────────────────┘')
    } else {
      console.warn('⚠️ Unified LT2 detection failed - keeping original thresholds')
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
    console.warn('[Zone Calculation]', zoneResult.warning)
  } else if (zoneResult.confidence === 'HIGH') {
    console.log('[Zone Calculation] Using individualized zones from lactate test (HIGH confidence)')
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
