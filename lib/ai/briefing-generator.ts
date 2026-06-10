/**
 * Morning Briefing Generator Service
 *
 * Generates personalized daily briefings for athletes based on their
 * training schedule, readiness data, and recent activities.
 */

import { generateText } from 'ai'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveModel, type AvailableKeys } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { getGeminiThinkingOptions } from '@/lib/ai/gemini-config'
import { getResolvedAiKeys } from '@/lib/user-api-keys'

const SWEDISH_DAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag']
const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
type BriefingLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): BriefingLocale {
  return language === 'sv' ? 'sv' : 'en'
}

export interface BriefingContext {
  athleteName: string
  locale: BriefingLocale
  readinessScore?: number
  sleepHours?: number
  sleepQuality?: number
  fatigue?: number
  soreness?: number
  mood?: number
  restingHR?: number
  hrv?: number
  todaysWorkout?: {
    name: string
    type: string
    duration?: number
    description?: string
  }
  recentMemories?: string[]
  upcomingEvents?: {
    name: string
    date: Date
    type: string
  }[]
  weatherInfo?: {
    temp: number
    condition: string
  }
  previousBriefingTopics: string[]
  recentMilestones: { title: string; type: string; createdAt: Date }[]
  activePatternAlerts: { title: string; priority: string; message: string }[]
  latestACWR?: { acwr: number; acwrZone: string; injuryRisk: string }
  currentWeeklySummary?: {
    workoutCount: number
    totalDuration: number
    compliancePercent?: number
    polarizationRatio?: number
  }
  recentWorkoutCompletions: {
    name: string
    completedAt: Date
    feeling?: string
    rpe?: number
  }[]
  activeInjuries: {
    bodyPart: string
    side?: string
    painLevel: number
    phase?: string
  }[]
  dayOfWeek: string
}

export interface GeneratedBriefing {
  title: string
  content: string
  highlights: string[]
  alerts: { type: 'warning' | 'info' | 'success'; message: string }[]
  quickActions: { label: string; action: string }[]
}

// ---------------------------------------------------------------------------
// Data-fetching helpers (each self-contained with try/catch)
// ---------------------------------------------------------------------------

async function getPreviousBriefingTopics(clientId: string): Promise<string[]> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const previous = await prisma.aIBriefing.findMany({
      where: {
        clientId,
        briefingType: 'MORNING',
        scheduledFor: { lt: today },
      },
      orderBy: { scheduledFor: 'desc' },
      take: 3,
      select: { highlights: true },
    })

    return previous.flatMap((b) => b.highlights)
  } catch (error) {
    logger.error('Error fetching previous briefing topics', { clientId }, error)
    return []
  }
}

async function getRecentMilestones(
  clientId: string
): Promise<{ title: string; type: string; createdAt: Date }[]> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const milestones = await prisma.aINotification.findMany({
      where: {
        clientId,
        notificationType: 'MILESTONE',
        createdAt: { gte: sevenDaysAgo },
        dismissedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { title: true, notificationType: true, createdAt: true },
    })

    return milestones.map((m) => ({
      title: m.title,
      type: m.notificationType,
      createdAt: m.createdAt,
    }))
  } catch (error) {
    logger.error('Error fetching recent milestones', { clientId }, error)
    return []
  }
}

async function getActivePatternAlerts(
  clientId: string
): Promise<{ title: string; priority: string; message: string }[]> {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const alerts = await prisma.aINotification.findMany({
      where: {
        clientId,
        notificationType: 'PATTERN_ALERT',
        createdAt: { gte: threeDaysAgo },
        dismissedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { title: true, priority: true, message: true },
    })

    return alerts
  } catch (error) {
    logger.error('Error fetching pattern alerts', { clientId }, error)
    return []
  }
}

