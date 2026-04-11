// lib/calculations/economy.ts
import { TestStage, EconomyData, Gender } from '@/types'

export function calculateRunningEconomy(vo2: number, speed: number): number {
  // O₂-kostnad i ml/kg/km
  return Number(((vo2 * 60) / speed).toFixed(0))
}

export function evaluateRunningEconomy(economy: number, gender: Gender): string {
  // Baserat på kön och värde
  if (gender === 'MALE') {
    if (economy < 200) return 'Utmärkt'
    if (economy < 210) return 'Mycket god'
    if (economy < 220) return 'God'
    if (economy < 240) return 'Acceptabel'
    return 'Behöver förbättring'
  } else {
    if (economy < 210) return 'Utmärkt'
    if (economy < 220) return 'Mycket god'
    if (economy < 240) return 'God'
    if (economy < 260) return 'Acceptabel'
    return 'Behöver förbättring'
  }
}

export interface EconomyCalculationResult {
  data: EconomyData[]
  /** Sequence numbers of stages that were skipped because vo2 or speed was missing */
  skippedStageSequences: number[]
}

export function calculateAllEconomy(
  stages: TestStage[],
  gender: Gender
): EconomyCalculationResult {
  const data: EconomyData[] = []
  const skippedStageSequences: number[] = []

  for (const stage of stages) {
    if (!stage.vo2 || !stage.speed) {
      skippedStageSequences.push(stage.sequence)
      continue
    }
    const economy = calculateRunningEconomy(stage.vo2, stage.speed)
    const efficiency = evaluateRunningEconomy(economy, gender)
    data.push({
      speed: stage.speed,
      vo2: stage.vo2,
      economy,
      efficiency: efficiency as EconomyData['efficiency'],
    })
  }

  return { data, skippedStageSequences }
}

export function calculateWattsPerKg(power: number, weight: number): number {
  return Number((power / weight).toFixed(2))
}
