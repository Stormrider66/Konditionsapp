/**
 * Athlete Chat Workout Write Tools
 *
 * Tools that let the athlete log training from the floating chat:
 *  - logCompletedWorkout: record a workout done outside the plan as a
 *    CONFIRMED AdHocWorkout + TrainingLoad row (mirrors the ad-hoc confirm
 *    route, including the TSS formula and Garmin auto-link).
 *  - completeAssignedWorkout: mark an assigned strength/cardio session or an
 *    AI workout (WOD) as completed with RPE/duration, including the same
 *    side effects as the focus-mode routes (TrainingLoad, progression rollup).
 *
 * Both are write tools registered with requiresConfirmation, so with AI
 * operations enabled they run through the action-draft confirmation flow.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rollupAssignmentProgression } from '@/lib/training-engine/progression/assignment-rollup'
import { estimateCalories } from '@/lib/adhoc-workout/calorie-estimator'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'

type ChatLocale = 'en' | 'sv'

function chatText(locale: ChatLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function parseWorkoutDate(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00.000Z`)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

/** RPE → TrainingLoad intensity label (same mapping as the focus-mode routes). */
function rpeToIntensity(rpe: number): string {
  if (rpe <= 3) return 'EASY'
  if (rpe <= 5) return 'MODERATE'
  if (rpe <= 7) return 'HARD'
  return 'VERY_HARD'
}

/** Same TSS estimate as the ad-hoc confirm route: (min × IF² × 100) / 60, IF = rpe/10. */
function adHocTss(durationMinutes: number, rpe: number): number {
  const intensityFactor = rpe / 10
  return Math.max(1, Math.round((durationMinutes * Math.pow(intensityFactor, 2) * 100) / 60))
}

function mapIntensityToString(intensity?: ParsedWorkout['intensity']): string {
  switch (intensity) {
    case 'RECOVERY':
      return 'RECOVERY'
    case 'EASY':
      return 'EASY'
    case 'MODERATE':
      return 'MODERATE'
    case 'THRESHOLD':
      return 'HARD'
    case 'INTERVAL':
    case 'MAX':
      return 'VERY_HARD'
    default:
      return 'MODERATE'
  }
}

function mapWorkoutTypeToString(
  type: ParsedWorkout['type'],
  intensity?: ParsedWorkout['intensity']
): string {
  if (type === 'CARDIO') {
    switch (intensity) {
      case 'INTERVAL':
        return 'INTERVALS'
      case 'THRESHOLD':
        return 'THRESHOLD'
      case 'MAX':
        return 'RACE'
      case 'MODERATE':
        return 'TEMPO'
      case 'RECOVERY':
        return 'RECOVERY'
      case 'EASY':
      default:
        return 'EASY'
    }
  }
  switch (type) {
    case 'STRENGTH':
      return 'STRENGTH'
    case 'HYBRID':
      return 'INTERVALS'
    case 'MIXED':
      return 'EASY'
    default:
      return 'EASY'
  }
}

/** Upsert today's per-modality TrainingLoad row (focus-mode route behavior). */
async function addDailyLoad(params: {
  clientId: string
  workoutType: 'STRENGTH' | 'CARDIO'
  loadType: 'STRENGTH_TSS' | 'CARDIO_TSS'
  load: number
  durationMinutes: number
  distanceKm?: number
  avgHR?: number
  intensity: string
}): Promise<void> {
  const today = startOfToday()
  const existingLoad = await prisma.trainingLoad.findFirst({
    where: {
      clientId: params.clientId,
      date: today,
      workoutType: params.workoutType,
      source: 'WORKOUT',
    },
  })

  if (existingLoad) {
    await prisma.trainingLoad.update({
      where: { id: existingLoad.id },
      data: {
        dailyLoad: existingLoad.dailyLoad + params.load,
        duration: existingLoad.duration + params.durationMinutes,
        ...(params.distanceKm !== undefined
          ? { distance: (existingLoad.distance || 0) + params.distanceKm }
          : {}),
      },
    })
  } else {
    await prisma.trainingLoad.create({
      data: {
        clientId: params.clientId,
        date: today,
        dailyLoad: params.load,
        loadType: params.loadType,
        duration: params.durationMinutes,
        distance: params.distanceKm,
        avgHR: params.avgHR,
        intensity: params.intensity,
        workoutType: params.workoutType,
      },
    })
  }
}

