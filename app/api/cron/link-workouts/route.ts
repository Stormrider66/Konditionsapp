/**
 * Link Unmatched Workouts Cron Job
 *
 * Retries matching unlinked ad-hoc workouts with Garmin activities.
 * Catches cases where the ad-hoc was created before Garmin synced
 * or vice versa.
 *
 * Trigger: Every 15 minutes
 * Method: GET /api/cron/link-workouts
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/api/cron-auth'
import { prisma } from '@/lib/prisma'
import { findMatchingGarminActivity, findMatchingAdHocWorkout, linkAdHocToGarmin } from '@/lib/training/adhoc-garmin-matcher'
import { linkGarminToCardioLog } from '@/lib/cardio/garmin-cardio-link'
import { logger } from '@/lib/logger'
import { subDays } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const authError = verifyCronAuth(request)
    if (authError) return authError

    const since = subDays(new Date(), 3) // Only look at last 3 days
    let linked = 0

    // Strategy 1: Find unlinked ad-hoc workouts and try to match with Garmin
    const unlinkedAdHocs = await prisma.adHocWorkout.findMany({
      where: {
        status: { in: ['CONFIRMED', 'READY_FOR_REVIEW'] },
        garminActivityId: null,
        workoutDate: { gte: since },
        inputType: { notIn: ['STRAVA_IMPORT', 'GARMIN_IMPORT', 'CONCEPT2_IMPORT'] },
      },
      select: {
        id: true,
        athleteId: true,
        workoutDate: true,
        parsedType: true,
        parsedStructure: true,
      },
      take: 50, // Limit per run
    })

    for (const adHoc of unlinkedAdHocs) {
      try {
        const match = await findMatchingGarminActivity(
          { workoutDate: adHoc.workoutDate, parsedStructure: adHoc.parsedStructure, parsedType: adHoc.parsedType },
          adHoc.athleteId
        )
        if (match) {
          await linkAdHocToGarmin(adHoc.id, match.id)
          linked++
        }
      } catch (err) {
        logger.warn('Failed to link ad-hoc to Garmin', { adHocId: adHoc.id, error: String(err) })
      }
    }

    // Strategy 2: Find unlinked Garmin activities and try to match with ad-hocs
    const unlinkedGarmins = await prisma.garminActivity.findMany({
      where: {
        startDate: { gte: since },
        adHocWorkout: null,
      },
      select: {
        id: true,
        clientId: true,
        startDate: true,
        duration: true,
        type: true,
        mappedType: true,
      },
      take: 50,
    })

    for (const garmin of unlinkedGarmins) {
      try {
        const match = await findMatchingAdHocWorkout({
          id: garmin.id,
          clientId: garmin.clientId,
          startDate: garmin.startDate,
          duration: garmin.duration,
          type: garmin.type,
          mappedType: garmin.mappedType,
        })
        if (match) {
          await linkAdHocToGarmin(match.id, garmin.id)
          linked++
        }
      } catch (err) {
        logger.warn('Failed to link Garmin to ad-hoc', { garminId: garmin.id, error: String(err) })
      }
    }

    // Strategy 3: completed cardio focus-mode sessions whose watch recording
    // synced after completion (the completion-time link attempt missed).
    const unlinkedCardioLogs = await prisma.cardioSessionLog.findMany({
      where: {
        status: 'COMPLETED',
        garminActivityId: null,
        startedAt: { gte: since },
      },
      select: { id: true },
      take: 50,
    })

    let cardioLinked = 0
    for (const log of unlinkedCardioLogs) {
      try {
        if (await linkGarminToCardioLog(log.id)) cardioLinked++
      } catch (err) {
        logger.warn('Failed to link cardio log to Garmin', { logId: log.id, error: String(err) })
      }
    }

    logger.info('Link-workouts cron completed', { linked, cardioLinked, checkedAdHocs: unlinkedAdHocs.length, checkedGarmins: unlinkedGarmins.length, checkedCardioLogs: unlinkedCardioLogs.length })

    return NextResponse.json({
      success: true,
      linked,
      cardioLinked,
      checked: { adHocs: unlinkedAdHocs.length, garmins: unlinkedGarmins.length, cardioLogs: unlinkedCardioLogs.length },
    })
  } catch (error) {
    logger.error('Link-workouts cron failed', { error: String(error) })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
