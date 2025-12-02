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
import { ZonePaces, ZonePowers, getZonePace, getZonePower, getZoneHR, speedToPace, paceToSpeed } from './zone-calculator'

/**
 * Calculate distance for warmup/cooldown segments
 * Uses Zone 1 pace (easy pace) for calculation
 */
function calculateWarmupCooldownDistance(durationMinutes: number, zones: ZonePaces): number {
  const zone1SpeedKmh = paceToSpeed(zones.zone1)
  const distance = (durationMinutes / 60) * zone1SpeedKmh
  return Math.round(distance * 10) / 10 // Round to 0.1km
}

/**
 * Calculate total distance from all segments (warmup + work + cooldown)
 * This gives accurate weekly km totals
 */
function calculateTotalDistanceFromSegments(segments: CreateWorkoutSegmentDTO[]): number {
  const total = segments.reduce((sum, seg) => sum + (seg.distance || 0), 0)
  return Math.round(total * 10) / 10 // Round to 0.1km
}

/**
 * Long run params interface
 */
interface LongRunParams {
  distance: number
  progressive?: boolean
  alternating?: boolean
  segments?: Array<{ distance: number; pacePercent: number }>
  fastPacePercent?: number
  slowPacePercent?: number
  pacePercent?: number
  marathonPace?: number // km/h
  description?: string
}

/**
 * Build a long run workout
 * Supports: continuous, progressive (with MP finish), and alternating pace
 */
export function buildLongRun(
  params: LongRunParams | number | undefined,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  // Handle legacy call with just distance
  const longParams: LongRunParams = typeof params === 'number' || params === undefined
    ? { distance: params ?? 15 }
    : params

  const distance = longParams.distance ?? 15
  const marathonPaceKmh = longParams.marathonPace || 12.0 // Default ~5:00/km
  const segments: CreateWorkoutSegmentDTO[] = []

  // Warm-up (10 min Zone 1)
  const warmupDistance = calculateWarmupCooldownDistance(10, zones)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 10,
    distance: warmupDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Lugn uppvärmning ${warmupDistance}km`,
  })

  // === PROGRESSIVE LONG RUN (with MP finish) ===
  if (longParams.progressive && longParams.segments && longParams.segments.length > 0) {
    let order = 2
    for (const seg of longParams.segments) {
      const segPaceKmh = marathonPaceKmh * (seg.pacePercent / 100)
      const segPaceMinKm = speedToPace(segPaceKmh)
      const segDuration = Math.round((seg.distance / segPaceKmh) * 60)

      // Determine zone based on pace percent
      const zone = seg.pacePercent >= 98 ? 3 : seg.pacePercent >= 85 ? 2 : 1

      segments.push({
        order: order++,
        type: 'work',
        duration: segDuration,
        distance: seg.distance,
        zone,
        pace: segPaceMinKm,
        heartRate: getZoneHR(trainingZones, zone),
        description: seg.pacePercent >= 95
          ? `MP-avslutning ${seg.distance}km @ ${seg.pacePercent}% MP`
          : `Lugnt tempo ${seg.distance}km @ ${seg.pacePercent}% MP`,
      })
    }

    // Cool-down
    const cooldownDistance = calculateWarmupCooldownDistance(10, zones)
    segments.push({
      order: order,
      type: 'cooldown',
      duration: 10,
      distance: cooldownDistance,
      zone: 1,
      pace: zones.zone1,
      heartRate: getZoneHR(trainingZones, 1),
      description: `Lugn avslutning ${cooldownDistance}km`,
    })

    const totalDuration = segments.reduce((sum, s) => sum + (s.duration || 0), 0)
    const mpSegments = longParams.segments.filter(s => s.pacePercent >= 95)
    const mpKm = mpSegments.reduce((sum, s) => sum + s.distance, 0)
    const totalDistance = calculateTotalDistanceFromSegments(segments)

    return {
      type: 'RUNNING',
      name: 'Progressivt långpass',
      intensity: 'MODERATE',
      distance: totalDistance,
      duration: totalDuration,
      instructions: longParams.description || `Progressivt långpass ${totalDistance}km med ${mpKm}km @ maratontempo.`,
      segments,
    }
  }

  // === ALTERNATING PACE LONG RUN ===
  if (longParams.alternating) {
    const fastPace = longParams.fastPacePercent || 103
    const slowPace = longParams.slowPacePercent || 90
    const fastPaceKmh = marathonPaceKmh * (fastPace / 100)
    const slowPaceKmh = marathonPaceKmh * (slowPace / 100)

    // Estimate total duration with alternating km
    const avgPaceKmh = (fastPaceKmh + slowPaceKmh) / 2
    const mainDuration = Math.round(((distance - 2) / avgPaceKmh) * 60)

    segments.push({
      order: 2,
      type: 'work',
      duration: mainDuration,
      distance: distance - 2,
      zone: 3,
      pace: `${speedToPace(fastPaceKmh)}/${speedToPace(slowPaceKmh)}`,
      heartRate: getZoneHR(trainingZones, 3),
      description: `Växlande 1km @ ${fastPace}% MP / 1km @ ${slowPace}% MP`,
      notes: 'Ingen paus mellan kilometer - direkt växling!',
    })

    const altCooldownDistance = calculateWarmupCooldownDistance(10, zones)
    segments.push({
      order: 3,
      type: 'cooldown',
      duration: 10,
      distance: altCooldownDistance,
      zone: 1,
      pace: zones.zone1,
      heartRate: getZoneHR(trainingZones, 1),
      description: `Lugn avslutning ${altCooldownDistance}km`,
    })

    const altTotalDistance = calculateTotalDistanceFromSegments(segments)
    return {
      type: 'RUNNING',
      name: 'Växlande långpass',
      intensity: 'THRESHOLD',
      distance: altTotalDistance,
      duration: mainDuration + 20,
      instructions: longParams.description || `Specifikt långpass ${altTotalDistance}km med växlande tempo (1km snabb/1km lugn). Ingen paus!`,
      segments,
    }
  }

  // === CONTINUOUS LONG RUN (default) ===
  const basePacePercent = longParams.pacePercent || 80
  const basePaceKmh = marathonPaceKmh * (basePacePercent / 100)
  const mainDuration = Math.round(((distance - 2) / basePaceKmh) * 60)

  segments.push({
    order: 2,
    type: 'work',
    duration: mainDuration,
    distance: distance - 2,
    zone: 2,
    pace: speedToPace(basePaceKmh),
    heartRate: getZoneHR(trainingZones, 2),
    description: `Långdistans ${distance - 2}km @ ${basePacePercent}% MP`,
  })

  const contCooldownDistance = calculateWarmupCooldownDistance(10, zones)
  segments.push({
    order: 3,
    type: 'cooldown',
    duration: 10,
    distance: contCooldownDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Lugn avslutning ${contCooldownDistance}km`,
  })

  const contTotalDistance = calculateTotalDistanceFromSegments(segments)
  return {
    type: 'RUNNING',
    name: 'Långpass',
    intensity: 'EASY',
    distance: contTotalDistance,
    duration: mainDuration + 20,
    instructions: longParams.description || `Lugnt långpass på ${contTotalDistance} km @ ${basePacePercent}% MP. Fokusera på löpform och uthållighet.`,
    segments,
  }
}

