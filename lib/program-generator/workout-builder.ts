// lib/program-generator/workout-builder.ts
// Build individual workout structures with segments

import {
  CreateWorkoutDTO,
  CreateWorkoutSegmentDTO,
  WorkoutType,
  WorkoutIntensity,
  TrainingZone,
  PeriodPhase,
} from '@/types'
import { ZonePaces, ZonePowers, getZonePace, getZonePower, getZoneHR, speedToPace } from './zone-calculator'

/**
 * Build a long run workout
 */
export function buildLongRun(
  distanceKm: number,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  // Long runs are typically Zone 2 with some Zone 3
  const segments: CreateWorkoutSegmentDTO[] = []

  // Warm-up (10 min Zone 1)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 10,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Lugn uppvärmning',
  })

  // Main portion (mostly Zone 2)
  const mainDuration = Math.round((distanceKm - 2) * 6) // Estimate based on Zone 2 pace
  segments.push({
    order: 2,
    type: 'work',
    duration: mainDuration,
    distance: distanceKm - 2,
    zone: 2,
    pace: zones.zone2,
    heartRate: getZoneHR(trainingZones, 2),
    description: 'Långdistans i lugnt tempo',
  })

  // Cool-down (10 min Zone 1)
  segments.push({
    order: 3,
    type: 'cooldown',
    duration: 10,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Lugn avslutning',
  })

  return {
    type: 'RUNNING',
    name: 'Långpass',
    intensity: 'EASY',
    distance: distanceKm,
    duration: mainDuration + 20,
    instructions: `Lugnt långpass på ${distanceKm} km. Håll jämnt tempo i Zon 2. Fokusera på löpform och uthalllighet.`,
    segments,
  }
}

/**
 * Build a tempo run (threshold workout)
 */
export function buildTempoRun(
  durationMinutes: number,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Warm-up (15 min Zone 1-2)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 15,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Uppvärmning gradvis ökande tempo',
  })

  // Tempo portion (Zone 4 - threshold)
  segments.push({
    order: 2,
    type: 'work',
    duration: durationMinutes,
    zone: 4,
    pace: zones.zone4,
    heartRate: getZoneHR(trainingZones, 4),
    description: 'Tempopass vid tröskel',
    notes: 'Håll jämnt tempo. Ska kännas "comfortably hard".',
  })

  // Cool-down (10 min Zone 1)
  segments.push({
    order: 3,
    type: 'cooldown',
    duration: 10,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Lugn nedvärmning',
  })

  return {
    type: 'RUNNING',
    name: 'Tempopass',
    intensity: 'THRESHOLD',
    duration: durationMinutes + 25,
    instructions: `${durationMinutes} minuter tempopass vid anaerob tröskel (Zon 4). Viktigt att hålla jämnt tempo.`,
    segments,
  }
}

/**
 * Build interval workout
 */
export function buildIntervals(
  reps: number,
  workDuration: number, // minutes
  restDuration: number, // minutes
  zone: number,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Warm-up (20 min Zone 1-2)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 20,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Uppvärmning med några stegring',
  })

  // Intervals
  for (let i = 0; i < reps; i++) {
    // Work interval
    segments.push({
      order: segments.length + 1,
      type: 'interval',
      duration: workDuration,
      zone,
      pace: getZonePace(zones, zone),
      heartRate: getZoneHR(trainingZones, zone),
      reps: 1,
      description: `Intervall ${i + 1}/${reps}`,
    })

    // Rest interval (if not last rep)
    if (i < reps - 1) {
      segments.push({
        order: segments.length + 1,
        type: 'rest',
        duration: restDuration,
        zone: 1,
        pace: zones.zone1,
        description: 'Jogg-vila',
      })
    }
  }

  // Cool-down (10 min Zone 1)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown',
    duration: 10,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Nedvärmning',
  })

  const totalDuration = 20 + reps * workDuration + (reps - 1) * restDuration + 10

  return {
    type: 'RUNNING',
    name: `Intervaller ${reps}×${workDuration}min`,
    intensity: zone >= 5 ? 'INTERVAL' : 'THRESHOLD',
    duration: totalDuration,
    instructions: `${reps}×${workDuration} min i Zon ${zone} med ${restDuration} min jogg-vila. Fokusera på att hålla tempo och form.`,
    segments,
  }
}

/**
 * Build hill sprint workout (alactic neuromuscular training)
 * Hill sprints are maximal effort uphill - no pace targets apply
 */
