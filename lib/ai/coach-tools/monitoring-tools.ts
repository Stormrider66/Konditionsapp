/**
 * Coach chat tools for monitoring athletes: roster attention list, per-athlete
 * status, readiness history, training load, and test results.
 *
 * All tools are read-only (no confirmation flow). Every athlete lookup goes
 * through the coach access check, mirroring athlete-tools.ts.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  type CoachToolContext,
  type CoachToolClient,
  toolText,
  findAccessibleCoachClients,
  getAccessibleCoachClientById,
  resolveCoachToolBusinessId,
} from './shared'

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

type ResolveResult =
  | { ok: true; client: CoachToolClient }
  | { ok: false; result: Record<string, unknown> }

/** Resolve clientId/athleteName to one accessible client, or a tool-result error. */
async function resolveClient(
  ctx: CoachToolContext,
  clientId: string | undefined,
  athleteName: string | undefined
): Promise<ResolveResult> {
  const { coachUserId, businessSlug, locale } = ctx

  if (clientId) {
    const client = await getAccessibleCoachClientById(coachUserId, clientId, businessSlug)
    if (!client) {
      return {
        ok: false,
        result: {
          success: false,
          error: toolText(locale, 'The athlete was not found or is outside your access.', 'Atleten hittades inte eller ligger utanför din behörighet.'),
        },
      }
    }
    return { ok: true, client }
  }

  if (!athleteName) {
    return {
      ok: false,
      result: {
        success: false,
        error: toolText(locale, 'Provide clientId or athleteName.', 'Ange clientId eller athleteName.'),
      },
    }
  }

  const candidates = await findAccessibleCoachClients(coachUserId, athleteName, businessSlug, 6)
  const exactMatches = candidates.filter(
    (candidate) => candidate.name.toLowerCase() === athleteName.toLowerCase()
  )
  const client = exactMatches.length === 1 ? exactMatches[0] : candidates.length === 1 ? candidates[0] : null
  if (client) return { ok: true, client }

  return {
    ok: false,
    result: {
      success: false,
      needsClarification: candidates.length > 1,
      error:
        candidates.length === 0
          ? toolText(locale, `I found no accessible athlete matching "${athleteName}".`, `Jag hittade ingen tillgänglig atlet som matchar "${athleteName}".`)
          : toolText(locale, `I found several possible athletes matching "${athleteName}".`, `Jag hittade flera möjliga atleter som matchar "${athleteName}".`),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        team: candidate.team?.name ?? null,
      })),
    },
  }
}

