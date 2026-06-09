/**
 * Estimated training load for planned team practices (session-RPE model).
 *
 * Each practice block gets an estimated RPE from its focus, scaled by the
 * practice-wide intensity. Load follows the same sRPE convention as the
 * cardio focus-mode logging: TSS ≈ duration(min) × (RPE / 10).
 *
 * Used client-side (PracticePlanner preview) and server-side (writing
 * TrainingLoad entries when a practice is saved to the calendar) — keep pure.
 */

export type PracticeBlockFocus =
  | 'warmup'
  | 'skill'
  | 'skating'
  | 'tactical'
  | 'specialTeams'
  | 'smallArea'
  | 'conditioning'
  | 'game'
  | 'cooldown'

export interface PracticeLoadBlock {
  focus: PracticeBlockFocus | string
  durationMinutes: number
}

export interface PracticeLoadEstimate {
  totalLoad: number
  totalMinutes: number
  averageRpe: number
  perBlock: { rpe: number; load: number }[]
}

const FOCUS_BASE_RPE: Record<PracticeBlockFocus, number> = {
  warmup: 3,
  skill: 5,
  skating: 7,
  tactical: 5,
  specialTeams: 5,
  smallArea: 7.5,
  conditioning: 8.5,
  game: 7,
  cooldown: 2,
}

const INTENSITY_MULTIPLIER: Record<string, number> = {
  low: 0.8,
  moderate: 1.0,
  high: 1.15,
  matchLike: 1.3,
}

const DEFAULT_BLOCK_RPE = 5

export function estimatePracticeLoad(
  blocks: PracticeLoadBlock[],
  practiceIntensity: string
): PracticeLoadEstimate {
  const multiplier = INTENSITY_MULTIPLIER[practiceIntensity] ?? 1.0

  let totalLoad = 0
  let totalMinutes = 0
  let rpeWeightedSum = 0

  const perBlock = blocks.map((block) => {
    const duration = Math.max(0, block.durationMinutes || 0)
    const baseRpe = FOCUS_BASE_RPE[block.focus as PracticeBlockFocus] ?? DEFAULT_BLOCK_RPE
    const rpe = Math.min(10, Math.max(1, baseRpe * multiplier))
    const load = duration * (rpe / 10)
    totalLoad += load
    totalMinutes += duration
    rpeWeightedSum += rpe * duration
    return { rpe: Math.round(rpe * 10) / 10, load: Math.round(load) }
  })

  return {
    totalLoad: Math.round(totalLoad),
    totalMinutes,
    averageRpe: totalMinutes > 0 ? Math.round((rpeWeightedSum / totalMinutes) * 10) / 10 : 0,
    perBlock,
  }
}

/** Map an average RPE to the TrainingLoad intensity scale. */
export function practiceIntensityLabel(averageRpe: number): string {
  if (averageRpe <= 3) return 'EASY'
  if (averageRpe <= 5) return 'MODERATE'
  if (averageRpe <= 7) return 'HARD'
  return 'VERY_HARD'
}