async function getLatestACWRData(
  clientId: string
): Promise<{ acwr: number; acwrZone: string; injuryRisk: string } | undefined> {
  try {
    const load = await prisma.trainingLoad.findFirst({
      where: { clientId, source: 'ACWR_SUMMARY' },
      orderBy: { date: 'desc' },
      select: { acwr: true, acwrZone: true, injuryRisk: true },
    })

    if (!load?.acwr || !load.acwrZone || !load.injuryRisk) return undefined

    return { acwr: load.acwr, acwrZone: load.acwrZone, injuryRisk: load.injuryRisk }
  } catch (error) {
    logger.error('Error fetching ACWR', { clientId }, error)
    return undefined
  }
}

async function getCurrentWeeklySummary(
  clientId: string
): Promise<
  | {
      workoutCount: number
      totalDuration: number
      compliancePercent?: number
      polarizationRatio?: number
    }
  | undefined
> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const summary = await prisma.weeklyTrainingSummary.findFirst({
      where: {
        clientId,
        weekStart: { lte: today },
        weekEnd: { gte: today },
      },
      select: {
        workoutCount: true,
        totalDuration: true,
        compliancePercent: true,
        polarizationRatio: true,
      },
    })

    if (!summary) return undefined

    return {
      workoutCount: summary.workoutCount,
      totalDuration: summary.totalDuration,
      compliancePercent: summary.compliancePercent ?? undefined,
      polarizationRatio: summary.polarizationRatio ?? undefined,
    }
  } catch (error) {
    logger.error('Error fetching weekly summary', { clientId }, error)
    return undefined
  }
}

async function getRecentWorkoutCompletions(
  userId: string
): Promise<{ name: string; completedAt: Date; feeling?: string; rpe?: number }[]> {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const logs = await prisma.workoutLog.findMany({
      where: {
        athleteId: userId,
        completed: true,
        completedAt: { gte: threeDaysAgo },
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
      select: {
        completedAt: true,
        feeling: true,
        perceivedEffort: true,
        workout: { select: { name: true } },
      },
    })

    return logs
      .filter((l) => l.completedAt !== null)
      .map((l) => ({
        name: l.workout.name,
        completedAt: l.completedAt!,
        feeling: l.feeling ?? undefined,
        rpe: l.perceivedEffort ?? undefined,
      }))
  } catch (error) {
    logger.error('Error fetching recent workout completions', { userId }, error)
    return []
  }
}

