// lib/calculations/economy.ts
import { TestStage, EconomyData, Gender } from '@/types'

type AppLocale = 'en' | 'sv'

export function calculateRunningEconomy(vo2: number, speed: number): number {
  // O₂-kostnad i ml/kg/km
  return Number(((vo2 * 60) / speed).toFixed(0))
}

export function evaluateRunningEconomy(economy: number, gender: Gender, locale: AppLocale = 'en'): string {
  // Baserat på kön och värde
  const labels = locale === 'sv'
    ? {
        excellent: 'Utmärkt',
        veryGood: 'Mycket god',
        good: 'God',
        fair: 'Acceptabel',
        improve: 'Behöver förbättring',
      }
    : {
        excellent: 'Excellent',
        veryGood: 'Very good',
        good: 'Good',
        fair: 'Fair',
        improve: 'Needs improvement',
      }

  if (gender === 'MALE') {
    if (economy < 200) return labels.excellent
    if (economy < 210) return labels.veryGood
    if (economy < 220) return labels.good
    if (economy < 240) return labels.fair
    return labels.improve
  } else {
    if (economy < 210) return labels.excellent
    if (economy < 220) return labels.veryGood
    if (economy < 240) return labels.good
    if (economy < 260) return labels.fair
    return labels.improve
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
