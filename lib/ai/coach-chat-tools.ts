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
  }
}
