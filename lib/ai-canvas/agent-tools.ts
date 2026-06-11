/**
 * AI Canvas Agent Tools
 *
 * Tool surface for the agentic canvas generation endpoint. Two kinds:
 *
 * 1. Read tools — coach-scoped, read-only queries over athletes, teams,
 *    tests, sessions, readiness, programs, and notes. The agent pulls the
 *    context it needs instead of the coach pre-selecting it.
 * 2. Emit tools — addCanvasBlocks / addAnalyticsBlocks / setCanvasTitle.
 *    Their tool *outputs* carry validated blocks; the client reads blocks
 *    from the streamed tool-result parts and appends them to the canvas.
 *    addAnalyticsBlocks builds blocks deterministically server-side so the
 *    numbers never pass through the model.
 *
 * ID space: every query here uses Client.id. WorkoutLog (keyed on User.id)
 * is only reached through the program relation, mirroring context-builder.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { differenceInCalendarDays, subDays, addDays } from 'date-fns'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { canvasBlockSchema } from '@/lib/ai-canvas/block-schema'
import { buildCanvasAnalyticsBlocks } from '@/lib/ai-canvas/context-builder'
import { logger } from '@/lib/logger'

export interface CanvasAgentToolsParams {
  userId: string
  businessId: string
  businessSlug: string
  role: string
  locale: 'en' | 'sv'
}

function isoDate(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null
}

function round1(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10
}

export function createCanvasAgentTools(params: CanvasAgentToolsParams) {
  const { userId, businessId, businessSlug, role, locale } = params

  let coachIdsPromise: Promise<string[]> | null = null
  const getCoachIds = () => {
    coachIdsPromise ??= getCoachScopedIds(userId, businessId, role)
    return coachIdsPromise
  }

  async function baseClientWhere(): Promise<Prisma.ClientWhereInput> {
    return { userId: { in: await getCoachIds() }, businessId }
  }

  /**
   * Resolve the athletes a tool call may touch. Inaccessible athleteIds and
   * teams silently drop out because everything intersects the coach scope.
   */
  async function resolveScopedClients(input: {
    athleteIds?: string[]
    teamId?: string
    take?: number
  }): Promise<Array<{ id: string; name: string }>> {
    const where = await baseClientWhere()
    if (input.teamId) {
      const teamWhere = await getAccessibleTeamWhere(userId, businessSlug)
      const team = await prisma.team.findFirst({
        where: { id: input.teamId, AND: [teamWhere] },
        select: { id: true },
      })
      if (!team) return []
      where.teamId = input.teamId
    }
    if (input.athleteIds?.length) {
      where.id = { in: input.athleteIds }
    }
    return prisma.client.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: input.take ?? 80,
    })
  }

  const scopeInput = {
    athleteIds: z.array(z.string()).max(80).optional()
      .describe('Limit to these athlete ids (from listAthletes). Omit together with teamId to include all accessible athletes.'),
    teamId: z.string().optional().describe('Limit to athletes in this team (from listTeams).'),
  }

  const noAthletesResult = { athletes: [], note: 'No accessible athletes matched. Check athleteIds/teamId against listAthletes/listTeams.' }

  return {
    // ── Read tools ────────────────────────────────────────────────────
    listAthletes: tool({
      description: 'List the coach\'s accessible athletes (id, name, sport, team). Call this first to resolve athlete names mentioned by the coach into ids.',
      inputSchema: z.object({
        search: z.string().max(80).optional().describe('Case-insensitive name filter.'),
        teamId: z.string().optional(),
      }),
      execute: async ({ search, teamId }) => {
        try {
          const where = await baseClientWhere()
          if (teamId) where.teamId = teamId
          if (search) where.name = { contains: search, mode: 'insensitive' }
          const clients = await prisma.client.findMany({
            where,
            select: {
              id: true,
              name: true,
              sportProfile: { select: { primarySport: true } },
              team: { select: { id: true, name: true } },
            },
            orderBy: { name: 'asc' },
            take: 100,
          })
          return {
            athletes: clients.map((client) => ({
              id: client.id,
              name: client.name,
              sport: client.sportProfile?.primarySport ?? null,
              teamId: client.team?.id ?? null,
              teamName: client.team?.name ?? null,
            })),
            total: clients.length,
          }
        } catch (error) {
          logger.error('Canvas agent listAthletes failed', {}, error)
          return { error: 'Could not list athletes right now.' }
        }
      },
    }),

    listTeams: tool({
      description: 'List the coach\'s accessible teams with athlete counts. Use to resolve a team name into a teamId.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const teamWhere = await getAccessibleTeamWhere(userId, businessSlug)
          const teams = await prisma.team.findMany({
            where: teamWhere,
            select: {
              id: true,
              name: true,
              sportType: true,
              _count: { select: { members: true } },
            },
            orderBy: { name: 'asc' },
            take: 50,
          })
          return {
            teams: teams.map((team) => ({
              id: team.id,
              name: team.name,
              sportType: team.sportType,
              athleteCount: team._count.members,
            })),
          }
        } catch (error) {
          logger.error('Canvas agent listTeams failed', {}, error)
          return { error: 'Could not list teams right now.' }
        }
      },
    }),

    getTestData: tool({
      description: 'Fetch completed physiological test results (VO2max, max HR, LT1/LT2, test age in days) for athletes. Returns up to 3 most recent tests per athlete so you can describe development over time.',
      inputSchema: z.object(scopeInput),
      execute: async ({ athleteIds, teamId }) => {
        try {
          const clients = await resolveScopedClients({ athleteIds, teamId })
          if (clients.length === 0) return noAthletesResult
          const now = new Date()
          const tests = await prisma.test.findMany({
            where: { clientId: { in: clients.map((client) => client.id) }, status: 'COMPLETED' },
            select: {
              clientId: true,
              testDate: true,
              testType: true,
              vo2max: true,
              maxHR: true,
              manualLT1Intensity: true,
              manualLT2Intensity: true,
            },
            orderBy: { testDate: 'desc' },
          })
          const byClient = new Map<string, typeof tests>()
          for (const test of tests) {
            const list = byClient.get(test.clientId) ?? []
            if (list.length < 3) {
              list.push(test)
              byClient.set(test.clientId, list)
            }
          }
          const athletes = clients.map((client) => {
            const clientTests = byClient.get(client.id) ?? []
            const latest = clientTests[0]
            return {
              id: client.id,
              name: client.name,
              daysSinceLatestTest: latest ? differenceInCalendarDays(now, latest.testDate) : null,
              tests: clientTests.map((test) => ({
                date: isoDate(test.testDate),
                type: test.testType,
                vo2max: test.vo2max,
                maxHR: test.maxHR,
                lt1: test.manualLT1Intensity,
                lt2: test.manualLT2Intensity,
              })),
            }
          })
          return {
            athletes,
            summary: {
              withTests: athletes.filter((athlete) => athlete.tests.length > 0).length,
              total: athletes.length,
              staleOver120Days: athletes.filter((athlete) => (athlete.daysSinceLatestTest ?? 0) > 120).length,
            },
          }
        } catch (error) {
          logger.error('Canvas agent getTestData failed', {}, error)
          return { error: 'Could not fetch test data right now.' }
        }
      },
    }),

    getSessionData: tool({
      description: 'Fetch training session activity from program workout logs: completed counts, average RPE, and last logged session per athlete (direction "past"), or upcoming planned sessions per athlete (direction "upcoming").',
      inputSchema: z.object({
        ...scopeInput,
        days: z.number().int().min(1).max(180).optional().describe('Window size in days. Default 30.'),
        direction: z.enum(['past', 'upcoming']).optional().describe('Default "past".'),
      }),
      execute: async ({ athleteIds, teamId, days = 30, direction = 'past' }) => {
        try {
          const clients = await resolveScopedClients({ athleteIds, teamId })
          if (clients.length === 0) return noAthletesResult
          const clientIds = clients.map((client) => client.id)
          const names = new Map(clients.map((client) => [client.id, client.name]))
          const now = new Date()

          if (direction === 'upcoming') {
            const workouts = await prisma.workout.findMany({
              where: {
                day: {
                  date: { gte: now, lte: addDays(now, days) },
                  week: { program: { clientId: { in: clientIds } } },
                },
                status: { not: 'CANCELLED' },
              },
              select: {
                type: true,
                intensity: true,
                duration: true,
                day: {
                  select: {
                    date: true,
                    week: { select: { program: { select: { clientId: true } } } },
                  },
                },
              },
              orderBy: { day: { date: 'asc' } },
              take: 120,
            })
            const perAthlete = new Map<string, { planned: number; next: string | null }>()
            for (const workout of workouts) {
              const clientId = workout.day.week.program.clientId
              const entry = perAthlete.get(clientId) ?? { planned: 0, next: null }
              entry.planned += 1
              entry.next ??= isoDate(workout.day.date)
              perAthlete.set(clientId, entry)
            }
            return {
              windowDays: days,
              athletes: clients.map((client) => ({
                id: client.id,
                name: client.name,
                plannedSessions: perAthlete.get(client.id)?.planned ?? 0,
                nextSessionDate: perAthlete.get(client.id)?.next ?? null,
              })),
              totalPlanned: workouts.length,
            }
          }

          const logs = await prisma.workoutLog.findMany({
            where: {
              completedAt: { gte: subDays(now, days), lte: now },
              workout: { day: { week: { program: { clientId: { in: clientIds } } } } },
            },
            select: {
              completed: true,
              completedAt: true,
              perceivedEffort: true,
              workout: { select: { day: { select: { week: { select: { program: { select: { clientId: true } } } } } } } },
            },
            orderBy: { completedAt: 'desc' },
            take: 400,
          })
          const perAthlete = new Map<string, { logged: number; completed: number; lastDate: string | null }>()
          const rpes: number[] = []
          for (const log of logs) {
            const clientId = log.workout.day.week.program.clientId
            const entry = perAthlete.get(clientId) ?? { logged: 0, completed: 0, lastDate: null }
            entry.logged += 1
            if (log.completed) entry.completed += 1
            entry.lastDate ??= isoDate(log.completedAt)
            perAthlete.set(clientId, entry)
            if (typeof log.perceivedEffort === 'number') rpes.push(log.perceivedEffort)
          }
          return {
            windowDays: days,
            athletes: clients.map((client) => ({
              id: client.id,
              name: names.get(client.id) ?? client.name,
              loggedSessions: perAthlete.get(client.id)?.logged ?? 0,
              completedSessions: perAthlete.get(client.id)?.completed ?? 0,
              lastSessionDate: perAthlete.get(client.id)?.lastDate ?? null,
            })),
            summary: {
              totalLogged: logs.length,
              totalCompleted: logs.filter((log) => log.completed).length,
              averageRpe: rpes.length ? round1(rpes.reduce((sum, value) => sum + value, 0) / rpes.length) : null,
              athletesWithNoSessions: clients.filter((client) => !perAthlete.has(client.id)).map((client) => client.name),
            },
          }
        } catch (error) {
          logger.error('Canvas agent getSessionData failed', {}, error)
          return { error: 'Could not fetch session data right now.' }
        }
      },
    }),

    getReadinessData: tool({
      description: 'Fetch daily readiness check-ins: latest score, level, recommended action, and pain flag per athlete, plus the group average over the window.',
      inputSchema: z.object({
        ...scopeInput,
        days: z.number().int().min(1).max(90).optional().describe('Window size in days. Default 14.'),
      }),
      execute: async ({ athleteIds, teamId, days = 14 }) => {
        try {
          const clients = await resolveScopedClients({ athleteIds, teamId })
          if (clients.length === 0) return noAthletesResult
          const now = new Date()
          const metrics = await prisma.dailyMetrics.findMany({
            where: {
              clientId: { in: clients.map((client) => client.id) },
              date: { gte: subDays(now, days), lte: now },
            },
            select: {
              clientId: true,
              date: true,
              readinessScore: true,
              readinessLevel: true,
              recommendedAction: true,
              injuryPain: true,
              sleepHours: true,
            },
            orderBy: { date: 'desc' },
            take: 400,
          })
          const latestByClient = new Map<string, typeof metrics[number]>()
          for (const metric of metrics) {
            if (!latestByClient.has(metric.clientId)) latestByClient.set(metric.clientId, metric)
          }
          const scores = metrics
            .map((metric) => metric.readinessScore)
            .filter((score): score is number => typeof score === 'number')
          return {
            windowDays: days,
            athletes: clients.map((client) => {
              const latest = latestByClient.get(client.id)
              return {
                id: client.id,
                name: client.name,
                latest: latest
                  ? {
                      date: isoDate(latest.date),
                      readinessScore: latest.readinessScore,
                      level: latest.readinessLevel,
                      recommendedAction: latest.recommendedAction,
                      injuryPain: latest.injuryPain,
                      sleepHours: latest.sleepHours,
                    }
                  : null,
              }
            }),
            summary: {
              averageScore: scores.length ? round1(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
              athletesWithData: latestByClient.size,
              total: clients.length,
              painFlags: Array.from(latestByClient.values()).filter((metric) => (metric.injuryPain ?? 0) >= 4).length,
            },
          }
        } catch (error) {
          logger.error('Canvas agent getReadinessData failed', {}, error)
          return { error: 'Could not fetch readiness data right now.' }
        }
      },
    }),

    getProgramData: tool({
      description: 'Fetch active training programs per athlete: name, dates, goal race/date, days remaining, and which athletes lack an active program.',
      inputSchema: z.object(scopeInput),
      execute: async ({ athleteIds, teamId }) => {
        try {
          const clients = await resolveScopedClients({ athleteIds, teamId })
          if (clients.length === 0) return noAthletesResult
          const now = new Date()
          const programs = await prisma.trainingProgram.findMany({
            where: {
              clientId: { in: clients.map((client) => client.id) },
              isActive: true,
              startDate: { lte: now },
              endDate: { gte: now },
            },
            select: {
              clientId: true,
              name: true,
              startDate: true,
              endDate: true,
              goalRace: true,
              goalDate: true,
            },
            orderBy: { endDate: 'asc' },
            take: 100,
          })
          const names = new Map(clients.map((client) => [client.id, client.name]))
          const covered = new Set(programs.map((program) => program.clientId))
          return {
            programs: programs.map((program) => ({
              athleteId: program.clientId,
              athlete: names.get(program.clientId) ?? 'Unknown',
              name: program.name,
              startDate: isoDate(program.startDate),
              endDate: isoDate(program.endDate),
              daysRemaining: differenceInCalendarDays(program.endDate, now),
              goalRace: program.goalRace,
              goalDate: isoDate(program.goalDate),
            })),
            athletesWithoutActiveProgram: clients
              .filter((client) => !covered.has(client.id))
              .map((client) => client.name),
          }
        } catch (error) {
          logger.error('Canvas agent getProgramData failed', {}, error)
          return { error: 'Could not fetch program data right now.' }
        }
      },
    }),

    getCoachNotes: tool({
      description: 'Fetch the coach\'s own notes on athletes (free-text observations, flags, context the coach has written down).',
      inputSchema: z.object(scopeInput),
      execute: async ({ athleteIds, teamId }) => {
        try {
          const clients = await resolveScopedClients({ athleteIds, teamId })
          if (clients.length === 0) return noAthletesResult
          const withNotes = await prisma.client.findMany({
            where: { id: { in: clients.map((client) => client.id) }, notes: { not: null } },
            select: { id: true, name: true, notes: true },
            orderBy: { name: 'asc' },
          })
          return {
            notes: withNotes
              .filter((client) => client.notes?.trim())
              .map((client) => ({
                athleteId: client.id,
                athlete: client.name,
                note: client.notes!.trim().replace(/\s+/g, ' ').slice(0, 300),
              })),
            athletesWithoutNotes: clients.length - withNotes.length,
          }
        } catch (error) {
          logger.error('Canvas agent getCoachNotes failed', {}, error)
          return { error: 'Could not fetch coach notes right now.' }
        }
      },
    }),

    // ── Emit tools ────────────────────────────────────────────────────
    addAnalyticsBlocks: tool({
      description: 'Insert deterministic, platform-computed analytics blocks (metric row, risk list, trend summary, charts) for an athlete or team into the canvas. The numbers are computed by the platform, never by you — prefer this over hand-writing metric/chart blocks when live data should be shown. The blocks are added to the canvas automatically; afterwards, interpret them in your own text blocks instead of repeating the numbers.',
      inputSchema: z.object({
        scope: z.enum(['athlete', 'team']),
        athleteId: z.string().optional().describe('Required when scope is "athlete".'),
        teamId: z.string().optional().describe('Required when scope is "team".'),
        dateRange: z.enum(['last7', 'last30', 'last90', 'next30']).optional().describe('Default last30.'),
        dataKeys: z.array(z.enum(['tests', 'sessions', 'programs', 'readiness', 'notes'])).min(1).max(5)
          .describe('Which data areas to compute analytics for.'),
      }),
      execute: async ({ scope, athleteId, teamId, dateRange = 'last30', dataKeys }) => {
        try {
          if (scope === 'athlete' && !athleteId) return { error: 'athleteId is required when scope is "athlete".' }
          if (scope === 'team' && !teamId) return { error: 'teamId is required when scope is "team".' }
          const blocks = await buildCanvasAnalyticsBlocks({
            userId,
            businessSlug,
            businessId,
            role,
            selection: { scope, athleteId, teamId, dateRange, dataKeys },
            locale,
          })
          if (blocks.length === 0) {
            return { blocks: [], added: 0, note: 'No analytics could be computed — the athlete/team was not accessible or has no data in the window.' }
          }
          return { blocks, added: blocks.length }
        } catch (error) {
          logger.error('Canvas agent addAnalyticsBlocks failed', {}, error)
          return { error: 'Could not compute analytics blocks right now.' }
        }
      },
    }),

    addCanvasBlocks: tool({
      description: 'Append content blocks to the canvas document. Call this repeatedly to build the document progressively (1-5 blocks per call) — sections appear to the coach as you write them. Do not use chart/metric blocks with invented numbers; use addAnalyticsBlocks for live numbers.',
      inputSchema: z.object({
        blocks: z.array(canvasBlockSchema).min(1).max(5),
      }),
      execute: async ({ blocks }) => {
        return {
          blocks: blocks.map((block) => ({ ...block, source: block.source ?? ('ai' as const) })),
          added: blocks.length,
        }
      },
    }),

    setCanvasTitle: tool({
      description: 'Set the canvas document title. Call once, early, with a short specific title.',
      inputSchema: z.object({
        title: z.string().trim().min(1).max(120),
      }),
      execute: async ({ title }) => ({ title }),
    }),
  }
}

export type CanvasAgentTools = ReturnType<typeof createCanvasAgentTools>
