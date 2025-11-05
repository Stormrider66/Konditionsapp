// lib/calculations/cycling.ts
import { Threshold, PowerZone, Gender, TestStage, CyclingData } from '@/types'
import { calculateWattsPerKg } from './economy'

/**
 * Beräkna FTP (Functional Threshold Power) från anaerob tröskel
 * FTP motsvarar effekten vid 4 mmol/L laktat
 */
export function calculateFTP(anaerobicThreshold: Threshold): number {
  console.log('calculateFTP called with:', anaerobicThreshold)
  if (anaerobicThreshold.unit !== 'watt') {
    throw new Error('FTP kan endast beräknas för cykeltester')
  }
  const ftp = Math.round(anaerobicThreshold.value)
  console.log('Calculated FTP:', ftp)
  return ftp
}

/**
 * Beräkna power zones baserat på FTP
 * Använder 7-zonsmodellen som är standard inom cykling
 */
export function calculatePowerZones(ftp: number): PowerZone[] {
  const zones: PowerZone[] = [
    {
      zone: 1,
      name: 'Active Recovery',
      percentMin: 0,
      percentMax: 55,
      powerMin: 0,
      powerMax: Math.round(ftp * 0.55),
      description: 'Aktiv återhämtning, mycket låg intensitet',
    },
    {
      zone: 2,
      name: 'Endurance',
      percentMin: 56,
      percentMax: 75,
      powerMin: Math.round(ftp * 0.56),
      powerMax: Math.round(ftp * 0.75),
      description: 'Grundträning, lång långsam distans',
    },
    {
      zone: 3,
      name: 'Tempo',
      percentMin: 76,
      percentMax: 90,
      powerMin: Math.round(ftp * 0.76),
      powerMax: Math.round(ftp * 0.90),
      description: 'Tempo, aerob kapacitet',
    },
    {
      zone: 4,
      name: 'Lactate Threshold',
      percentMin: 91,
      percentMax: 105,
      powerMin: Math.round(ftp * 0.91),
      powerMax: Math.round(ftp * 1.05),
      description: 'Laktattröskel, "sweet spot"',
    },
    {
      zone: 5,
      name: 'VO2 Max',
      percentMin: 106,
      percentMax: 120,
      powerMin: Math.round(ftp * 1.06),
      powerMax: Math.round(ftp * 1.20),
      description: 'VO2 max intervaller',
    },
    {
      zone: 6,
      name: 'Anaerobic Capacity',
      percentMin: 121,
      percentMax: 150,
      powerMin: Math.round(ftp * 1.21),
      powerMax: Math.round(ftp * 1.50),
      description: 'Anaerob kapacitet, korta intervaller',
    },
    {
      zone: 7,
      name: 'Neuromuscular',
      percentMin: 151,
      percentMax: 200,
      powerMin: Math.round(ftp * 1.51),
      powerMax: Math.round(ftp * 2.0),
      description: 'Neuromuskulär träning, sprint',
    },
  ]

  return zones
}

/**
 * Utvärdera cykelkraft baserat på watt/kg, ålder och kön
 * Använder generella riktlinjer för cyklister
 */
export function evaluateCyclingPower(
  wattsPerKg: number,
  age: number,
  gender: Gender
): string {
  // Bedömningskriterier (generella riktlinjer)
  let thresholds: number[]

  if (gender === 'MALE') {
    thresholds = [2.0, 3.0, 4.0, 5.0]
    if (wattsPerKg < thresholds[0]) {
      return 'Nybörjare - Bra utgångspunkt för träning'
    } else if (wattsPerKg < thresholds[1]) {
      return 'Motionär - God grundnivå'
    } else if (wattsPerKg < thresholds[2]) {
      return 'Vältränad - Mycket god cykelkraft'
    } else if (wattsPerKg < thresholds[3]) {
      return 'Mycket vältränad - Tävlingsnivå'
    } else {
      return 'Elitnivå - Exceptionell cykelkraft'
    }
  } else {
    thresholds = [1.5, 2.5, 3.5, 4.5]
    if (wattsPerKg < thresholds[0]) {
      return 'Nybörjare - Bra utgångspunkt för träning'
    } else if (wattsPerKg < thresholds[1]) {
      return 'Motionär - God grundnivå'
    } else if (wattsPerKg < thresholds[2]) {
      return 'Vältränad - Mycket god cykelkraft'
    } else if (wattsPerKg < thresholds[3]) {
      return 'Mycket vältränad - Tävlingsnivå'
    } else {
      return 'Elitnivå - Exceptionell cykelkraft'
    }
  }
}

/**
 * Beräkna alla cykel-specifika data
 */
export function calculateCyclingData(
  stages: TestStage[],
  anaerobicThreshold: Threshold,
  weight: number,
  age: number,
  gender: Gender
): CyclingData {
  // Beräkna FTP
  const ftp = calculateFTP(anaerobicThreshold)

  // Beräkna genomsnittlig watt/kg vid tröskel
  const wattsPerKg = calculateWattsPerKg(ftp, weight)

  // Beräkna power zones
  const powerZones = calculatePowerZones(ftp)

  // Utvärdera cykelkraft
  const evaluation = evaluateCyclingPower(wattsPerKg, age, gender)

  return {
    ftp,
    wattsPerKg,
    powerZones,
    evaluation,
  }
}

/**
 * Beräkna watt/kg för alla stages (för detaljerad analys)
 */
export function calculateStageWattsPerKg(stages: TestStage[], weight: number): TestStage[] {
  return stages.map((stage) => ({
    ...stage,
    wattsPerKg: stage.power ? calculateWattsPerKg(stage.power, weight) : undefined,
  }))
}
