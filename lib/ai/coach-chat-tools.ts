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
import { modifyStrengthSessionPrompt } from '@/lib/ai/strength-program-prompts'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { logger } from '@/lib/logger'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { getAccessibleTeam, getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { buildCoachMessageAction, prepareCoachMessageDraftInputSchema } from '@/lib/ai/coach-message-actions'
import type { StrengthPhase } from '@prisma/client'

type CoachToolClient = {
  id: string
  name: string
  email: string | null
  team: { id: string; name: string } | null
  athleteAccount: { userId: string } | null
}

type CompletedWorkoutItem = {
  source: string
  id: string
  date: Date | null
  name: string
  type: string
  programName?: string
  durationMinutes?: number | null
  distanceKm?: number | null
  rpe?: number | null
  metrics: Record<string, unknown>
}

type CoachNavigationDestination =
  | 'dashboard'
  | 'calendar'
  | 'athletes'
  | 'programs'
  | 'programBuilder'
  | 'aiStudio'
  | 'strength'
  | 'cardio'
  | 'hybrid'
  | 'agility'
  | 'monitoring'
  | 'liveHr'
  | 'testOverview'
  | 'newTest'
  | 'videoAnalysis'
  | 'messages'
  | 'teams'
  | 'settings'
  | 'documents'
  | 'analytics'
  | 'athleteProfile'
  | 'athleteLogs'
  | 'athleteCalendar'
  | 'athleteFueling'
  | 'athleteEdit'
  | 'teamDashboard'
  | 'teamCalendar'
  | 'teamTests'

type CoachToolTeam = {
  id: string
  name: string
  sportType: string | null
}

async function findAccessibleCoachClients(
  coachUserId: string,
  search: string,
  businessSlug?: string,
  limit = 5
): Promise<CoachToolClient[]> {
  const clients = await prisma.client.findMany({
    where: {
      name: { contains: search, mode: 'insensitive' },
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      team: { select: { id: true, name: true } },
      athleteAccount: { select: { userId: true } },
    },
    orderBy: { name: 'asc' },
    take: 25,
  })

  const accessible: CoachToolClient[] = []
  for (const client of clients) {
    const access = await canAccessAthlete(coachUserId, client.id)
    if (!access.allowed) continue
    accessible.push(client)
    if (accessible.length >= limit) break
  }
  return accessible
}

async function getAccessibleCoachClientById(
  coachUserId: string,
  clientId: string,
  businessSlug?: string
): Promise<CoachToolClient | null> {
  const access = await canAccessAthlete(coachUserId, clientId)
  if (!access.allowed) return null

  return prisma.client.findFirst({
    where: {
      id: clientId,
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      team: { select: { id: true, name: true } },
      athleteAccount: { select: { userId: true } },
    },
  })
}

function parseAdHocWorkoutSummary(parsedStructure: unknown) {
  const parsed = parsedStructure as {
    name?: string
    type?: string
    sport?: string
    duration?: number
    distance?: number
    perceivedEffort?: number
  } | null

  if (!parsed || typeof parsed !== 'object') return {}
  return {
    name: parsed.name,
    type: parsed.type === 'CARDIO' && parsed.sport ? parsed.sport : parsed.type,
    duration: parsed.duration,
    distance:
      typeof parsed.distance === 'number'
        ? (parsed.distance >= 100 ? parsed.distance / 1000 : parsed.distance)
        : undefined,
    perceivedEffort: parsed.perceivedEffort,
  }
}

async function findAccessibleCoachTeam(
  coachUserId: string,
  params: { teamId?: string; teamName?: string; businessSlug?: string }
): Promise<{ team: CoachToolTeam | null; candidates: CoachToolTeam[] }> {
  if (params.teamId) {
    const team = await getAccessibleTeam(coachUserId, params.teamId, params.businessSlug)
    return {
      team: team ? { id: team.id, name: team.name, sportType: team.sportType } : null,
      candidates: [],
    }
  }

  if (!params.teamName) return { team: null, candidates: [] }

  const where = await getAccessibleTeamWhere(coachUserId, params.businessSlug)
  const candidates = await prisma.team.findMany({
    where: {
      AND: [
        where,
        { name: { contains: params.teamName, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, sportType: true },
    orderBy: { name: 'asc' },
    take: 6,
  })

  const exactMatches = candidates.filter(
    (team) => team.name.toLowerCase() === params.teamName?.toLowerCase()
  )
  return {
    team: exactMatches.length === 1 ? exactMatches[0] : candidates.length === 1 ? candidates[0] : null,
    candidates,
  }
}

function getStaticCoachNavigation(destination: CoachNavigationDestination) {
  const routes: Partial<Record<CoachNavigationDestination, { href: string; label: string; description: string }>> = {
    dashboard: { href: '/coach/dashboard', label: 'Öppna dashboard', description: 'Coachens huvudöversikt' },
    calendar: { href: '/coach/calendar', label: 'Öppna kalender', description: 'Planerade pass, tester och händelser' },
    athletes: { href: '/coach/clients', label: 'Öppna atleter', description: 'Atletlista och snabb statusöversikt' },
    programs: { href: '/coach/programs', label: 'Öppna program', description: 'Träningsprogram och programöversikt' },
    programBuilder: { href: '/coach/programs/new', label: 'Skapa program', description: 'Starta nytt träningsprogram' },
    aiStudio: { href: '/coach/ai-studio', label: 'Öppna AI Studio', description: 'AI-assisterad programgenerering' },
    strength: { href: '/coach/strength', label: 'Öppna Strength Studio', description: 'Styrkepass och progression' },
    cardio: { href: '/coach/cardio', label: 'Öppna Cardio Studio', description: 'Konditionspass och intervaller' },
    hybrid: { href: '/coach/hybrid-studio', label: 'Öppna Hybrid Studio', description: 'HYROX och funktionella pass' },
    agility: { href: '/coach/agility-studio', label: 'Öppna Agility Studio', description: 'Agilitypass och timing gates' },
    monitoring: { href: '/coach/monitoring', label: 'Öppna monitorering', description: 'Beredskap, HRV och belastning' },
    liveHr: { href: '/coach/live-hr', label: 'Öppna Live HR', description: 'Realtidsövervakning av puls' },
    testOverview: { href: '/coach/test-overview', label: 'Öppna testöversikt', description: 'Senaste tester och teststatus' },
    newTest: { href: '/coach/test', label: 'Skapa nytt test', description: 'Ny testinmatning' },
    videoAnalysis: { href: '/coach/video-analysis', label: 'Öppna videoanalys', description: 'Rörelse- och teknikvideo' },
    messages: { href: '/coach/messages', label: 'Öppna meddelanden', description: 'Coachens konversationer' },
    teams: { href: '/coach/teams', label: 'Öppna lag', description: 'Lagöversikt' },
    settings: { href: '/coach/settings', label: 'Öppna inställningar', description: 'Coach- och verksamhetsinställningar' },
    documents: { href: '/coach/documents', label: 'Öppna dokument', description: 'Kunskapsdokument för AI/RAG' },
    analytics: { href: '/coach/analytics', label: 'Öppna analys', description: 'Övergripande analysvyer' },
  }
  return routes[destination] ?? null
}

/**
 * Create all chat tools for a coach session.
 */
export function createCoachChatTools(coachUserId: string, businessSlug?: string) {
  return {
    generateStrengthSession: tool({
      description: 'Generera ett styrkepass automatiskt baserat på mål, fas, utrustning och atletprofil. Kan skapa enskilt pass eller veckoprogram (2-3 pass A/B/C). Passet sparas i databasen och kan sedan redigeras i Strength Studio.',
      inputSchema: z.object({
        clientId: z.string().optional().describe('Atletens client-ID om passet ska anpassas efter en specifik atlet'),
        goal: z.enum(['strength', 'power', 'injury-prevention', 'running-economy']).describe('Träningsmål: strength=generell styrka, power=kraft & explosivitet, injury-prevention=skadeförebyggande, running-economy=löpekonomi'),
        phase: z.enum(['ANATOMICAL_ADAPTATION', 'MAXIMUM_STRENGTH', 'POWER', 'MAINTENANCE', 'TAPER']).describe('Träningsfas/periodisering'),
        athleteLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).default('INTERMEDIATE').describe('Atletens nivå'),
        sessionsPerWeek: z.enum(['1', '2', '3']).default('2').describe('Antal pass per vecka (1, 2 eller 3)'),
        timePerSession: z.enum(['20', '30', '45', '60', '75', '90']).default('45').describe('Tid per pass i minuter'),
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
            sessionsPerWeek: sessionsPerWeekStr,
            timePerSession: timePerSessionStr,
            equipmentAvailable,
            mode,
            includeWarmup,
            includeCore,
            includeCooldown,
          } = params
          const sessionsPerWeek = parseInt(sessionsPerWeekStr) as 1 | 2 | 3
          const timePerSession = parseInt(timePerSessionStr)

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

    findAthleteByName: tool({
      description: 'Sök efter en atlet som coachen har behörighet till. Använd när coachen nämner en atlet vid namn och du behöver clientId innan du hämtar data eller skapar något.',
      inputSchema: z.object({
        name: z.string().min(2).describe('Namnet eller del av namnet att söka efter'),
        limit: z.number().int().min(1).max(10).default(5).describe('Max antal träffar att returnera'),
      }),
      execute: async ({ name, limit }) => {
        try {
          const clients = await findAccessibleCoachClients(coachUserId, name, businessSlug, limit)
          return {
            success: true,
            matchCount: clients.length,
            athletes: clients.map((client) => ({
              id: client.id,
              name: client.name,
              email: client.email,
              team: client.team?.name ?? null,
              hasLinkedAthleteAccount: Boolean(client.athleteAccount?.userId),
            })),
            message:
              clients.length === 0
                ? `Jag hittade ingen tillgänglig atlet som matchar "${name}".`
                : clients.length === 1
                  ? `Jag hittade ${clients[0].name}.`
                  : `Jag hittade ${clients.length} möjliga atleter. Be coachen välja rätt clientId om namnet är otydligt.`,
          }
        } catch (error) {
          logger.error('Error in findAthleteByName tool', { coachUserId, name }, error)
          return { success: false, error: 'Kunde inte söka efter atleten.' }
        }
      },
    }),

    getLatestCompletedWorkout: tool({
      description: 'Hämta den senaste genomförda träningsaktiviteten för en specifik atlet. Kan ta clientId direkt eller söka med athleteName. Täcker programloggar, ad-hoc-pass, Garmin, styrka, kondition, hybrid, agility och AI-genererade WODs.',
      inputSchema: z.object({
        clientId: z.string().optional().describe('Atletens clientId om det redan är känt'),
        athleteName: z.string().optional().describe('Atletens namn om clientId inte är känt'),
      }),
      execute: async ({ clientId, athleteName }) => {
        try {
          let client: CoachToolClient | null = null
          let candidates: CoachToolClient[] = []

          if (clientId) {
            client = await getAccessibleCoachClientById(coachUserId, clientId, businessSlug)
            if (!client) {
              return {
                success: false,
                error: 'Atleten hittades inte eller ligger utanför din behörighet.',
              }
            }
          } else if (athleteName) {
            candidates = await findAccessibleCoachClients(coachUserId, athleteName, businessSlug, 6)
            const exactMatches = candidates.filter(
              (candidate) => candidate.name.toLowerCase() === athleteName.toLowerCase()
            )
            if (exactMatches.length === 1) {
              client = exactMatches[0]
            } else if (candidates.length === 1) {
              client = candidates[0]
            } else {
              return {
                success: false,
                needsClarification: candidates.length > 1,
                error:
                  candidates.length === 0
                    ? `Jag hittade ingen tillgänglig atlet som matchar "${athleteName}".`
                    : `Jag hittade flera möjliga atleter som matchar "${athleteName}".`,
                candidates: candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  team: candidate.team?.name ?? null,
                })),
              }
            }
          } else {
            return { success: false, error: 'Ange clientId eller athleteName.' }
          }

          const athleteUserId = client.athleteAccount?.userId
          if (!athleteUserId) {
            return {
              success: false,
              athlete: { id: client.id, name: client.name },
              error: 'Atleten har inget länkat atletkonto ännu, så genomförda pass kan inte hämtas från historiken.',
            }
          }

          const [
            programLog,
            adHocWorkout,
            garminActivity,
            strengthAssignment,
            cardioAssignment,
            hybridAssignment,
            agilityAssignment,
            completedWOD,
          ] = await Promise.all([
            prisma.workoutLog.findFirst({
              where: {
                athleteId: athleteUserId,
                completed: true,
                completedAt: { not: null },
                workout: {
                  day: {
                    week: {
                      program: { clientId: client.id },
                    },
                  },
                },
              },
              include: {
                workout: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    intensity: true,
                    distance: true,
                    duration: true,
                    day: {
                      select: {
                        week: {
                          select: {
                            program: { select: { id: true, name: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.adHocWorkout.findFirst({
              where: {
                athleteId: client.id,
                status: 'CONFIRMED',
              },
              select: {
                id: true,
                workoutDate: true,
                workoutName: true,
                parsedType: true,
                parsedStructure: true,
                inputType: true,
              },
              orderBy: { workoutDate: 'desc' },
            }),
            prisma.garminActivity.findFirst({
              where: { clientId: client.id },
              select: {
                id: true,
                name: true,
                type: true,
                mappedType: true,
                startDate: true,
                duration: true,
                distance: true,
                averageHeartrate: true,
                maxHeartrate: true,
                averageWatts: true,
                tss: true,
                deviceName: true,
              },
              orderBy: { startDate: 'desc' },
            }),
            prisma.strengthSessionAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                duration: true,
                rpe: true,
                session: { select: { name: true, phase: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.cardioSessionAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                actualDuration: true,
                actualDistance: true,
                avgHeartRate: true,
                session: { select: { name: true, sport: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.hybridWorkoutAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                workout: { select: { name: true, format: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.agilityWorkoutAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                workout: { select: { name: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.aIGeneratedWOD.findFirst({
              where: {
                clientId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                title: true,
                primarySport: true,
                actualDuration: true,
                requestedDuration: true,
                sessionRPE: true,
                completedAt: true,
                source: true,
              },
              orderBy: { completedAt: 'desc' },
            }),
          ])

          const adHocSummary = parseAdHocWorkoutSummary(adHocWorkout?.parsedStructure)
          const completedItems = ([
            programLog && {
              source: 'program-log',
              id: programLog.id,
              date: programLog.completedAt,
              name: programLog.workout.name,
              type: programLog.workout.type,
              programName: programLog.workout.day.week.program.name,
              durationMinutes: programLog.duration ?? programLog.workout.duration,
              distanceKm: programLog.distance ?? programLog.workout.distance,
              rpe: programLog.perceivedEffort,
              metrics: {
                avgHR: programLog.avgHR,
                maxHR: programLog.maxHR,
                avgPower: programLog.avgPower,
                tss: programLog.tss,
                feeling: programLog.feeling,
              },
            },
            adHocWorkout && {
              source: 'ad-hoc',
              id: adHocWorkout.id,
              date: adHocWorkout.workoutDate,
              name: adHocSummary.name ?? adHocWorkout.workoutName ?? 'Ad-hoc pass',
              type: adHocSummary.type ?? adHocWorkout.parsedType ?? 'OTHER',
              durationMinutes: adHocSummary.duration,
              distanceKm: adHocSummary.distance,
              rpe: adHocSummary.perceivedEffort,
              metrics: { inputType: adHocWorkout.inputType },
            },
            garminActivity && {
              source: 'garmin',
              id: garminActivity.id,
              date: garminActivity.startDate,
              name: garminActivity.name ?? garminActivity.type,
              type: garminActivity.mappedType ?? garminActivity.type,
              durationMinutes: garminActivity.duration ? Math.round(garminActivity.duration / 60) : null,
              distanceKm: garminActivity.distance ? garminActivity.distance / 1000 : null,
              rpe: null,
              metrics: {
                avgHR: garminActivity.averageHeartrate,
                maxHR: garminActivity.maxHeartrate,
                avgPower: garminActivity.averageWatts,
                tss: garminActivity.tss,
                deviceName: garminActivity.deviceName,
              },
            },
            strengthAssignment && {
              source: 'strength-assignment',
              id: strengthAssignment.id,
              date: strengthAssignment.completedAt,
              name: strengthAssignment.session.name,
              type: 'STRENGTH',
              durationMinutes: strengthAssignment.duration,
              distanceKm: null,
              rpe: strengthAssignment.rpe,
              metrics: { phase: strengthAssignment.session.phase },
            },
            cardioAssignment && {
              source: 'cardio-assignment',
              id: cardioAssignment.id,
              date: cardioAssignment.completedAt,
              name: cardioAssignment.session.name,
              type: cardioAssignment.session.sport,
              durationMinutes: cardioAssignment.actualDuration ? Math.round(cardioAssignment.actualDuration / 60) : null,
              distanceKm: cardioAssignment.actualDistance ? cardioAssignment.actualDistance / 1000 : null,
              rpe: null,
              metrics: { avgHR: cardioAssignment.avgHeartRate },
            },
            hybridAssignment && {
              source: 'hybrid-assignment',
              id: hybridAssignment.id,
              date: hybridAssignment.completedAt,
              name: hybridAssignment.workout.name,
              type: 'HYBRID',
              durationMinutes: null,
              distanceKm: null,
              rpe: null,
              metrics: { format: hybridAssignment.workout.format },
            },
            agilityAssignment && {
              source: 'agility-assignment',
              id: agilityAssignment.id,
              date: agilityAssignment.completedAt,
              name: agilityAssignment.workout.name,
              type: 'AGILITY',
              durationMinutes: null,
              distanceKm: null,
              rpe: null,
              metrics: {},
            },
            completedWOD && {
              source: completedWOD.source === 'chat' ? 'ai-chat-wod' : 'wod',
              id: completedWOD.id,
              date: completedWOD.completedAt,
              name: completedWOD.title,
              type: completedWOD.primarySport ?? 'WOD',
              durationMinutes: completedWOD.actualDuration ?? completedWOD.requestedDuration,
              distanceKm: null,
              rpe: completedWOD.sessionRPE,
              metrics: {},
            },
          ] as Array<CompletedWorkoutItem | null | false>).filter(
            (item): item is CompletedWorkoutItem => typeof item === 'object' && item !== null && Boolean(item.date)
          )
            .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

          const latestWorkout = completedItems[0] ?? null

          if (!latestWorkout) {
            return {
              success: true,
              athlete: { id: client.id, name: client.name, team: client.team?.name ?? null },
              latestWorkout: null,
              message: `${client.name} har inga genomförda pass i den tillgängliga historiken.`,
            }
          }

          return {
            success: true,
            athlete: { id: client.id, name: client.name, team: client.team?.name ?? null },
            latestWorkout: {
              ...latestWorkout,
              completedAt: latestWorkout.date?.toISOString(),
            },
            checkedSources: completedItems.length,
            message: `${client.name}s senaste genomförda pass är "${latestWorkout.name}" (${latestWorkout.type}) från ${latestWorkout.date?.toISOString().slice(0, 10)}.`,
          }
        } catch (error) {
          logger.error('Error in getLatestCompletedWorkout tool', { coachUserId, clientId, athleteName }, error)
          return { success: false, error: 'Kunde inte hämta senaste genomförda pass.' }
        }
      },
    }),

    suggestCoachNavigation: tool({
      description: 'Skapa en säker navigeringsåtgärd till rätt coach-sida. Använd när coachen ber dig öppna, visa, gå till eller ta dem till en sida, atletvy eller lagvy. Verktyget klickar inte själv, utan returnerar en app-länk som chatten kan visa som knapp.',
      inputSchema: z.object({
        destination: z.enum([
          'dashboard',
          'calendar',
          'athletes',
          'programs',
          'programBuilder',
          'aiStudio',
          'strength',
          'cardio',
          'hybrid',
          'agility',
          'monitoring',
          'liveHr',
          'testOverview',
          'newTest',
          'videoAnalysis',
          'messages',
          'teams',
          'settings',
          'documents',
          'analytics',
          'athleteProfile',
          'athleteLogs',
          'athleteCalendar',
          'athleteFueling',
          'athleteEdit',
          'teamDashboard',
          'teamCalendar',
          'teamTests',
        ]).describe('Målsidan coachen vill till'),
        clientId: z.string().optional().describe('Atletens clientId om känd'),
        athleteName: z.string().optional().describe('Atletens namn om destinationen är atletrelaterad'),
        teamId: z.string().optional().describe('Lagets id om känd'),
        teamName: z.string().optional().describe('Lagets namn om destinationen är lagrelaterad'),
      }),
      execute: async ({ destination, clientId, athleteName, teamId, teamName }) => {
        try {
          const athleteDestinations = new Set<CoachNavigationDestination>([
            'athleteProfile',
            'athleteLogs',
            'athleteCalendar',
            'athleteFueling',
            'athleteEdit',
          ])
          const teamDestinations = new Set<CoachNavigationDestination>([
            'teamDashboard',
            'teamCalendar',
            'teamTests',
          ])

          if (athleteDestinations.has(destination)) {
            let client: CoachToolClient | null = null
            let candidates: CoachToolClient[] = []

            if (clientId) {
              client = await getAccessibleCoachClientById(coachUserId, clientId, businessSlug)
            } else if (athleteName) {
              candidates = await findAccessibleCoachClients(coachUserId, athleteName, businessSlug, 6)
              const exactMatches = candidates.filter(
                (candidate) => candidate.name.toLowerCase() === athleteName.toLowerCase()
              )
              client = exactMatches.length === 1 ? exactMatches[0] : candidates.length === 1 ? candidates[0] : null
            }

            if (!client) {
              return {
                success: false,
                needsClarification: candidates.length > 1,
                error:
                  candidates.length > 1
                    ? `Jag hittade flera möjliga atleter${athleteName ? ` för "${athleteName}"` : ''}.`
                    : 'Jag behöver en atlet för att skapa den navigeringen.',
                candidates: candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  team: candidate.team?.name ?? null,
                })),
              }
            }

            const athleteRoutes: Record<string, { href: string; label: string; description: string }> = {
              athleteProfile: {
                href: `/coach/clients/${client.id}`,
                label: `Öppna ${client.name}`,
                description: 'Atletens coachprofil',
              },
              athleteLogs: {
                href: `/coach/athletes/${client.id}/logs`,
                label: `Öppna ${client.name}s träningslogg`,
                description: 'Genomförda och ej genomförda pass',
              },
              athleteCalendar: {
                href: `/coach/athletes/${client.id}/calendar`,
                label: `Öppna ${client.name}s kalender`,
                description: 'Atletens planerade kalender',
              },
              athleteFueling: {
                href: `/coach/clients/${client.id}/fueling`,
                label: `Öppna ${client.name}s fueling`,
                description: 'Energi- och vätskeplanering',
              },
              athleteEdit: {
                href: `/coach/clients/${client.id}/edit`,
                label: `Redigera ${client.name}`,
                description: 'Atletens profilinställningar',
              },
            }
            const navigation = athleteRoutes[destination]
            return {
              success: true,
              navigation: {
                ...navigation,
                destination,
                entityType: 'athlete',
                entityId: client.id,
                entityName: client.name,
              },
              message: `Jag har förberett en genväg till ${navigation.description.toLowerCase()} för ${client.name}.`,
            }
          }

          if (teamDestinations.has(destination)) {
            const { team, candidates } = await findAccessibleCoachTeam(coachUserId, {
              teamId,
              teamName,
              businessSlug,
            })

            if (!team) {
              return {
                success: false,
                needsClarification: candidates.length > 1,
                error:
                  candidates.length > 1
                    ? `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                    : 'Jag behöver ett lag för att skapa den navigeringen.',
                candidates: candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  sportType: candidate.sportType,
                })),
              }
            }

            const teamRoutes: Record<string, { href: string; label: string; description: string }> = {
              teamDashboard: {
                href: `/coach/teams/${team.id}`,
                label: `Öppna ${team.name}`,
                description: 'Lagdashboard',
              },
              teamCalendar: {
                href: `/coach/teams/${team.id}/calendar`,
                label: `Öppna ${team.name}s kalender`,
                description: 'Lagets kalender',
              },
              teamTests: {
                href: `/coach/teams/${team.id}/tests`,
                label: `Öppna ${team.name}s tester`,
                description: 'Lagets testvy',
              },
            }
            const navigation = teamRoutes[destination]
            return {
              success: true,
              navigation: {
                ...navigation,
                destination,
                entityType: 'team',
                entityId: team.id,
                entityName: team.name,
              },
              message: `Jag har förberett en genväg till ${navigation.description.toLowerCase()} för ${team.name}.`,
            }
          }

          const navigation = getStaticCoachNavigation(destination)
          if (!navigation) {
            return { success: false, error: 'Den destinationen stöds inte ännu.' }
          }

          return {
            success: true,
            navigation: {
              ...navigation,
              destination,
              entityType: 'page',
              entityId: null,
              entityName: null,
            },
            message: `Jag har förberett en genväg: ${navigation.label}.`,
          }
        } catch (error) {
          logger.error('Error in suggestCoachNavigation tool', {
            coachUserId,
            businessSlug,
            destination,
            clientId,
            athleteName,
            teamId,
            teamName,
          }, error)
          return { success: false, error: 'Kunde inte skapa navigeringen.' }
        }
      },
    }),

    prepareCoachMessageDraft: tool({
      description: 'Förbered ett meddelande till en atlet, ett helt lag eller en filtrerad laggrupp. Verktyget skickar aldrig direkt utan returnerar ett bekräftelsekort som coachen måste klicka på.',
      inputSchema: prepareCoachMessageDraftInputSchema,
      execute: async (params) => {
        try {
          return await buildCoachMessageAction(coachUserId, params, businessSlug)
        } catch (error) {
          logger.error('Error in prepareCoachMessageDraft tool', { coachUserId, businessSlug }, error)
          return { success: false, error: 'Kunde inte förbereda meddelandet.' }
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

    modifyStrengthSession: tool({
      description: 'Modifiera ett befintligt styrkepass med AI. Kan byta ut övningar, justera volym/intensitet, anpassa för skador, göra lättare/svårare etc. Kräver sessionId.',
      inputSchema: z.object({
        sessionId: z.string().describe('Styrkepassets ID'),
        modification: z.string().describe('Vad ska ändras (t.ex. "byt ut knäböj mot benspress", "gör passet lättare", "ta bort alla hoppövningar")'),
      }),
      execute: async ({ sessionId, modification }) => {
        try {
          // Fetch current session
          const session = await prisma.strengthSession.findUnique({
            where: { id: sessionId },
            select: {
              id: true,
              name: true,
              description: true,
              phase: true,
              exercises: true,
              warmupData: true,
              coreData: true,
              cooldownData: true,
              coachId: true,
            },
          })

          if (!session) {
            return { success: false, error: 'Passet hittades inte.' }
          }

          if (session.coachId !== coachUserId) {
            return { success: false, error: 'Du har inte tillgång till detta pass.' }
          }

          // Build the AI prompt
          const sessionJson = JSON.stringify({
            name: session.name,
            description: session.description,
            phase: session.phase,
            exercises: session.exercises,
            warmupData: session.warmupData,
            coreData: session.coreData,
            cooldownData: session.cooldownData,
          }, null, 2)

          const prompt = modifyStrengthSessionPrompt(sessionJson, modification)

          // Get AI model
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'balanced')
          if (!resolved) {
            return { success: false, error: 'Inga AI-nycklar konfigurerade.' }
          }

          // Create model instance
          let aiModel: any
          if (resolved.provider === 'anthropic') {
            const anthropic = createAnthropic({ apiKey: resolved.apiKey })
            aiModel = anthropic(resolved.modelId)
          } else if (resolved.provider === 'google') {
            const google = createGoogleGenerativeAI({ apiKey: resolved.apiKey })
            aiModel = google(resolved.modelId)
          } else {
            const openai = createOpenAI({ apiKey: resolved.apiKey })
            aiModel = openai(resolved.modelId)
          }

          // Call AI
          const result = await generateText({
            model: aiModel,
            system: 'Du är en expert på styrketräning. Returnera ALLTID ett giltigt JSON-objekt i ett ```json``` kodblock.',
            prompt,
            maxOutputTokens: 4096,
          })

          // Parse the JSON from the response
          const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
          if (!jsonMatch?.[1]) {
            return {
              success: false,
              error: 'AI kunde inte generera ett giltigt modifierat pass.',
              aiResponse: result.text.slice(0, 500),
            }
          }

          const modified = JSON.parse(jsonMatch[1])

          // Update the session
          await prisma.strengthSession.update({
            where: { id: sessionId },
            data: {
              name: modified.name || session.name,
              description: modified.description || session.description,
              exercises: modified.exercises || session.exercises,
              warmupData: modified.warmupData ?? session.warmupData,
              coreData: modified.coreData ?? session.coreData,
              cooldownData: modified.cooldownData ?? session.cooldownData,
            },
          })

          // Extract explanation from AI response (text after JSON block)
          const explanation = result.text.split('```').pop()?.trim() || 'Passet har uppdaterats.'

          return {
            success: true,
            sessionId,
            name: modified.name || session.name,
            modification,
            explanation,
            message: `Passet "${modified.name || session.name}" har modifierats: ${modification}`,
          }
        } catch (error) {
          logger.error('Error in modifyStrengthSession tool', {}, error)
          return { success: false, error: 'Kunde inte modifiera passet.' }
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
