import type { CreateTrainingProgramDTO } from '@/types'
import { formatPaceMinKm } from '../training-paces'
import { text, type SportRouterLocale } from '../locale'
import { calculateVolumePercent, getIntervalPaceForDuration } from './polarized'

// ============================================================================

/**
 * Create weeks with Pyramidal methodology
 * Pyramidal: 70% Zone 1, 20% Zone 2 (tempo), 10% Zone 3 (VO2max)
 */
export function createPyramidalWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string,
  locale: SportRouterLocale = 'en'
) {
  const weeks = []
  const baseWeeks = Math.max(Math.floor(durationWeeks * 0.4), 2)
  const buildWeeks = Math.max(Math.floor(durationWeeks * 0.35), 2)
  const peakWeeks = Math.max(Math.floor(durationWeeks * 0.15), 1)

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

    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: phase === 'BASE' ? text(locale, 'Aerobic base (70/20/10)', 'Aerob bas (70/20/10)') :
             phase === 'BUILD' ? text(locale, 'Progressive intensity', 'Progressiv intensitet') :
             phase === 'PEAK' ? text(locale, 'Race-specific', 'Tävlingsspecifik') : text(locale, 'Taper', 'Nedtrappning'),
      days: createPyramidalDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh, goal, locale),
    })
  }

  return weeks
}

/**
 * Create 7 days with Pyramidal distribution
 * Distribution: 70% easy, 20% tempo/threshold, 10% VO2max intervals
 */
export function createPyramidalDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  locale: SportRouterLocale = 'en'
) {
  const days = []
  const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace
  const tempoPaceKmh = marathonPaceKmh * 1.05 // Threshold pace (88% VDOT)
  // Interval pace will be calculated based on work duration using getIntervalPaceForDuration
  const workMin = phase === 'BASE' ? 3 : 4
  const intervalPaceKmh = getIntervalPaceForDuration(marathonPaceKmh, workMin) // Duration-aware VO2max pace

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === 7) {
      // Sunday: Long easy run (Zone 1)
      const duration = phase === 'TAPER' ? 60 : Math.min(80 + weekInPhase * 5, 120)
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Long run - Zone 1', 'Långpass - Zon 1'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'Long run', 'Långpass'),
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: text(
            locale,
            `Long run in Zone 1 (${formatPaceMinKm(easyPaceKmh)}/km). 70% of the training.`,
            `Långpass i Zon 1 (${formatPaceMinKm(easyPaceKmh)}/km). 70% av träningen.`
          ),
          segments: [],
        }],
      })
    } else if (dayNum === 2) {
      // Tuesday: Tempo/Threshold (Zone 2 - 20%)
      const tempoMinutes = phase === 'TAPER' ? 15 : Math.min(20 + weekInPhase * 2, 35)
      const totalDuration = tempoMinutes + 25 // tempo + warmup/cooldown
      // Calculate distance: tempo part at tempo pace + warmup/cooldown at easy pace
      const tempoDistanceKm = (tempoMinutes / 60) * tempoPaceKmh
      const warmupCooldownKm = (25 / 60) * easyPaceKmh
      const tempoTotalDistanceKm = Math.round((tempoDistanceKm + warmupCooldownKm) * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Tempo session - Zone 2', 'Tempopass - Zon 2'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'Tempo session', 'Tempopass'),
          intensity: 'THRESHOLD' as const,
          duration: totalDuration,
          distance: tempoTotalDistanceKm,
          instructions: text(
            locale,
            `Tempo: ${tempoMinutes} min @ ${formatPaceMinKm(tempoPaceKmh)}/km (Zone 2). Steady effort.`,
            `Tempo: ${tempoMinutes} min @ ${formatPaceMinKm(tempoPaceKmh)}/km (Zon 2). Jämn ansträngning.`
          ),
          segments: [],
        }],
      })
    } else if (dayNum === 4 && phase !== 'TAPER') {
      // Thursday: VO2max intervals (Zone 3 - 10%)
      const reps = phase === 'BASE' ? 4 : 5
      const workMin = phase === 'BASE' ? 3 : 4
      const restMin = 3
      // Calculate distance: work at interval pace + rest jogging + warmup/cooldown
      const workDistanceKm = (reps * workMin / 60) * intervalPaceKmh
      const restDistanceKm = ((reps - 1) * restMin / 60) * easyPaceKmh
      const warmupCooldownKm = (20 / 60) * easyPaceKmh
      const vo2maxTotalDistanceKm = Math.round((workDistanceKm + restDistanceKm + warmupCooldownKm) * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'VO2max intervals - Zone 3', 'VO2max-intervaller - Zon 3'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'VO2max intervals', 'VO2max-intervaller'),
          intensity: 'INTERVAL' as const,
          duration: 50,
          distance: vo2maxTotalDistanceKm,
          instructions: text(
            locale,
            `${reps}x${workMin} min @ ${formatPaceMinKm(intervalPaceKmh)}/km with 3 min recovery. High intensity (Zone 3).`,
            `${reps}×${workMin} min @ ${formatPaceMinKm(intervalPaceKmh)}/km med 3 min vila. Hög intensitet (Zon 3).`
          ),
          segments: [],
        }],
      })
    } else if ([1, 3, 5, 6].includes(dayNum) && sessionsPerWeek > 3) {
      // Easy days (Zone 1)
      const easyCount = Math.min(sessionsPerWeek - 3, 4) // Max 4 easy days
      const easyDays = [1, 3, 5, 6].slice(0, easyCount)

      if (easyDays.includes(dayNum)) {
        const duration = phase === 'TAPER' ? 30 : 40
        const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

        days.push({
          dayNumber: dayNum,
          notes: text(locale, 'Easy run - Zone 1', 'Lugn löpning - Zon 1'),
          workouts: [{
            type: 'RUNNING' as const,
            name: text(locale, 'Easy run', 'Lugn löpning'),
            intensity: 'EASY' as const,
            duration,
            distance,
            instructions: text(
              locale,
              `Easy running (${formatPaceMinKm(easyPaceKmh)}/km). Part of the 70% Zone 1 volume.`,
              `Lätt löpning (${formatPaceMinKm(easyPaceKmh)}/km). Del av 70% Zon 1.`
            ),
            segments: [],
          }],
        })
      } else {
        days.push({
          dayNumber: dayNum,
          notes: text(locale, 'Rest day', 'Vilodag'),
          workouts: [],
        })
      }
    } else {
      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Rest day', 'Vilodag'),
        workouts: [],
      })
    }
  }

  return days
}
