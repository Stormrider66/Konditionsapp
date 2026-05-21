// lib/calculations/cycling.ts
import { Threshold, PowerZone, Gender, TestStage, CyclingData } from '@/types'
import { calculateWattsPerKg } from './economy'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

/**
 * Beräkna FTP (Functional Threshold Power) från anaerob tröskel
 * FTP motsvarar effekten vid 4 mmol/L laktat
 */
export function calculateFTP(anaerobicThreshold: Threshold): number {
  logger.debug('calculateFTP called', { threshold: anaerobicThreshold })
  if (anaerobicThreshold.unit !== 'watt') {
    throw new Error('FTP can only be calculated for cycling tests')
  }
  const ftp = Math.round(anaerobicThreshold.value)
  logger.debug('Calculated FTP', { ftp })
  return ftp
}

/**
 * Beräkna power zones baserat på FTP
 * Använder 7-zonsmodellen som är standard inom cykling
 */
export function calculatePowerZones(ftp: number, locale: AppLocale = 'en'): PowerZone[] {
  const descriptions = locale === 'sv'
    ? {
        activeRecovery: 'Aktiv återhämtning, mycket låg intensitet',
        endurance: 'Grundträning, lång långsam distans',
        tempo: 'Tempo, aerob kapacitet',
        threshold: 'Laktattröskel, "sweet spot"',
        vo2max: 'VO2 max intervaller',
        anaerobic: 'Anaerob kapacitet, korta intervaller',
        neuromuscular: 'Neuromuskulär träning, sprint',
      }
    : {
        activeRecovery: 'Active recovery, very low intensity',
        endurance: 'Base training, long slow distance',
        tempo: 'Tempo, aerobic capacity',
        threshold: 'Lactate threshold, "sweet spot"',
        vo2max: 'VO2 max intervals',
        anaerobic: 'Anaerobic capacity, short intervals',
        neuromuscular: 'Neuromuscular training, sprint',
      }

  const zones: PowerZone[] = [
    {
      zone: 1,
      name: 'Active Recovery',
      percentMin: 0,
      percentMax: 55,
      powerMin: 0,
      powerMax: Math.round(ftp * 0.55),
      description: descriptions.activeRecovery,
    },
    {
      zone: 2,
      name: 'Endurance',
      percentMin: 56,
      percentMax: 75,
      powerMin: Math.round(ftp * 0.56),
      powerMax: Math.round(ftp * 0.75),
      description: descriptions.endurance,
    },
    {
      zone: 3,
      name: 'Tempo',
      percentMin: 76,
      percentMax: 90,
      powerMin: Math.round(ftp * 0.76),
      powerMax: Math.round(ftp * 0.90),
      description: descriptions.tempo,
    },
    {
      zone: 4,
      name: 'Lactate Threshold',
      percentMin: 91,
      percentMax: 105,
      powerMin: Math.round(ftp * 0.91),
      powerMax: Math.round(ftp * 1.05),
      description: descriptions.threshold,
    },
    {
      zone: 5,
      name: 'VO2 Max',
      percentMin: 106,
      percentMax: 120,
      powerMin: Math.round(ftp * 1.06),
      powerMax: Math.round(ftp * 1.20),
      description: descriptions.vo2max,
    },
    {
      zone: 6,
      name: 'Anaerobic Capacity',
      percentMin: 121,
      percentMax: 150,
      powerMin: Math.round(ftp * 1.21),
      powerMax: Math.round(ftp * 1.50),
      description: descriptions.anaerobic,
    },
    {
      zone: 7,
      name: 'Neuromuscular',
      percentMin: 151,
      percentMax: 200,
      powerMin: Math.round(ftp * 1.51),
      powerMax: Math.round(ftp * 2.0),
      description: descriptions.neuromuscular,
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
  gender: Gender,
  locale: AppLocale = 'en'
): string {
  // Bedömningskriterier (generella riktlinjer)
  const labels = locale === 'sv'
    ? {
        beginner: 'Nybörjare - Bra utgångspunkt för träning',
        recreational: 'Motionär - God grundnivå',
        trained: 'Vältränad - Mycket god cykelkraft',
        competitive: 'Mycket vältränad - Tävlingsnivå',
        elite: 'Elitnivå - Exceptionell cykelkraft',
      }
    : {
        beginner: 'Beginner - Good starting point for training',
        recreational: 'Recreational - Good base level',
        trained: 'Trained - Very good cycling power',
        competitive: 'Highly trained - Competitive level',
        elite: 'Elite level - Exceptional cycling power',
      }
  let thresholds: number[]

  if (gender === 'MALE') {
    thresholds = [2.0, 3.0, 4.0, 5.0]
    if (wattsPerKg < thresholds[0]) {
      return labels.beginner
    } else if (wattsPerKg < thresholds[1]) {
      return labels.recreational
    } else if (wattsPerKg < thresholds[2]) {
      return labels.trained
    } else if (wattsPerKg < thresholds[3]) {
      return labels.competitive
    } else {
      return labels.elite
    }
  } else {
    thresholds = [1.5, 2.5, 3.5, 4.5]
    if (wattsPerKg < thresholds[0]) {
      return labels.beginner
    } else if (wattsPerKg < thresholds[1]) {
      return labels.recreational
    } else if (wattsPerKg < thresholds[2]) {
      return labels.trained
    } else if (wattsPerKg < thresholds[3]) {
      return labels.competitive
    } else {
      return labels.elite
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
  gender: Gender,
  locale: AppLocale = 'en'
): CyclingData {
  // Beräkna FTP
  const ftp = calculateFTP(anaerobicThreshold)

  // Beräkna genomsnittlig watt/kg vid tröskel
  const wattsPerKg = calculateWattsPerKg(ftp, weight)

  // Beräkna power zones
  const powerZones = calculatePowerZones(ftp, locale)

  // Utvärdera cykelkraft
  const evaluation = evaluateCyclingPower(wattsPerKg, age, gender, locale)

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