async function getActiveInjuries(
  clientId: string
): Promise<{ bodyPart: string; side?: string; painLevel: number; phase?: string }[]> {
  try {
    const injuries = await prisma.injuryAssessment.findMany({
      where: {
        clientId,
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
      orderBy: { date: 'desc' },
      take: 2,
      select: { bodyPart: true, side: true, painLevel: true, phase: true },
    })

    return injuries
      .filter((i) => i.bodyPart !== null)
      .map((i) => ({
        bodyPart: i.bodyPart!,
        side: i.side ?? undefined,
        painLevel: i.painLevel,
        phase: i.phase ?? undefined,
      }))
  } catch (error) {
    logger.error('Error fetching active injuries', { clientId }, error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Build context for morning briefing generation
// ---------------------------------------------------------------------------

export async function buildBriefingContext(clientId: string): Promise<BriefingContext | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get client with related data
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      userId: true,
      user: { select: { language: true } },
      athleteAccount: {
        select: {
          userId: true,
          user: {
            select: { language: true },
          },
        },
      },
      dailyMetrics: {
        orderBy: { date: 'desc' },
        take: 1,
        where: {
          date: {
            gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          },
        },
        select: {
          sleepQuality: true,
          sleepHours: true,
          energyLevel: true,
          muscleSoreness: true,
          mood: true,
          stress: true,
          restingHR: true,
          hrvRMSSD: true,
          readinessScore: true,
          readinessLevel: true,
        },
      },
      conversationMemories: {
        where: {
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            { createdAt: { gte: thirtyDaysAgo } },
          ],
        },
        orderBy: { importance: 'desc' },
        take: 3,
        select: { content: true },
      },
      calendarEvents: {
        where: {
          startDate: {
            gte: today,
            lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { startDate: 'asc' },
        take: 3,
        select: {
          title: true,
          startDate: true,
          startTime: true,
          type: true,
        },
      },
    },
  })

  if (!client) {
    return null
  }

  const locale = resolveLocale(client.athleteAccount?.user?.language ?? client.user.language)

  // Fetch all enrichment data in parallel
  const [
    todaysWorkout,
    previousBriefingTopics,
    recentMilestones,
    activePatternAlerts,
    latestACWR,
    currentWeeklySummary,
    recentWorkoutCompletions,
    activeInjuries,
  ] = await Promise.all([
    getTodaysWorkout(clientId),
    getPreviousBriefingTopics(clientId),
    getRecentMilestones(clientId),
    getActivePatternAlerts(clientId),
    getLatestACWRData(clientId),
    getCurrentWeeklySummary(clientId),
    client.athleteAccount?.userId
      ? getRecentWorkoutCompletions(client.athleteAccount.userId)
      : Promise.resolve([] as { name: string; completedAt: Date; feeling?: string; rpe?: number }[]),
    getActiveInjuries(clientId),
  ])

  // Filter milestones already mentioned in previous briefings
  const filteredMilestones = recentMilestones.filter(
    (m) =>
      !previousBriefingTopics.some(
        (topic) =>
          topic.toLowerCase().includes(m.title.toLowerCase()) ||
          m.title.toLowerCase().includes(topic.toLowerCase())
      )
  )

  // Use readiness from DailyMetrics (computed by the readiness engine)
  const metrics = client.dailyMetrics[0]
  let readinessScore: number | undefined
  if (metrics) {
    if (metrics.readinessScore !== null) {
      readinessScore = metrics.readinessScore
    } else {
      // Fallback: compute from individual fields
      const scores = []
      if (metrics.energyLevel) scores.push(metrics.energyLevel)
      if (metrics.muscleSoreness) scores.push(11 - metrics.muscleSoreness)
      if (metrics.mood) scores.push(metrics.mood)
      if (metrics.sleepQuality) scores.push(metrics.sleepQuality)
      if (scores.length > 0) {
        readinessScore = scores.reduce((a, b) => a + b, 0) / scores.length
      }
    }
  }

  // Map DailyMetrics fields to BriefingContext
  // energyLevel (1=exhausted,10=energized) → fatigue inverted (10=extreme fatigue)
  const fatigue = metrics?.energyLevel ? 11 - metrics.energyLevel : undefined

  const now = new Date()

  return {
    athleteName: client.name.split(' ')[0],
    readinessScore,
    sleepHours: metrics?.sleepHours ?? undefined,
    sleepQuality: metrics?.sleepQuality ?? undefined,
    fatigue,
    soreness: metrics?.muscleSoreness ?? undefined,
    mood: metrics?.mood ?? undefined,
    restingHR: metrics?.restingHR ?? undefined,
    hrv: metrics?.hrvRMSSD ?? undefined,
    todaysWorkout: todaysWorkout ?? undefined,
    recentMemories: client.conversationMemories.map((m) => m.content),
    upcomingEvents: client.calendarEvents.map((e) => ({
      name: e.title,
      date: e.startDate,
      type: e.type,
    })),
    previousBriefingTopics,
    recentMilestones: filteredMilestones,
    activePatternAlerts,
    latestACWR,
    currentWeeklySummary,
    recentWorkoutCompletions,
    activeInjuries,
    dayOfWeek: locale === 'sv' ? SWEDISH_DAYS[now.getDay()] : ENGLISH_DAYS[now.getDay()],
    locale,
  }
}

/**
 * Get today's scheduled workout from active training program
 */
async function getTodaysWorkout(clientId: string): Promise<BriefingContext['todaysWorkout'] | null> {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Find today's workout from active program using the date field
  const todayDay = await prisma.trainingDay.findFirst({
    where: {
      date: {
        gte: todayStart,
        lt: todayEnd,
      },
      week: {
        program: {
          clientId,
          isActive: true,
        },
      },
    },
    select: {
      workouts: {
        take: 1,
        select: {
          name: true,
          type: true,
          duration: true,
          description: true,
        },
      },
    },
  })

  const workout = todayDay?.workouts[0]
  if (!workout) return null

  return {
    name: workout.name,
    type: workout.type,
    duration: workout.duration ?? undefined,
    description: workout.description ?? undefined,
  }
}

/**
 * Generate morning briefing content using AI
 */
export async function generateMorningBriefing(
  context: BriefingContext,
  keys: AvailableKeys
): Promise<GeneratedBriefing> {
  const resolved = resolveModel(keys, 'fast')
  if (!resolved) {
    return getDefaultBriefing(context)
  }

  const prompt = buildBriefingPrompt(context)

  try {
    const response = await generateText({
      model: createModelInstance(resolved),
      prompt,
      maxOutputTokens: 1200,
      providerOptions: resolved.provider === 'google'
        ? getGeminiThinkingOptions('quick')
        : undefined,
    })

    const textContent = response.text
    if (!textContent) {
      return getDefaultBriefing(context)
    }

    // Parse JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return getDefaultBriefing(context)
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      title: parsed.title || (context.locale === 'sv' ? `God morgon ${context.athleteName}!` : `Good morning ${context.athleteName}!`),
      content: parsed.content || '',
      highlights: parsed.highlights || [],
      alerts: parsed.alerts || [],
      quickActions: parsed.quickActions || [],
    }
  } catch (error) {
    logger.error('Error generating briefing', {}, error)
    return getDefaultBriefing(context)
  }
}

