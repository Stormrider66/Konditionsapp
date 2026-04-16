import type { CreateWorkoutSegmentDTO } from '@/types'
import type { HYROXTemplateWorkout } from '../../templates/hyrox'
import { validateEliteZones, type EliteZonePaces } from '../../elite-pace-integration'

/**
 * Parse pace string (MM:SS or M:SS or MM:SS/km) to seconds per km.
 * Returns 0 when the input can't be parsed.
 */
export function parsePaceToSeconds(pace: string): number {
  if (!pace) return 0
  const cleanPace = pace.replace(/\/km$/i, '').trim()
  const parts = cleanPace.split(':').map(Number)
  if (parts.some(isNaN) || parts.length !== 2) return 0
  return parts[0] * 60 + parts[1]
}

/**
 * Sum real duration + distance from the generated segments, falling back
 * to the template's declared values when a segment only has pace (and we
 * can derive time from distance/pace).
 */
export function calculateTotalsFromSegments(
  segments: CreateWorkoutSegmentDTO[],
  fallbackDuration: number,
  fallbackDistanceMeters: number | undefined
): { totalDuration: number; totalDistance: number | undefined } {
  if (!segments || segments.length === 0) {
    return {
      totalDuration: fallbackDuration,
      totalDistance: fallbackDistanceMeters ? fallbackDistanceMeters / 1000 : undefined,
    }
  }

  let totalDuration = 0
  let totalDistance = 0
  let hasDistanceData = false

  for (const segment of segments) {
    if (segment.duration) {
      totalDuration += segment.duration
    } else if (segment.distance && segment.pace) {
      const paceSeconds = typeof segment.pace === 'string' ? parseInt(segment.pace, 10) : segment.pace
      if (!isNaN(paceSeconds) && paceSeconds > 0) {
        totalDuration += (segment.distance * paceSeconds) / 60
      }
    }

    if (segment.distance) {
      totalDistance += segment.distance
      hasDistanceData = true
    }
  }

  return {
    totalDuration: totalDuration > 0 ? Math.round(totalDuration) : fallbackDuration,
    totalDistance: hasDistanceData
      ? Math.round(totalDistance * 10) / 10
      : fallbackDistanceMeters
        ? fallbackDistanceMeters / 1000
        : undefined,
  }
}

export function getWorkoutPace(intensity: string, elitePaces: EliteZonePaces): string {
  switch (intensity) {
    case 'easy': return elitePaces.core.easy
    case 'moderate': return elitePaces.core.marathon
    case 'hard': return elitePaces.core.threshold
    case 'race_pace': return elitePaces.core.interval
    default: return elitePaces.core.easy
  }
}

export function getWorkoutZone(intensity: string): number {
  switch (intensity) {
    case 'easy': return 1
    case 'moderate': return 2
    case 'hard': return 3
    case 'race_pace': return 4
    default: return 2
  }
}

/**
 * Build running segments (warmup / work / cooldown / interval+rest) with
 * pace data. Returns `[]` for non-running workouts or when no pace data
 * is available. Pace is stored as numeric seconds for Focus Mode.
 *
 * Rules:
 *   - Runs ≥ 20 min or ≥ 3 km get warmup + cooldown.
 *   - Interval workouts get one segment per rep with rest in between.
 *   - Short easy runs (< 20 min and < 3 km) get a single work segment.
 */
