/**
 * Coach chat tools for creating cardio, hybrid, and sport-specific sessions.
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import {
  type CoachToolContext,
  CARDIO_TOOL_SPORTS,
  toolText,
} from './shared'

export function createWorkoutTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  const resolveTeamId = async (teamId?: string) => {
    if (!teamId) return null
    const team = await getAccessibleTeam(coachUserId, teamId, businessSlug)
    return team?.id ?? null
  }

  const teamCaptureHref = (teamId: string | null, workoutType: 'CARDIO' | 'HYBRID', workoutId: string) => {
    if (!teamId || !businessSlug) return null
    return `/${businessSlug}/coach/teams/${teamId}/capture?workoutType=${workoutType}&workoutId=${workoutId}`
  }

  return {
    createCardioSession: tool({
      description: toolText(
        locale,
        'Create a cardio or interval session. Saves in Cardio Studio. Supports endurance sports, HYROX, functional fitness, team sports, and racket sports. For team/racket sports: make sessions sport-specific with repeated sprints, court/field intervals, change of direction, point/shift repeats, and relevant prevention.',
        'Skapa ett konditionspass/intervallpass. Sparas i Cardio Studio. Stödjer uthållighetssporter, HYROX, funktionell fitness, lagidrotter och racketsporter. För lag/racket: gör passen sportnära med repeated sprints, court/field intervals, change-of-direction, point/shift repeats och relevant prevention.'
      ),
      inputSchema: z.object({
        name: z.string().describe('Session name in the coach chat language.'),
        description: z.string().optional().describe('Short description in the coach chat language.'),
        sport: z.enum(CARDIO_TOOL_SPORTS).default('RUNNING').describe('Sport/activity. Use TEAM_ICE_HOCKEY for hockey-specific 7x40/RSA/shift repeats, TEAM_BASKETBALL for court repeats, TENNIS/PADEL for point intervals, and the corresponding sport for other team sports.'),
        teamId: z.string().optional().describe('Optional team ID when this workout should be team-capture ready for a specific team.'),
        captureReady: z.boolean().optional().describe('Set true when the coach wants to use this workout in Team Capture. Use explicit equipment fields on station steps.'),
        segments: z.array(z.object({
          type: z.enum(['WARMUP', 'COOLDOWN', 'INTERVAL', 'STEADY', 'RECOVERY', 'HILL', 'DRILLS', 'REPEAT_GROUP']).describe('Segment type.'),
          duration: z.number().optional().describe('Time in seconds.'),
          distance: z.number().optional().describe('Distance in meters.'),
          equipment: z.string().optional().describe('Equipment key such as BIKE_ERG, ROW, SKI_ERG, WATTBIKE, ECHO_BIKE, ASSAULT_BIKE, RUN.'),
          pace: z.string().optional().describe('Pace, for example "4:30" (min/km).'),
          zone: z.number().min(1).max(5).optional().describe('Heart-rate zone 1-5.'),
          notes: z.string().optional().describe('Instructions in the coach chat language.'),
          repeats: z.number().optional().describe('Number of repeats for intervals.'),
          restDuration: z.number().optional().describe('Rest in seconds between repeats.'),
          calories: z.number().optional().describe('Calorie target for ergometers.'),
          // For REPEAT_GROUP
          steps: z.array(z.object({
            type: z.enum(['INTERVAL', 'STEADY', 'RECOVERY']).describe('Step type.'),
            duration: z.number().optional(),
            distance: z.number().optional(),
            pace: z.string().optional(),
            zone: z.number().min(1).max(5).optional(),
            notes: z.string().optional(),
            calories: z.number().optional(),
            targetType: z.string().optional().describe('Target type: watts, rpm, pace, heart rate.'),
            targetValue: z.string().optional().describe('Target value, for example "250" (W).'),
            equipment: z.string().optional().describe('Equipment, for example "Wattbike".'),
          })).optional().describe('Steps in the repeat group.'),
          restBetweenRounds: z.number().optional().describe('Rest between rounds in seconds.'),
        })).describe('Session segments in order.'),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ name, description, sport, teamId, captureReady, segments, tags }) => {
        try {
          const resolvedTeamId = await resolveTeamId(teamId)
          // Calculate totals
          let totalDuration = 0
          let totalDistance = 0
          for (const s of segments) {
            if (s.type === 'REPEAT_GROUP' && s.steps) {
              const reps = s.repeats || 1
              const stepsDur = s.steps.reduce((sum, step) => sum + (step.duration || 0), 0)
              const stepsDist = s.steps.reduce((sum, step) => sum + (step.distance || 0), 0)
              const rest = (s.restBetweenRounds || 0) * Math.max(reps - 1, 0)
              totalDuration += (stepsDur * reps) + rest
              totalDistance += stepsDist * reps
            } else {
              const reps = (s.repeats && s.repeats > 1) ? s.repeats : 1
              const rest = (s.restDuration || 0) * Math.max(reps - 1, 0)
              totalDuration += (s.duration || 0) * reps + rest
              totalDistance += (s.distance || 0) * reps
            }
          }

          const session = await prisma.cardioSession.create({
            data: {
              name,
              description,
              sport: sport || 'RUNNING',
              segments: segments as Prisma.InputJsonValue,
              totalDuration: totalDuration > 0 ? totalDuration : null,
              totalDistance: totalDistance > 0 ? totalDistance : null,
              coachId: coachUserId,
              teamId: resolvedTeamId,
              tags: tags || [],
            },
          })

          const durationMin = totalDuration ? Math.round(totalDuration / 60) : 0
          const distanceKm = totalDistance ? (totalDistance / 1000).toFixed(1) : null

          return {
            success: true,
            savedSessionId: session.id,
            name,
            sport,
            totalDuration: `${durationMin} min`,
            totalDistance: distanceKm ? `${distanceKm} km` : null,
            segmentCount: segments.length,
            captureReady: Boolean(captureReady),
            teamCaptureUrl: teamCaptureHref(resolvedTeamId, 'CARDIO', session.id),
            message: toolText(
              locale,
              `Cardio session "${name}" was created and saved in Cardio Studio.${distanceKm ? ` Total distance: ${distanceKm} km.` : ''} Total time: ${durationMin} min.${captureReady ? ' It is ready for Team Capture.' : ''}`,
              `Konditionspass "${name}" skapat och sparat i Cardio Studio.${distanceKm ? ` Total distans: ${distanceKm} km.` : ''} Total tid: ${durationMin} min.${captureReady ? ' Det är redo för lagfångst.' : ''}`
            ),
          }
        } catch (error) {
          logger.error('Error in createCardioSession tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create the cardio session.', 'Kunde inte skapa konditionspass.'),
          }
        }
      },
    }),

    createHybridWorkout: tool({
      description: toolText(
        locale,
        'Create a hybrid or functional session (CrossFit-style, HYROX, hockey off-ice circuit, etc.). Saves in Hybrid Studio. Supports AMRAP, For Time, EMOM, Tabata, Chipper, Ladder, Intervals, HYROX simulation, and Custom. Use this for hockey sessions with stations such as sled, carries, SkiErg, medicine ball, and mixed circuits. Movements are defined by name and matched automatically against the exercise library.',
        'Skapa ett hybridpass/funktionellt pass (CrossFit-stil, HYROX, hockey off-ice circuit etc). Sparas i Hybrid Studio. Stödjer AMRAP, For Time, EMOM, Tabata, Chipper, Ladder, Intervals, HYROX-sim och Custom. Använd detta för hockeypass med stationer som sled, carries, SkiErg, medicine ball och mixed circuits. Övningarna definieras med namn — de matchas automatiskt mot övningsbiblioteket.'
      ),
      inputSchema: z.object({
        name: z.string().describe('Session name in the coach chat language.'),
        description: z.string().optional(),
        format: z.enum(['AMRAP', 'FOR_TIME', 'EMOM', 'TABATA', 'CHIPPER', 'LADDER', 'INTERVALS', 'HYROX_SIM', 'CUSTOM']).describe('Session format.'),
        timeCap: z.number().optional().describe('Time cap in seconds (0 = none).'),
        workTime: z.number().optional().describe('Work time per interval in seconds (EMOM/Tabata).'),
        restTime: z.number().optional().describe('Rest time per interval in seconds.'),
        totalRounds: z.number().optional().describe('Number of rounds.'),
        totalMinutes: z.number().optional().describe('Total time in minutes (for AMRAP/EMOM).'),
        repScheme: z.string().optional().describe('Rep scheme, for example "21-15-9" or "5-5-5-5-5".'),
        teamId: z.string().optional().describe('Optional team ID when this workout should be team-capture ready for a specific team.'),
        captureReady: z.boolean().optional().describe('Set true when the coach wants to start Team Capture from this workout. Use explicit equipment on station movements.'),
        movements: z.array(z.object({
          exerciseName: z.string().describe('Exercise name in English or Swedish.'),
          equipment: z.string().optional().describe('Equipment key such as BIKE_ERG, ROW, SKI_ERG, WATTBIKE, ECHO_BIKE, ASSAULT_BIKE, RUN.'),
          order: z.number().describe('Order.'),
          reps: z.number().optional(),
          calories: z.number().optional(),
          distance: z.number().optional().describe('Distance in meters.'),
          duration: z.number().optional().describe('Time in seconds.'),
          weightMale: z.number().optional().describe('Male/RX weight in kg.'),
          weightFemale: z.number().optional().describe('Female/scaled weight in kg.'),
          notes: z.string().optional(),
        })).describe('Exercises/movements in the session.'),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ name, description, format, timeCap, workTime, restTime, totalRounds, totalMinutes, repScheme, teamId, captureReady, movements, tags }) => {
        try {
          const resolvedTeamId = await resolveTeamId(teamId)
          // Look up exercises in the library by name
          const allExercises = await prisma.exercise.findMany({
            where: { OR: [{ isPublic: true }, { coachId: coachUserId }] },
            select: { id: true, name: true, nameSv: true },
          })

          const movementData = movements.map((m) => {
            // Try to match by name (case-insensitive)
            const match = allExercises.find((e) =>
              e.name.toLowerCase() === m.exerciseName.toLowerCase() ||
              (e.nameSv && e.nameSv.toLowerCase() === m.exerciseName.toLowerCase())
            )
            return {
              exerciseId: match?.id || allExercises[0]?.id, // Fallback to first exercise
              order: m.order,
              reps: m.reps,
              calories: m.calories,
              distance: m.distance,
              duration: m.duration,
              weightMale: m.weightMale,
              weightFemale: m.weightFemale,
              notes: m.notes
                ? `${m.exerciseName}: ${m.notes}`
                : (!match
                    ? toolText(locale, `"${m.exerciseName}" - not matched in library`, `"${m.exerciseName}" - ej matchad i biblioteket`)
                    : undefined),
            }
          })

          const workout = await prisma.hybridWorkout.create({
            data: {
              name,
              description,
              format,
              timeCap,
              workTime,
              restTime,
              totalRounds,
              totalMinutes,
              repScheme,
              scalingLevel: 'RX',
              coachId: coachUserId,
              teamId: resolvedTeamId,
              tags: tags || [],
              metconData: captureReady
                ? {
                    blocks: [{
                      title: name,
                      format,
                      rounds: totalRounds ?? 1,
                      restAfterSeconds: restTime ?? 0,
                      movements: movements.map((movement) => ({
                        exerciseName: movement.exerciseName,
                        equipment: movement.equipment,
                        calories: movement.calories,
                        distance: movement.distance,
                        duration: movement.duration,
                        reps: movement.reps,
                        notes: movement.notes,
                      })),
                    }],
                  }
                : undefined,
              movements: {
                create: movementData,
              },
            },
          })

          return {
            success: true,
            savedWorkoutId: workout.id,
            name,
            format,
            movementCount: movements.length,
            captureReady: Boolean(captureReady),
            teamCaptureUrl: teamCaptureHref(resolvedTeamId, 'HYBRID', workout.id),
            message: toolText(
              locale,
              `Hybrid session "${name}" (${format}) was created with ${movements.length} movements and saved in Hybrid Studio.${captureReady ? ' It is ready for Team Capture.' : ''}`,
              `Hybridpass "${name}" (${format}) skapat med ${movements.length} övningar och sparat i Hybrid Studio.${captureReady ? ' Det är redo för lagfångst.' : ''}`
            ),
          }
        } catch (error) {
          logger.error('Error in createHybridWorkout tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create the hybrid session.', 'Kunde inte skapa hybridpass.'),
          }
        }
      },
    }),

    createSportWorkout: tool({
      description: toolText(
        locale,
        'Create a sport-specific workout with mixed sections. Can combine warmup, strength, conditioning, agility/technique, and cooldown in one session. Ideal for team sports (football, ice hockey, handball, basketball, etc.), HYROX, tennis, padel, and more. The session is saved as an AI-generated WOD for a specific athlete.',
        'Skapa ett sportspecifikt träningspass med blandade sektioner. Kan kombinera uppvärmning, styrka, kondition, agility/teknik och nedvarvning i ett pass. Idealiskt för lagsporter (fotboll, ishockey, handboll, basket etc), HYROX, tennis, padel m.m. Passet sparas som en AI-genererad WOD åt en specifik atlet.'
      ),
      inputSchema: z.object({
        clientId: z.string().describe('Athlete client ID.'),
        title: z.string().describe('Session title in the coach chat language.'),
        description: z.string().describe('Description in the coach chat language.'),
        sport: z.string().describe('Sport, for example FOOTBALL, ICE_HOCKEY, BASKETBALL, HANDBALL, HYROX, TENNIS, PADEL, RUNNING, CYCLING.'),
        duration: z.number().min(10).max(180).describe('Total time in minutes.'),
        intensity: z.enum(['recovery', 'easy', 'moderate', 'threshold']).optional(),
        sections: z.array(z.object({
          type: z.enum(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN', 'AGILITY', 'CONDITIONING']).describe('Section type.'),
          name: z.string().describe('Section name in the coach chat language.'),
          duration: z.number().describe('Section length in minutes.'),
          exercises: z.array(z.object({
            name: z.string().describe('Exercise name in English.'),
            nameSv: z.string().describe('Exercise name in Swedish, for compatibility.'),
            sets: z.number().optional(),
            reps: z.string().optional(),
            duration: z.number().optional().describe('Time in seconds.'),
            distance: z.number().optional().describe('Distance in meters.'),
            restSeconds: z.number().optional(),
            notes: z.string().optional(),
          })),
        })),
      }),
      execute: async ({ clientId, title, description, sport, duration, intensity, sections }) => {
        try {
          const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0)
          const totalSets = sections.reduce(
            (sum, s) => s.exercises.reduce((eSum, e) => eSum + (e.sets || 1), 0) + sum, 0
          )

          const workoutJson = {
            title,
            subtitle: sport,
            description,
            workoutType: 'mixed',
            duration,
            intensity: intensity || 'moderate',
            totalExercises,
            totalSets,
            sections: sections.map((s) => ({
              type: s.type,
              name: s.name,
              duration: s.duration,
              exercises: s.exercises.map((e) => ({
                name: e.name,
                nameSv: e.nameSv,
                sets: e.sets,
                reps: e.reps,
                duration: e.duration,
                distance: e.distance,
                restSeconds: e.restSeconds,
                notes: e.notes,
              })),
            })),
          }

          const wod = await prisma.aIGeneratedWOD.create({
            data: {
              clientId,
              title,
              description,
              workoutType: 'mixed',
              requestedDuration: duration,
              workoutJson: workoutJson as Prisma.InputJsonValue,
              source: 'chat',
              status: 'GENERATED',
            },
          })

          return {
            success: true,
            wodId: wod.id,
            title,
            sport,
            duration: `${duration} min`,
            totalExercises,
            sectionNames: sections.map((s) => s.name).join(', '),
            message: toolText(
              locale,
              `Sport workout "${title}" was created for the athlete. ${totalExercises} exercises in ${sections.length} sections (${sections.map(s => s.name).join(', ')}).`,
              `Sportpass "${title}" skapat för atleten. ${totalExercises} övningar i ${sections.length} sektioner (${sections.map(s => s.name).join(', ')}).`
            ),
          }
        } catch (error) {
          logger.error('Error in createSportWorkout tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create the sport workout.', 'Kunde inte skapa sportpass.'),
          }
        }
      },
    }),
  }
}