export function createAthleteWorkoutWriteTools(clientId: string, locale: ChatLocale = 'en') {
  return {
    // ── Log a workout done outside the plan ───────────────────────────
    logCompletedWorkout: tool({
      description: chatText(
        locale,
        'Log a workout the athlete already did outside their plan (a run, a gym session, a match, etc.). Saves it to training history and counts it in training load. Use when the athlete describes a finished workout that was not an assigned session. Collect at least type and duration before calling.',
        'Logga ett pass atleten redan gjort utanför sin plan (en löprunda, ett gympass, en match, etc.). Sparas i träningshistoriken och räknas in i träningsbelastningen. Använd när atleten beskriver ett genomfört pass som inte var ett tilldelat pass. Samla in minst typ och duration innan du anropar.'
      ),
      inputSchema: z.object({
        date: z.string().optional().describe('Workout date (YYYY-MM-DD). Default: today.'),
        name: z.string().optional().describe('Short workout name, e.g. "Lunch run".'),
        workoutType: z.enum(['CARDIO', 'STRENGTH', 'HYBRID', 'MIXED']).describe('Primary workout classification.'),
        sport: z.enum([
          'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX',
          'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
          'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
          'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
        ]).optional().describe('Sport (mainly for cardio/team workouts).'),
        intensity: z.enum(['RECOVERY', 'EASY', 'MODERATE', 'THRESHOLD', 'INTERVAL', 'MAX']).optional()
          .describe('Overall intensity of the session.'),
        durationMinutes: z.number().int().min(1).max(600).describe('Total duration in minutes.'),
        distanceKm: z.number().positive().max(500).optional().describe('Distance in kilometers, if relevant.'),
        avgHeartRate: z.number().int().min(40).max(230).optional().describe('Average heart rate in bpm.'),
        maxHeartRate: z.number().int().min(40).max(250).optional().describe('Max heart rate in bpm.'),
        perceivedEffort: z.number().int().min(1).max(10).optional().describe('Session RPE 1-10.'),
        notes: z.string().optional().describe('Free-text notes from the athlete.'),
      }),
      execute: async ({ date, name, workoutType, sport, intensity, durationMinutes, distanceKm, avgHeartRate, maxHeartRate, perceivedEffort, notes }) => {
        try {
          const workoutDate = parseWorkoutDate(date)

          const parsedStructure: ParsedWorkout = {
            type: workoutType,
            confidence: 1, // athlete-stated, not OCR/voice parsed
            rawInterpretation: chatText(locale, 'Structured directly from the athlete in AI chat.', 'Strukturerat direkt från atleten i AI-chatten.'),
            name,
            duration: durationMinutes,
            distance: distanceKm !== undefined ? distanceKm * 1000 : undefined,
            intensity,
            sport,
            avgHeartRate,
            maxHeartRate,
            perceivedEffort,
            notes,
          }

          // Estimate calories if athlete has a recorded weight (same as confirm route)
          const athleteClient = await prisma.client.findUnique({
            where: { id: clientId },
            select: { weight: true },
          })
          if (athleteClient?.weight && athleteClient.weight > 0) {
            const cal = estimateCalories(parsedStructure, athleteClient.weight)
            if (cal) parsedStructure.estimatedCalories = cal
          }

          const rpe = perceivedEffort || 6
          const tss = adHocTss(durationMinutes, rpe)

          const result = await prisma.$transaction(async (tx) => {
            const load = await tx.trainingLoad.create({
              data: {
                clientId,
                date: workoutDate,
                dailyLoad: tss,
                loadType: 'TSS',
                duration: durationMinutes,
                distance: distanceKm,
                avgHR: avgHeartRate,
                maxHR: maxHeartRate,
                intensity: mapIntensityToString(intensity),
                workoutType: mapWorkoutTypeToString(workoutType, intensity),
              },
            })

            const adHoc = await tx.adHocWorkout.create({
              data: {
                athleteId: clientId,
                inputType: 'TEXT',
                workoutDate,
                workoutName: name || null,
                rawInputText: chatText(locale, 'Logged via AI chat.', 'Loggat via AI-chatten.'),
                parsedStructure: parsedStructure as unknown as Prisma.InputJsonValue,
                status: 'CONFIRMED',
                athleteReviewed: true,
                trainingLoadId: load.id,
              },
            })

            return { adHoc, load }
          })

          // Auto-link with a matching Garmin activity (best-effort, same as confirm route)
          try {
            const { findMatchingGarminActivity, linkAdHocToGarmin } = await import('@/lib/training/adhoc-garmin-matcher')
            const garminMatch = await findMatchingGarminActivity(
              { workoutDate, parsedStructure, parsedType: null },
              clientId
            )
            if (garminMatch) {
              await linkAdHocToGarmin(result.adHoc.id, garminMatch.id)
            }
          } catch (err) {
            logger.warn('Failed to auto-link chat-logged workout to Garmin', { adHocId: result.adHoc.id }, err)
          }

          logger.info('Workout logged via chat tool', {
            clientId,
            adHocId: result.adHoc.id,
            workoutType,
            durationMinutes,
            tss,
          })

          return {
            success: true,
            workoutId: result.adHoc.id,
            date: workoutDate.toISOString().slice(0, 10),
            workoutType,
            durationMinutes,
            distanceKm: distanceKm ?? null,
            trainingLoad: tss,
            message: chatText(
              locale,
              'The workout was logged and added to the training load.',
              'Passet loggades och räknas nu in i träningsbelastningen.'
            ),
          }
        } catch (error) {
          logger.error('logCompletedWorkout tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not log the workout. Please try again.', 'Kunde inte logga passet. Försök igen.') }
        }
      },
    }),

    // ── Complete an assigned session or WOD ───────────────────────────
    completeAssignedWorkout: tool({
      description: chatText(
        locale,
        'Mark an assigned workout as completed: a strength session, a cardio session, or an AI workout (WOD). Records RPE and duration and counts it in training load. Use when the athlete says they finished an assigned/planned session. If you do not have the assignment id, call without it — the tool finds today\'s pending session and asks for clarification if there are several.',
        'Markera ett tilldelat pass som genomfört: ett styrkepass, ett konditionspass eller ett AI-pass (WOD). Registrerar RPE och duration och räknas in i träningsbelastningen. Använd när atleten säger att de gjort klart ett tilldelat/planerat pass. Om du inte har tilldelnings-id, anropa utan det — verktyget hittar dagens väntande pass och ber om förtydligande om det finns flera.'
      ),
      inputSchema: z.object({
        kind: z.enum(['STRENGTH', 'CARDIO', 'WOD']).describe('Which kind of assigned workout was completed.'),
        assignmentId: z.string().optional().describe('Assignment id (or WOD id) if already known from a previous tool call.'),
        date: z.string().optional().describe('Assigned date to search (YYYY-MM-DD). Default: today.'),
        rpe: z.number().int().min(1).max(10).optional().describe('Session RPE 1-10.'),
        durationMinutes: z.number().int().min(1).max(600).optional().describe('Actual duration in minutes.'),
        distanceKm: z.number().positive().max(500).optional().describe('Actual distance in km (cardio only).'),
        avgHeartRate: z.number().int().min(40).max(230).optional().describe('Average heart rate in bpm (cardio only).'),
        notes: z.string().optional().describe('Notes from the athlete.'),
      }),
      execute: async ({ kind, assignmentId, date, rpe, durationMinutes, distanceKm, avgHeartRate, notes }) => {
        try {
          const searchDate = parseWorkoutDate(date)
          searchDate.setHours(0, 0, 0, 0)
          const searchDateEnd = new Date(searchDate)
          searchDateEnd.setHours(23, 59, 59, 999)
          const now = new Date()

          if (kind === 'STRENGTH') {
            let assignment = assignmentId
              ? await prisma.strengthSessionAssignment.findFirst({
                  where: { id: assignmentId, athleteId: clientId },
                  select: { id: true, assignedDate: true, status: true, session: { select: { name: true } } },
                })
              : null

            if (!assignment) {
              const candidates = await prisma.strengthSessionAssignment.findMany({
                where: {
                  athleteId: clientId,
                  status: { in: ['PENDING', 'SCHEDULED'] },
                  assignedDate: { gte: searchDate, lte: searchDateEnd },
                },
                select: { id: true, assignedDate: true, status: true, session: { select: { name: true } } },
                take: 5,
              })
              if (candidates.length === 0) {
                return {
                  success: false,
                  error: chatText(locale, 'No pending strength session found for that date.', 'Inget väntande styrkepass hittades för det datumet.'),
                }
              }
              if (candidates.length > 1) {
                return {
                  success: false,
                  needsClarification: true,
                  candidates: candidates.map((c) => ({ id: c.id, name: c.session.name })),
                  error: chatText(locale, 'Several pending strength sessions found — ask which one.', 'Flera väntande styrkepass hittades — fråga vilket som avses.'),
                }
              }
              assignment = candidates[0]
            }

            if (assignment.assignedDate > now) {
              return {
                success: false,
                error: chatText(locale, 'That session is scheduled in the future and cannot be completed yet.', 'Det passet är schemalagt i framtiden och kan inte slutföras ännu.'),
              }
            }

            await prisma.strengthSessionAssignment.update({
              where: { id: assignment.id },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                ...(rpe !== undefined ? { rpe } : {}),
                ...(durationMinutes !== undefined ? { duration: durationMinutes } : {}),
                ...(notes !== undefined ? { notes } : {}),
              },
            })

            // Best-effort: never fail completion if the rollup errors.
            try {
              await rollupAssignmentProgression(assignment.id)
            } catch (rollupError) {
              logger.error('Progression rollup on chat completion failed', { assignmentId: assignment.id }, rollupError)
            }

            if (durationMinutes) {
              const rpeValue = rpe || 6
              await addDailyLoad({
                clientId,
                workoutType: 'STRENGTH',
                loadType: 'STRENGTH_TSS',
                load: Math.round(durationMinutes * (rpeValue / 10) * 0.8),
                durationMinutes,
                intensity: rpeToIntensity(rpeValue),
              })
            }

            return {
              success: true,
              kind,
              assignmentId: assignment.id,
              name: assignment.session.name,
              rpe: rpe ?? null,
              durationMinutes: durationMinutes ?? null,
              message: chatText(locale, 'The strength session was marked as completed.', 'Styrkepasset markerades som genomfört.'),
            }
          }

          if (kind === 'CARDIO') {
            let assignment = assignmentId
              ? await prisma.cardioSessionAssignment.findFirst({
                  where: { id: assignmentId, athleteId: clientId },
                  select: { id: true, assignedDate: true, status: true, sessionId: true, session: { select: { name: true } } },
                })
              : null

            if (!assignment) {
              const candidates = await prisma.cardioSessionAssignment.findMany({
                where: {
                  athleteId: clientId,
                  status: { in: ['PENDING', 'SCHEDULED'] },
                  assignedDate: { gte: searchDate, lte: searchDateEnd },
                },
                select: { id: true, assignedDate: true, status: true, sessionId: true, session: { select: { name: true } } },
                take: 5,
              })
              if (candidates.length === 0) {
                return {
                  success: false,
                  error: chatText(locale, 'No pending cardio session found for that date.', 'Inget väntande konditionspass hittades för det datumet.'),
                }
              }
              if (candidates.length > 1) {
                return {
                  success: false,
                  needsClarification: true,
                  candidates: candidates.map((c) => ({ id: c.id, name: c.session.name })),
                  error: chatText(locale, 'Several pending cardio sessions found — ask which one.', 'Flera väntande konditionspass hittades — fråga vilket som avses.'),
                }
              }
              assignment = candidates[0]
            }

            if (assignment.assignedDate > now) {
              return {
                success: false,
                error: chatText(locale, 'That session is scheduled in the future and cannot be completed yet.', 'Det passet är schemalagt i framtiden och kan inte slutföras ännu.'),
              }
            }

            await prisma.cardioSessionAssignment.update({
              where: { id: assignment.id },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                ...(durationMinutes !== undefined ? { actualDuration: durationMinutes * 60 } : {}),
                ...(distanceKm !== undefined ? { actualDistance: distanceKm * 1000 } : {}),
                ...(avgHeartRate !== undefined ? { avgHeartRate } : {}),
              },
            })

            // Close an in-flight focus-mode log if one exists (best-effort).
            try {
              const sessionLog = await prisma.cardioSessionLog.findFirst({
                where: {
                  assignmentId: assignment.id,
                  athleteId: clientId,
                  status: { in: ['PENDING', 'SCHEDULED'] },
                },
                select: { id: true },
              })
              if (sessionLog) {
                await prisma.cardioSessionLog.update({
                  where: { id: sessionLog.id },
                  data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    ...(rpe !== undefined ? { sessionRPE: rpe } : {}),
                    ...(durationMinutes !== undefined ? { actualDuration: durationMinutes * 60 } : {}),
                    ...(distanceKm !== undefined ? { actualDistance: distanceKm * 1000 } : {}),
                    ...(avgHeartRate !== undefined ? { avgHeartRate } : {}),
                  },
                })
              }
            } catch (logError) {
              logger.warn('Failed to close cardio session log from chat completion', { assignmentId: assignment.id }, logError)
            }

            if (durationMinutes) {
              const rpeValue = rpe || 6
              await addDailyLoad({
                clientId,
                workoutType: 'CARDIO',
                loadType: 'CARDIO_TSS',
                load: Math.round(durationMinutes * (rpeValue / 10) * 1.0),
                durationMinutes,
                distanceKm,
                avgHR: avgHeartRate,
                intensity: rpeToIntensity(rpeValue),
              })
            }

            return {
              success: true,
              kind,
              assignmentId: assignment.id,
              name: assignment.session.name,
              rpe: rpe ?? null,
              durationMinutes: durationMinutes ?? null,
              distanceKm: distanceKm ?? null,
              message: chatText(locale, 'The cardio session was marked as completed.', 'Konditionspasset markerades som genomfört.'),
            }
          }

          // kind === 'WOD'
          let wod = assignmentId
            ? await prisma.aIGeneratedWOD.findFirst({
                where: { id: assignmentId, clientId },
                select: { id: true, title: true, status: true, requestedDuration: true, primarySport: true },
              })
            : null

          if (!wod) {
            const candidates = await prisma.aIGeneratedWOD.findMany({
              where: {
                clientId,
                status: { in: ['GENERATED', 'STARTED'] },
                createdAt: { gte: searchDate, lte: searchDateEnd },
              },
              select: { id: true, title: true, status: true, requestedDuration: true, primarySport: true },
              orderBy: { createdAt: 'desc' },
              take: 5,
            })
            if (candidates.length === 0) {
              return {
                success: false,
                error: chatText(locale, 'No open AI workout (WOD) found for that date.', 'Inget öppet AI-pass (WOD) hittades för det datumet.'),
              }
            }
            if (candidates.length > 1) {
              return {
                success: false,
                needsClarification: true,
                candidates: candidates.map((c) => ({ id: c.id, name: c.title })),
                error: chatText(locale, 'Several open AI workouts found — ask which one.', 'Flera öppna AI-pass hittades — fråga vilket som avses.'),
              }
            }
            wod = candidates[0]
          }

          await prisma.aIGeneratedWOD.update({
            where: { id: wod.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              ...(rpe !== undefined ? { sessionRPE: rpe } : {}),
              ...(durationMinutes !== undefined ? { actualDuration: durationMinutes } : {}),
            },
          })

          // Same load formula as the WOD completion route (RPE-based session load).
          try {
            const duration = durationMinutes || wod.requestedDuration || 45
            const rpeValue = rpe || 6
            await prisma.trainingLoad.create({
              data: {
                clientId,
                date: new Date(),
                dailyLoad: Math.round(duration * rpeValue * 0.8),
                loadType: 'RPE_BASED',
                workoutType: wod.primarySport || 'STRENGTH',
                duration,
                intensity: rpeToIntensity(rpeValue),
              },
            })
          } catch (loadError) {
            logger.warn('Error saving training load for chat WOD completion', { wodId: wod.id }, loadError)
          }

          return {
            success: true,
            kind,
            assignmentId: wod.id,
            name: wod.title,
            rpe: rpe ?? null,
            durationMinutes: durationMinutes ?? null,
            message: chatText(locale, 'The AI workout was marked as completed.', 'AI-passet markerades som genomfört.'),
          }
        } catch (error) {
          logger.error('completeAssignedWorkout tool failed', { clientId, kind }, error)
          return { success: false, error: chatText(locale, 'Could not complete the workout. Please try again.', 'Kunde inte slutföra passet. Försök igen.') }
        }
      },
    }),

    // ── Create a structured cardio/erg session, assigned and startable ──
    createCardioWorkout: tool({
      description: chatText(
        locale,
        'Create a structured cardio/erg session (intervals, EMOM rounds, machine circuits) and assign it to the athlete so it can be started in focus mode with live machine data. Use when the athlete asks for a cardio, rowing, BikeErg, SkiErg, bike or interval workout to DO (not one they already did). Each station can have a fixed time window (e.g. 60 s on the minute), a calorie goal, or both — with both, the window runs on the clock and the calories are the goal within it.',
        'Skapa ett strukturerat konditions-/ergometerpass (intervaller, EMOM-rundor, maskincirklar) och tilldela det till atleten så att det kan startas i fokusläge med live-maskindata. Använd när atleten ber om ett konditions-, rodd-, BikeErg-, SkiErg-, cykel- eller intervallpass att GÖRA (inte ett de redan gjort). Varje station kan ha ett fast tidsfönster (t.ex. 60 s varje minut), ett kalorimål, eller båda — med båda går fönstret på klockan och kalorierna är målet inom det.'
      ),
      inputSchema: z.object({
        name: z.string().describe('Short session name, e.g. "Triple erg EMOM".'),
        description: z.string().optional().describe('One-line description of the session.'),
        sport: z.enum([
          'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX',
          'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
          'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
          'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
        ]).optional().describe('Sport. Default GENERAL_FITNESS.'),
        date: z.string().optional().describe('Assignment date (YYYY-MM-DD). Default: today.'),
        warmupMinutes: z.number().int().min(1).max(60).optional().describe('Optional warm-up duration in minutes.'),
        cooldownMinutes: z.number().int().min(1).max(60).optional().describe('Optional cool-down duration in minutes.'),
        rounds: z.number().int().min(1).max(30).optional().describe('Rounds of the station circuit. Default 1.'),
        restBetweenRoundsSeconds: z.number().int().min(5).max(600).optional().describe('Rest between rounds in seconds.'),
        stations: z.array(z.object({
          equipment: z.enum([
            'RUN', 'TREADMILL', 'BIKE', 'ASSAULT_BIKE', 'ECHO_BIKE', 'WATTBIKE',
            'BIKE_ERG', 'ROW', 'SKI_ERG', 'SWIM', 'OTHER',
          ]).optional().describe('Machine/modality. Concept2 machines: BIKE_ERG, ROW, SKI_ERG.'),
          durationSeconds: z.number().int().min(10).max(3600).optional().describe('Fixed work window in seconds (e.g. 60 for on-the-minute work).'),
          calories: z.number().int().min(1).max(200).optional().describe('Calorie goal. Without durationSeconds the station ends when the target is reached.'),
          distanceMeters: z.number().int().min(50).max(50000).optional().describe('Distance in meters, if distance-based.'),
          targetWatts: z.number().int().min(30).max(1000).optional().describe('Power target in watts.'),
          zone: z.number().int().min(1).max(5).optional().describe('Intensity zone 1-5.'),
          notes: z.string().optional(),
        })).min(1).max(10).describe('The stations of one round, in order.'),
      }),
      execute: async ({ name, description, sport, date, warmupMinutes, cooldownMinutes, rounds, restBetweenRoundsSeconds, stations }) => {
        try {
          const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { userId: true },
          })
          if (!client) {
            return { success: false, error: chatText(locale, 'Athlete profile not found.', 'Atletprofilen hittades inte.') }
          }

          const repeats = rounds ?? 1
          const steps = stations.map((station, index) => ({
            id: `station-${index + 1}`,
            type: 'INTERVAL',
            duration: station.durationSeconds,
            calories: station.calories,
            distance: station.distanceMeters,
            equipment: station.equipment,
            zone: station.zone,
            notes: station.notes,
            ...(station.targetWatts != null
              ? { targetType: 'power', targetValue: String(station.targetWatts) }
              : {}),
          }))

          const segments: Prisma.InputJsonValue[] = []
          if (warmupMinutes) {
            segments.push({ id: 'warmup', type: 'WARMUP', duration: warmupMinutes * 60, zone: 1 })
          }
          segments.push({
            id: 'main',
            type: 'REPEAT_GROUP',
            repeats,
            restBetweenRounds: restBetweenRoundsSeconds,
            steps,
          } as unknown as Prisma.InputJsonValue)
          if (cooldownMinutes) {
            segments.push({ id: 'cooldown', type: 'COOLDOWN', duration: cooldownMinutes * 60, zone: 1 })
          }

          const stationSeconds = stations.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0)
          const totalDuration =
            (warmupMinutes ?? 0) * 60 +
            (cooldownMinutes ?? 0) * 60 +
            repeats * stationSeconds +
            Math.max(0, repeats - 1) * (restBetweenRoundsSeconds ?? 0)

          const assignedDate = parseWorkoutDate(date)

          const { session, assignment } = await prisma.$transaction(async (tx) => {
            // coachId = the user owning the client record: the athlete's coach,
            // or the athlete themself for self-managed accounts.
            const createdSession = await tx.cardioSession.create({
              data: {
                name,
                description: description ?? null,
                sport: sport ?? 'GENERAL_FITNESS',
                segments: segments as unknown as Prisma.InputJsonValue,
                totalDuration: totalDuration > 0 ? totalDuration : null,
                coachId: client.userId,
                isPublic: false,
                tags: ['ai-chat'],
              },
            })
            const createdAssignment = await tx.cardioSessionAssignment.create({
              data: {
                sessionId: createdSession.id,
                athleteId: clientId,
                assignedDate,
                assignedBy: client.userId,
                notes: chatText(locale, 'Created in AI chat.', 'Skapat i AI-chatten.'),
              },
            })
            return { session: createdSession, assignment: createdAssignment }
          })

          logger.info('Cardio workout created via chat tool', {
            clientId,
            sessionId: session.id,
            assignmentId: assignment.id,
            rounds: repeats,
            stations: stations.length,
          })

          return {
            success: true,
            assignmentId: assignment.id,
            sessionId: session.id,
            name,
            rounds: repeats,
            stationCount: stations.length,
            totalDurationSeconds: totalDuration > 0 ? totalDuration : null,
            // Relative to the athlete area — the chat card prefixes the
            // business basePath before navigating.
            startPath: `/athlete/cardio?start=${assignment.id}`,
            message: chatText(
              locale,
              'The session is assigned — open it to start focus mode.',
              'Passet är tilldelat — öppna det för att starta fokusläget.'
            ),
          }
        } catch (error) {
          logger.error('createCardioWorkout tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not create the cardio session. Please try again.', 'Kunde inte skapa konditionspasset. Försök igen.') }
        }
      },
    }),
  }
}