/**
 * Get a rotating daily angle hint based on day of week
 */
function getDailyAngle(dayIndex: number, locale: BriefingLocale): string {
  if (locale === 'en') {
    switch (dayIndex) {
      case 1:
        return 'Week ahead and goals - focus on what is coming this week'
      case 2:
      case 3:
      case 4:
        return 'Training quality and progress - highlight development and good work'
      case 5:
        return 'Recovery and weekend preparation - focus on rest and planning'
      case 6:
        return 'Performance and enjoyment - emphasize the fun side of training'
      case 0:
        return "Weekly reflection and consistency - summarize this week's efforts"
      default:
        return 'Training quality and progress'
    }
  }

  switch (dayIndex) {
    case 1:
      return 'Veckan framåt & mål — fokusera på vad som väntar denna vecka'
    case 2:
    case 3:
    case 4:
      return 'Träningskvalitet & framsteg — lyft fram utveckling och bra arbete'
    case 5:
      return 'Återhämtning & helgförberedelse — fokusera på vila och planering'
    case 6:
      return 'Prestation & glädje — betona det roliga med träning'
    case 0:
      return 'Veckoreflektion & konsistens — summera veckans insatser'
    default:
      return 'Träningskvalitet & framsteg'
  }
}

/**
 * Build the AI prompt for briefing generation
 */