/**
 * Tempo run params interface
 */
interface TempoRunParams {
  duration: number
  pacePercent?: number
  marathonPace?: number // km/h
  progressiveFinish?: boolean
  progressiveMinutes?: number
  progressivePacePercent?: number
  description?: string
}

/**
 * Build a tempo run (fundamental or threshold workout)
 * Supports: continuous tempo or progressive finish at MP
 */
export function buildTempoRun(
  params: TempoRunParams | number,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  // Handle legacy call with just duration
  const tempoParams: TempoRunParams = typeof params === 'number'
    ? { duration: params }
    : params

  const duration = tempoParams.duration
  const marathonPaceKmh = tempoParams.marathonPace || 12.0
  const basePacePercent = tempoParams.pacePercent || 90 // Default to 90% MP (fundamental)
  const segments: CreateWorkoutSegmentDTO[] = []

  // Warm-up (15 min Zone 1-2)
  const tempoWarmupDistance = calculateWarmupCooldownDistance(15, zones)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 15,
    distance: tempoWarmupDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Uppvärmning ${tempoWarmupDistance}km, gradvis ökande tempo`,
  })

  // === PROGRESSIVE TEMPO (with MP finish) ===
  if (tempoParams.progressiveFinish && tempoParams.progressiveMinutes) {
    const fundamentalDuration = duration - tempoParams.progressiveMinutes
    const progressivePace = tempoParams.progressivePacePercent || 98
    const fundamentalPaceKmh = marathonPaceKmh * (basePacePercent / 100)
    const progressivePaceKmh = marathonPaceKmh * (progressivePace / 100)

    // Fundamental portion
    if (fundamentalDuration > 0) {
      const fundamentalDistance = (fundamentalDuration / 60) * fundamentalPaceKmh
      segments.push({
        order: 2,
        type: 'work',
        duration: fundamentalDuration,
        distance: Math.round(fundamentalDistance * 10) / 10,
        zone: 2,
        pace: speedToPace(fundamentalPaceKmh),
        heartRate: getZoneHR(trainingZones, 2),
        description: `Fundamental tempo @ ${basePacePercent}% MP`,
      })
    }

    // Progressive finish at MP
    const progressiveDistance = (tempoParams.progressiveMinutes / 60) * progressivePaceKmh
    segments.push({
      order: 3,
      type: 'work',
      duration: tempoParams.progressiveMinutes,
      distance: Math.round(progressiveDistance * 10) / 10,
      zone: 3,
      pace: speedToPace(progressivePaceKmh),
      heartRate: getZoneHR(trainingZones, 3),
      description: `MP-avslutning @ ${progressivePace}% MP`,
      notes: 'Öka till maratontempo!',
    })

    // Cool-down
    const progTempoCooldownDistance = calculateWarmupCooldownDistance(10, zones)
    segments.push({
      order: 4,
      type: 'cooldown',
      duration: 10,
      distance: progTempoCooldownDistance,
      zone: 1,
      pace: zones.zone1,
      heartRate: getZoneHR(trainingZones, 1),
      description: `Lugn nedvärmning ${progTempoCooldownDistance}km`,
    })

    const progTempoTotalDistance = calculateTotalDistanceFromSegments(segments)

    return {
      type: 'RUNNING',
      name: 'Progressivt tempo',
      intensity: 'MODERATE',
      duration: duration + 25,
      distance: progTempoTotalDistance,
      instructions: tempoParams.description || `Progressivt tempopass ${progTempoTotalDistance}km: ${fundamentalDuration}min @ ${basePacePercent}% MP + ${tempoParams.progressiveMinutes}min @ ${progressivePace}% MP.`,
      segments,
    }
  }

  // === CONTINUOUS TEMPO (Canova fundamental pace) ===
  const tempoPaceKmh = marathonPaceKmh * (basePacePercent / 100)
  const tempoDistance = (duration / 60) * tempoPaceKmh

  segments.push({
    order: 2,
    type: 'work',
    duration,
    distance: Math.round(tempoDistance * 10) / 10,
    zone: basePacePercent >= 90 ? 3 : 2,
    pace: speedToPace(tempoPaceKmh),
    heartRate: getZoneHR(trainingZones, basePacePercent >= 90 ? 3 : 2),
    description: `Tempo @ ${basePacePercent}% MP`,
    notes: 'Håll jämnt tempo. Ska kännas kontrollerat.',
  })

  // Cool-down
  const tempoCooldownDistance = calculateWarmupCooldownDistance(10, zones)
  segments.push({
    order: 3,
    type: 'cooldown',
    duration: 10,
    distance: tempoCooldownDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Lugn nedvärmning ${tempoCooldownDistance}km`,
  })

  const tempoTotalDistance = calculateTotalDistanceFromSegments(segments)
  return {
    type: 'RUNNING',
    name: basePacePercent >= 90 ? 'Tempopass' : 'Fundamental tempo',
    intensity: basePacePercent >= 90 ? 'THRESHOLD' : 'MODERATE',
    duration: duration + 25,
    distance: tempoTotalDistance,
    instructions: tempoParams.description || `Tempopass ${tempoTotalDistance}km: ${duration} minuter @ ${basePacePercent}% av maratontempo.`,
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
  const intervalWarmupDistance = calculateWarmupCooldownDistance(20, zones)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 20,
    distance: intervalWarmupDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Uppvärmning ${intervalWarmupDistance}km med stegringar`,
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
  const intervalCooldownDistance = calculateWarmupCooldownDistance(10, zones)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown',
    duration: 10,
    distance: intervalCooldownDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Nedvärmning ${intervalCooldownDistance}km`,
  })

  const totalDuration = 20 + reps * workDuration + (reps - 1) * restDuration + 10
  const intervalTotalDistance = calculateTotalDistanceFromSegments(segments)

  return {
    type: 'RUNNING',
    name: `Intervaller ${reps}×${workDuration}min`,
    intensity: zone >= 5 ? 'INTERVAL' : 'THRESHOLD',
    duration: totalDuration,
    distance: intervalTotalDistance,
    instructions: `Intervaller ${intervalTotalDistance}km: ${reps}×${workDuration} min i Zon ${zone} med ${restDuration} min jogg-vila.`,
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
  const hillWarmupDistance = calculateWarmupCooldownDistance(20, zones)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 20,
    distance: hillWarmupDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Uppvärmning ${hillWarmupDistance}km med stegringar`,
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
  const hillCooldownDistance = calculateWarmupCooldownDistance(10, zones)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown',
    duration: 10,
    distance: hillCooldownDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Nedvärmning ${hillCooldownDistance}km`,
  })

  const totalDuration = 20 + (reps * (workSeconds / 60)) + ((reps - 1) * restMinutes) + 10
  const hillTotalDistance = calculateTotalDistanceFromSegments(segments)

  return {
    type: 'RUNNING',
    name: `Backsprints ${reps}×${workSeconds} sek`,
    intensity: 'INTERVAL',
    duration: Math.round(totalDuration),
    distance: hillTotalDistance,
    instructions: `Backsprints ${hillTotalDistance}km: ${reps}×${workSeconds} sek maximal ansträngning uppför backe med ${restMinutes} min vila.`,
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
  const canovaWarmupDistance = calculateWarmupCooldownDistance(20, zones)
  segments.push({
    order: 1,
    type: 'warmup',
    duration: 20,
    distance: canovaWarmupDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Uppvärmning ${canovaWarmupDistance}km med stegringar`,
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
  const canovaCooldownDistance = calculateWarmupCooldownDistance(10, zones)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown',
    duration: 10,
    distance: canovaCooldownDistance,
    zone: 1,
    pace: zones.zone1,
    heartRate: getZoneHR(trainingZones, 1),
    description: `Nedvärmning ${canovaCooldownDistance}km`,
  })

  const totalDuration = 20 + (reps * workDuration) + ((reps - 1) * recoveryDuration) + 10
  const canovaTotalDistance = calculateTotalDistanceFromSegments(segments)

  return {
    type: 'RUNNING',
    name: `Intervaller ${reps}×${workDistanceKm}km`,
    intensity: zone >= 4 ? 'THRESHOLD' : 'MODERATE',
    duration: totalDuration,
    distance: canovaTotalDistance,
    instructions: `Intervaller ${canovaTotalDistance}km: ${reps}×${workDistanceKm}km @ ${workPacePercent}% MP med ${recoveryDistanceKm}km aktiv vila.`,
    segments,
  }
}

/**
 * Easy run params interface
 */
interface EasyRunParams {
  duration: number
  pacePercent?: number
  marathonPace?: number // km/h
  description?: string
}

/**
 * Build easy recovery run with distance calculation
 */
export function buildEasyRun(
  params: EasyRunParams | number,
  zones: ZonePaces,
  trainingZones: TrainingZone[]
): CreateWorkoutDTO {
  // Handle legacy call with just duration
  const easyParams: EasyRunParams = typeof params === 'number'
    ? { duration: params }
    : params

  const duration = easyParams.duration
  const marathonPaceKmh = easyParams.marathonPace || 12.0
  const pacePercent = easyParams.pacePercent || 75 // Default to 75% MP for easy runs

  // Calculate pace and distance
  const easyPaceKmh = marathonPaceKmh * (pacePercent / 100)
  const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10 // Round to 0.1km

  return {
    type: 'RUNNING',
    name: 'Lugnt löppass',
    intensity: 'EASY',
    duration,
    distance, // Now includes calculated distance!
    instructions: easyParams.description || `Lugnt återhämtningspass ${distance}km @ ${pacePercent}% MP. Fokus på återhämtning.`,
    segments: [
      {
        order: 1,
        type: 'work',
        duration,
        distance,
        zone: 2,
        pace: speedToPace(easyPaceKmh),
        heartRate: getZoneHR(trainingZones, 2),
        description: `Lugnt löppass ${distance}km`,
      },
    ],
  }
}

// Default strength exercises when database is empty (for runners)
const DEFAULT_STRENGTH_EXERCISES = {
  lower: [
    { name: 'Knäböj', description: 'Grundläggande knäböj för benstyrka. Fokusera på djup och kontroll.' },
    { name: 'Utfall', description: 'Alternerande utfall för enbensstyrka och balans.' },
    { name: 'Höftlyft', description: 'Höftlyft/Glute Bridge för gluteus och hamstrings.' },
    { name: 'Vadpress', description: 'Vadpress för vadmuskulatur - viktig för löpare.' },
  ],
  upper: [
    { name: 'Armhävningar', description: 'Armhävningar för bröst, axlar och triceps.' },
    { name: 'Rodd', description: 'Rodd-rörelse för rygg och biceps.' },
  ],
  full: [
    { name: 'Knäböj', description: 'Grundläggande knäböj för benstyrka.' },
    { name: 'Utfall', description: 'Utfall för enbensstyrka och balans.' },
    { name: 'Höftlyft', description: 'Höftlyft för gluteus och posterior kedja.' },
    { name: 'Armhävningar', description: 'Armhävningar för överkroppsstyrka.' },
  ],
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

  // If no exercises from database, use default exercises with descriptions
  if (exercises.length === 0) {
    console.log(`[buildStrengthWorkout] No exercises from DB, using default ${focus} exercises`)
    const defaultExercises = DEFAULT_STRENGTH_EXERCISES[focus] || DEFAULT_STRENGTH_EXERCISES.full

    defaultExercises.forEach((exercise, index) => {
      segments.push({
        order: index + 1,
        type: 'exercise',
        sets: scheme.sets,
        repsCount: scheme.reps,
        rest: scheme.rest,
        tempo: '3-1-1',
        description: exercise.name,
        notes: exercise.description,
      })
    })
  } else {
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
  }

  const exerciseCount = exercises.length > 0 ? exercises.length : DEFAULT_STRENGTH_EXERCISES[focus]?.length || 4
  const estimatedDuration = exerciseCount * scheme.sets * 3 // ~3 min per set

  return {
    type: 'STRENGTH',
    name: focus === 'full' ? 'Helkroppsstyrka' : focus === 'upper' ? 'Överkroppsstyrka' : 'Benstyrka',
    intensity: phase === 'PEAK' ? 'THRESHOLD' : 'MODERATE',
    duration: estimatedDuration,
    instructions: `${scheme.sets} set × ${scheme.reps} reps med ${scheme.rest}s vila. Fokusera på kontroll och form.`,
    segments,
  }
}

// Default core exercises when database is empty
const DEFAULT_CORE_EXERCISES = [
  { name: 'Planka', description: 'Planka/Plank - grundläggande core-stabilitet. Håll rak kropp.' },
  { name: 'Sidoplanka', description: 'Sidoplanka för obliques och höftstabilitet.' },
  { name: 'Dead Bug', description: 'Dead Bug - kontrollerad bålstabilitet med armar/ben.' },
  { name: 'Bird Dog', description: 'Bird Dog - rygg och core-stabilitet på alla fyra.' },
]

/**
 * Build core workout
 */
export function buildCoreWorkout(exercises: string[]): CreateWorkoutDTO {
  console.log(`[buildCoreWorkout] Building workout with ${exercises.length} exercises:`, exercises)

  const segments: CreateWorkoutSegmentDTO[] = []

  // If no exercises from database, use default core exercises
  if (exercises.length === 0) {
    console.log('[buildCoreWorkout] No exercises from DB, using default core exercises')

    DEFAULT_CORE_EXERCISES.forEach((exercise, index) => {
      segments.push({
        order: index + 1,
        type: 'exercise',
        sets: 3,
        repsCount: '45-60 sek',
        rest: 45,
        description: exercise.name,
        notes: exercise.description,
      })
    })
  } else {
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
  }

  return {
    type: 'CORE',
    name: 'Core-träning',
    intensity: 'MODERATE',
    duration: 30,
    instructions: 'Core-stabilitetsövningar. 3 set av varje övning med fokus på kontroll.',
    segments,
  }
}

// Default plyometric exercises when database is empty
const DEFAULT_PLYOMETRIC_EXERCISES = [
  { name: 'Squat Jumps', description: 'Hoppa upp från knäböj-position, mjuk landning.' },
  { name: 'Box Jumps', description: 'Hopp upp på låda/bänk, steg ner kontrollerat.' },
  { name: 'Skipping', description: 'Höga knälyft med kraft, arm-swing.' },
]

/**
 * Build plyometric workout
 */
export function buildPlyometricWorkout(exercises: string[]): CreateWorkoutDTO {
  console.log(`[buildPlyometricWorkout] Building workout with ${exercises.length} exercises:`, exercises)

  const segments: CreateWorkoutSegmentDTO[] = []

  // If no exercises from database, use default plyometric exercises
  if (exercises.length === 0) {
    console.log('[buildPlyometricWorkout] No exercises from DB, using default plyometric exercises')

    DEFAULT_PLYOMETRIC_EXERCISES.forEach((exercise, index) => {
      segments.push({
        order: index + 1,
        type: 'exercise',
        sets: 3,
        repsCount: '8-10',
        rest: 120,
        description: exercise.name,
        notes: exercise.description,
      })
    })
  } else {
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
  }

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