export function createRunningSegments(
  workout: HYROXTemplateWorkout,
  elitePaces: EliteZonePaces | null,
  division?: 'open' | 'pro' | 'doubles'
): CreateWorkoutSegmentDTO[] {
  const runningTypes = ['running', 'interval', 'endurance']
  if (!runningTypes.includes(workout.type)) return []
  if (!elitePaces || !validateEliteZones(elitePaces)) return []

  const segments: CreateWorkoutSegmentDTO[] = []
  let segmentOrder = 1

  const mainPaceStr = getWorkoutPace(workout.intensity, elitePaces)
  const mainPaceSeconds = parsePaceToSeconds(mainPaceStr)
  const mainZone = getWorkoutZone(workout.intensity)

  const warmupPaceStr = elitePaces.daniels.easy.minPace
  const warmupPaceSeconds = parsePaceToSeconds(warmupPaceStr)

  const isIntervalWorkout = workout.structure && (
    workout.structure.includes('x') ||
    workout.structure.includes('×') ||
    workout.structure.includes('intervall') ||
    workout.structure.includes('800m') ||
    workout.structure.includes('1km') ||
    workout.structure.includes('400m')
  )

  const distanceKm = workout.runningDistance ? workout.runningDistance / 1000 : undefined
  const needsWarmupCooldown =
    workout.duration >= 20 || (distanceKm && distanceKm >= 3) || isIntervalWorkout

  if (isIntervalWorkout && workout.structure) {
    const intervalMatch = workout.structure.match(/(\d+)\s*[x×]\s*(\d+)\s*(km|m)/i)

    if (intervalMatch) {
      const reps = parseInt(intervalMatch[1])
      const distance = parseInt(intervalMatch[2])
      const unit = intervalMatch[3].toLowerCase()
      const intervalDistanceKm = unit === 'km' ? distance : distance / 1000

      const restMatch = workout.structure.match(/(\d+)\s*(min|sek)/i)
      let restSeconds = 120
      if (restMatch) {
        const restValue = parseInt(restMatch[1])
        const restUnit = restMatch[2].toLowerCase()
        restSeconds = restUnit === 'min' ? restValue * 60 : restValue
      }

      const warmupDurationMin = 10
      const cooldownDurationMin = 5
      const warmupDistanceKm = warmupPaceSeconds > 0
        ? Math.round((warmupDurationMin / (warmupPaceSeconds / 60)) * 10) / 10
        : 1.5
      const cooldownDistanceKm = warmupPaceSeconds > 0
        ? Math.round((cooldownDurationMin / (warmupPaceSeconds / 60)) * 10) / 10
        : 0.8

      segments.push({
        order: segmentOrder++,
        type: 'warmup',
        duration: warmupDurationMin,
        distance: warmupDistanceKm,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Uppvärmning ${warmupDistanceKm} km @ ${warmupPaceStr}`,
      })

      // Short intervals (≤ 1 km) are paced faster than the workout's main pace.
      const isShortInterval = intervalDistanceKm <= 1
      const intervalPaceStr = isShortInterval ? elitePaces.core.interval : mainPaceStr
      const intervalPaceSeconds = parsePaceToSeconds(intervalPaceStr)
      const intervalZone = isShortInterval ? 4 : mainZone

      for (let rep = 1; rep <= reps; rep++) {
        const partnerNote = division === 'doubles' ? ` (Partner ${rep % 2 === 1 ? 'A' : 'B'})` : ''

        segments.push({
          order: segmentOrder++,
          type: 'interval',
          distance: intervalDistanceKm,
          pace: intervalPaceSeconds.toString(),
          zone: intervalZone,
          description: `Intervall ${rep}/${reps}: ${distance}${unit} @ ${intervalPaceStr}${partnerNote}`,
        })

        if (rep < reps) {
          segments.push({
            order: segmentOrder++,
            type: 'rest',
            duration: Math.round(restSeconds / 60),
            zone: 1,
            description: `Vila ${restSeconds >= 60 ? Math.round(restSeconds / 60) + ' min' : restSeconds + ' sek'}`,
          })
        }
      }

      segments.push({
        order: segmentOrder++,
        type: 'cooldown',
        duration: cooldownDurationMin,
        distance: cooldownDistanceKm,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Nedvarvning ${cooldownDistanceKm} km @ ${warmupPaceStr}`,
      })
    } else {
      // Generic interval structure — we can't parse reps but still add
      // warmup/cooldown around the main block.
      const warmupDist = warmupPaceSeconds > 0
        ? Math.round((10 / (warmupPaceSeconds / 60)) * 10) / 10
        : 1.5
      const cooldownDist = warmupPaceSeconds > 0
        ? Math.round((5 / (warmupPaceSeconds / 60)) * 10) / 10
        : 0.8

      segments.push({
        order: segmentOrder++,
        type: 'warmup',
        duration: 10,
        distance: warmupDist,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Uppvärmning ${warmupDist} km @ ${warmupPaceStr}`,
      })
      segments.push({
        order: segmentOrder++,
        type: 'work',
        duration: workout.duration - 15,
        pace: mainPaceSeconds.toString(),
        zone: mainZone,
        description: workout.name,
      })
      segments.push({
        order: segmentOrder++,
        type: 'cooldown',
        duration: 5,
        distance: cooldownDist,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Nedvarvning ${cooldownDist} km @ ${warmupPaceStr}`,
      })
    }
  } else if (needsWarmupCooldown) {
    // Continuous run ≥ 20 min / ≥ 3 km: warmup + single work + cooldown.
    const warmupDuration = 10
    const cooldownDuration = 5
    const warmupDistanceKm = warmupPaceSeconds > 0
      ? Math.round((warmupDuration / (warmupPaceSeconds / 60)) * 10) / 10
      : 1.5
    const cooldownDistanceKm = warmupPaceSeconds > 0
      ? Math.round((cooldownDuration / (warmupPaceSeconds / 60)) * 10) / 10
      : 0.8

    segments.push({
      order: segmentOrder++,
      type: 'warmup',
      duration: warmupDuration,
      distance: warmupDistanceKm,
      pace: warmupPaceSeconds.toString(),
      zone: 2,
      description: `Uppvärmning ${warmupDistanceKm} km @ ${warmupPaceStr}`,
    })

    // The template distance IS the main workout; warmup/cooldown are additional.
    const mainDuration = distanceKm
      ? undefined
      : Math.max(workout.duration - warmupDuration - cooldownDuration, 10)
    const mainDistance = distanceKm

    if (workout.intensity === 'easy' && distanceKm && distanceKm > 8) {
      const easyMinSeconds = parsePaceToSeconds(elitePaces.daniels.easy.minPace)
      segments.push({
        order: segmentOrder++,
        type: 'work',
        distance: mainDistance,
        duration: mainDuration,
        pace: easyMinSeconds.toString(),
        zone: 1,
        description: `Huvudpass ${mainDistance ? mainDistance.toFixed(1) + ' km' : mainDuration + ' min'} @ ${elitePaces.daniels.easy.minPace}-${elitePaces.daniels.easy.maxPace}`,
      })
    } else {
      segments.push({
        order: segmentOrder++,
        type: 'work',
        distance: mainDistance,
        duration: mainDuration,
        pace: mainPaceSeconds.toString(),
        zone: mainZone,
        description: `Huvudpass ${mainDistance ? mainDistance.toFixed(1) + ' km' : mainDuration + ' min'} @ ${mainPaceStr}`,
      })
    }

    segments.push({
      order: segmentOrder++,
      type: 'cooldown',
      duration: cooldownDuration,
      distance: cooldownDistanceKm,
      pace: warmupPaceSeconds.toString(),
      zone: 2,
      description: `Nedvarvning ${cooldownDistanceKm} km @ ${warmupPaceStr}`,
    })
  } else {
    // Short run: single work segment.
    segments.push({
      order: segmentOrder++,
      type: 'work',
      duration: workout.duration,
      distance: distanceKm,
      pace: mainPaceSeconds.toString(),
      zone: mainZone,
      description: workout.name,
    })
  }

  return segments
}
