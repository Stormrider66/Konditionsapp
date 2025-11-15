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

export function calculateAllEconomy(stages: TestStage[], gender: Gender): EconomyData[] {
  return stages
    .filter((stage) => stage.vo2 && stage.speed)
    .map((stage) => {
      const economy = calculateRunningEconomy(stage.vo2!, stage.speed!)
      const efficiency = evaluateRunningEconomy(economy, gender)
      return {
        speed: stage.speed,
        vo2: stage.vo2!,
        economy,
        efficiency: efficiency as EconomyData['efficiency'],
      }
    })
}

export function calculateWattsPerKg(power: number, weight: number): number {
  return Number((power / weight).toFixed(2))
}