function buildBriefingPrompt(context: BriefingContext): string {
  const locale = context.locale
  const outputLanguage = locale === 'sv' ? 'Swedish' : 'English'
  const formatDate = (date: Date) => new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
  const copy = (en: string, sv: string) => (locale === 'sv' ? sv : en)
  const sections: string[] = []

  // 1. Previous topics — deduplication
  if (context.previousBriefingTopics.length > 0) {
    sections.push(
      `${copy('TOPICS ALREADY COVERED (DO NOT REPEAT):', 'ÄMNEN SOM REDAN TAGITS UPP (UPPREPA INTE):')}\n${context.previousBriefingTopics.map((t) => `- ${t}`).join('\n')}\n${copy('You MUST find NEW angles every day. Do NOT mention these topics again.', 'Du MÅSTE hitta NYA vinklar varje dag. Nämn INTE dessa ämnen igen.')}`
    )
  }

  // 2. Athlete data today
  let dataLines = ''
  if (context.readinessScore !== undefined) {
    dataLines += `\n- ${copy('Readiness score', 'Readiness-poäng')}: ${context.readinessScore.toFixed(1)}/10`
  }
  if (context.sleepHours !== undefined) {
    dataLines += `\n- ${copy('Sleep', 'Sömn')}: ${context.sleepHours} ${copy('hours', 'timmar')}`
  }
  if (context.sleepQuality !== undefined) {
    dataLines += `\n- ${copy('Sleep quality', 'Sömnkvalitet')}: ${context.sleepQuality}/10`
  }
  if (context.fatigue !== undefined) {
    dataLines += `\n- ${copy('Fatigue', 'Trötthet')}: ${context.fatigue}/10`
  }
  if (context.soreness !== undefined) {
    dataLines += `\n- ${copy('Muscle soreness', 'Muskelömhet')}: ${context.soreness}/10`
  }
  if (context.hrv !== undefined) {
    dataLines += `\n- HRV: ${context.hrv} ms`
  }
  if (context.restingHR !== undefined) {
    dataLines += `\n- ${copy('Resting heart rate', 'Vilopuls')}: ${context.restingHR} bpm`
  }
  sections.push(`${copy("ATHLETE DATA TODAY", 'ATLETENS DATA IDAG')}:${dataLines || `\n- ${copy('No check-in data available', 'Ingen check-in-data tillgänglig')}`}`)

  // 3. Active warnings (Tier 1 — urgent)
  const warnings: string[] = []
  if (context.activePatternAlerts.length > 0) {
    for (const alert of context.activePatternAlerts) {
      warnings.push(`⚠ ${alert.title}: ${alert.message} (${copy('priority', 'prioritet')}: ${alert.priority})`)
    }
  }
  if (context.activeInjuries.length > 0) {
    for (const injury of context.activeInjuries) {
      const sideStr = injury.side ? ` (${injury.side})` : ''
      const phaseStr = injury.phase ? `, ${copy('phase', 'fas')}: ${injury.phase}` : ''
      warnings.push(
        `🩹 ${copy('Injury', 'Skada')}: ${injury.bodyPart}${sideStr} — ${copy('pain level', 'smärtnivå')} ${injury.painLevel}/10${phaseStr}`
      )
    }
  }
  if (context.latestACWR && ['DANGER', 'CRITICAL'].includes(context.latestACWR.acwrZone)) {
    warnings.push(
      `🔴 ACWR ${context.latestACWR.acwr.toFixed(2)} — ${copy('zone', 'zon')}: ${context.latestACWR.acwrZone}, ${copy('injury risk', 'skaderisk')}: ${context.latestACWR.injuryRisk}`
    )
  }
  if (warnings.length > 0) {
    sections.push(`${copy('ACTIVE WARNINGS', 'AKTUELLA VARNINGAR')}:\n${warnings.join('\n')}`)
  }

  // 4. Today's workout
  if (context.todaysWorkout) {
    let workoutLines = `- ${copy('Name', 'Namn')}: ${context.todaysWorkout.name}\n- ${copy('Type', 'Typ')}: ${context.todaysWorkout.type}`
    if (context.todaysWorkout.duration) {
      workoutLines += `\n- ${copy('Duration', 'Längd')}: ${context.todaysWorkout.duration} min`
    }
    if (context.todaysWorkout.description) {
      workoutLines += `\n- ${copy('Description', 'Beskrivning')}: ${context.todaysWorkout.description}`
    }
    sections.push(`${copy("TODAY'S PLANNED WORKOUT", 'DAGENS PLANERADE TRÄNING')}:\n${workoutLines}`)
  }

  // 5. Recent workout completions
  if (context.recentWorkoutCompletions.length > 0) {
    const completionLines = context.recentWorkoutCompletions.map((w) => {
      const date = formatDate(w.completedAt)
      const details: string[] = []
      if (w.feeling) details.push(`${copy('feeling', 'känsla')}: ${w.feeling}`)
      if (w.rpe) details.push(`RPE: ${w.rpe}/10`)
      return `- ${w.name} (${date})${details.length > 0 ? ' — ' + details.join(', ') : ''}`
    })
    sections.push(`${copy('RECENT TRAINING', 'SENASTE TRÄNINGEN')}:\n${completionLines.join('\n')}`)
  }

  // 6. New milestones (already filtered against previous topics)
  if (context.recentMilestones.length > 0) {
    const milestoneLines = context.recentMilestones.map(
      (m) => `- ${m.title} (${formatDate(m.createdAt)})`
    )
    sections.push(`${copy('NEW ACHIEVEMENTS', 'NYA PRESTATIONER')}:\n${milestoneLines.join('\n')}`)
  }

  // 7. Weekly summary (Mon/Wed/Sat only for variety)
  const dayIndex = new Date().getDay()
  if (context.currentWeeklySummary && [1, 3, 6].includes(dayIndex)) {
    const ws = context.currentWeeklySummary
    let summaryLines = `- ${copy('Workout count', 'Antal pass')}: ${ws.workoutCount}\n- ${copy('Total time', 'Total tid')}: ${ws.totalDuration} min`
    if (ws.compliancePercent !== undefined) {
      summaryLines += `\n- ${copy('Compliance', 'Följsamhet')}: ${ws.compliancePercent.toFixed(0)}%`
    }
    if (ws.polarizationRatio !== undefined) {
      summaryLines += `\n- ${copy('Polarization ratio', 'Polariseringskvot')}: ${ws.polarizationRatio.toFixed(2)}`
    }
    sections.push(`${copy("THIS WEEK'S TRAINING", 'VECKANS TRÄNING')}:\n${summaryLines}`)
  }

  // 8. Memories & events (trimmed)
  const contextNotes: string[] = []
  if (context.recentMemories && context.recentMemories.length > 0) {
    contextNotes.push(...context.recentMemories.map((m) => `- ${m}`))
  }
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    for (const e of context.upcomingEvents) {
      contextNotes.push(
        `- ${locale === 'sv' ? 'Händelse' : 'Event'}: ${e.name} (${e.type}) — ${formatDate(e.date)}`
      )
    }
  }
  if (contextNotes.length > 0) {
    sections.push(`${copy('IMPORTANT TO REMEMBER', 'VIKTIGT ATT KOMMA IHÅG')}:\n${contextNotes.join('\n')}`)
  }

  // 9. Daily angle hint
  sections.push(`${copy("TODAY'S ANGLE", 'DAGENS VINKEL')} (${context.dayOfWeek}):\n${getDailyAngle(dayIndex, locale)}`)

  // 10. Instructions
  const instructions = locale === 'sv'
    ? `INSTRUKTIONER:
0. Svara på ${outputLanguage}. Alla fält som visas för atleten ska vara på ${outputLanguage}.
1. Skriv en kort, personlig morgonhälsning (max 2-3 meningar)
2. Var ALDRIG upprepande — hitta nya vinklar varje dag
3. Om inga nya prestationer finns, fokusera på process och framsteg
4. Lyft fram det viktigaste för dagen
5. Ge 1-3 konkreta tips baserat på data
6. Varna om något ser oroande ut (skador, hög trötthet, ACWR-varning)
7. Var uppmuntrande men realistisk

SVARA I JSON-FORMAT:
{
  "title": "${locale === 'sv' ? `God morgon ${context.athleteName}!` : `Good morning ${context.athleteName}!`}",
  "content": "${locale === 'sv' ? 'Kort personlig briefing här...' : 'Short personal briefing here...'}",
  "highlights": ["${locale === 'sv' ? 'Punkt 1' : 'Point 1'}", "${locale === 'sv' ? 'Punkt 2' : 'Point 2'}"],
  "alerts": [
    {"type": "warning", "message": "${locale === 'sv' ? 'Varningsmeddelande om något' : 'Warning message if needed'}"},
    {"type": "info", "message": "${locale === 'sv' ? 'Informationsmeddelande' : 'Information message'}"}
  ],
  "quickActions": [
    {"label": "${locale === 'sv' ? 'Logga träning' : 'Log workout'}", "action": "log_workout"},
    {"label": "${locale === 'sv' ? 'Chatta med AI' : 'Chat with AI'}", "action": "open_chat"}
  ]
}

ALERT TYPER:
- warning: Något som behöver uppmärksamhet (skada, hög trötthet, ACWR-varning)
- info: Neutral information
- success: Positiva saker (bra återhämtning, nått mål, nytt rekord)

QUICK ACTIONS:
- log_workout: Öppna träningsloggning
- open_chat: Öppna AI-chatt
- check_in: Gör daglig check-in
- view_program: Se träningsprogram

TONALITET: Vänlig, personlig, motiverande. Som en bra tränare som bryr sig.`
    : `INSTRUCTIONS:
0. Respond in ${outputLanguage}. Every field shown to the athlete must be in ${outputLanguage}.
1. Write a short, personal morning greeting (max 2-3 sentences)
2. Never repeat yourself - find new angles every day
3. If there are no new achievements, focus on process and progress
4. Highlight the most important thing for today
5. Give 1-3 concrete tips based on the data
6. Warn if anything looks concerning (injuries, high fatigue, ACWR warning)
7. Be encouraging but realistic

RESPOND IN JSON FORMAT:
{
  "title": "Good morning ${context.athleteName}!",
  "content": "Short personal briefing here...",
  "highlights": ["Point 1", "Point 2"],
  "alerts": [
    {"type": "warning", "message": "Warning message if needed"},
    {"type": "info", "message": "Information message"}
  ],
  "quickActions": [
    {"label": "Log workout", "action": "log_workout"},
    {"label": "Chat with AI", "action": "open_chat"}
  ]
}

ALERT TYPES:
- warning: Something that needs attention (injury, high fatigue, ACWR warning)
- info: Neutral information
- success: Positive items (good recovery, reached goal, new record)

QUICK ACTIONS:
- log_workout: Open workout logging
- open_chat: Open AI chat
- check_in: Do daily check-in
- view_program: View training program

TONE: Friendly, personal, motivating. Like a good coach who cares.`

  return `${locale === 'sv' ? 'Generera en personlig morgonbriefing för atleten' : 'Generate a personal morning briefing for athlete'} ${context.athleteName}.\n\n${sections.join('\n\n')}\n\n${instructions}\n`
}

