/**
 * Writes estimated TrainingLoad entries for a planned team practice so the
 * on-ice load shows up in each athlete's ACWR monitoring.
 *
 * One PRACTICE_TSS row per team member per practice instance, keyed by
 * workoutId = TeamEvent id so re-syncs are idempotent. The nightly
 * calculate-acwr cron sums these together with strength/cardio loads.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  estimatePracticeLoad,
  practiceIntensityLabel,
  type PracticeLoadBlock,
} from '@/lib/drills/practice-load'

export const PRACTICE_LOAD_TYPE = 'PRACTICE_TSS'
export const PRACTICE_WORKOUT_TYPE = 'TEAM_PRACTICE'

interface PracticePlanLike {
  intensity?: unknown
  blocks?: unknown
}

function extractLoadBlocks(practicePlan: unknown): { blocks: PracticeLoadBlock[]; intensity: string } | null {
  if (!practicePlan || typeof practicePlan !== 'object') return null
  const plan = practicePlan as PracticePlanLike
  if (!Array.isArray(plan.blocks)) return null

  const blocks: PracticeLoadBlock[] = []
  for (const raw of plan.blocks) {
    if (!raw || typeof raw !== 'object') continue
    const block = raw as { focus?: unknown; durationMinutes?: unknown }
    const duration = typeof block.durationMinutes === 'number' ? block.durationMinutes : 0
    if (duration <= 0) continue
    blocks.push({
      focus: typeof block.focus === 'string' ? block.focus : 'skill',
      durationMinutes: duration,
    })
  }
  if (blocks.length === 0) return null

  return {
    blocks,
    intensity: typeof plan.intensity === 'string' ? plan.intensity : 'moderate',
  }
}

/**
 * Sync estimated practice load for one or more TeamEvent instances.
 * Never throws — a load-sync failure must not block saving the practice.
 * Returns the number of TrainingLoad rows written.
 */
export async function syncPracticeTrainingLoad(options: {
  teamId: string
  events: { id: string; startDate: Date }[]
  practicePlan: unknown
}): Promise<number> {
  try {
    const extracted = extractLoadBlocks(options.practicePlan)
    if (!extracted || options.events.length === 0) return 0

    const estimate = estimatePracticeLoad(extracted.blocks, extracted.intensity)
    if (estimate.totalLoad <= 0) return 0

    const roster = await prisma.client.findMany({
      where: { teamId: options.teamId },
      select: { id: true },
    })
    if (roster.length === 0) return 0

    const intensity = practiceIntensityLabel(estimate.averageRpe)
    const eventIds = options.events.map((event) => event.id)

    // Idempotent re-sync: replace any previous estimates for these events
    await prisma.trainingLoad.deleteMany({
      where: {
        loadType: PRACTICE_LOAD_TYPE,
        workoutId: { in: eventIds },
      },
    })

    const rows = options.events.flatMap((event) => {
      const date = new Date(event.startDate)
      date.setHours(0, 0, 0, 0)
      return roster.map((client) => ({
        clientId: client.id,
        date,
        dailyLoad: estimate.totalLoad,
        loadType: PRACTICE_LOAD_TYPE,
        duration: estimate.totalMinutes,
        intensity,
        workoutType: PRACTICE_WORKOUT_TYPE,
        workoutId: event.id,
      }))
    })

    const result = await prisma.trainingLoad.createMany({ data: rows })
    return result.count
  } catch (error) {
    logger.error('Failed to sync practice training load', { teamId: options.teamId }, error)
    return 0
  }
}
