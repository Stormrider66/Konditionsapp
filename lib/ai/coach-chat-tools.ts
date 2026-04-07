/**
 * AI Chat Tools for Coach
 *
 * Vercel AI SDK tools the AI can invoke during coach chat conversations.
 * Supports generating strength sessions and programs from the Strength Studio.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateStrengthSession, generateWeeklyProgram, type AutoGenerateParams } from '@/lib/training-engine/generators/auto-strength-generator'
import { calculatePhases, estimateGenerationMinutes, generateMultiPartProgram, type GenerationContext } from '@/lib/ai/program-generator'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { logger } from '@/lib/logger'
import type { StrengthPhase } from '@prisma/client'

/**
 * Create all chat tools for a coach session.
 */
export function createCoachChatTools(coachUserId: string) {
  return {
    generateStrengthSession: tool({
      description: 'Generera ett styrkepass automatiskt baserat på mål, fas, utrustning och atletprofil. Kan skapa enskilt pass eller veckoprogram (2-3 pass A/B/C). Passet sparas i databasen och kan sedan redigeras i Strength Studio.',
      inputSchema: z.object({
        clientId: z.string().optional().describe('Atletens client-ID om passet ska anpassas efter en specifik atlet'),
        goal: z.enum(['strength', 'power', 'injury-prevention', 'running-economy']).describe('Träningsmål: strength=generell styrka, power=kraft & explosivitet, injury-prevention=skadeförebyggande, running-economy=löpekonomi'),
        phase: z.enum(['ANATOMICAL_ADAPTATION', 'MAXIMUM_STRENGTH', 'POWER', 'MAINTENANCE', 'TAPER']).describe('Träningsfas/periodisering'),
        athleteLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).default('INTERMEDIATE').describe('Atletens nivå'),
        sessionsPerWeek: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2).describe('Antal pass per vecka'),
        timePerSession: z.number().min(20).max(90).default(45).describe('Tid per pass i minuter'),
        equipmentAvailable: z.array(z.string()).default(['barbell', 'dumbbell', 'bodyweight']).describe('Tillgänglig utrustning: barbell, dumbbell, kettlebell, bodyweight, cable, machine, bands, box'),
        mode: z.enum(['single', 'weekly']).default('single').describe('single=enskilt pass, weekly=veckoprogram med A/B/C variation'),
        includeWarmup: z.boolean().default(true),
        includeCore: z.boolean().default(true),
        includeCooldown: z.boolean().default(true),
      }),
      execute: async (params) => {
        try {
          const {
            clientId,
            goal,
            phase,
            athleteLevel,
            sessionsPerWeek,
            timePerSession,
            equipmentAvailable,
            mode,
            includeWarmup,
            includeCore,
            includeCooldown,
          } = params

          // Fetch athlete context if clientId provided
          let recentExerciseIds: string[] = []
          let oneRmData: Record<string, number> = {}
          let restrictedExerciseIds: string[] = []
          let restrictionTypes: string[] = []
          let restrictedBodyParts: string[] = []

          if (clientId) {
            const twoWeeksAgo = new Date()
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

            try {
              const recentLogs = await prisma.progressionTracking.findMany({
                where: { clientId, date: { gte: twoWeeksAgo } },
                select: { exerciseId: true },
                distinct: ['exerciseId'],
              })
              recentExerciseIds = recentLogs.map((l) => l.exerciseId)
            } catch { /* skip */ }

            try {
              const oneRmHistory = await prisma.oneRepMaxHistory.findMany({
                where: { clientId },
                orderBy: { date: 'desc' },
                distinct: ['exerciseId'],
                select: { exerciseId: true, oneRepMax: true },
              })
              oneRmData = oneRmHistory.reduce((acc, rm) => {
                acc[rm.exerciseId] = rm.oneRepMax
                return acc
              }, {} as Record<string, number>)
            } catch { /* skip */ }

            try {
              const restrictions = await prisma.trainingRestriction.findMany({
                where: {
                  clientId,
                  isActive: true,
                  OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
                },
                select: { type: true, bodyParts: true, affectedExerciseIds: true },
              })
              restrictedExerciseIds = restrictions.flatMap((r) => r.affectedExerciseIds || [])
              restrictedBodyParts = restrictions.flatMap((r) => r.bodyParts || [])
              restrictionTypes = restrictions.map((r) => r.type)
            } catch { /* skip */ }
          }

          // Fetch and filter exercise library
          const exerciseLibrary = await prisma.exercise.findMany({
            where: {
              OR: [{ isPublic: true }, { coachId: coachUserId }],
            },
            select: {
              id: true,
              name: true,
              nameSv: true,
              biomechanicalPillar: true,
              progressionLevel: true,
              equipment: true,
              category: true,
              targetBodyParts: true,
              contraindications: true,
            },
          })

          const filtered = exerciseLibrary
            .filter((ex) => {
              if (restrictedExerciseIds.includes(ex.id)) return false
              if (restrictedBodyParts.length > 0 && ex.targetBodyParts?.length) {
                if (ex.targetBodyParts.some((part: string) =>
                  restrictedBodyParts.some((r) => part.toLowerCase().includes(r.toLowerCase()))
                )) return false
              }
              if (restrictionTypes.includes('NO_JUMPING') && ex.category === 'PLYOMETRIC') return false
              if (restrictionTypes.includes('NO_UPPER_BODY') && ex.biomechanicalPillar === 'UPPER_BODY') return false
              if (restrictionTypes.includes('NO_LOWER_BODY') &&
                ['POSTERIOR_CHAIN', 'KNEE_DOMINANCE', 'FOOT_ANKLE'].includes(ex.biomechanicalPillar || '')) return false
              return true
            })
            .map((ex) => ({ ...ex, isPlyometric: ex.category === 'PLYOMETRIC' }))

          const generateParams: AutoGenerateParams = {
            athleteId: clientId || coachUserId,
            goal,
            phase: phase as StrengthPhase,
            sessionsPerWeek,
            timePerSession,
            equipmentAvailable,
            athleteLevel,
            includeWarmup,
            includeCore,
            includeCooldown,
            recentExerciseIds,
            oneRmData,
          }

          if (mode === 'weekly') {
            const sessions = await generateWeeklyProgram(generateParams, filtered)

            // Save all sessions to database
            const savedIds: string[] = []
            for (const session of sessions) {
              const mainExercises = session.sections.find((s) => s.type === 'MAIN')?.exercises || []
              const warmupData = session.sections.find((s) => s.type === 'WARMUP')
              const coreData = session.sections.find((s) => s.type === 'CORE')
              const cooldownData = session.sections.find((s) => s.type === 'COOLDOWN')

              const saved = await prisma.strengthSession.create({
                data: {
                  name: session.name,
                  description: session.description,
                  phase: session.phase,
                  estimatedDuration: session.estimatedDuration,
                  exercises: mainExercises as any,
                  warmupData: warmupData ? { exercises: warmupData.exercises, notes: warmupData.notes, duration: warmupData.duration } as any : undefined,
                  coreData: coreData ? { exercises: coreData.exercises, notes: coreData.notes, duration: coreData.duration } as any : undefined,
                  cooldownData: cooldownData ? { exercises: cooldownData.exercises, notes: cooldownData.notes, duration: cooldownData.duration } as any : undefined,
                  totalSets: session.totalSets,
                  totalExercises: session.totalExercises,
                  coachId: coachUserId,
                },
              })
              savedIds.push(saved.id)
            }

            return {
              success: true,
              mode: 'weekly',
              sessionsGenerated: sessions.length,
              savedSessionIds: savedIds,
              sessions: sessions.map((s) => ({
                name: s.name,
                description: s.description,
                totalExercises: s.totalExercises,
                totalSets: s.totalSets,
                rationale: s.rationale,
                mainExercises: s.exercises
                  .filter((e) => e.section === 'MAIN')
                  .map((e) => `${e.exerciseName} (${e.sets}x${e.reps})`),
              })),
              message: `${sessions.length} pass skapade och sparade i Passbiblioteket.`,
            }
          }

          // Single session
          const session = await generateStrengthSession(generateParams, filtered)

          const mainExercises = session.sections.find((s) => s.type === 'MAIN')?.exercises || []
          const warmupData = session.sections.find((s) => s.type === 'WARMUP')
          const coreData = session.sections.find((s) => s.type === 'CORE')
          const cooldownData = session.sections.find((s) => s.type === 'COOLDOWN')

          const saved = await prisma.strengthSession.create({
            data: {
              name: session.name,
              description: session.description,
              phase: session.phase,
              estimatedDuration: session.estimatedDuration,
              exercises: mainExercises as any,
              warmupData: warmupData ? { exercises: warmupData.exercises, notes: warmupData.notes, duration: warmupData.duration } as any : undefined,
              coreData: coreData ? { exercises: coreData.exercises, notes: coreData.notes, duration: coreData.duration } as any : undefined,
              cooldownData: cooldownData ? { exercises: cooldownData.exercises, notes: cooldownData.notes, duration: cooldownData.duration } as any : undefined,
              totalSets: session.totalSets,
              totalExercises: session.totalExercises,
              coachId: coachUserId,
            },
          })

          return {
            success: true,
            mode: 'single',
            savedSessionId: saved.id,
            name: session.name,
            description: session.description,
            totalExercises: session.totalExercises,
            totalSets: session.totalSets,
            rationale: session.rationale,
            mainExercises: session.exercises
              .filter((e) => e.section === 'MAIN')
              .map((e) => `${e.exerciseName} (${e.sets}x${e.reps}${e.weight ? ` @ ${e.weight}kg` : ''})`),
            message: `Pass "${session.name}" skapat och sparat i Passbiblioteket.`,
          }
        } catch (error) {
          logger.error('Error in generateStrengthSession tool', {}, error)
          return {
            success: false,
            error: 'Kunde inte generera styrkepass. Försök igen.',
          }
        }
      },
    }),

    listAthletes: tool({
      description: 'Lista coachens atleter för att kunna välja en atlet att generera styrkepass för.',
      inputSchema: z.object({
        search: z.string().optional().describe('Sök efter namn'),
      }),
      execute: async ({ search }) => {
        try {
          const clients = await prisma.client.findMany({
            where: {
              userId: coachUserId,
              ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
            },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
            take: 20,
          })
          return {
            success: true,
            athletes: clients.map((c) => ({ id: c.id, name: c.name })),
          }
        } catch {
          return { success: false, error: 'Kunde inte hämta atleter.' }
        }
      },
    }),

    createCardioSession: tool({
      description: 'Skapa ett konditionspass/intervallpass. Sparas i Cardio Studio. Stödjer löpning, cykling, simning, rodd, HYROX m.m. Segmenten kan vara intervaller, steady state, repeat groups (upprepningsblock med flera steg), uppvärmning och nedvarvning.',
      inputSchema: z.object({
        name: z.string().describe('Passnamn på svenska'),
        description: z.string().optional().describe('Kort beskrivning'),
        sport: z.enum(['RUNNING', 'CYCLING', 'SWIMMING', 'SKIING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS']).default('RUNNING').describe('Sport/aktivitet'),
        segments: z.array(z.object({
          type: z.enum(['WARMUP', 'COOLDOWN', 'INTERVAL', 'STEADY', 'RECOVERY', 'HILL', 'DRILLS', 'REPEAT_GROUP']).describe('Segmenttyp'),
          duration: z.number().optional().describe('Tid i sekunder'),
          distance: z.number().optional().describe('Distans i meter'),
          pace: z.string().optional().describe('Tempo t.ex. "4:30" (min/km)'),
          zone: z.number().min(1).max(5).optional().describe('Pulszon 1-5'),
          notes: z.string().optional().describe('Instruktioner'),
          repeats: z.number().optional().describe('Antal upprepningar (för intervaller)'),
          restDuration: z.number().optional().describe('Vila i sekunder (mellan upprepningar)'),
          calories: z.number().optional().describe('Kalorimål (för ergometer)'),
          // For REPEAT_GROUP
          steps: z.array(z.object({
            type: z.enum(['INTERVAL', 'STEADY', 'RECOVERY']).describe('Stegtyp'),
            duration: z.number().optional(),
            distance: z.number().optional(),
            pace: z.string().optional(),
            zone: z.number().min(1).max(5).optional(),
            notes: z.string().optional(),
            calories: z.number().optional(),
            targetType: z.string().optional().describe('Mål: watt, rpm, tempo, puls'),
            targetValue: z.string().optional().describe('Målvärde t.ex. "250" (W)'),
            equipment: z.string().optional().describe('Utrustning t.ex. "Wattbike"'),
          })).optional().describe('Steg i repeat group'),
          restBetweenRounds: z.number().optional().describe('Vila mellan rundor i sekunder'),
        })).describe('Passets segment i ordning'),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ name, description, sport, segments, tags }) => {
        try {
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
              segments: segments as any,
              totalDuration: totalDuration > 0 ? totalDuration : null,
              totalDistance: totalDistance > 0 ? totalDistance : null,
              coachId: coachUserId,
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
            message: `Konditionspass "${name}" skapat och sparat i Cardio Studio.${distanceKm ? ` Total distans: ${distanceKm} km.` : ''} Total tid: ${durationMin} min.`,
          }
        } catch (error) {
          logger.error('Error in createCardioSession tool', {}, error)
          return { success: false, error: 'Kunde inte skapa konditionspass.' }
        }
      },
    }),

    createHybridWorkout: tool({
      description: 'Skapa ett hybridpass/funktionellt pass (CrossFit-stil, HYROX, circuit etc). Sparas i Hybrid Studio. Stödjer AMRAP, For Time, EMOM, Tabata, Chipper. Övningarna definieras med namn — de matchas automatiskt mot övningsbiblioteket.',
      inputSchema: z.object({
        name: z.string().describe('Passnamn'),
        description: z.string().optional(),
        format: z.enum(['AMRAP', 'FOR_TIME', 'EMOM', 'TABATA', 'CHIPPER']).describe('Passformat'),
        timeCap: z.number().optional().describe('Tidsbegränsning i sekunder (0 = ingen)'),
        workTime: z.number().optional().describe('Arbetstid per intervall (EMOM/Tabata) i sekunder'),
        restTime: z.number().optional().describe('Vilotid per intervall i sekunder'),
        totalRounds: z.number().optional().describe('Antal rundor'),
        totalMinutes: z.number().optional().describe('Total tid i minuter (för AMRAP/EMOM)'),
        repScheme: z.string().optional().describe('Repschema t.ex. "21-15-9" eller "5-5-5-5-5"'),
        movements: z.array(z.object({
          exerciseName: z.string().describe('Övningsnamn på engelska eller svenska'),
          order: z.number().describe('Ordning'),
          reps: z.number().optional(),
          calories: z.number().optional(),
          distance: z.number().optional().describe('Distans i meter'),
          duration: z.number().optional().describe('Tid i sekunder'),
          weightMale: z.number().optional().describe('Vikt herrar i kg'),
          weightFemale: z.number().optional().describe('Vikt damer i kg'),
          notes: z.string().optional(),
        })).describe('Övningar/rörelser i passet'),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ name, description, format, timeCap, workTime, restTime, totalRounds, totalMinutes, repScheme, movements, tags }) => {
        try {
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
              notes: m.notes ? `${m.exerciseName}: ${m.notes}` : (!match ? `⚠️ "${m.exerciseName}" — ej matchad i biblioteket` : undefined),
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
              tags: tags || [],
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
            message: `Hybridpass "${name}" (${format}) skapat med ${movements.length} övningar och sparat i Hybrid Studio.`,
          }
        } catch (error) {
          logger.error('Error in createHybridWorkout tool', {}, error)
          return { success: false, error: 'Kunde inte skapa hybridpass.' }
        }
      },
    }),

    createSportWorkout: tool({
      description: 'Skapa ett sportspecifikt träningspass med blandade sektioner. Kan kombinera uppvärmning, styrka, kondition, agility/teknik och nedvarvning i ett pass. Idealiskt för lagsporter (fotboll, ishockey, handboll, basket etc), HYROX, tennis, padel m.m. Passet sparas som en AI-genererad WOD åt en specifik atlet.',
      inputSchema: z.object({
        clientId: z.string().describe('Atletens client-ID'),
        title: z.string().describe('Passtitel på svenska'),
        description: z.string().describe('Beskrivning'),
        sport: z.string().describe('Sport t.ex. FOOTBALL, ICE_HOCKEY, BASKETBALL, HANDBALL, HYROX, TENNIS, PADEL, RUNNING, CYCLING'),
        duration: z.number().min(10).max(180).describe('Total tid i minuter'),
        intensity: z.enum(['recovery', 'easy', 'moderate', 'threshold']).optional(),
        sections: z.array(z.object({
          type: z.enum(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN', 'AGILITY', 'CONDITIONING']).describe('Sektionstyp'),
          name: z.string().describe('Sektionsnamn på svenska'),
          duration: z.number().describe('Sektionslängd i minuter'),
          exercises: z.array(z.object({
            name: z.string().describe('Övningsnamn på engelska'),
            nameSv: z.string().describe('Övningsnamn på svenska'),
            sets: z.number().optional(),
            reps: z.string().optional(),
            duration: z.number().optional().describe('Tid i sekunder'),
            distance: z.number().optional().describe('Distans i meter'),
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
              workoutJson: workoutJson as any,
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
            message: `Sportpass "${title}" skapat för atleten. ${totalExercises} övningar i ${sections.length} sektioner (${sections.map(s => s.name).join(', ')}).`,
          }
        } catch (error) {
          logger.error('Error in createSportWorkout tool', {}, error)
          return { success: false, error: 'Kunde inte skapa sportpass.' }
        }
      },
    }),

    generateTrainingProgram: tool({
      description: 'Starta generering av ett komplett flervekkors träningsprogram åt en atlet. Programmet genereras i bakgrunden (1-10 min) med AI och sparas automatiskt. Stödjer alla sporter och metodiker (Polarized, Norwegian, Canova, Pyramidal). Kräver atletens clientId — använd listAthletes först om du inte har det.',
      inputSchema: z.object({
        clientId: z.string().describe('Atletens client-ID (hämta med listAthletes)'),
        sport: z.string().describe('Primär sport (t.ex. "Running", "Cycling", "Swimming", "HYROX", "Triathlon", "Football")'),
        totalWeeks: z.number().min(1).max(52).describe('Programlängd i veckor'),
        sessionsPerWeek: z.number().min(1).max(14).optional().describe('Antal pass per vecka'),
        goal: z.string().describe('Atletens huvudmål (t.ex. "Springa ett marathon under 3:30")'),
        goalDate: z.string().optional().describe('Måldatum i ISO-format (t.ex. "2026-06-15")'),
        methodology: z.enum(['POLARIZED', 'NORWEGIAN', 'CANOVA', 'PYRAMIDAL', 'GENERAL']).optional().describe('Träningsmetodik'),
        notes: z.string().optional().describe('Ytterligare önskemål eller begränsningar'),
      }),
      execute: async ({ clientId, sport, totalWeeks, sessionsPerWeek, goal, goalDate, methodology, notes }) => {
        try {
          // Check for active generation
          const activeSession = await prisma.programGenerationSession.findFirst({
            where: {
              athleteId: clientId,
              status: { in: ['PENDING', 'GENERATING_OUTLINE', 'GENERATING_PHASE', 'MERGING'] },
            },
            select: { id: true, status: true },
          })

          if (activeSession) {
            return {
              success: false,
              error: 'Det pågår redan en programgenerering för denna atlet. Vänta tills den är klar.',
            }
          }

          // Fetch client data
          const clientRecord = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, name: true, weight: true, height: true, birthDate: true },
          })

          if (!clientRecord) {
            return { success: false, error: 'Atleten hittades inte.' }
          }

          // Get coach's API keys
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'powerful')
          if (!resolved) {
            return {
              success: false,
              error: 'Inga AI-nycklar konfigurerade. Gå till Inställningar → AI för att lägga till API-nycklar.',
            }
          }

          // Fetch test data and injuries
          const [latestTest, injuries] = await Promise.all([
            prisma.test.findFirst({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              select: { vo2max: true, maxHR: true, anaerobicThreshold: true },
            }),
            prisma.injuryAssessment.findMany({
              where: { clientId, status: { in: ['ACTIVE', 'MONITORING'] } },
              select: { injuryType: true, status: true, notes: true },
            }),
          ])

          // Calculate age
          const age = clientRecord.birthDate
            ? Math.floor((Date.now() - new Date(clientRecord.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : undefined

          const generationContext: GenerationContext = {
            sport,
            totalWeeks,
            sessionsPerWeek,
            methodology: methodology || undefined,
            goal,
            goalDate: goalDate || undefined,
            athleteId: clientId,
            athleteName: clientRecord.name || undefined,
            athleteAge: age,
            athleteWeight: clientRecord.weight || undefined,
            athleteHeight: clientRecord.height || undefined,
            vo2max: latestTest?.vo2max ?? undefined,
            maxHR: latestTest?.maxHR ?? undefined,
            lactateThreshold: latestTest?.anaerobicThreshold
              ? { hr: (latestTest.anaerobicThreshold as { hr?: number })?.hr }
              : undefined,
            injuries: injuries.map((i) => ({
              type: i.injuryType || 'unknown',
              status: i.status,
              notes: i.notes || undefined,
            })),
            notes: notes || undefined,
          }

          const phases = calculatePhases(totalWeeks)
          const totalPhases = phases.length
          const estimatedMinutes = estimateGenerationMinutes(totalPhases)

          const providerUpperMap: Record<string, 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'> = {
            anthropic: 'ANTHROPIC', google: 'GOOGLE', openai: 'OPENAI',
          }
          const providerUpper = providerUpperMap[resolved.provider] || 'ANTHROPIC'

          const session = await prisma.programGenerationSession.create({
            data: {
              coachId: coachUserId,
              athleteId: clientId,
              query: `${sport} program: ${goal}`,
              totalWeeks,
              sport,
              methodology: methodology || null,
              athleteContext: generationContext as unknown as object,
              status: 'PENDING',
              totalPhases,
              provider: providerUpper,
              modelUsed: resolved.modelId,
            },
          })

          // Fire-and-forget background generation
          generateMultiPartProgram({
            sessionId: session.id,
            context: generationContext,
            apiKey: resolved.apiKey,
            provider: providerUpper,
            modelId: resolved.modelId,
          }).catch((error) => {
            logger.error('Background program generation failed', { sessionId: session.id, clientId }, error)
          })

          return {
            success: true,
            sessionId: session.id,
            athleteName: clientRecord.name,
            sport,
            totalWeeks,
            totalPhases,
            estimatedMinutes,
            goal,
            message: `Programgenerering startad för ${clientRecord.name}! ${totalWeeks} veckor ${sport}, ${totalPhases} faser. Beräknad tid: ${estimatedMinutes} minuter. Programmet dyker upp automatiskt på atletens profil när det är klart.`,
          }
        } catch (error) {
          logger.error('Failed to start program generation via coach chat', { coachUserId }, error)
          return { success: false, error: 'Kunde inte starta programgenereringen. Försök igen.' }
        }
      },
    }),
  }
}