export function buildHillSprints(
  reps: number,
  workSeconds: number,
  restMinutes: number,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Warm-up (20 min Zone 1-2 with strides)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 20,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Uppvärmning med några stegringar',
  })

  // Hill sprints - NO pace target, maximal effort
  for (let i = 0; i < reps; i++) {
    // Work interval - Hill sprint (maximal effort, no pace)
    segments.push({
      order: segments.length + 1,
      type: 'interval',
      duration: workSeconds / 60, // Convert seconds to minutes
      zone: undefined, // No zone - this is maximal effort uphill
      pace: undefined, // NO PACE - hill sprints are effort-based, not pace-based
      heartRate: undefined, // HR will lag during short sprints
      reps: 1,
      description: `Backsprint ${i + 1}/${reps} (maximal ansträngning uppför backe)`,
      notes: workSeconds <= 15
        ? 'Alaktisk kraft: Max ansträngning 8-15 sek, fokus på explosivitet'
        : 'Neuromuskulär: Max ansträngning 30-45 sek, behåll formen',
    })

    // Rest interval (full recovery walk down)
    if (i < reps - 1) {
      segments.push({
        order: segments.length + 1,
        type: 'rest',
        duration: restMinutes,
        zone: 1,
        pace: undefined, // Walking recovery
        description: 'Gå ner backen (full återhämtning)',
        notes: 'Gå lugnt ner och återhämta fullständigt innan nästa sprint',
      })
    }
  }

  // Cool-down (10 min Zone 1)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown',
    duration: 10,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Nedvärmning',
  })

  const totalDuration = 20 + (reps * (workSeconds / 60)) + ((reps - 1) * restMinutes) + 10

  return {
    type: 'RUNNING',
    name: `Backsprints ${reps}×${workSeconds} sek`,
    intensity: 'INTERVAL',
    duration: Math.round(totalDuration),
    instructions: `${reps} backsprinter à ${workSeconds} sekunder med ${restMinutes} min full återhämtning. Maximal ansträngning uppför backe (6-8% lutning). Fokus på kraft och form, INTE på tempo.`,
    segments,
  }
}

/**
 * Build Canova-style distance-based intervals with pace percentages
 * e.g., 5×5km at marathon pace with 1km active recovery
 */
export function buildCanovaIntervals(
  reps: number,
  workDistanceKm: number,
  workPacePercent: number, // Percentage of marathon pace (e.g., 100 = marathon pace, 103 = 3% faster)
  recoveryDistanceKm: number,
  recoveryPacePercent: number,
  marathonPaceKmh: number, // Marathon pace in km/h
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Calculate actual paces
  const workPaceKmh = marathonPaceKmh * (workPacePercent / 100)
  const recoveryPaceKmh = marathonPaceKmh * (recoveryPacePercent / 100)

  // Convert to min/km for display
  const workPaceMinPerKm = speedToPace(workPaceKmh)
  const recoveryPaceMinPerKm = speedToPace(recoveryPaceKmh)

  // Calculate durations
  const workDuration = Math.round((workDistanceKm / workPaceKmh) * 60) // minutes
  const recoveryDuration = Math.round((recoveryDistanceKm / recoveryPaceKmh) * 60) // minutes

  // Determine zone based on pace percentage
  let zone: number
  let zoneHR: string | undefined
  if (workPacePercent >= 105) {
    zone = 4 // Threshold/5K pace
    zoneHR = getZoneHR(trainingZones, 4)
  } else if (workPacePercent >= 100) {
    zone = 3 // Marathon pace
    zoneHR = getZoneHR(trainingZones, 3)
  } else {
    zone = 2 // Slower than marathon
    zoneHR = getZoneHR(trainingZones, 2)
  }

  // Warm-up (20 min Zone 1-2)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 20,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Uppvärmning med några stegringar',
  })

  // Intervals
  for (let i = 0; i < reps; i++) {
    // Work interval
    segments.push({
      order: segments.length + 1,
      type: 'interval',
      duration: workDuration,
      distance: workDistanceKm,
      zone,
      pace: workPaceMinPerKm,
      heartRate: zoneHR,
      reps: 1,
      description: `Intervall ${i + 1}/${reps} (${workDistanceKm}km @ ${workPacePercent}% maratontempo)`,
      notes: workPacePercent === 100
        ? 'Håll maratontempo, inte snabbare!'
        : workPacePercent > 100
        ? `${workPacePercent - 100}% snabbare än maratontempo`
        : undefined,
    })

    // Recovery interval (if not last rep)
    if (i < reps - 1) {
      segments.push({
        order: segments.length + 1,
        type: 'rest',
        duration: recoveryDuration,
        distance: recoveryDistanceKm,
        zone: 2,
        pace: recoveryPaceMinPerKm,
        description: `Aktiv vila (${recoveryDistanceKm}km @ ${recoveryPacePercent}% MP)`,
        notes: 'AKTIV återhämtning - fortsätt springa i lugnt tempo, inte gå!',
      })
    }
  }

  // Cool-down (10 min Zone 1)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown',
    duration: 10,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: 'Nedvärmning',
  })

  const totalDuration = 20 + (reps * workDuration) + ((reps - 1) * recoveryDuration) + 10

  return {
    type: 'RUNNING',
    name: `Intervaller ${reps}×${workDistanceKm}km`,
    intensity: zone >= 4 ? 'THRESHOLD' : 'MODERATE',
    duration: totalDuration,
    instructions: `${reps}×${workDistanceKm}km @ ${workPacePercent}% maratontempo (${workPaceMinPerKm}) med ${recoveryDistanceKm}km aktiv vila @ ${recoveryPacePercent}% MP. Fokus på jämnt tempo och form.`,
    segments,
  }
}

