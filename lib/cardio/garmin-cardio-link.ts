/**
 * Cardio ↔ Garmin Activity link.
 *
 * A cardio focus-mode session has exact wall-clock timestamps (session +
 * per-segment), so matching against a simultaneously-recorded Garmin activity
 * is stricter than the ad-hoc matcher: the recording must overlap the
 * session's time span. Once linked, the watch's HR stream is sliced per
 * segment (using GarminActivity.hrStreamOffsets when present) and written
 * onto the segment logs' actualAvgHR/actualMaxHR — which lights up the HR
 * columns in the session summary.
 *
 * Linking runs at session completion (the recording is usually not synced
 * yet), from the link-workouts cron as catch-up, and re-slices when activity
 * details (the HR stream) arrive after the link via the Garmin webhook.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const WINDOW_PAD_MS = 30 * 60 * 1000 // candidate search padding around the session
const MIN_OVERLAP_RATIO = 0.5 // of the shorter of session/activity span
const MIN_SLICE_SAMPLES = 5 // don't write HR for a window with fewer samples
const FALLBACK_SESSION_LENGTH_MS = 2 * 60 * 60 * 1000

export interface HrWindowSlice {
  avg: number
  max: number
  samples: number
}

/**
 * Average/max HR within [windowStart, windowEnd] of a recording that started
 * at activityStart. Offsets are seconds-from-activity-start per hrStream
 * entry; when absent the stream is assumed to be 1 Hz gap-free.
 */
export function sliceHrStream({
  activityStartMs,
  hrStream,
  hrStreamOffsets,
  windowStartMs,
  windowEndMs,
}: {
  activityStartMs: number
  hrStream: number[]
  hrStreamOffsets?: number[] | null
  windowStartMs: number
  windowEndMs: number
}): HrWindowSlice | null {
  if (hrStream.length === 0 || windowEndMs <= windowStartMs) return null

  let sum = 0
  let max = 0
  let count = 0
  for (let i = 0; i < hrStream.length; i++) {
    const hr = hrStream[i]
    if (typeof hr !== 'number' || hr <= 0) continue
    const offsetSec = hrStreamOffsets?.[i] ?? i
    const sampleMs = activityStartMs + offsetSec * 1000
    if (sampleMs < windowStartMs || sampleMs > windowEndMs) continue
    sum += hr
    if (hr > max) max = hr
    count++
  }

  if (count < MIN_SLICE_SAMPLES) return null
  return { avg: Math.round(sum / count), max: Math.round(max), samples: count }
}

interface CandidateActivity {
  id: string
  startDate: Date
  duration: number | null
  elapsedTime: number | null
}

/**
 * Pick the candidate recording that best overlaps the session span.
 * Exported for tests.
 */
export function pickBestOverlap(
  sessionStartMs: number,
  sessionEndMs: number,
  candidates: CandidateActivity[]
): { id: string; overlapMs: number } | null {
  let best: { id: string; overlapMs: number } | null = null
  const sessionLen = sessionEndMs - sessionStartMs
  for (const candidate of candidates) {
    const startMs = candidate.startDate.getTime()
    const lengthSec = candidate.duration ?? candidate.elapsedTime
    // A recording without a duration can't prove overlap — require its start
    // to fall inside the (padded) session window instead.
    if (lengthSec == null || lengthSec <= 0) {
      if (startMs >= sessionStartMs - WINDOW_PAD_MS && startMs <= sessionEndMs) {
        const overlapMs = Math.max(0, sessionEndMs - Math.max(startMs, sessionStartMs))
        if (overlapMs > 0 && (!best || overlapMs > best.overlapMs)) {
          best = { id: candidate.id, overlapMs }
        }
      }
      continue
    }
    const endMs = startMs + lengthSec * 1000
    const overlapMs = Math.min(sessionEndMs, endMs) - Math.max(sessionStartMs, startMs)
    if (overlapMs <= 0) continue
    const shorter = Math.min(sessionLen, endMs - startMs)
    if (shorter > 0 && overlapMs / shorter < MIN_OVERLAP_RATIO) continue
    if (!best || overlapMs > best.overlapMs) {
      best = { id: candidate.id, overlapMs }
    }
  }
  return best
}

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((v): v is number => typeof v === 'number')
}

function asOffsetsArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null
  // Offsets must be index-aligned with hrStream — keep nulls out by mapping
  // non-numbers to their index (the 1 Hz assumption for that sample).
  return value.map((v, i) => (typeof v === 'number' ? v : i))
}