export function createMonitoringTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    getAthletesNeedingAttention: tool({
      description: toolText(
        locale,
        'List active coach alerts: athletes flagged for readiness drops, missed check-ins, missed workouts, pain mentions, or high ACWR. Same data as the dashboard AI assistant panel. Use when the coach asks who needs attention, who is at risk, or for a roster status overview.',
        'Lista aktiva coachvarningar: atleter flaggade för beredskapsfall, missade check-ins, missade pass, smärtomnämnanden eller hög ACWR. Samma data som dashboardens AI-assistentpanel. Använd när coachen frågar vem som behöver uppmärksamhet, vem som är i riskzonen eller vill ha en statusöversikt.'
      ),
      inputSchema: z.object({
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
          .describe('Only alerts at this severity.'),
        limit: z.number().int().min(1).max(50).default(20).describe('Maximum number of alerts.'),
      }),
      execute: async ({ severity, limit }) => {
        try {
          const businessId = await resolveCoachToolBusinessId(coachUserId, businessSlug)
          const alerts = await prisma.coachAlert.findMany({
            where: {
              coachId: coachUserId,
              status: 'ACTIVE',
              ...(severity ? { severity } : {}),
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              client: businessId ? { businessId } : { userId: coachUserId },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
              id: true,
              alertType: true,
              severity: true,
              title: true,
              message: true,
              createdAt: true,
              client: { select: { id: true, name: true } },
            },
          })

          const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
          alerts.sort(
            (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
          )

          return {
            success: true,
            alertCount: alerts.length,
            alerts: alerts.map((a) => ({
              athleteId: a.client.id,
              athleteName: a.client.name,
              type: a.alertType,
              severity: a.severity,
              title: a.title,
              message: a.message,
              date: isoDate(a.createdAt),
            })),
            message:
              alerts.length === 0
                ? toolText(locale, 'No active alerts — no athletes are currently flagged.', 'Inga aktiva varningar — inga atleter är flaggade just nu.')
                : undefined,
          }
        } catch (error) {
          logger.error('getAthletesNeedingAttention tool failed', { coachUserId }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not fetch alerts.', 'Kunde inte hämta varningar.'),
          }
        }
      },
    }),

    getAthleteStatusSummary: tool({
      description: toolText(
        locale,
        'Fetch a combined status summary for one athlete: latest readiness check-in, latest ACWR with zone, and active injuries. Use when the coach asks how an athlete is doing right now.',
        'Hämta en kombinerad statusöversikt för en atlet: senaste beredskaps-check-in, senaste ACWR med zon och aktiva skador. Använd när coachen frågar hur en atlet mår just nu.'
      ),
      inputSchema: z.object({
        clientId: z.string().optional().describe('Athlete clientId if already known.'),
        athleteName: z.string().optional().describe('Athlete name if clientId is not known.'),
      }),
      execute: async ({ clientId, athleteName }) => {
        try {
          const resolved = await resolveClient(ctx, clientId, athleteName)
          if (!resolved.ok) return resolved.result
          const client = resolved.client

          const [latestCheckIn, latestAcwr, injuries] = await Promise.all([
            prisma.dailyCheckIn.findFirst({
              where: { clientId: client.id },
              orderBy: { date: 'desc' },
              select: {
                date: true,
                readinessScore: true,
                readinessDecision: true,
                sleepQuality: true,
                fatigue: true,
                soreness: true,
                stress: true,
                hrv: true,
              },
            }),
            prisma.trainingLoad.findFirst({
              where: { clientId: client.id, source: 'ACWR_SUMMARY', acwr: { not: null } },
              orderBy: { date: 'desc' },
              select: { date: true, acuteLoad: true, chronicLoad: true, acwr: true, acwrZone: true, injuryRisk: true },
            }),
            prisma.injuryAssessment.findMany({
              where: { clientId: client.id, status: { in: ['ACTIVE', 'MONITORING'] } },
              orderBy: { createdAt: 'desc' },
              select: { bodyPart: true, side: true, painLevel: true, phase: true, status: true, createdAt: true },
            }),
          ])

          return {
            success: true,
            athlete: { id: client.id, name: client.name, team: client.team?.name ?? null },
            latestCheckIn: latestCheckIn
              ? { ...latestCheckIn, date: isoDate(latestCheckIn.date) }
              : null,
            acwr: latestAcwr
              ? {
                  date: isoDate(latestAcwr.date),
                  acuteLoad: latestAcwr.acuteLoad,
                  chronicLoad: latestAcwr.chronicLoad,
                  ratio: latestAcwr.acwr,
                  zone: latestAcwr.acwrZone,
                  injuryRisk: latestAcwr.injuryRisk,
                }
              : null,
            activeInjuries: injuries.map((i) => ({ ...i, createdAt: isoDate(i.createdAt) })),
          }
        } catch (error) {
          logger.error('getAthleteStatusSummary tool failed', { coachUserId, clientId, athleteName }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not fetch the athlete status.', 'Kunde inte hämta atletens status.'),
          }
        }
      },
    }),

    getAthleteReadinessHistory: tool({
      description: toolText(
        locale,
        'Fetch an athlete\'s daily check-in history: readiness score, sleep, soreness, fatigue, stress, mood, HRV. Use for questions about readiness trends or recovery over time.',
        'Hämta en atlets dagliga check-in-historik: beredskapspoäng, sömn, ömhet, trötthet, stress, humör, HRV. Använd för frågor om beredskapstrender eller återhämtning över tid.'
      ),
      inputSchema: z.object({
        clientId: z.string().optional().describe('Athlete clientId if already known.'),
        athleteName: z.string().optional().describe('Athlete name if clientId is not known.'),
        days: z.number().int().min(1).max(90).default(14).describe('Number of days back to fetch.'),
      }),
      execute: async ({ clientId, athleteName, days }) => {
        try {
          const resolved = await resolveClient(ctx, clientId, athleteName)
          if (!resolved.ok) return resolved.result
          const client = resolved.client

          const since = new Date()
          since.setUTCHours(0, 0, 0, 0)
          since.setUTCDate(since.getUTCDate() - days)

          const checkIns = await prisma.dailyCheckIn.findMany({
            where: { clientId: client.id, date: { gte: since } },
            orderBy: { date: 'desc' },
            select: {
              date: true,
              readinessScore: true,
              readinessDecision: true,
              sleepQuality: true,
              sleepHours: true,
              soreness: true,
              fatigue: true,
              stress: true,
              mood: true,
              motivation: true,
              hrv: true,
              restingHR: true,
            },
          })

          return {
            success: true,
            athlete: { id: client.id, name: client.name },
            periodDays: days,
            checkInCount: checkIns.length,
            checkIns: checkIns.map((c) => ({ ...c, date: isoDate(c.date) })),
          }
        } catch (error) {
          logger.error('getAthleteReadinessHistory tool failed', { coachUserId, clientId, athleteName }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not fetch check-in history.', 'Kunde inte hämta check-in-historik.'),
          }
        }
      },
    }),

    getAthleteTrainingLoad: tool({
      description: toolText(
        locale,
        'Fetch an athlete\'s training load: daily load totals for a period plus the latest ACWR with zone. Note: ACWR is computed nightly and does not include workouts logged today.',
        'Hämta en atlets träningsbelastning: dagliga belastningssummor för en period plus senaste ACWR med zon. Obs: ACWR beräknas nattligen och inkluderar inte pass loggade idag.'
      ),
      inputSchema: z.object({
        clientId: z.string().optional().describe('Athlete clientId if already known.'),
        athleteName: z.string().optional().describe('Athlete name if clientId is not known.'),
        days: z.number().int().min(7).max(90).default(28).describe('Number of days back to summarize.'),
      }),
      execute: async ({ clientId, athleteName, days }) => {
        try {
          const resolved = await resolveClient(ctx, clientId, athleteName)
          if (!resolved.ok) return resolved.result
          const client = resolved.client

          const since = new Date()
          since.setUTCHours(0, 0, 0, 0)
          since.setUTCDate(since.getUTCDate() - days)

          // WORKOUT rows for load sums; ACWR_SUMMARY rows for ACWR — never mix.
          const [workoutRows, latestAcwr] = await Promise.all([
            prisma.trainingLoad.findMany({
              where: { clientId: client.id, source: 'WORKOUT', date: { gte: since } },
              orderBy: { date: 'asc' },
              select: { date: true, dailyLoad: true, duration: true, intensity: true, workoutType: true },
            }),
            prisma.trainingLoad.findFirst({
              where: { clientId: client.id, source: 'ACWR_SUMMARY', acwr: { not: null } },
              orderBy: { date: 'desc' },
              select: { date: true, acuteLoad: true, chronicLoad: true, acwr: true, acwrZone: true, injuryRisk: true },
            }),
          ])

          const byDay = new Map<string, { load: number; sessions: number; minutes: number }>()
          for (const row of workoutRows) {
            const key = isoDate(row.date)
            const entry = byDay.get(key) ?? { load: 0, sessions: 0, minutes: 0 }
            entry.load += row.dailyLoad
            entry.sessions += 1
            entry.minutes += row.duration
            byDay.set(key, entry)
          }

          return {
            success: true,
            athlete: { id: client.id, name: client.name },
            periodDays: days,
            totals: {
              load: Math.round(workoutRows.reduce((sum, r) => sum + r.dailyLoad, 0)),
              sessions: workoutRows.length,
              hours: Math.round((workoutRows.reduce((sum, r) => sum + r.duration, 0) / 60) * 10) / 10,
            },
            dailyLoads: Array.from(byDay.entries()).map(([date, v]) => ({
              date,
              load: Math.round(v.load),
              sessions: v.sessions,
              minutes: Math.round(v.minutes),
            })),
            acwr: latestAcwr
              ? {
                  date: isoDate(latestAcwr.date),
                  acuteLoad: latestAcwr.acuteLoad,
                  chronicLoad: latestAcwr.chronicLoad,
                  ratio: latestAcwr.acwr,
                  zone: latestAcwr.acwrZone,
                  injuryRisk: latestAcwr.injuryRisk,
                }
              : null,
          }
        } catch (error) {
          logger.error('getAthleteTrainingLoad tool failed', { coachUserId, clientId, athleteName }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not fetch training load.', 'Kunde inte hämta träningsbelastning.'),
          }
        }
      },
    }),

    getAthleteTestResults: tool({
      description: toolText(
        locale,
        'Fetch an athlete\'s physiological test results: VO2max, max HR, aerobic/anaerobic thresholds. Use for questions about an athlete\'s test values, zones, or development between tests.',
        'Hämta en atlets fysiologiska testresultat: VO2max, maxpuls, aerob/anaerob tröskel. Använd för frågor om en atlets testvärden, zoner eller utveckling mellan tester.'
      ),
      inputSchema: z.object({
        clientId: z.string().optional().describe('Athlete clientId if already known.'),
        athleteName: z.string().optional().describe('Athlete name if clientId is not known.'),
        limit: z.number().int().min(1).max(10).default(3).describe('Number of most recent tests.'),
      }),
      execute: async ({ clientId, athleteName, limit }) => {
        try {
          const resolved = await resolveClient(ctx, clientId, athleteName)
          if (!resolved.ok) return resolved.result
          const client = resolved.client

          const tests = await prisma.test.findMany({
            where: { clientId: client.id, status: { not: 'DRAFT' } },
            orderBy: { testDate: 'desc' },
            take: limit,
            select: {
              id: true,
              testDate: true,
              testType: true,
              vo2max: true,
              maxHR: true,
              maxLactate: true,
              aerobicThreshold: true,
              anaerobicThreshold: true,
            },
          })

          return {
            success: true,
            athlete: { id: client.id, name: client.name },
            tests: tests.map((t) => ({
              id: t.id,
              date: isoDate(t.testDate),
              type: t.testType,
              vo2max: t.vo2max,
              maxHR: t.maxHR,
              maxLactate: t.maxLactate,
              aerobicThreshold: t.aerobicThreshold,
              anaerobicThreshold: t.anaerobicThreshold,
            })),
            message:
              tests.length === 0
                ? toolText(locale, `${client.name} has no completed tests.`, `${client.name} har inga genomförda tester.`)
                : undefined,
          }
        } catch (error) {
          logger.error('getAthleteTestResults tool failed', { coachUserId, clientId, athleteName }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not fetch test results.', 'Kunde inte hämta testresultat.'),
          }
        }
      },
    }),
  }
}