/**
 * Build easy recovery run
 */
export function buildEasyRun(
  durationMinutes: number,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  return {
    type: 'RUNNING',
    name: 'Lugnt löppass',
    intensity: 'EASY',
    duration: durationMinutes,
    instructions: 'Lugnt återhämtningspass i Zon 1-2. Fokus på återhämtning.',
    segments: [
      {
        order: 1,
        type: 'work',
        duration: durationMinutes,
        zone: 2,
        pace: zones.zone2,
        heartRate: getZoneHR(trainingZones, 2),
        description: 'Lugnt löppass',
      },
    ],
  }
}

/**
 * Build strength workout
 */
export function buildStrengthWorkout(
  phase: PeriodPhase,
  focus: 'upper' | 'lower' | 'full',
  exercises: string[] // Exercise IDs from database
): CreateWorkoutDTO {
  console.log(`[buildStrengthWorkout] Building workout with ${exercises.length} exercises:`, exercises)

  const segments: CreateWorkoutSegmentDTO[] = []

  // Reps/sets vary by phase
  const repScheme = {
    BASE: { sets: 3, reps: '12-15', rest: 90 },
    BUILD: { sets: 4, reps: '8-10', rest: 120 },
    PEAK: { sets: 3, reps: '6-8', rest: 180 },
    TAPER: { sets: 2, reps: '8-10', rest: 90 },
    RECOVERY: { sets: 2, reps: '12-15', rest: 60 },
    TRANSITION: { sets: 3, reps: '10-12', rest: 90 },
  }

  const scheme = repScheme[phase]

  exercises.forEach((exerciseId, index) => {
    segments.push({
      order: index + 1,
      type: 'exercise',
      exerciseId,
      sets: scheme.sets,
      repsCount: scheme.reps,
      rest: scheme.rest,
      tempo: '3-1-1', // 3 sec eccentric, 1 sec pause, 1 sec concentric
      description: `Set ${index + 1}`,
    })
  })

  const estimatedDuration = exercises.length * scheme.sets * 3 // ~3 min per set

  return {
    type: 'STRENGTH',
    name: focus === 'full' ? 'Helkroppsstyrka' : focus === 'upper' ? 'Överkroppsstyrka' : 'Benstyrka',
    intensity: phase === 'PEAK' ? 'THRESHOLD' : 'MODERATE',
    duration: estimatedDuration,
    instructions: `${scheme.sets} set × ${scheme.reps} reps med ${scheme.rest}s vila. Fokusera på kontroll och form.`,
    segments,
  }
}

/**
 * Build core workout
 */
export function buildCoreWorkout(exercises: string[]): CreateWorkoutDTO {
  console.log(`[buildCoreWorkout] Building workout with ${exercises.length} exercises:`, exercises)

  const segments: CreateWorkoutSegmentDTO[] = []

  exercises.forEach((exerciseId, index) => {
    segments.push({
      order: index + 1,
      type: 'exercise',
      exerciseId,
      sets: 3,
      repsCount: '45-60 sek', // Core exercises often time-based
      rest: 45,
      description: `Core övning ${index + 1}`,
    })
  })

  return {
    type: 'CORE',
    name: 'Core-träning',
    intensity: 'MODERATE',
    duration: 30,
    instructions: 'Core-stabilitetsövningar. 3 set av varje övning med fokus på kontroll.',
    segments,
  }
}

/**
 * Build plyometric workout
 */
export function buildPlyometricWorkout(exercises: string[]): CreateWorkoutDTO {
  console.log(`[buildPlyometricWorkout] Building workout with ${exercises.length} exercises:`, exercises)

  const segments: CreateWorkoutSegmentDTO[] = []

  exercises.forEach((exerciseId, index) => {
    segments.push({
      order: index + 1,
      type: 'exercise',
      exerciseId,
      sets: 3,
      repsCount: '8-10',
      rest: 120,
      description: `Plyometrisk övning ${index + 1}`,
      notes: 'Maximal explosivitet, full återhämtning mellan set',
    })
  })

  return {
    type: 'PLYOMETRIC',
    name: 'Plyometri',
    intensity: 'INTERVAL',
    duration: 35,
    instructions: 'Explosiva hopp och språng. Fokus på maximal kraft och mjuka landningar.',
    segments,
  }
}

/**
 * Build recovery/mobility workout
 */
export function buildRecoveryWorkout(): CreateWorkoutDTO {
  return {
    type: 'RECOVERY',
    name: 'Återhämtning',
    intensity: 'RECOVERY',
    duration: 30,
    instructions: 'Lätt rörlighet, stretching och foam rolling. Fokus på återhämtning.',
    segments: [
      {
        order: 1,
        type: 'work',
        duration: 30,
        description: 'Rörlighet och stretching',
        notes: 'Lugn rörlighetsträning och foam rolling',
      },
    ],
  }
}
