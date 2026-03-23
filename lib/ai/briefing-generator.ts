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

const SWEDISH_DAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag']

export interface BriefingContext {
  athleteName: string
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
      where: { clientId, acwr: { not: null } },
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
      dailyCheckIns: {
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
          fatigue: true,
          soreness: true,
          mood: true,
          restingHR: true,
          hrv: true,
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
    client.userId
      ? getRecentWorkoutCompletions(client.userId)
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

  // Calculate readiness score from check-in data
  const checkIn = client.dailyCheckIns[0]
  let readinessScore: number | undefined
  if (checkIn) {
    const scores = []
    if (checkIn.fatigue) scores.push(11 - checkIn.fatigue) // Invert 1-10 scale
    if (checkIn.soreness) scores.push(11 - checkIn.soreness) // Invert 1-10 scale
    if (checkIn.mood) scores.push(checkIn.mood)
    if (checkIn.sleepQuality) scores.push(checkIn.sleepQuality)
    if (scores.length > 0) {
      readinessScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  const now = new Date()

  return {
    athleteName: client.name.split(' ')[0],
    readinessScore,
    sleepHours: checkIn?.sleepHours ?? undefined,
    sleepQuality: checkIn?.sleepQuality ?? undefined,
    fatigue: checkIn?.fatigue ?? undefined,
    soreness: checkIn?.soreness ?? undefined,
    mood: checkIn?.mood ?? undefined,
    restingHR: checkIn?.restingHR ?? undefined,
    hrv: checkIn?.hrv ?? undefined,
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
    dayOfWeek: SWEDISH_DAYS[now.getDay()],
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
      title: parsed.title || `God morgon ${context.athleteName}!`,
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
function getDailyAngle(dayIndex: number): string {
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
  const sections: string[] = []

  // 1. Previous topics — deduplication
  if (context.previousBriefingTopics.length > 0) {
    sections.push(
      `ÄMNEN SOM REDAN TAGITS UPP (UPPREPA INTE):\n${context.previousBriefingTopics.map((t) => `- ${t}`).join('\n')}\nDu MÅSTE hitta NYA vinklar varje dag. Nämn INTE dessa ämnen igen.`
    )
  }

  // 2. Athlete data today
  let dataLines = ''
  if (context.readinessScore !== undefined) {
    dataLines += `\n- Readiness-poäng: ${context.readinessScore.toFixed(1)}/10`
  }
  if (context.sleepHours !== undefined) {
    dataLines += `\n- Sömn: ${context.sleepHours} timmar`
  }
  if (context.sleepQuality !== undefined) {
    dataLines += `\n- Sömnkvalitet: ${context.sleepQuality}/10`
  }
  if (context.fatigue !== undefined) {
    dataLines += `\n- Trötthet: ${context.fatigue}/10`
  }
  if (context.soreness !== undefined) {
    dataLines += `\n- Muskelömhet: ${context.soreness}/10`
  }
  if (context.hrv !== undefined) {
    dataLines += `\n- HRV: ${context.hrv} ms`
  }
  if (context.restingHR !== undefined) {
    dataLines += `\n- Vilopuls: ${context.restingHR} bpm`
  }
  sections.push(`ATLETENS DATA IDAG:${dataLines || '\n- Ingen check-in-data tillgänglig'}`)

  // 3. Active warnings (Tier 1 — urgent)
  const warnings: string[] = []
  if (context.activePatternAlerts.length > 0) {
    for (const alert of context.activePatternAlerts) {
      warnings.push(`⚠ ${alert.title}: ${alert.message} (prioritet: ${alert.priority})`)
    }
  }
  if (context.activeInjuries.length > 0) {
    for (const injury of context.activeInjuries) {
      const sideStr = injury.side ? ` (${injury.side})` : ''
      const phaseStr = injury.phase ? `, fas: ${injury.phase}` : ''
      warnings.push(
        `🩹 Skada: ${injury.bodyPart}${sideStr} — smärtnivå ${injury.painLevel}/10${phaseStr}`
      )
    }
  }
  if (context.latestACWR && ['DANGER', 'CRITICAL'].includes(context.latestACWR.acwrZone)) {
    warnings.push(
      `🔴 ACWR ${context.latestACWR.acwr.toFixed(2)} — zon: ${context.latestACWR.acwrZone}, skaderisk: ${context.latestACWR.injuryRisk}`
    )
  }
  if (warnings.length > 0) {
    sections.push(`AKTUELLA VARNINGAR:\n${warnings.join('\n')}`)
  }

  // 4. Today's workout
  if (context.todaysWorkout) {
    let workoutLines = `- Namn: ${context.todaysWorkout.name}\n- Typ: ${context.todaysWorkout.type}`
    if (context.todaysWorkout.duration) {
      workoutLines += `\n- Längd: ${context.todaysWorkout.duration} min`
    }
    if (context.todaysWorkout.description) {
      workoutLines += `\n- Beskrivning: ${context.todaysWorkout.description}`
    }
    sections.push(`DAGENS PLANERADE TRÄNING:\n${workoutLines}`)
  }

  // 5. Recent workout completions
  if (context.recentWorkoutCompletions.length > 0) {
    const completionLines = context.recentWorkoutCompletions.map((w) => {
      const date = new Date(w.completedAt).toLocaleDateString('sv-SE')
      const details: string[] = []
      if (w.feeling) details.push(`känsla: ${w.feeling}`)
      if (w.rpe) details.push(`RPE: ${w.rpe}/10`)
      return `- ${w.name} (${date})${details.length > 0 ? ' — ' + details.join(', ') : ''}`
    })
    sections.push(`SENASTE TRÄNINGEN:\n${completionLines.join('\n')}`)
  }

  // 6. New milestones (already filtered against previous topics)
  if (context.recentMilestones.length > 0) {
    const milestoneLines = context.recentMilestones.map(
      (m) => `- ${m.title} (${new Date(m.createdAt).toLocaleDateString('sv-SE')})`
    )
    sections.push(`NYA PRESTATIONER:\n${milestoneLines.join('\n')}`)
  }

  // 7. Weekly summary (Mon/Wed/Sat only for variety)
  const dayIndex = new Date().getDay()
  if (context.currentWeeklySummary && [1, 3, 6].includes(dayIndex)) {
    const ws = context.currentWeeklySummary
    let summaryLines = `- Antal pass: ${ws.workoutCount}\n- Total tid: ${ws.totalDuration} min`
    if (ws.compliancePercent !== undefined) {
      summaryLines += `\n- Följsamhet: ${ws.compliancePercent.toFixed(0)}%`
    }
    if (ws.polarizationRatio !== undefined) {
      summaryLines += `\n- Polariseringskvot: ${ws.polarizationRatio.toFixed(2)}`
    }
    sections.push(`VECKANS TRÄNING:\n${summaryLines}`)
  }

  // 8. Memories & events (trimmed)
  const contextNotes: string[] = []
  if (context.recentMemories && context.recentMemories.length > 0) {
    contextNotes.push(...context.recentMemories.map((m) => `- ${m}`))
  }
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    for (const e of context.upcomingEvents) {
      contextNotes.push(
        `- Händelse: ${e.name} (${e.type}) — ${new Date(e.date).toLocaleDateString('sv-SE')}`
      )
    }
  }
  if (contextNotes.length > 0) {
    sections.push(`VIKTIGT ATT KOMMA IHÅG:\n${contextNotes.join('\n')}`)
  }

  // 9. Daily angle hint
  sections.push(`DAGENS VINKEL (${context.dayOfWeek}):\n${getDailyAngle(dayIndex)}`)

  // 10. Instructions
  const instructions = `INSTRUKTIONER:
1. Skriv en kort, personlig morgonhälsning (max 2-3 meningar)
2. Var ALDRIG upprepande — hitta nya vinklar varje dag
3. Om inga nya prestationer finns, fokusera på process och framsteg
4. Lyft fram det viktigaste för dagen
5. Ge 1-3 konkreta tips baserat på data
6. Varna om något ser oroande ut (skador, hög trötthet, ACWR-varning)
7. Var uppmuntrande men realistisk

SVARA I JSON-FORMAT:
{
  "title": "God morgon ${context.athleteName}!",
  "content": "Kort personlig briefing här...",
  "highlights": ["Punkt 1", "Punkt 2"],
  "alerts": [
    {"type": "warning", "message": "Varningsmeddelande om något"},
    {"type": "info", "message": "Informationsmeddelande"}
  ],
  "quickActions": [
    {"label": "Logga träning", "action": "log_workout"},
    {"label": "Chatta med AI", "action": "open_chat"}
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

  return `Generera en personlig morgonbriefing för atleten ${context.athleteName}.\n\n${sections.join('\n\n')}\n\n${instructions}\n`
}

/**
 * Get a default briefing when AI generation fails
 */
function getDefaultBriefing(context: BriefingContext): GeneratedBriefing {
  const highlights: string[] = []
  const alerts: GeneratedBriefing['alerts'] = []

  if (context.todaysWorkout) {
    highlights.push(`Dagens pass: ${context.todaysWorkout.name}`)
  }

  if (context.readinessScore !== undefined) {
    if (context.readinessScore >= 7) {
      highlights.push('Bra readiness - kör på!')
    } else if (context.readinessScore < 5) {
      alerts.push({ type: 'warning', message: 'Låg readiness - överväg att ta det lugnt' })
    }
  }

  if (context.sleepHours !== undefined && context.sleepHours < 6) {
    alerts.push({ type: 'warning', message: `Du sov bara ${context.sleepHours} timmar` })
  }

  // Add injury warnings
  for (const injury of context.activeInjuries) {
    const sideStr = injury.side ? ` (${injury.side})` : ''
    alerts.push({
      type: 'warning',
      message: `Aktiv skada: ${injury.bodyPart}${sideStr} — smärtnivå ${injury.painLevel}/10`,
    })
  }

  // Add ACWR danger/critical alerts
  if (context.latestACWR && ['DANGER', 'CRITICAL'].includes(context.latestACWR.acwrZone)) {
    alerts.push({
      type: 'warning',
      message: `Hög träningsbelastning (ACWR ${context.latestACWR.acwr.toFixed(2)}) — var försiktig`,
    })
  }

  // Add milestone highlights
  for (const milestone of context.recentMilestones) {
    highlights.push(milestone.title)
  }

  // Mention last completed workout
  if (context.recentWorkoutCompletions.length > 0) {
    const last = context.recentWorkoutCompletions[0]
    highlights.push(`Senaste passet: ${last.name}${last.feeling ? ` (${last.feeling})` : ''}`)
  }

  let content: string
  if (context.todaysWorkout) {
    content = `Idag väntar ${context.todaysWorkout.name}. Ha en bra träningsdag!`
  } else if (context.recentWorkoutCompletions.length > 0) {
    content = `Bra jobbat med ${context.recentWorkoutCompletions[0].name}! Ha en bra dag.`
  } else {
    content = 'Ha en bra dag! Glöm inte att röra på dig.'
  }

  return {
    title: `God morgon ${context.athleteName}!`,
    content,
    highlights,
    alerts,
    quickActions: [
      { label: 'Logga träning', action: 'log_workout' },
      { label: 'Chatta med AI', action: 'open_chat' },
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