/**
 * Get a default briefing when AI generation fails
 */
function getDefaultBriefing(context: BriefingContext): GeneratedBriefing {
  const locale = context.locale
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const highlights: string[] = []
  const alerts: GeneratedBriefing['alerts'] = []

  if (context.todaysWorkout) {
    highlights.push(t(`Dagens pass: ${context.todaysWorkout.name}`, `Today's workout: ${context.todaysWorkout.name}`))
  }

  if (context.readinessScore !== undefined) {
    if (context.readinessScore >= 7) {
      highlights.push(t('Bra readiness - kör på!', 'Good readiness - go for it!'))
    } else if (context.readinessScore < 5) {
      alerts.push({ type: 'warning', message: t('Låg readiness - överväg att ta det lugnt', 'Low readiness - consider taking it easier') })
    }
  }

  if (context.sleepHours !== undefined && context.sleepHours < 6) {
    alerts.push({ type: 'warning', message: t(`Du sov bara ${context.sleepHours} timmar`, `You only slept ${context.sleepHours} hours`) })
  }

  // Add injury warnings
  for (const injury of context.activeInjuries) {
    const sideStr = injury.side ? ` (${injury.side})` : ''
    alerts.push({
      type: 'warning',
      message: t(`Aktiv skada: ${injury.bodyPart}${sideStr} — smärtnivå ${injury.painLevel}/10`, `Active injury: ${injury.bodyPart}${sideStr} - pain level ${injury.painLevel}/10`),
    })
  }

  // Add ACWR danger/critical alerts
  if (context.latestACWR && ['DANGER', 'CRITICAL'].includes(context.latestACWR.acwrZone)) {
    alerts.push({
      type: 'warning',
      message: t(`Hög träningsbelastning (ACWR ${context.latestACWR.acwr.toFixed(2)}) — var försiktig`, `High training load (ACWR ${context.latestACWR.acwr.toFixed(2)}) - be careful`),
    })
  }

  // Add milestone highlights
  for (const milestone of context.recentMilestones) {
    highlights.push(milestone.title)
  }

  // Mention last completed workout
  if (context.recentWorkoutCompletions.length > 0) {
    const last = context.recentWorkoutCompletions[0]
    highlights.push(t(`Senaste passet: ${last.name}${last.feeling ? ` (${last.feeling})` : ''}`, `Latest workout: ${last.name}${last.feeling ? ` (${last.feeling})` : ''}`))
  }

  let content: string
  if (context.todaysWorkout) {
    content = t(`Idag väntar ${context.todaysWorkout.name}. Ha en bra träningsdag!`, `${context.todaysWorkout.name} is scheduled today. Have a good training day!`)
  } else if (context.recentWorkoutCompletions.length > 0) {
    content = t(`Bra jobbat med ${context.recentWorkoutCompletions[0].name}! Ha en bra dag.`, `Good work on ${context.recentWorkoutCompletions[0].name}! Have a good day.`)
  } else {
    content = t('Ha en bra dag! Glöm inte att röra på dig.', 'Have a good day! Remember to move.')
  }

  return {
    title: t(`God morgon ${context.athleteName}!`, `Good morning ${context.athleteName}!`),
    content,
    highlights,
    alerts,
    quickActions: [
      { label: t('Logga träning', 'Log workout'), action: 'log_workout' },
      { label: t('Chatta med AI', 'Chat with AI'), action: 'open_chat' },
    ],
  }
}

