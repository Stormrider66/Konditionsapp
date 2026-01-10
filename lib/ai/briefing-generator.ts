/**
 * Morning Briefing Generator Service
 *
 * Generates personalized daily briefings for athletes based on their
 * training schedule, readiness data, and recent activities.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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
}

export interface GeneratedBriefing {
  title: string
  content: string
  highlights: string[]
  alerts: { type: 'warning' | 'info' | 'success'; message: string }[]
  quickActions: { label: string; action: string }[]
}

/**
 * Build context for morning briefing generation
 */
export async function buildBriefingContext(clientId: string): Promise<BriefingContext | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get client with related data
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      dailyCheckIns: {
        orderBy: { date: 'desc' },
        take: 1,
        where: {
          date: {
            gte: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
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
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { importance: 'desc' },
        take: 5,
        select: { content: true },
      },
      calendarEvents: {
        where: {
          startTime: {
            gte: today,
            lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
        },
        orderBy: { startTime: 'asc' },
        take: 3,
        select: {
          title: true,
          startTime: true,
          eventType: true,
        },
      },
    },
  })

  if (!client) {
    return null
  }

  // Get today's scheduled workout from training program
  const todaysWorkout = await getTodaysWorkout(clientId)

  // Calculate readiness score from check-in data
  const checkIn = client.dailyCheckIns[0]
  let readinessScore: number | undefined
  if (checkIn) {
    // Simple readiness calculation: average of inverted fatigue, inverted soreness, mood, sleep quality
    const scores = []
    if (checkIn.fatigue) scores.push(11 - checkIn.fatigue) // Invert 1-10 scale
    if (checkIn.soreness) scores.push(11 - checkIn.soreness) // Invert 1-10 scale
    if (checkIn.mood) scores.push(checkIn.mood)
    if (checkIn.sleepQuality) scores.push(checkIn.sleepQuality)
    if (scores.length > 0) {
      readinessScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  return {
    athleteName: client.name.split(' ')[0], // First name only
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
      date: e.startTime,
      type: e.eventType,
    })),
  }
}

/**
 * Get today's scheduled workout from active training program
 */
async function getTodaysWorkout(clientId: string): Promise<BriefingContext['todaysWorkout'] | null> {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Find active program
  const program = await prisma.trainingProgram.findFirst({
    where: {
      clientId,
      isActive: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: {
      weeks: {
        where: {
          weekNumber: {
            // Calculate current week number
            equals: Math.ceil(
              (today.getTime() - new Date().setHours(0, 0, 0, 0)) / (7 * 24 * 60 * 60 * 1000)
            ) + 1,
          },
        },
        take: 1,
        select: {
          days: {
            where: { dayOfWeek },
            take: 1,
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
          },
        },
      },
    },
  })

  const workout = program?.weeks[0]?.days[0]?.workouts[0]
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
  apiKey: string
): Promise<GeneratedBriefing> {
  const client = new Anthropic({ apiKey })

  const prompt = buildBriefingPrompt(context)

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return getDefaultBriefing(context)
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
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
 * Build the AI prompt for briefing generation
 */
function buildBriefingPrompt(context: BriefingContext): string {
  let dataSection = ''

  if (context.readinessScore !== undefined) {
    dataSection += `\n- Readiness-poäng: ${context.readinessScore.toFixed(1)}/10`
  }
  if (context.sleepHours !== undefined) {
    dataSection += `\n- Sömn: ${context.sleepHours} timmar`
  }
  if (context.sleepQuality !== undefined) {
    dataSection += `\n- Sömnkvalitet: ${context.sleepQuality}/10`
  }
  if (context.fatigue !== undefined) {
    dataSection += `\n- Trötthet: ${context.fatigue}/10`
  }
  if (context.soreness !== undefined) {
    dataSection += `\n- Muskelömhet: ${context.soreness}/10`
  }
  if (context.hrv !== undefined) {
    dataSection += `\n- HRV: ${context.hrv} ms`
  }

  let workoutSection = ''
  if (context.todaysWorkout) {
    workoutSection = `
DAGENS PLANERADE TRÄNING:
- Namn: ${context.todaysWorkout.name}
- Typ: ${context.todaysWorkout.type}
${context.todaysWorkout.duration ? `- Längd: ${context.todaysWorkout.duration} min` : ''}
${context.todaysWorkout.description ? `- Beskrivning: ${context.todaysWorkout.description}` : ''}`
  }

  let memorySection = ''
  if (context.recentMemories && context.recentMemories.length > 0) {
    memorySection = `
VIKTIGT ATT KOMMA IHÅG OM ATLETEN:
${context.recentMemories.map((m) => `- ${m}`).join('\n')}`
  }

  let eventsSection = ''
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    eventsSection = `
KOMMANDE HÄNDELSER:
${context.upcomingEvents.map((e) => `- ${e.name} (${e.type}) - ${new Date(e.date).toLocaleDateString('sv-SE')}`).join('\n')}`
  }

  return `Generera en personlig morgonbriefing för atleten ${context.athleteName}.

ATLETENS DATA IDAG:${dataSection || '\n- Ingen check-in-data tillgänglig'}
${workoutSection}
${memorySection}
${eventsSection}

INSTRUKTIONER:
1. Skriv en kort, personlig morgonhälsning (max 2-3 meningar)
2. Lyft fram det viktigaste för dagen
3. Ge 1-3 konkreta tips baserat på data
4. Varna om något ser oroande ut (låg sömn, hög trötthet, etc.)
5. Var uppmuntrande men realistisk

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
- warning: Något som behöver uppmärksamhet (låg sömn, hög trötthet)
- info: Neutral information
- success: Positiva saker (bra återhämtning, nått mål)

QUICK ACTIONS:
- log_workout: Öppna träningsloggning
- open_chat: Öppna AI-chatt
- check_in: Gör daglig check-in
- view_program: Se träningsprogram

TONALITET: Vänlig, personlig, motiverande. Som en bra tränare som bryr sig.
`
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

  return {
    title: `God morgon ${context.athleteName}!`,
    content: context.todaysWorkout
      ? `Idag väntar ${context.todaysWorkout.name}. Ha en bra träningsdag!`
      : 'Ha en bra dag! Glöm inte att röra på dig.',
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
  apiKey: string
): Promise<string | null> {
  try {
    // Build context
    const context = await buildBriefingContext(clientId)
    if (!context) {
      logger.warn('Could not build briefing context', { clientId })
      return null
    }

    // Generate briefing
    const briefing = await generateMorningBriefing(context, apiKey)

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
        modelUsed: 'claude-3-5-haiku-20241022',
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
