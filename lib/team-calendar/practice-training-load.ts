/**
 * Writes estimated TrainingLoad entries for a planned team practice so the
 * on-ice load shows up in each athlete's ACWR monitoring.
 *
 * One PRACTICE_TSS row per attending team member per practice instance,
 * keyed by workoutId = TeamEvent id so re-syncs are idempotent. Players
 * marked ABSENT in the event's attendance list are skipped; ATTENDING,
 * UNKNOWN and unlisted players are assumed to take part. The nightly
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

interface PracticeEventInput {
  id: string
  startDate: Date
  attendance?: unknown
}

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
 * Roster members who should receive load for an event, given its attendance
 * list (TeamEvent.attendance Json: [{ clientId, status }]). Only an explicit
 * ABSENT excludes a player — UNKNOWN or unlisted players are assumed present.
 */
export function eligiblePracticeClientIds(rosterIds: string[], attendance: unknown): string[] {
  if (!Array.isArray(attendance)) return rosterIds

  const absent = new Set<string>()
  for (const raw of attendance) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as { clientId?: unknown; status?: unknown }
    if (typeof entry.clientId === 'string' && entry.status === 'ABSENT') {
      absent.add(entry.clientId)
    }
  }
  if (absent.size === 0) return rosterIds
  return rosterIds.filter((id) => !absent.has(id))
}

/**
 * Sync estimated practice load for one or more TeamEvent instances sharing
 * the same practice plan. Previous estimates for these events are always
 * replaced, so attendance or plan changes shrink load as well as grow it.
 * Never throws — a load-sync failure must not block saving the practice.
 * Returns the number of TrainingLoad rows written.
 */
export async function syncPracticeTrainingLoad(options: {
  teamId: string
  events: PracticeEventInput[]
  practicePlan: unknown
}): Promise<number> {
  try {
    if (options.events.length === 0) return 0

    // Idempotent re-sync: replace any previous estimates for these events
    await prisma.trainingLoad.deleteMany({
      where: {
        loadType: PRACTICE_LOAD_TYPE,
        workoutId: { in: options.events.map((event) => event.id) },
      },
    })

    const extracted = extractLoadBlocks(options.practicePlan)
    if (!extracted) return 0

    const estimate = estimatePracticeLoad(extracted.blocks, extracted.intensity)
    if (estimate.totalLoad <= 0) return 0

    const roster = await prisma.client.findMany({
      where: { teamId: options.teamId },
      select: { id: true },
    })
    if (roster.length === 0) return 0

    const rosterIds = roster.map((client) => client.id)
    const intensity = practiceIntensityLabel(estimate.averageRpe)

    const rows = options.events.flatMap((event) => {
      const date = new Date(event.startDate)
      date.setHours(0, 0, 0, 0)
      return eligiblePracticeClientIds(rosterIds, event.attendance).map((clientId) => ({
        clientId,
        date,
        dailyLoad: estimate.totalLoad,
        loadType: PRACTICE_LOAD_TYPE,
        duration: estimate.totalMinutes,
        intensity,
        workoutType: PRACTICE_WORKOUT_TYPE,
        workoutId: event.id,
      }))
    })
    if (rows.length === 0) return 0

    const result = await prisma.trainingLoad.createMany({ data: rows })
    return result.count
  } catch (error) {
    logger.error('Failed to sync practice training load', { teamId: options.teamId }, error)
    return 0
  }
}

/**
 * Re-sync load for events from their current database state — used after
 * attendance, practice plan, date or type updates. Events that no longer
 * exist, are not practices, or have no plan get their estimates cleared.
 */
export async function resyncPracticeTrainingLoadForEvents(eventIds: string[]): Promise<number> {
  try {
    if (eventIds.length === 0) return 0

    const events = await prisma.teamEvent.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        teamId: true,
        type: true,
        startDate: true,
        practicePlan: true,
        attendance: true,
      },
    })

    const found = new Set(events.map((event) => event.id))
    const toClear = eventIds.filter((id) => !found.has(id))
    let written = 0

    for (const event of events) {
      if (event.type !== 'PRACTICE' || !event.practicePlan) {
        toClear.push(event.id)
        continue
      }
      written += await syncPracticeTrainingLoad({
        teamId: event.teamId,
        events: [{ id: event.id, startDate: event.startDate, attendance: event.attendance }],
        practicePlan: event.practicePlan,
      })
    }

    if (toClear.length > 0) {
      await clearPracticeTrainingLoad(toClear)
    }
    return written
  } catch (error) {
    logger.error('Failed to resync practice training load', { eventIds }, error)
    return 0
  }
}

/** Remove estimated load rows for deleted (or de-planned) events. */
export async function clearPracticeTrainingLoad(eventIds: string[]): Promise<void> {
  try {
    if (eventIds.length === 0) return
    await prisma.trainingLoad.deleteMany({
      where: {
        loadType: PRACTICE_LOAD_TYPE,
        workoutId: { in: eventIds },
      },
    })
  } catch (error) {
    logger.error('Failed to clear practice training load', { eventIds }, error)
  }
}