/**
 * Create and save a morning briefing for an athlete
 */
export async function createMorningBriefing(
  clientId: string,
  keys: AvailableKeys
): Promise<string | null> {
  try {
    // Build context
    const context = await buildBriefingContext(clientId)
    if (!context) {
      logger.warn('Could not build briefing context', { clientId })
      return null
    }

    // Generate briefing
    const briefing = await generateMorningBriefing(context, keys)

    // Save to database
    const saved = await prisma.aIBriefing.create({
      data: {
        clientId,
        briefingType: 'MORNING',
        title: briefing.title,
        content: briefing.content,
        highlights: briefing.highlights,
        readinessScore: context.readinessScore,
        todaysWorkout: context.todaysWorkout?.name,
        alerts: briefing.alerts,
        quickActions: briefing.quickActions,
        scheduledFor: new Date(),
        modelUsed: resolveModel(keys, 'fast')?.modelId ?? 'unknown',
      },
    })

    logger.info('Morning briefing created', { clientId, briefingId: saved.id })
    return saved.id
  } catch (error) {
    logger.error('Error creating morning briefing', { clientId }, error)
    return null
  }
}

/**
 * Regenerate today's morning briefing after new data (e.g. check-in).
 * Deletes the existing briefing and creates a fresh one with updated context.
 * Resolves AI keys from the client's coach automatically.
 */
