// lib/calculations/index.ts
import { Test, Client, TestCalculations } from '@/types'
import { calculateBMI, calculateAge } from './basic'
import { calculateAerobicThreshold, calculateAnaerobicThreshold } from './thresholds'
import { calculateTrainingZones } from './zones'
import { calculateAllEconomy } from './economy'
import { identifyVO2max } from './vo2max'
import { calculateCyclingData, calculateStageWattsPerKg } from './cycling'

export async function performAllCalculations(test: Test, client: Client): Promise<TestCalculations> {
  const stages = test.testStages.sort((a, b) => a.sequence - b.sequence)
  const age = calculateAge(client.birthDate)

  // Grundläggande
  const bmi = calculateBMI(client.weight, client.height)

  // Max-värden
  const maxHR = Math.max(...stages.map((s) => s.heartRate))
  const maxLactate = Math.max(...stages.map((s) => s.lactate))
  const vo2max = identifyVO2max(stages) || 0

  // Trösklar
  let aerobicThreshold = calculateAerobicThreshold(stages)
  let anaerobicThreshold = calculateAnaerobicThreshold(stages)

  if (!aerobicThreshold || !anaerobicThreshold) {
    throw new Error('Kunde inte beräkna tröskelvärden')
  }

  // Sanity check: LT1 (aerobic) should always be at lower intensity than LT2 (anaerobic)
  // If not, something went wrong and we should swap or recalculate
  if (aerobicThreshold.value >= anaerobicThreshold.value) {
    console.warn('[Threshold Sanity Check] LT1 >= LT2 detected. LT1:', aerobicThreshold.value, 'LT2:', anaerobicThreshold.value)
    console.warn('[Threshold Sanity Check] This is physiologically incorrect. Recalculating using traditional methods.')

    // The aerobic threshold should be lower, so if they're swapped, the D-max
    // might have found LT1 instead of LT2. Use traditional 2.0 and 4.0 mmol/L methods.
    // Create a simple interpolation-based aerobic threshold at 2.0 mmol/L
    const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence)

    // Force traditional method by finding 2.0 mmol/L crossing
    let lt1Below: typeof sortedStages[0] | null = null
    let lt1Above: typeof sortedStages[0] | null = null
    for (let i = 0; i < sortedStages.length; i++) {
      if (sortedStages[i].lactate <= 2.0) {
        lt1Below = sortedStages[i]
      } else if (!lt1Above && sortedStages[i].lactate > 2.0) {
        lt1Above = sortedStages[i]
        break
      }
    }

    if (lt1Below && lt1Above) {
      const factor = (2.0 - lt1Below.lactate) / (lt1Above.lactate - lt1Below.lactate)
      const hr = lt1Below.heartRate + factor * (lt1Above.heartRate - lt1Below.heartRate)
      const speed = (lt1Below.speed || 0) + factor * ((lt1Above.speed || 0) - (lt1Below.speed || 0))
      const power = (lt1Below.power || 0) + factor * ((lt1Above.power || 0) - (lt1Below.power || 0))
      const value = speed > 0 ? speed : power
      const unit = speed > 0 ? 'km/h' : 'watt'

      aerobicThreshold = {
        heartRate: Math.round(hr),
        value: Number(value.toFixed(1)),
        unit: unit as 'km/h' | 'watt' | 'min/km',
        lactate: 2.0,
        percentOfMax: 0
      }
      console.log('[Threshold Sanity Check] Recalculated aerobic threshold:', aerobicThreshold)
    }
  }

  // Uppdatera procent av max
  aerobicThreshold.percentOfMax = Math.round((aerobicThreshold.heartRate / maxHR) * 100)
  anaerobicThreshold.percentOfMax = Math.round((anaerobicThreshold.heartRate / maxHR) * 100)

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
