// lib/calculations/zones.ts
import { TrainingZone, Threshold, TestType } from '@/types'

export function calculateTrainingZones(
  maxHR: number,
  threshold: Threshold,
  testType: TestType
): TrainingZone[] {
  const zones: TrainingZone[] = [
    {
      zone: 1,
      name: 'Mycket lätt',
      intensity: 'Återhämtning',
      percentMin: 50,
      percentMax: 60,
      hrMin: Math.round(maxHR * 0.5),
      hrMax: Math.round(maxHR * 0.6),
      effect: 'Återhämtning, uppvärmning',
    },
    {
      zone: 2,
      name: 'Lätt',
      intensity: 'Grundkondition',
      percentMin: 60,
      percentMax: 70,
      hrMin: Math.round(maxHR * 0.6),
      hrMax: Math.round(maxHR * 0.7),
      effect: 'Grundkondition, fettförbränning',
    },
    {
      zone: 3,
      name: 'Måttlig',
      intensity: 'Aerob kapacitet',
      percentMin: 70,
      percentMax: 80,
      hrMin: Math.round(maxHR * 0.7),
      hrMax: Math.round(maxHR * 0.8),
      effect: 'Aerob kapacitet',
    },
    {
      zone: 4,
      name: 'Hård',
      intensity: 'Anaerob tröskel',
      percentMin: 80,
      percentMax: 90,
      hrMin: Math.round(maxHR * 0.8),
      hrMax: Math.round(maxHR * 0.9),
      effect: 'Anaerob tröskel',
    },
    {
      zone: 5,
      name: 'Maximal',
      intensity: 'VO₂max',
      percentMin: 90,
      percentMax: 100,
      hrMin: Math.round(maxHR * 0.9),
      hrMax: maxHR,
      effect: 'VO₂max, maximal kapacitet',
    },
  ]

  // Lägg till hastighet/watt-intervall baserat på tröskel
  if (testType === 'RUNNING' && threshold.unit === 'km/h') {
    zones.forEach((zone) => {
      const factor = zone.percentMin / threshold.percentOfMax
      zone.speedMin = Number((threshold.value * factor).toFixed(1))
      zone.speedMax = Number((threshold.value * (zone.percentMax / threshold.percentOfMax)).toFixed(1))
    })
  } else if (testType === 'CYCLING' && threshold.unit === 'watt') {
    zones.forEach((zone) => {
      const factor = zone.percentMin / threshold.percentOfMax
      zone.powerMin = Math.round(threshold.value * factor)
      zone.powerMax = Math.round(threshold.value * (zone.percentMax / threshold.percentOfMax))
    })
  }

  return zones
}
