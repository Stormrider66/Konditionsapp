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
  const aerobicThreshold = calculateAerobicThreshold(stages)
  const anaerobicThreshold = calculateAnaerobicThreshold(stages)

  if (!aerobicThreshold || !anaerobicThreshold) {
    throw new Error('Kunde inte beräkna tröskelvärden')
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
export * from './vdot'
export * from './environmental'
