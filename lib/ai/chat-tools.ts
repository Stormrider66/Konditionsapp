/**
 * AI Chat Tool Calling
 *
 * Vercel AI SDK tools that the AI can invoke during athlete chat conversations.
 * Supports creating workouts (WODs) and full training programs from the chat.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { buildWODContext } from '@/lib/ai/wod-context-builder'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import {
  calculatePhases,
  estimateGenerationMinutes,
  generateMultiPartProgram,
  type GenerationContext,
} from '@/lib/ai/program-generator'
import { resolveModel } from '@/types/ai-models'
import { logger } from '@/lib/logger'
import { lookupOrGenerateExercise } from '@/lib/ai/exercise-generator'

/** Capabilities that control which tools are available */
export interface ChatToolCapabilities {
  canGenerateProgram?: boolean
}

/**
 * Create all chat tools for an athlete session.
 * Uses closure to capture clientId and optional conversationId.
 * The capabilities param controls which tools are included.
 */
export function createChatTools(
  clientId: string,
  conversationId?: string,
  capabilities?: ChatToolCapabilities
) {
  const tools: Record<string, any> = { // eslint-disable-line
    createTodayWorkout: tool({
      description:
        'Skapa ett träningspass åt atleten för idag. Passet sparas på dashboarden och i kalendern. ' +
        'Använd detta verktyg när atleten ber dig skapa, skriva, föreslå eller ge dem ett pass.',
      inputSchema: z.object({
        title: z.string().describe('Kort, motiverande svensk titel (t.ex. "Explosiv Styrka")'),
        subtitle: z.string().optional().describe('Motiverande undertitel'),
        description: z.string().describe('Kort beskrivning av vad passet fokuserar på'),
        workoutType: z.enum(['strength', 'cardio', 'mixed', 'core']).describe('Passtyp'),
        duration: z.number().min(10).max(180).describe('Total duration i minuter'),
        intensity: z.enum(['recovery', 'easy', 'moderate', 'threshold']).optional()
          .describe('Intensitetsnivå baserat på atletens beredskap'),
        sections: z.array(z.object({
          type: z.enum(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN']).describe('Sektionstyp'),
          name: z.string().describe('Svenskt sektionsnamn (t.ex. "Uppvärmning")'),
          duration: z.number().describe('Sektionens längd i minuter'),
          exercises: z.array(z.object({
            name: z.string().describe('Övningsnamn på engelska'),
            nameSv: z.string().describe('Övningsnamn på svenska'),
            sets: z.number().optional(),
            reps: z.string().optional().describe('"10" eller "10-12" eller "AMRAP"'),
            weight: z.string().optional().describe('"Bodyweight", "Light", "Moderate", "60% 1RM"'),
            restSeconds: z.number().optional(),
            duration: z.number().optional().describe('Tid i sekunder (för cardio)'),
            distance: z.number().optional().describe('Distans i meter'),
            zone: z.number().min(1).max(5).optional().describe('Pulszon 1-5'),
            notes: z.string().optional().describe('Korta instruktioner'),
          })),
        })),
      }),
      execute: async ({ title, subtitle, description, workoutType, duration, intensity, sections }) => {
        const startTime = Date.now()

        try {
          // Fetch athlete context for readiness-aware creation
          const context = await buildWODContext(clientId)

          // Calculate totals
          const totalExercises = sections.reduce(
            (sum, s) => sum + s.exercises.length, 0
          )
          const totalSets = sections.reduce(
            (sum, s) => s.exercises.reduce((eSum, e) => eSum + (e.sets || 1), 0) + sum, 0
          )

          // Build workoutJson matching WODWorkout format
          const workoutJson = {
            title,
            subtitle: subtitle || '',
            description,
            sections: sections.map(s => ({
              type: s.type,
              name: s.name,
              duration: s.duration,
              exercises: s.exercises.map(e => ({
                name: e.name,
                nameSv: e.nameSv,
                sets: e.sets,
                reps: e.reps,
                weight: e.weight,
                restSeconds: e.restSeconds,
                duration: e.duration,
                distance: e.distance,
                zone: e.zone,
                instructions: e.notes,
              })),
            })),
            coachNotes: `Skapat via AI-chatt baserat på atletens önskemål.`,
            totalDuration: duration,
            totalExercises,
            totalSets,
          }

          // Save to database (same pattern as app/api/ai/wod/route.ts)
          const savedWOD = await prisma.aIGeneratedWOD.create({
            data: {
              clientId,
              mode: 'STRUCTURED',
              workoutType,
              requestedDuration: duration,
              title,
              subtitle,
              description,
              workoutJson: JSON.parse(JSON.stringify(workoutJson)),
              readinessAtGeneration: context?.readinessScore ?? null,
              intensityAdjusted: intensity || null,
              primarySport: context?.primarySport ?? null,
              generationTimeMs: Date.now() - startTime,
              source: 'chat',
              chatConversationId: conversationId || null,
            },
          })

          logger.info('WOD created via chat tool', {
            wodId: savedWOD.id,
            clientId,
            workoutType,
            duration,
            exerciseCount: totalExercises,
          })

          // Fire-and-forget: generate exercise images in background
          // This avoids blocking the chat response (Vercel 60s timeout)
          const clientRecord = await prisma.client.findUnique({
            where: { id: clientId },
            select: { userId: true }
          })
          const coachId = clientRecord?.userId || ''

          void (async () => {
            try {
              for (const section of sections) {
                for (const ex of section.exercises) {
                  const isComplex = ['burpee', 'clean', 'snatch', 'get-up'].some(kw =>
                    ex.name.toLowerCase().includes(kw) || ex.nameSv.toLowerCase().includes(kw)
                  )
                  await lookupOrGenerateExercise({
                    exerciseNameSv: ex.nameSv,
                    exerciseNameEn: ex.name,
                    muscleGroups: [workoutType],
                    isComplexMovement: isComplex,
                    coachId
                  })
                }
              }
            } catch (err) {
              logger.error('Background exercise image generation failed', { wodId: savedWOD.id, err })
            }
          })()

          return {
            success: true,
            wodId: savedWOD.id,
            title,
            subtitle: subtitle || null,
            duration,
            workoutType,
            intensity: intensity || null,
            exerciseCount: totalExercises,
            sectionCount: sections.length,
          }
        } catch (error) {
          logger.error('Failed to create WOD via chat tool', { clientId }, error)
          return {
            success: false,
            error: 'Kunde inte skapa passet. Försök igen.',
          }
        }
      },
    }),
  }

  // Only include program generation tool when the athlete has the capability
  if (capabilities?.canGenerateProgram) {
    tools.generateTrainingProgram = tool({
      description:
        'Starta generering av ett komplett flervekkors träningsprogram åt atleten. ' +
        'Programmet genereras i bakgrunden (1-10 min). ' +
        'Använd detta verktyg EFTER att du samlat in sport, mål, programlängd och pass per vecka från atleten.',
      inputSchema: z.object({
        sport: z.string().describe('Primär sport (t.ex. "Running", "Cycling", "Swimming", "HYROX")'),
        totalWeeks: z.number().min(1).max(52).describe('Programlängd i veckor'),
        sessionsPerWeek: z.number().min(1).max(14).optional()
          .describe('Antal träningspass per vecka'),
        goal: z.string().describe('Atletens huvudmål (t.ex. "Springa ett marathon under 3:30")'),
        goalDate: z.string().optional()
          .describe('Måldatum i ISO-format (t.ex. "2026-06-15")'),
        methodology: z.enum(['POLARIZED', 'NORWEGIAN', 'CANOVA', 'PYRAMIDAL', 'GENERAL']).optional()
          .describe('Träningsmetodik'),
        notes: z.string().optional()
          .describe('Ytterligare önskemål eller begränsningar från atleten'),
      }),
      execute: async ({ sport, totalWeeks, sessionsPerWeek, goal, goalDate, methodology, notes }) => {
        try {
          // Check for active generation session
          const activeSession = await prisma.programGenerationSession.findFirst({
            where: {
              athleteId: clientId,
              status: {
                in: ['PENDING', 'GENERATING_OUTLINE', 'GENERATING_PHASE', 'MERGING'],
              },
            },
            select: { id: true, status: true },
          })

          if (activeSession) {
            return {
              success: false,
              error: 'Det pågår redan en programgenerering. Vänta tills den är klar innan du startar en ny.',
              activeSessionId: activeSession.id,
            }
          }

          // Fetch client record to get coach user ID (needed for API keys + coachId)
          const clientRecord = await prisma.client.findUnique({
            where: { id: clientId },
            select: {
              id: true,
              userId: true,
              name: true,
              sportProfile: true,
            },
          })

          if (!clientRecord?.userId) {
            return {
              success: false,
              error: 'Kunde inte hitta din profil. Kontakta support.',
            }
          }

          const coachUserId = clientRecord.userId

          // Check feature access
          const access = await checkAthleteFeatureAccess(clientId, 'program_generation')
          if (!access.allowed) {
            return {
              success: false,
              error: access.reason || 'Programgenerering kräver en STANDARD- eller PRO-prenumeration.',
              code: access.code,
            }
          }

          // Get API keys (coach's keys)
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'powerful')
          if (!resolved) {
            return {
              success: false,
              error: 'Inga AI-nycklar konfigurerade. Be din coach konfigurera API-nycklar.',
            }
          }

          // Build generation context from tool params + athlete data
          const sportProfile = clientRecord.sportProfile as Record<string, unknown> | null

          // Fetch athlete test data for zones/thresholds
          const [latestTest, injuries] = await Promise.all([
            prisma.test.findFirst({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              select: {
                vo2max: true,
                maxHR: true,
                anaerobicThreshold: true,
                testStages: {
                  orderBy: { sequence: 'asc' },
                  select: { heartRate: true, speed: true, power: true },
                },
              },
            }),
            prisma.injuryAssessment.findMany({
              where: {
                clientId,
                status: { in: ['ACTIVE', 'MONITORING'] },
              },
              select: { injuryType: true, status: true, notes: true },
            }),
          ])

          const generationContext: GenerationContext = {
            sport,
            totalWeeks,
            sessionsPerWeek,
            methodology: methodology || undefined,
            goal,
            goalDate: goalDate || undefined,
            athleteId: clientId,
            athleteName: clientRecord.name || undefined,
            athleteAge: sportProfile?.age as number | undefined,
            athleteWeight: sportProfile?.weight as number | undefined,
            athleteHeight: sportProfile?.height as number | undefined,
            experienceLevel: sportProfile?.experienceLevel as string | undefined,
            vo2max: latestTest?.vo2max ?? undefined,
            maxHR: latestTest?.maxHR ?? undefined,
            lactateThreshold: latestTest?.anaerobicThreshold
              ? { hr: (latestTest.anaerobicThreshold as { hr?: number })?.hr }
              : undefined,
            injuries: injuries.map(i => ({
              type: i.injuryType || 'unknown',
              status: i.status,
              notes: i.notes || undefined,
            })),
            notes: notes || undefined,
          }

          // Calculate phases and estimate time
          const phases = calculatePhases(totalWeeks)
          const totalPhases = phases.length
          const estimatedMinutes = estimateGenerationMinutes(totalPhases)

          // Map provider to uppercase format expected by orchestrator
          const providerUpperMap: Record<string, 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'> = {
            anthropic: 'ANTHROPIC',
            google: 'GOOGLE',
            openai: 'OPENAI',
          }
          const providerUpper = providerUpperMap[resolved.provider] || 'ANTHROPIC'

          // Create ProgramGenerationSession
          const session = await prisma.programGenerationSession.create({
            data: {
              coachId: coachUserId,
              athleteId: clientId,
              conversationId: conversationId || null,
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

          // Fire-and-forget: start generation in background
          // On Vercel, the poll-program-generation cron picks up PENDING sessions
          generateMultiPartProgram({
            sessionId: session.id,
            context: generationContext,
            apiKey: resolved.apiKey,
            provider: providerUpper,
            modelId: resolved.modelId,
          }).catch((error) => {
            logger.error('Background program generation failed', {
              sessionId: session.id,
              clientId,
            }, error)
          })

          logger.info('Program generation started via chat tool', {
            sessionId: session.id,
            clientId,
            sport,
            totalWeeks,
            totalPhases,
            estimatedMinutes,
          })

          return {
            success: true,
            sessionId: session.id,
            totalPhases,
            estimatedMinutes,
            sport,
            totalWeeks,
            goal,
          }
        } catch (error) {
          logger.error('Failed to start program generation via chat tool', { clientId }, error)
          return {
            success: false,
            error: 'Kunde inte starta programgenereringen. Försök igen.',
          }
        }
      },
    })
  }

  return tools
}