export async function regenerateTodaysBriefing(clientId: string): Promise<string | null> {
  try {
    // Look up coach userId for AI key resolution
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    })

    if (!client) {
      logger.warn('Client not found for briefing regeneration', { clientId })
      return null
    }

    const apiKeys = await getResolvedAiKeys(client.userId)
    if (!apiKeys.anthropicKey && !apiKeys.googleKey && !apiKeys.openaiKey) {
      logger.warn('No AI API keys available for briefing regeneration', { clientId })
      return null
    }

    // Delete today's existing morning briefing
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.aIBriefing.deleteMany({
      where: {
        clientId,
        briefingType: 'MORNING',
        scheduledFor: { gte: today },
      },
    })

    // Create a fresh briefing with updated context
    return createMorningBriefing(clientId, apiKeys)
  } catch (error) {
    logger.error('Error regenerating morning briefing', { clientId }, error)
    return null
  }
}

/**
 * Get the latest unread briefing for an athlete
 */
export async function getLatestBriefing(clientId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return prisma.aIBriefing.findFirst({
    where: {
      clientId,
      briefingType: 'MORNING',
      scheduledFor: { gte: today },
      dismissedAt: null,
    },
    orderBy: { scheduledFor: 'desc' },
  })
}

/**
 * Mark a briefing as read
 */
export async function markBriefingAsRead(briefingId: string) {
  return prisma.aIBriefing.update({
    where: { id: briefingId },
    data: { readAt: new Date() },
  })
}

/**
 * Dismiss a briefing
 */
export async function dismissBriefing(briefingId: string) {
  return prisma.aIBriefing.update({
    where: { id: briefingId },
    data: { dismissedAt: new Date() },
  })
}
