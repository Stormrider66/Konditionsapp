import type { CreateTrainingProgramDTO } from '@/types'
import { formatPaceMinKm } from '../training-paces'

/**
 * Create weeks with actual polarized workouts
 */
export function createPolarizedWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string
) {
  const weeks = []

  // Calculate phase distribution
  const baseWeeks = Math.max(Math.floor(durationWeeks * 0.4), 2)
  const buildWeeks = Math.max(Math.floor(durationWeeks * 0.35), 2)
  const peakWeeks = Math.max(Math.floor(durationWeeks * 0.15), 1)
  const taperWeeks = Math.max(durationWeeks - baseWeeks - buildWeeks - peakWeeks, 1)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
    }

    // Volume progression
    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: getWeekFocus(phase, goal),
      days: createPolarizedDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh, goal),
    })
  }

  return weeks
}

/**
 * Calculate volume percentage for week
 */
export function calculateVolumePercent(
  phase: string,
  weekInPhase: number,
  overallWeek: number,
  totalWeeks: number
): number {
  switch (phase) {
    case 'BASE':
      return 70 + weekInPhase * 3 // 70-85%
    case 'BUILD':
      return 85 + weekInPhase * 2 // 85-95%
    case 'PEAK':
      return 100 // Peak volume
    case 'TAPER':
      return 70 - weekInPhase * 10 // 70-50%
    default:
      return 80
  }
}

/**
 * Get week focus description
 */
export function getWeekFocus(phase: string, goal: string): string {
  const focusMap: Record<string, string> = {
    'BASE': 'Aerob bas och grundläggande uthållighet',
    'BUILD': 'Progressiv volymökning och tempokörningar',
    'PEAK': 'Tävlingsspecifik träning',
    'TAPER': 'Återhämtning inför tävling',
  }
  return focusMap[phase] || 'General'
}

/**
 * Create 7 days with polarized workout distribution
 */
