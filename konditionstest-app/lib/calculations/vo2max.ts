// lib/calculations/vo2max.ts
import { TestStage, Gender } from '@/types'

export function identifyVO2max(stages: TestStage[]): number | null {
  // Hitta högsta VO2-värdet
  let maxVO2 = 0

  for (const stage of stages) {
    if (stage.vo2 && stage.vo2 > maxVO2) {
      maxVO2 = stage.vo2
    }
  }

  return maxVO2 > 0 ? maxVO2 : null
}

interface VO2maxCategories {
  superior: number
  excellent: number
  good: number
  fair: number
  poor: number
}

function getVO2maxCategories(age: number, gender: Gender): VO2maxCategories {
  // Referensvärden baserat på ålder och kön
  const maleCategories: Record<number, VO2maxCategories> = {
    20: { superior: 60, excellent: 52, good: 47, fair: 42, poor: 37 },
    30: { superior: 57, excellent: 49, good: 44, fair: 40, poor: 35 },
    40: { superior: 53, excellent: 45, good: 41, fair: 37, poor: 33 },
    50: { superior: 49, excellent: 42, good: 38, fair: 35, poor: 31 },
    60: { superior: 45, excellent: 38, good: 35, fair: 32, poor: 28 },
  }

  const femaleCategories: Record<number, VO2maxCategories> = {
    20: { superior: 56, excellent: 47, good: 42, fair: 38, poor: 33 },
    30: { superior: 52, excellent: 44, good: 39, fair: 35, poor: 31 },
    40: { superior: 48, excellent: 41, good: 36, fair: 33, poor: 29 },
    50: { superior: 44, excellent: 37, good: 33, fair: 30, poor: 26 },
    60: { superior: 40, excellent: 34, good: 30, fair: 27, poor: 23 },
  }

  // Hitta närmaste åldersgrupp
  const ageGroup = Math.min(60, Math.max(20, Math.round(age / 10) * 10))
  const categories = gender === 'MALE' ? maleCategories : femaleCategories

  return categories[ageGroup]
}

export function evaluateVO2max(vo2max: number, age: number, gender: Gender): string {
  // Åldersbaserade referensvärden
  const categories = getVO2maxCategories(age, gender)

  if (vo2max >= categories.superior) return 'Överlägsen'
  if (vo2max >= categories.excellent) return 'Utmärkt'
  if (vo2max >= categories.good) return 'God'
  if (vo2max >= categories.fair) return 'Acceptabel'
  if (vo2max >= categories.poor) return 'Under genomsnitt'
  return 'Dålig'
}