/**
 * Slice the linked activity's HR stream onto the log's segments and the
 * session-level avg/max. Only fills values that are currently null — a
 * manually-entered HR is never overwritten.
 */
async function applyHrToLog(cardioSessionLogId: string): Promise<void> {
  const log = await prisma.cardioSessionLog.findUnique({
    where: { id: cardioSessionLogId },
    select: {
      id: true,
      avgHeartRate: true,
      maxHeartRate: true,
      startedAt: true,
      completedAt: true,
      garminActivity: {
        select: {
          startDate: true,
          averageHeartrate: true,
          maxHeartrate: true,
          hrStream: true,
          hrStreamOffsets: true,
        },
      },
      segmentLogs: {
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          actualAvgHR: true,
          actualMaxHR: true,
        },
      },
    },
  })
  if (!log?.garminActivity) return
  const garmin = log.garminActivity

  // Session-level HR from Garmin's own summary numbers.
  const sessionUpdate: { avgHeartRate?: number; maxHeartRate?: number } = {}
  if (log.avgHeartRate == null && garmin.averageHeartrate != null) {
    sessionUpdate.avgHeartRate = Math.round(garmin.averageHeartrate)
  }
  if (log.maxHeartRate == null && garmin.maxHeartrate != null) {
    sessionUpdate.maxHeartRate = Math.round(garmin.maxHeartrate)
  }
  if (Object.keys(sessionUpdate).length > 0) {
    await prisma.cardioSessionLog.update({
      where: { id: log.id },
      data: sessionUpdate,
    })
  }

  const hrStream = asNumberArray(garmin.hrStream)
  if (!hrStream || hrStream.length === 0) return
  const offsets = asOffsetsArray(garmin.hrStreamOffsets)
  const activityStartMs = garmin.startDate.getTime()

  for (const segment of log.segmentLogs) {
    if (segment.actualAvgHR != null && segment.actualMaxHR != null) continue
    if (!segment.startedAt || !segment.completedAt) continue
    const slice = sliceHrStream({
      activityStartMs,
      hrStream,
      hrStreamOffsets: offsets,
      windowStartMs: segment.startedAt.getTime(),
      windowEndMs: segment.completedAt.getTime(),
    })
    if (!slice) continue
    await prisma.cardioSegmentLog.update({
      where: { id: segment.id },
      data: {
        ...(segment.actualAvgHR == null ? { actualAvgHR: slice.avg } : {}),
        ...(segment.actualMaxHR == null ? { actualMaxHR: slice.max } : {}),
      },
    })
  }
}

/**
 * Try to link a cardio session log to the Garmin recording that covers it,
 * then slice HR onto the log. No-op when already linked or no clear match.
 * Returns true when a link was created.
 */
export async function linkGarminToCardioLog(cardioSessionLogId: string): Promise<boolean> {
  const log = await prisma.cardioSessionLog.findUnique({
    where: { id: cardioSessionLogId },
    select: {
      id: true,
      athleteId: true,
      startedAt: true,
      completedAt: true,
      actualDuration: true,
      garminActivityId: true,
    },
  })
  if (!log || log.garminActivityId) return false

  const sessionStartMs = log.startedAt.getTime()
  const sessionEndMs = log.completedAt
    ? log.completedAt.getTime()
    : log.actualDuration
      ? sessionStartMs + log.actualDuration * 1000
      : sessionStartMs + FALLBACK_SESSION_LENGTH_MS

  const candidates = await prisma.garminActivity.findMany({
    where: {
      clientId: log.athleteId,
      cardioSessionLog: null,
      startDate: {
        gte: new Date(sessionStartMs - 4 * 60 * 60 * 1000),
        lte: new Date(sessionEndMs + WINDOW_PAD_MS),
      },
    },
    select: { id: true, startDate: true, duration: true, elapsedTime: true },
  })

  const match = pickBestOverlap(sessionStartMs, sessionEndMs, candidates)
  if (!match) return false

  await prisma.cardioSessionLog.update({
    where: { id: log.id },
    data: { garminActivityId: match.id },
  })
  logger.info('Linked cardio session log to Garmin activity', {
    cardioSessionLogId: log.id,
    garminActivityId: match.id,
  })

  await applyHrToLog(log.id)
  return true
}

/**
 * Re-slice HR for an already-linked log — used when activity details (the HR
 * stream) arrive after the link was made.
 */
export async function resliceCardioLogHr(garminActivityDbId: string): Promise<void> {
  const linked = await prisma.cardioSessionLog.findUnique({
    where: { garminActivityId: garminActivityDbId },
    select: { id: true },
  })
  if (!linked) return
  await applyHrToLog(linked.id)
}
