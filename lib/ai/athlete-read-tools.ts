/**
 * Athlete Chat Read Tools
 *
 * Read-only Vercel AI SDK tools for the athlete floating chat. These let the
 * AI answer questions over the athlete's own data (week plan, tests, training
 * load, readiness, PRs, injuries) without any write risk, so none of them
 * require confirmation via the action-draft flow.
 *
 * ID space: every query here uses Client.id (`clientId`) — the only model
 * keyed on User.id is WorkoutLog, which is not queried directly here.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { usableTestQualityReviewWhere } from '@/lib/testing/test-quality-review'
import { getPerformanceMealGuideForDate } from '@/lib/nutrition/performance-plan'
import { getAthleteTimezone } from '@/lib/nutrition/athlete-day'
import { dayKeyInTimeZone } from '@/lib/nutrition/day-key'

type ChatLocale = 'en' | 'sv'

function chatText(locale: ChatLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toDateOnly(value: string | undefined, fallback: Date): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return fallback
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Monday..Sunday range containing `reference` (UTC date boundaries). */
function currentWeekRange(reference = new Date()): { start: Date; end: Date } {
  const start = new Date(reference)
  start.setUTCHours(0, 0, 0, 0)
  const day = start.getUTCDay()
  start.setUTCDate(start.getUTCDate() + (day === 0 ? -6 : 1 - day))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

export function createAthleteReadTools(clientId: string, locale: ChatLocale = 'en') {
  return {
    // ── Week plan ─────────────────────────────────────────────────────
    getMyWeekPlan: tool({
      description: chatText(
        locale,
        'Fetch the athlete\'s planned training for a date range (default: current week). Includes program workouts, coach-assigned strength/cardio/hybrid/agility sessions, AI workouts (WODs), and calendar events that affect training. Use when the athlete asks what is planned, what their week looks like, or what to do today/tomorrow.',
        'Hämta atletens planerade träning för ett datumintervall (standard: innevarande vecka). Inkluderar programpass, coach-tilldelade styrke-/konditions-/hybrid-/agilitypass, AI-pass (WODs) och kalenderhändelser som påverkar träningen. Använd när atleten frågar vad som är planerat, hur veckan ser ut eller vad de ska göra idag/imorgon.'
      ),
      inputSchema: z.object({
        startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Default: Monday of the current week.'),
        endDate: z.string().optional().describe('End date (YYYY-MM-DD). Default: Sunday of the current week.'),
      }),
      execute: async ({ startDate, endDate }) => {
        try {
          const week = currentWeekRange()
          const start = toDateOnly(startDate, week.start)
          const end = toDateOnly(endDate, week.end)
          end.setUTCHours(23, 59, 59, 999)

          const [programDays, strength, cardio, hybrid, agility, wods, events] = await Promise.all([
            prisma.trainingDay.findMany({
              where: {
                date: { gte: start, lte: end },
                week: { program: { clientId, isActive: true } },
              },
              orderBy: { date: 'asc' },
              select: {
                date: true,
                week: {
                  select: {
                    weekNumber: true,
                    phase: true,
                    focus: true,
                    program: { select: { name: true } },
                  },
                },
                workouts: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    intensity: true,
                    duration: true,
                    distance: true,
                    status: true,
                    description: true,
                  },
                },
              },
            }),
            prisma.strengthSessionAssignment.findMany({
              where: { athleteId: clientId, assignedDate: { gte: start, lte: end } },
              select: {
                id: true,
                assignedDate: true,
                status: true,
                session: { select: { name: true, phase: true, estimatedDuration: true } },
              },
            }),
            prisma.cardioSessionAssignment.findMany({
              where: { athleteId: clientId, assignedDate: { gte: start, lte: end } },
              select: {
                id: true,
                assignedDate: true,
                status: true,
                session: { select: { name: true, sport: true, totalDuration: true } },
              },
            }),
            prisma.hybridWorkoutAssignment.findMany({
              where: { athleteId: clientId, assignedDate: { gte: start, lte: end } },
              select: {
                id: true,
                assignedDate: true,
                status: true,
                workout: { select: { name: true, format: true } },
              },
            }),
            prisma.agilityWorkoutAssignment.findMany({
              where: { athleteId: clientId, assignedDate: { gte: start, lte: end } },
              select: {
                id: true,
                assignedDate: true,
                status: true,
                workout: { select: { name: true } },
              },
            }),
            prisma.aIGeneratedWOD.findMany({
              where: { clientId, createdAt: { gte: start, lte: end } },
              select: {
                id: true,
                createdAt: true,
                title: true,
                workoutType: true,
                requestedDuration: true,
                status: true,
              },
            }),
            prisma.calendarEvent.findMany({
              where: {
                clientId,
                status: { not: 'CANCELLED' },
                startDate: { lte: end },
                endDate: { gte: start },
              },
              select: {
                id: true,
                type: true,
                title: true,
                startDate: true,
                endDate: true,
                trainingImpact: true,
              },
            }),
          ])

          return {
            success: true,
            range: { start: isoDate(start), end: isoDate(end) },
            programDays: programDays.map((d) => ({
              date: isoDate(d.date),
              program: d.week.program.name,
              week: d.week.weekNumber,
              phase: d.week.phase,
              focus: d.week.focus,
              workouts: d.workouts,
            })),
            assignedSessions: [
              ...strength.map((a) => ({
                date: isoDate(a.assignedDate),
                kind: 'STRENGTH',
                name: a.session.name,
                status: a.status,
                detail: a.session.phase,
                durationMinutes: a.session.estimatedDuration,
              })),
              ...cardio.map((a) => ({
                date: isoDate(a.assignedDate),
                kind: 'CARDIO',
                name: a.session.name,
                status: a.status,
                detail: a.session.sport,
                durationMinutes: a.session.totalDuration,
              })),
              ...hybrid.map((a) => ({
                date: isoDate(a.assignedDate),
                kind: 'HYBRID',
                name: a.workout.name,
                status: a.status,
                detail: a.workout.format,
                durationMinutes: null,
              })),
              ...agility.map((a) => ({
                date: isoDate(a.assignedDate),
                kind: 'AGILITY',
                name: a.workout.name,
                status: a.status,
                detail: null,
                durationMinutes: null,
              })),
            ].sort((a, b) => a.date.localeCompare(b.date)),
            aiWorkouts: wods.map((w) => ({
              date: isoDate(w.createdAt),
              title: w.title,
              workoutType: w.workoutType,
              durationMinutes: w.requestedDuration,
              status: w.status,
            })),
            calendarEvents: events.map((e) => ({
              type: e.type,
              title: e.title,
              start: isoDate(e.startDate),
              end: isoDate(e.endDate),
              trainingImpact: e.trainingImpact,
            })),
          }
        } catch (error) {
          logger.error('getMyWeekPlan tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not fetch the training plan.', 'Kunde inte hämta träningsplanen.') }
        }
      },
    }),

    // ── Test results ──────────────────────────────────────────────────
    getMyTestResults: tool({
      description: chatText(
        locale,
        'Fetch the athlete\'s physiological test results (lactate threshold tests): VO2max, max HR, aerobic/anaerobic thresholds. Use when the athlete asks about their test values, thresholds, zones, or fitness development over time.',
        'Hämta atletens fysiologiska testresultat (laktattröskeltester): VO2max, maxpuls, aerob/anaerob tröskel. Använd när atleten frågar om sina testvärden, trösklar, zoner eller formutveckling över tid.'
      ),
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).default(3).describe('Number of most recent tests to fetch.'),
      }),
      execute: async ({ limit }) => {
        try {
          const [tests, reviewRequiredCount] = await Promise.all([
            prisma.test.findMany({
              where: {
                clientId,
                status: { not: 'DRAFT' },
                ...usableTestQualityReviewWhere,
              },
              orderBy: { testDate: 'desc' },
              take: limit,
              select: {
                id: true,
                testDate: true,
                testType: true,
                vo2max: true,
                maxHR: true,
                maxLactate: true,
                restingHeartRate: true,
                aerobicThreshold: true,
                anaerobicThreshold: true,
                manualLT1Lactate: true,
                manualLT1Intensity: true,
                manualLT2Lactate: true,
                manualLT2Intensity: true,
              },
            }),
            prisma.test.count({
              where: {
                clientId,
                status: { not: 'DRAFT' },
                qualityReviewStatus: 'REVIEW_REQUIRED',
              },
            }),
          ])

          if (tests.length === 0) {
            return {
              success: true,
              tests: [],
              reviewRequiredCount,
              message: chatText(locale, 'No usable completed tests found.', 'Inga användbara genomförda tester hittades.'),
            }
          }

          return {
            success: true,
            reviewRequiredCount,
            tests: tests.map((t) => ({
              id: t.id,
              date: isoDate(t.testDate),
              type: t.testType,
              vo2max: t.vo2max,
              maxHR: t.maxHR,
              maxLactate: t.maxLactate,
              restingHeartRate: t.restingHeartRate,
              aerobicThreshold: t.aerobicThreshold,
              anaerobicThreshold: t.anaerobicThreshold,
              manualOverrides:
                t.manualLT1Lactate != null || t.manualLT2Lactate != null
                  ? {
                      lt1Lactate: t.manualLT1Lactate,
                      lt1Intensity: t.manualLT1Intensity,
                      lt2Lactate: t.manualLT2Lactate,
                      lt2Intensity: t.manualLT2Intensity,
                    }
                  : null,
            })),
          }
        } catch (error) {
          logger.error('getMyTestResults tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not fetch test results.', 'Kunde inte hämta testresultat.') }
        }
      },
    }),

    // ── Training load & ACWR ──────────────────────────────────────────
    getMyTrainingLoad: tool({
      description: chatText(
        locale,
        'Fetch the athlete\'s training load: daily load totals for a period plus the latest ACWR (acute:chronic workload ratio) with zone. Use when the athlete asks about training load, volume, ACWR, injury risk from load, or whether they are training too much/little. Note: ACWR is computed nightly, so it does not reflect workouts logged today.',
        'Hämta atletens träningsbelastning: daglig belastning för en period plus senaste ACWR (acute:chronic workload ratio) med zon. Använd när atleten frågar om träningsbelastning, volym, ACWR, skaderisk från belastning eller om de tränar för mycket/lite. Obs: ACWR beräknas nattligen och inkluderar inte pass loggade idag.'
      ),
      inputSchema: z.object({
        days: z.number().int().min(7).max(90).default(28).describe('Number of days back to summarize.'),
      }),
      execute: async ({ days }) => {
        try {
          const since = new Date()
          since.setUTCHours(0, 0, 0, 0)
          since.setUTCDate(since.getUTCDate() - days)

          // TrainingLoad rows are dual-purpose: WORKOUT rows carry per-session
          // load, ACWR_SUMMARY rows (nightly cron) carry acute/chronic/acwr.
          // Summing must use WORKOUT only, ACWR must read ACWR_SUMMARY only.
          const [workoutRows, latestAcwr] = await Promise.all([
            prisma.trainingLoad.findMany({
              where: { clientId, source: 'WORKOUT', date: { gte: since } },
              orderBy: { date: 'asc' },
              select: {
                date: true,
                dailyLoad: true,
                duration: true,
                distance: true,
                intensity: true,
                workoutType: true,
              },
            }),
            prisma.trainingLoad.findFirst({
              where: { clientId, source: 'ACWR_SUMMARY', acwr: { not: null } },
              orderBy: { date: 'desc' },
              select: {
                date: true,
                acuteLoad: true,
                chronicLoad: true,
                acwr: true,
                acwrZone: true,
                injuryRisk: true,
              },
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

          const totalLoad = workoutRows.reduce((sum, r) => sum + r.dailyLoad, 0)
          const totalMinutes = workoutRows.reduce((sum, r) => sum + r.duration, 0)

          return {
            success: true,
            periodDays: days,
            totals: {
              load: Math.round(totalLoad),
              sessions: workoutRows.length,
              hours: Math.round((totalMinutes / 60) * 10) / 10,
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
          logger.error('getMyTrainingLoad tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not fetch training load.', 'Kunde inte hämta träningsbelastning.') }
        }
      },
    }),

    // ── Readiness history ─────────────────────────────────────────────
    getMyReadinessHistory: tool({
      description: chatText(
        locale,
        'Fetch the athlete\'s daily check-in history: readiness score, sleep, soreness, fatigue, stress, mood, motivation, HRV. Use when the athlete asks why their readiness changed, how they have been sleeping/recovering, or about wellness trends.',
        'Hämta atletens dagliga check-in-historik: beredskapspoäng, sömn, ömhet, trötthet, stress, humör, motivation, HRV. Använd när atleten frågar varför beredskapen ändrats, hur de sovit/återhämtat sig eller om mående-trender.'
      ),
      inputSchema: z.object({
        days: z.number().int().min(1).max(60).default(14).describe('Number of days back to fetch.'),
      }),
      execute: async ({ days }) => {
        try {
          const since = new Date()
          since.setUTCHours(0, 0, 0, 0)
          since.setUTCDate(since.getUTCDate() - days)

          const checkIns = await prisma.dailyCheckIn.findMany({
            where: { clientId, date: { gte: since } },
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
            periodDays: days,
            checkInCount: checkIns.length,
            checkIns: checkIns.map((c) => ({ ...c, date: isoDate(c.date) })),
          }
        } catch (error) {
          logger.error('getMyReadinessHistory tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not fetch check-in history.', 'Kunde inte hämta check-in-historik.') }
        }
      },
    }),

    // ── Personal records ──────────────────────────────────────────────
    getMyPersonalRecords: tool({
      description: chatText(
        locale,
        'Fetch the athlete\'s personal records (1RM and other tracked maxes). Returns the latest record per exercise. Use when the athlete asks about their PRs, maxes, or strength progress.',
        'Hämta atletens personliga rekord (1RM och andra spårade max). Returnerar senaste rekordet per övning. Använd när atleten frågar om sina PRs, maxvärden eller styrkeutveckling.'
      ),
      inputSchema: z.object({
        exerciseName: z.string().optional().describe('Filter to a single exercise by name (partial match).'),
      }),
      execute: async ({ exerciseName }) => {
        try {
          const records = await prisma.oneRepMaxHistory.findMany({
            where: {
              clientId,
              ...(exerciseName
                ? {
                    exercise: {
                      OR: [
                        { name: { contains: exerciseName, mode: 'insensitive' } },
                        { nameSv: { contains: exerciseName, mode: 'insensitive' } },
                        { nameEn: { contains: exerciseName, mode: 'insensitive' } },
                      ],
                    },
                  }
                : {}),
            },
            orderBy: { date: 'desc' },
            take: 100,
            select: {
              date: true,
              oneRepMax: true,
              unit: true,
              source: true,
              bodyWeight: true,
              exercise: { select: { id: true, name: true, nameSv: true } },
            },
          })

          // Latest record per exercise (rows are already date-desc).
          const latestByExercise = new Map<string, (typeof records)[number]>()
          for (const record of records) {
            if (!latestByExercise.has(record.exercise.id)) {
              latestByExercise.set(record.exercise.id, record)
            }
          }

          return {
            success: true,
            records: Array.from(latestByExercise.values()).map((r) => ({
              exercise: locale === 'sv' ? r.exercise.nameSv || r.exercise.name : r.exercise.name,
              value: r.oneRepMax,
              unit: r.unit,
              date: isoDate(r.date),
              source: r.source,
              bodyWeight: r.bodyWeight,
            })),
          }
        } catch (error) {
          logger.error('getMyPersonalRecords tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not fetch personal records.', 'Kunde inte hämta personliga rekord.') }
        }
      },
    }),

    // ── Active injuries ───────────────────────────────────────────────
    getMyActiveInjuries: tool({
      description: chatText(
        locale,
        'Fetch the athlete\'s active and monitored injuries. Use when the athlete asks about their injury status, what is registered, or before giving training advice that an injury could affect.',
        'Hämta atletens aktiva och bevakade skador. Använd när atleten frågar om sin skadestatus, vad som är registrerat, eller innan du ger träningsråd som en skada kan påverka.'
      ),
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const injuries = await prisma.injuryAssessment.findMany({
            where: { clientId, status: { in: ['ACTIVE', 'MONITORING'] } },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              bodyPart: true,
              side: true,
              painLevel: true,
              description: true,
              phase: true,
              assessment: true,
              status: true,
              createdAt: true,
            },
          })

          return {
            success: true,
            injuryCount: injuries.length,
            injuries: injuries.map((i) => ({
              ...i,
              createdAt: isoDate(i.createdAt),
            })),
            message:
              injuries.length === 0
                ? chatText(locale, 'No active injuries are registered.', 'Inga aktiva skador är registrerade.')
                : undefined,
          }
        } catch (error) {
          logger.error('getMyActiveInjuries tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not fetch injuries.', 'Kunde inte hämta skador.') }
        }
      },
    }),

    // ── Performance Meal Guide: today's plan ──────────────────────────
    getMealGuideToday: tool({
      description: chatText(
        locale,
        "Fetch the athlete's Performance Meal Guide for a day (default today): day type, calorie/macro targets, the adaptation note, and each planned meal (time, title, kcal, protein/carbs/fat, recipe title). Use when the athlete asks what to eat today, what's on their meal plan, or about a planned meal.",
        "Hämta atletens Måltidsguide för prestation för en dag (standard idag): dagtyp, kcal-/makromål, anpassningsnoten och varje planerad måltid (tid, titel, kcal, protein/kolhydrater/fett, recepttitel). Använd när atleten frågar vad de ska äta idag, vad som står på måltidsplanen eller om en planerad måltid."
      ),
      inputSchema: z.object({
        date: z.string().optional().describe('Date (YYYY-MM-DD). Default: today in the athlete timezone.'),
      }),
      execute: async ({ date }) => {
        try {
          const tz = await getAthleteTimezone(clientId)
          const dateKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayKeyInTimeZone(new Date(), tz)
          const guide = await getPerformanceMealGuideForDate(clientId, dateKey)
          if (!guide) {
            return {
              success: true,
              hasGuide: false,
              date: dateKey,
              message: chatText(locale, 'No active Performance Meal Guide for this day. The athlete can generate one from the dashboard.', 'Ingen aktiv Måltidsguide för prestation för den här dagen. Atleten kan skapa en från dashboarden.'),
            }
          }
          return {
            success: true,
            hasGuide: true,
            date: dateKey,
            dayType: guide.day.dayType,
            target: {
              caloriesKcal: guide.day.caloriesKcal,
              proteinG: Math.round(guide.day.proteinG),
              carbsG: Math.round(guide.day.carbsG),
              fatG: Math.round(guide.day.fatG),
            },
            adaptationNote: guide.day.adaptationNotes ?? null,
            meals: guide.day.meals.map((m) => ({
              mealType: m.mealType,
              time: m.time,
              title: m.title,
              caloriesKcal: m.caloriesKcal,
              proteinG: Math.round(m.proteinG),
              carbsG: Math.round(m.carbsG),
              fatG: Math.round(m.fatG),
              recipeTitle: m.recipeTitle ?? null,
            })),
          }
        } catch (error) {
          logger.error('getMealGuideToday tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not fetch the meal guide.', 'Kunde inte hämta måltidsguiden.') }
        }
      },
    }),

    // ── Performance Meal Guide: fueling summary (planned vs eaten) ─────
    getFuelingSummary: tool({
      description: chatText(
        locale,
        "Summarize how the athlete is fueling on a day versus the Performance Meal Guide: planned vs eaten calories and macros for the day, % of the calorie target reached, what's left to hit the target, and which planned meals are still un-logged. Use when the athlete asks how their nutrition/fueling is going, what's left to eat, or whether they're on target.",
        "Sammanfatta hur atleten fyller på en dag jämfört med Måltidsguiden: planerat vs ätet i kalorier och makros för dagen, andel av kalorimålet som nåtts, vad som återstår för att nå målet och vilka planerade måltider som ännu inte loggats. Använd när atleten frågar hur näringen/fyllningen går, vad som är kvar att äta eller om de ligger i fas med målet."
      ),
      inputSchema: z.object({
        date: z.string().optional().describe('Date (YYYY-MM-DD). Default: today in the athlete timezone.'),
      }),
      execute: async ({ date }) => {
        try {
          const tz = await getAthleteTimezone(clientId)
          const dateKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayKeyInTimeZone(new Date(), tz)
          const guide = await getPerformanceMealGuideForDate(clientId, dateKey)
          if (!guide) {
            return {
              success: true,
              hasGuide: false,
              date: dateKey,
              message: chatText(locale, 'No active Performance Meal Guide for this day, so there is no plan to compare against.', 'Ingen aktiv Måltidsguide för prestation för den här dagen, så det finns ingen plan att jämföra mot.'),
            }
          }
          const eaten = guide.chart.reduce(
            (acc, row) => ({
              caloriesKcal: acc.caloriesKcal + row.eaten.caloriesKcal,
              proteinG: acc.proteinG + row.eaten.proteinG,
              carbsG: acc.carbsG + row.eaten.carbsG,
              fatG: acc.fatG + row.eaten.fatG,
            }),
            { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
          )
          const target = {
            caloriesKcal: guide.day.caloriesKcal,
            proteinG: guide.day.proteinG,
            carbsG: guide.day.carbsG,
            fatG: guide.day.fatG,
          }
          const round = (n: number) => Math.round(n)
          return {
            success: true,
            hasGuide: true,
            date: dateKey,
            dayType: guide.day.dayType,
            target: {
              caloriesKcal: round(target.caloriesKcal),
              proteinG: round(target.proteinG),
              carbsG: round(target.carbsG),
              fatG: round(target.fatG),
            },
            eaten: {
              caloriesKcal: round(eaten.caloriesKcal),
              proteinG: round(eaten.proteinG),
              carbsG: round(eaten.carbsG),
              fatG: round(eaten.fatG),
            },
            remaining: {
              caloriesKcal: round(target.caloriesKcal - eaten.caloriesKcal),
              proteinG: round(target.proteinG - eaten.proteinG),
              carbsG: round(target.carbsG - eaten.carbsG),
              fatG: round(target.fatG - eaten.fatG),
            },
            caloriePctOfTarget: target.caloriesKcal > 0 ? Math.round((eaten.caloriesKcal / target.caloriesKcal) * 100) : 0,
            mealsLogged: guide.chart.filter((r) => r.logCount > 0).length,
            totalMeals: guide.chart.length,
            openMeals: guide.chart
              .filter((r) => r.logCount === 0)
              .map((r) => ({ time: r.time, title: r.title, plannedKcal: r.planned.caloriesKcal })),
          }
        } catch (error) {
          logger.error('getFuelingSummary tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not summarize fueling.', 'Kunde inte sammanfatta fyllningen.') }
        }
      },
    }),
  }
}