export function createPolarizedDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string
) {
  const days = []

  // Polarized distribution: 80% easy, 20% hard
  const hardSessions = Math.max(1, Math.ceil(sessionsPerWeek * 0.20))
  const easySessions = sessionsPerWeek - hardSessions - 1 // -1 for long run

  // Assign days: Long run Sunday (7), Quality Tuesday (2) & Thursday (4), Easy other days
  const longRunDay = 7
  const qualityDays = [2, 4].slice(0, hardSessions)
  const easyDays = [1, 3, 5, 6].slice(0, Math.max(0, easySessions))

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === longRunDay && sessionsPerWeek >= 3) {
      // Long run
      const baseDuration = phase === 'TAPER' ? 60 : (phase === 'BASE' ? 75 : 90)
      const duration = baseDuration + weekInPhase * 5
      const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace
      const distance = Math.round((Math.min(duration, 150) / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Långpass - Zon 1, konversationstempo',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Långpass',
          intensity: 'EASY' as const,
          duration: Math.min(duration, 150),
          distance,
          instructions: `Lugnt långpass i Zon 1 (${formatPaceMinKm(easyPaceKmh)}/km). Ska kunna prata obehindrat.`,
          segments: [],
        }],
      })
    } else if (qualityDays.includes(dayNum)) {
      // Quality session (intervals)
      const workout = createQualityWorkout(phase, weekInPhase, marathonPaceKmh, goal)
      days.push({
        dayNumber: dayNum,
        notes: 'Kvalitetspass',
        workouts: [workout],
      })
    } else if (easyDays.includes(dayNum)) {
      // Easy run
      const duration = phase === 'TAPER' ? 30 : 40
      const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Lugn löpning',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Lugn löpning',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Lätt löpning i Zon 1 (${formatPaceMinKm(easyPaceKmh)}/km). Återhämtning.`,
          segments: [],
        }],
      })
    } else {
      // Rest day
      days.push({
        dayNumber: dayNum,
        notes: 'Vilodag',
        workouts: [],
      })
    }
  }

  return days
}

/**
 * Calculate interval pace based on work duration using Daniels' guidelines
 *
 * Pace varies by interval duration (from Daniels' Running Formula):
 * - 30-90s (Repetition): 110% VDOT = marathon × 1.31
 * - 2-3 min (Fast I): 100-105% VDOT = marathon × 1.19-1.25
 * - 3-5 min (Interval/VO2max): 98-100% VDOT = marathon × 1.17-1.19
 * - 5-8 min (Long Interval): 92-95% VDOT = marathon × 1.10-1.13
 * - 8+ min (Cruise/Threshold): 88% VDOT = marathon × 1.05
 *
 * @param marathonPaceKmh - Marathon pace in km/h
 * @param workDurationMin - Work interval duration in minutes
 * @returns Pace in km/h for the given interval duration
 */
export function getIntervalPaceForDuration(marathonPaceKmh: number, workDurationMin: number): number {
  // Daniels multipliers relative to marathon pace (marathon = 84% VDOT)
  if (workDurationMin <= 1.5) {
    // Repetition pace (30-90s): 110% VDOT = 110/84 × marathon
    return marathonPaceKmh * 1.31
  } else if (workDurationMin <= 3) {
    // Fast Interval (2-3 min): ~103% VDOT
    return marathonPaceKmh * 1.23
  } else if (workDurationMin <= 5) {
    // VO2max Interval (3-5 min): 100% VDOT = 100/84 × marathon
    return marathonPaceKmh * 1.19
  } else if (workDurationMin <= 8) {
    // Long Interval (5-8 min): ~94% VDOT - slightly slower for sustainability
    return marathonPaceKmh * 1.12
  } else {
    // Cruise Interval (8+ min): 88% VDOT (threshold pace)
    return marathonPaceKmh * 1.05
  }
}

/**
 * Create quality (interval) workout based on phase
 */
export function createQualityWorkout(
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string
) {

  // Seiler-style intervals that progress through phases
  let reps: number, workMin: number, restMin: number, name: string, description: string

  if (phase === 'BASE') {
    // Start with shorter intervals, build up
    if (weekInPhase <= 2) {
      reps = 4; workMin = 4; restMin = 2
      name = '4x4 min intervaller'
    } else if (weekInPhase <= 4) {
      reps = 4; workMin = 5; restMin = 2
      name = '4x5 min intervaller'
    } else {
      reps = 4; workMin = 6; restMin = 2
      name = '4x6 min intervaller'
    }
  } else if (phase === 'BUILD') {
    // Classic 4x8 or 5x8
    if (weekInPhase <= 3) {
      reps = 4; workMin = 7; restMin = 2
      name = '4x7 min intervaller'
    } else {
      reps = 4; workMin = 8; restMin = 2
      name = '4x8 min intervaller'
    }
  } else if (phase === 'PEAK') {
    reps = 5; workMin = 5; restMin = 2
    name = 'Tävlingsspecifika intervaller'
  } else {
    // Taper - reduced volume, maintain intensity
    reps = 3; workMin = 4; restMin = 2
    name = 'Underhållsintervaller'
  }

  // Calculate duration-appropriate interval pace (Daniels-based)
  const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace

  // Determine the actual workout pace based on phase
  // PEAK phase uses race-specific pacing, other phases use duration-based pacing
  let workoutPaceKmh: number
  if (phase === 'PEAK') {
    // Race-specific: use faster pace for 5K/10K goals
    workoutPaceKmh = goal === '5k' || goal === '10k'
      ? marathonPaceKmh * 1.19  // Interval pace (100% VDOT)
      : marathonPaceKmh * 1.08  // Slightly faster than marathon for longer races
  } else {
    // BASE, BUILD, TAPER: use duration-appropriate pace
    workoutPaceKmh = getIntervalPaceForDuration(marathonPaceKmh, workMin)
  }

  // Generate description with the actual workout pace
  if (phase === 'BASE') {
    description = `Seiler-intervaller @ ${formatPaceMinKm(workoutPaceKmh)}/km. VO2max-träning - hög intensitet men hållbar.`
  } else if (phase === 'BUILD') {
    description = `Klassiska Seiler 4x${workMin} @ ${formatPaceMinKm(workoutPaceKmh)}/km. "Isoeffort" - håll samma känsla hela vägen.`
  } else if (phase === 'PEAK') {
    description = `Race-pace intervaller @ ${formatPaceMinKm(workoutPaceKmh)}/km. Förbered dig för tävling.`
  } else {
    description = `Underhållsintervaller @ ${formatPaceMinKm(workoutPaceKmh)}/km. Håll farten utan att trötta ut dig.`
  }

  // Calculate total distance for the workout using the actual workout pace
  const workDistanceKm = (reps * workMin / 60) * workoutPaceKmh
  const restDistanceKm = ((reps - 1) * restMin / 60) * easyPaceKmh // Jogging during rest
  const warmupCooldownKm = (20 / 60) * easyPaceKmh // 20 min warmup+cooldown
  const totalDistanceKm = Math.round((workDistanceKm + restDistanceKm + warmupCooldownKm) * 10) / 10

  // Build segments array with warmup, work/rest intervals, and cooldown
  const segments = []

  // Warmup segment (10 min)
  segments.push({
    order: 1,
    type: 'warmup' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: 'Uppvärmning - lätt jogg',
  })

  // Work/rest intervals
  for (let i = 0; i < reps * 2 - 1; i++) {
    segments.push({
      order: segments.length + 1,
      type: (i % 2 === 0 ? 'work' : 'rest') as 'work' | 'rest',
      duration: i % 2 === 0 ? workMin : restMin,
      distance: undefined,
      targetPace: i % 2 === 0 ? formatPaceMinKm(workoutPaceKmh) : undefined,
      targetHeartRateZone: i % 2 === 0 ? 4 : 1,
      notes: i % 2 === 0 ? 'Arbete' : 'Vila',
    })
  }

  // Cooldown segment (10 min)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: 'Nedvarvning - lätt jogg',
  })

  return {
    type: 'RUNNING' as const,
    name,
    intensity: 'INTERVAL' as const,
    duration: (reps * workMin) + ((reps - 1) * restMin) + 20, // Add warmup/cooldown
    distance: totalDistanceKm,
    instructions: `${reps}x${workMin} min med ${restMin} min vila. ${description}`,
    segments,
  }
}

