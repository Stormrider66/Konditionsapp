/**
 * AI Chat Tools for Coach
 *
 * Vercel AI SDK tools the AI can invoke during coach chat conversations.
 * Supports generating strength sessions and programs from the Strength Studio.
 */

import { tool, type LanguageModel } from 'ai'
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
import { buildTeamCalendarBriefing, type TeamCalendarBriefingEvent } from '@/lib/team-calendar/briefing'
import { getTeamCalendarAssignmentSummaries } from '@/lib/team-calendar/assignment-summary'
import { findTeamCalendarLocationConflicts, formatLocationConflictMessage } from '@/lib/team-calendar/location-conflicts'
import { getTeamCalendarWritableTeam } from '@/lib/team-calendar/permissions'
import { getAssignableTeamCoaches, isAssignableTeamCoach } from '@/lib/team-calendar/responsible-coach'
import { strengthSessionAccessWhere } from '@/lib/strength/session-business-scope'
import { getStrengthBusinessTag } from '@/lib/strength/session-business-tags'
import {
  agilityWorkoutAccessWhere,
  cardioSessionAccessWhere,
  hybridWorkoutAccessWhere,
} from '@/lib/workouts/business-scope'
import { getProgramSportSettings, normalizeProgramSport } from '@/lib/ai/program-generator/sport-normalization'
import type { Prisma, StrengthPhase } from '@prisma/client'

const CARDIO_TOOL_SPORTS = [
  'RUNNING',
  'CYCLING',
  'SWIMMING',
  'SKIING',
  'TRIATHLON',
  'HYROX',
  'GENERAL_FITNESS',
  'FUNCTIONAL_FITNESS',
  'TEAM_ICE_HOCKEY',
  'TEAM_FOOTBALL',
  'TEAM_HANDBALL',
  'TEAM_FLOORBALL',
  'TEAM_BASKETBALL',
  'TEAM_VOLLEYBALL',
  'TENNIS',
  'PADEL',
] as const

const TEAM_WORKOUT_TYPES = ['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY'] as const
const TEAM_EVENT_CONTENT_OWNERS_FOR_AI = ['coach', 'physical_trainer', 'physio', 'shared', 'self'] as const
const TEAM_EVENT_CONTENT_STATUSES_FOR_AI = ['PLANNED', 'NEEDS_CONTENT', 'CONTENT_READY', 'ASSIGNED'] as const

function toolText(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
const VALID_STRENGTH_PHASES = [
  'ANATOMICAL_ADAPTATION',
  'MAXIMUM_STRENGTH',
  'POWER',
  'MAINTENANCE',
  'TAPER',
] as const

type TeamWorkoutType = (typeof TEAM_WORKOUT_TYPES)[number]

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

function getStaticCoachNavigation(destination: CoachNavigationDestination, locale: 'en' | 'sv') {
  const routes: Partial<Record<CoachNavigationDestination, { href: string; label: string; description: string }>> = {
    dashboard: { href: '/coach/dashboard', label: toolText(locale, 'Open dashboard', 'Öppna dashboard'), description: toolText(locale, 'Coach overview', 'Coachens huvudöversikt') },
    calendar: { href: '/coach/calendar', label: toolText(locale, 'Open calendar', 'Öppna kalender'), description: toolText(locale, 'Planned sessions, tests, and events', 'Planerade pass, tester och händelser') },
    athletes: { href: '/coach/clients', label: toolText(locale, 'Open athletes', 'Öppna atleter'), description: toolText(locale, 'Athlete list and quick status overview', 'Atletlista och snabb statusöversikt') },
    programs: { href: '/coach/programs', label: toolText(locale, 'Open programs', 'Öppna program'), description: toolText(locale, 'Training programs and program overview', 'Träningsprogram och programöversikt') },
    programBuilder: { href: '/coach/programs/new', label: toolText(locale, 'Create program', 'Skapa program'), description: toolText(locale, 'Start a new training program', 'Starta nytt träningsprogram') },
    aiStudio: { href: '/coach/ai-studio', label: toolText(locale, 'Open AI Studio', 'Öppna AI Studio'), description: toolText(locale, 'AI-assisted program generation', 'AI-assisterad programgenerering') },
    strength: { href: '/coach/strength', label: toolText(locale, 'Open Strength Studio', 'Öppna Strength Studio'), description: toolText(locale, 'Strength sessions and progression', 'Styrkepass och progression') },
    cardio: { href: '/coach/cardio', label: toolText(locale, 'Open Cardio Studio', 'Öppna Cardio Studio'), description: toolText(locale, 'Cardio sessions and intervals', 'Konditionspass och intervaller') },
    hybrid: { href: '/coach/hybrid-studio', label: toolText(locale, 'Open Hybrid Studio', 'Öppna Hybrid Studio'), description: toolText(locale, 'HYROX and functional sessions', 'HYROX och funktionella pass') },
    agility: { href: '/coach/agility-studio', label: toolText(locale, 'Open Agility Studio', 'Öppna Agility Studio'), description: toolText(locale, 'Agility sessions and timing gates', 'Agilitypass och timing gates') },
    monitoring: { href: '/coach/monitoring', label: toolText(locale, 'Open monitoring', 'Öppna monitorering'), description: toolText(locale, 'Readiness, HRV, and load', 'Beredskap, HRV och belastning') },
    liveHr: { href: '/coach/live-hr', label: toolText(locale, 'Open Live HR', 'Öppna Live HR'), description: toolText(locale, 'Real-time heart-rate monitoring', 'Realtidsövervakning av puls') },
    testOverview: { href: '/coach/test-overview', label: toolText(locale, 'Open test overview', 'Öppna testöversikt'), description: toolText(locale, 'Latest tests and test status', 'Senaste tester och teststatus') },
    newTest: { href: '/coach/test', label: toolText(locale, 'Create new test', 'Skapa nytt test'), description: toolText(locale, 'New test entry', 'Ny testinmatning') },
    videoAnalysis: { href: '/coach/video-analysis', label: toolText(locale, 'Open video analysis', 'Öppna videoanalys'), description: toolText(locale, 'Movement and technique video', 'Rörelse- och teknikvideo') },
    messages: { href: '/coach/messages', label: toolText(locale, 'Open messages', 'Öppna meddelanden'), description: toolText(locale, 'Coach conversations', 'Coachens konversationer') },
    teams: { href: '/coach/teams', label: toolText(locale, 'Open teams', 'Öppna lag'), description: toolText(locale, 'Team overview', 'Lagöversikt') },
    settings: { href: '/coach/settings', label: toolText(locale, 'Open settings', 'Öppna inställningar'), description: toolText(locale, 'Coach and business settings', 'Coach- och verksamhetsinställningar') },
    documents: { href: '/coach/documents', label: toolText(locale, 'Open documents', 'Öppna dokument'), description: toolText(locale, 'Knowledge documents for AI/RAG', 'Kunskapsdokument för AI/RAG') },
    analytics: { href: '/coach/analytics', label: toolText(locale, 'Open analytics', 'Öppna analys'), description: toolText(locale, 'Overall analytics views', 'Övergripande analysvyer') },
  }
  return routes[destination] ?? null
}

function getCoachToolWeekRange(reference = new Date()): { start: Date; end: Date } {
  const start = new Date(reference)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function parseCoachToolDateBoundary(value: string | undefined, fallback: Date, endOfDay = false): Date {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parsed.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  }

  return parsed
}

function addCoachToolWeeks(date: Date, weeks: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + weeks * 7)
  return next
}

function getCoachToolDayRange(dateValue: string | undefined): { start: Date; end: Date } {
  const parsed = parseCoachToolDateBoundary(dateValue, new Date())
  const start = new Date(parsed)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function parseCoachToolClockTime(value: string | undefined): { hours: number; minutes: number } | null {
  if (!value) return null
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return null
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  }
}

function buildCoachToolEventDate(dateValue: string, timeValue: string | undefined, allDay: boolean): Date {
  const date = parseCoachToolDateBoundary(dateValue, new Date())
  const next = new Date(date)
  const clock = allDay ? null : parseCoachToolClockTime(timeValue)
  next.setHours(clock?.hours ?? 0, clock?.minutes ?? 0, 0, 0)
  return next
}

function sumStrengthSets(exercises: unknown[]): number {
  return exercises.reduce<number>((total, exercise) => {
    if (!exercise || typeof exercise !== 'object') return total
    const sets = (exercise as { sets?: unknown }).sets
    return total + (typeof sets === 'number' && Number.isFinite(sets) ? sets : 1)
  }, 0)
}

async function resolveCoachToolBusinessId(
  coachUserId: string,
  businessSlug?: string
): Promise<string | undefined | null> {
  if (!businessSlug) return undefined
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId: coachUserId,
      isActive: true,
      business: {
        slug: businessSlug,
        isActive: true,
      },
    },
    select: { businessId: true },
  })
  return membership?.businessId ?? null
}

function compactWorkoutDate(date: Date, locale: 'en' | 'sv') {
  return date.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function eventTypeForTeamWorkoutType(workoutType: TeamWorkoutType) {
  return workoutType
}

function normalizeStrengthExercise(
  raw: unknown,
  exerciseLibrary: Array<{ id: string; name: string; nameSv: string | null }>
) {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const rawName = String(value.exerciseName || value.name || value.nameSv || '').trim()
  const rawId = typeof value.exerciseId === 'string' ? value.exerciseId : undefined
  const match = rawId
    ? exerciseLibrary.find((exercise) => exercise.id === rawId)
    : exerciseLibrary.find((exercise) => {
        const candidate = rawName.toLowerCase()
        return exercise.name.toLowerCase() === candidate || exercise.nameSv?.toLowerCase() === candidate
      })

  const sets = typeof value.sets === 'number' && Number.isFinite(value.sets) ? value.sets : 3
  const restSeconds = typeof value.restSeconds === 'number' && Number.isFinite(value.restSeconds)
    ? value.restSeconds
    : typeof value.rest === 'number' && Number.isFinite(value.rest)
      ? value.rest
      : undefined

  return {
    exerciseId: match?.id ?? rawId,
    exerciseName: match?.name ?? rawName,
    sets,
    reps: typeof value.reps === 'string' || typeof value.reps === 'number' ? String(value.reps) : '6-8',
    weight: typeof value.weight === 'string' || typeof value.weight === 'number' ? value.weight : undefined,
    restSeconds,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
  }
}

function normalizeStrengthSection(
  raw: unknown,
  exerciseLibrary: Array<{ id: string; name: string; nameSv: string | null }>
) {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const exercisesRaw = Array.isArray(value.exercises) ? value.exercises : []
  return {
    notes: typeof value.notes === 'string' ? value.notes : undefined,
    duration: typeof value.duration === 'number' && Number.isFinite(value.duration) ? value.duration : undefined,
    exercises: exercisesRaw
      .map((exercise) => normalizeStrengthExercise(exercise, exerciseLibrary))
      .filter((exercise) => Boolean(exercise.exerciseName)),
  }
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const candidate = fenced?.[1] ?? text
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found')
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1))
}

async function getCoachToolLinkedWorkoutDetails(
  coachUserId: string,
  workoutType: string | null,
  workoutId: string | null,
  businessId?: string
) {
  if (!workoutType || !workoutId) return null

  if (workoutType === 'STRENGTH') {
    const session = await prisma.strengthSession.findFirst({
      where: { id: workoutId, AND: [strengthSessionAccessWhere(coachUserId, businessId)] },
      select: {
        id: true,
        name: true,
        description: true,
        phase: true,
        estimatedDuration: true,
        exercises: true,
        warmupData: true,
        prehabData: true,
        coreData: true,
        cooldownData: true,
        totalSets: true,
        totalExercises: true,
        tags: true,
      },
    })
    if (!session) return null
    return {
      type: 'STRENGTH',
      ...session,
      sections: {
        warmup: session.warmupData,
        main: { exercises: session.exercises },
        prehab: session.prehabData,
        core: session.coreData,
        cooldown: session.cooldownData,
      },
    }
  }

  if (workoutType === 'CARDIO') {
    const session = await prisma.cardioSession.findFirst({
      where: { id: workoutId, AND: [cardioSessionAccessWhere(coachUserId, businessId)] },
      select: {
        id: true,
        name: true,
        description: true,
        sport: true,
        segments: true,
        totalDuration: true,
        totalDistance: true,
        avgZone: true,
        tags: true,
      },
    })
    return session ? { type: 'CARDIO', ...session } : null
  }

  if (workoutType === 'HYBRID') {
    const workout = await prisma.hybridWorkout.findFirst({
      where: { id: workoutId, AND: [hybridWorkoutAccessWhere(coachUserId, businessId)] },
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        timeCap: true,
        workTime: true,
        restTime: true,
        totalRounds: true,
        totalMinutes: true,
        repScheme: true,
        warmupData: true,
        strengthData: true,
        metconData: true,
        cooldownData: true,
        tags: true,
        movements: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            reps: true,
            calories: true,
            distance: true,
            duration: true,
            weightMale: true,
            weightFemale: true,
            notes: true,
            exercise: { select: { id: true, name: true, nameSv: true } },
          },
        },
      },
    })
    return workout ? { type: 'HYBRID', ...workout } : null
  }

  if (workoutType === 'AGILITY') {
    const workout = await prisma.agilityWorkout.findFirst({
      where: { id: workoutId, AND: [agilityWorkoutAccessWhere(coachUserId, businessId)] },
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        totalDuration: true,
        restBetweenDrills: true,
        developmentStage: true,
        targetSports: true,
        primaryFocus: true,
        tags: true,
        drills: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            sectionType: true,
            sets: true,
            reps: true,
            duration: true,
            restSeconds: true,
            notes: true,
            drill: {
              select: {
                id: true,
                name: true,
                nameSv: true,
                category: true,
                distanceMeters: true,
                durationSeconds: true,
                defaultReps: true,
                defaultSets: true,
                executionCues: true,
              },
            },
          },
        },
      },
    })
    return workout ? { type: 'AGILITY', ...workout } : null
  }

  return null
}

async function getCoachToolLinkedWorkoutName(
  coachUserId: string,
  workoutType: TeamWorkoutType,
  workoutId: string,
  businessId?: string
) {
  const details = await getCoachToolLinkedWorkoutDetails(coachUserId, workoutType, workoutId, businessId)
  return details && 'name' in details && typeof details.name === 'string' ? details.name : null
}

async function resolveResponsibleCoachIdFromAiInput({
  coachUserId,
  teamId,
  businessSlug,
  responsibleCoachId,
  responsibleCoachName,
  locale,
}: {
  coachUserId: string
  teamId: string
  businessSlug?: string
  responsibleCoachId?: string | null
  responsibleCoachName?: string | null
  locale: 'en' | 'sv'
}) {
  if (responsibleCoachId !== undefined) return { value: responsibleCoachId || null }
  const name = responsibleCoachName?.trim()
  if (!name) return { value: null }
  if (/^(ingen|none|no coach|eget ansvar|own responsibility|self)$/i.test(name)) {
    return { value: null }
  }

  const coaches = await getAssignableTeamCoaches({ requestingUserId: coachUserId, teamId, businessSlug, locale })
  const exact = coaches.filter((coach) => coach.name.toLowerCase() === name.toLowerCase())
  const candidates = exact.length > 0
    ? exact
    : coaches.filter((coach) => coach.name.toLowerCase().includes(name.toLowerCase()))

  if (candidates.length === 1) return { value: candidates[0].id }

  return {
    error: candidates.length > 1
      ? `Jag hittade flera möjliga tränare för "${name}".`
      : `Jag hittade ingen ansvarig tränare som matchar "${name}".`,
    candidates: candidates.map((coach) => ({
      id: coach.id,
      name: coach.name,
      roleLabel: coach.roleLabel,
    })),
  }
}

/**
 * Create all chat tools for a coach session.
 */
export function createCoachChatTools(coachUserId: string, businessSlug?: string, locale: 'en' | 'sv' = 'en') {
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
        includePrehab: z.boolean().optional().describe('Inkludera separat stabilitet/prehab-sektion. Om utelämnad aktiveras den automatiskt för hockey, skadeförebyggande mål eller aktiva riskområden.'),
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
            includePrehab,
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
          let athleteSport: string | null = null

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
              const sportProfile = await prisma.sportProfile.findFirst({
                where: { clientId },
                select: { primarySport: true },
              })
              athleteSport = sportProfile?.primarySport || null
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
              isRehabExercise: true,
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
            includePrehab: includePrehab ?? undefined,
            includeCore,
            includeCooldown,
            sport: athleteSport,
            riskBodyParts: restrictedBodyParts,
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
              const prehabData = session.sections.find((s) => s.type === 'PREHAB')
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
                  prehabData: prehabData ? { exercises: prehabData.exercises, notes: prehabData.notes, duration: prehabData.duration } as any : undefined,
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
          const prehabData = session.sections.find((s) => s.type === 'PREHAB')
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
              prehabData: prehabData ? { exercises: prehabData.exercises, notes: prehabData.notes, duration: prehabData.duration } as any : undefined,
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
      description: toolText(
        locale,
        'List the coach athletes so one can be selected for strength-session generation.',
        'Lista coachens atleter för att kunna välja en atlet att generera styrkepass för.'
      ),
      inputSchema: z.object({
        search: z.string().optional().describe('Search by name.'),
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
          return {
            success: false,
            error: toolText(locale, 'Could not fetch athletes.', 'Kunde inte hämta atleter.'),
          }
        }
      },
    }),

    findAthleteByName: tool({
      description: toolText(
        locale,
        'Search for an athlete the coach can access. Use when the coach mentions an athlete by name and you need the clientId before fetching data or creating something.',
        'Sök efter en atlet som coachen har behörighet till. Använd när coachen nämner en atlet vid namn och du behöver clientId innan du hämtar data eller skapar något.'
      ),
      inputSchema: z.object({
        name: z.string().min(2).describe('Name or part of the name to search for.'),
        limit: z.number().int().min(1).max(10).default(5).describe('Maximum number of matches to return.'),
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
                ? toolText(locale, `I found no accessible athlete matching "${name}".`, `Jag hittade ingen tillgänglig atlet som matchar "${name}".`)
                : clients.length === 1
                  ? toolText(locale, `I found ${clients[0].name}.`, `Jag hittade ${clients[0].name}.`)
                  : toolText(
                      locale,
                      `I found ${clients.length} possible athletes. Ask the coach to choose the right clientId if the name is ambiguous.`,
                      `Jag hittade ${clients.length} möjliga atleter. Be coachen välja rätt clientId om namnet är otydligt.`
                    ),
          }
        } catch (error) {
          logger.error('Error in findAthleteByName tool', { coachUserId, name }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not search for the athlete.', 'Kunde inte söka efter atleten.'),
          }
        }
      },
    }),

    getLatestCompletedWorkout: tool({
      description: toolText(
        locale,
        'Fetch the latest completed training activity for a specific athlete. Can take clientId directly or search by athleteName. Covers program logs, ad-hoc workouts, Garmin, strength, cardio, hybrid, agility, and AI-generated WODs.',
        'Hämta den senaste genomförda träningsaktiviteten för en specifik atlet. Kan ta clientId direkt eller söka med athleteName. Täcker programloggar, ad-hoc-pass, Garmin, styrka, kondition, hybrid, agility och AI-genererade WODs.'
      ),
      inputSchema: z.object({
        clientId: z.string().optional().describe('Athlete clientId if already known.'),
        athleteName: z.string().optional().describe('Athlete name if clientId is not known.'),
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
                error: toolText(locale, 'The athlete was not found or is outside your access.', 'Atleten hittades inte eller ligger utanför din behörighet.'),
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
                    ? toolText(locale, `I found no accessible athlete matching "${athleteName}".`, `Jag hittade ingen tillgänglig atlet som matchar "${athleteName}".`)
                    : toolText(locale, `I found several possible athletes matching "${athleteName}".`, `Jag hittade flera möjliga atleter som matchar "${athleteName}".`),
                candidates: candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  team: candidate.team?.name ?? null,
                })),
              }
            }
          } else {
            return {
              success: false,
              error: toolText(locale, 'Provide clientId or athleteName.', 'Ange clientId eller athleteName.'),
            }
          }

          const athleteUserId = client.athleteAccount?.userId
          if (!athleteUserId) {
            return {
              success: false,
              athlete: { id: client.id, name: client.name },
              error: toolText(
                locale,
                'The athlete does not have a linked athlete account yet, so completed workouts cannot be fetched from history.',
                'Atleten har inget länkat atletkonto ännu, så genomförda pass kan inte hämtas från historiken.'
              ),
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
              message: toolText(
                locale,
                `${client.name} has no completed workouts in the available history.`,
                `${client.name} har inga genomförda pass i den tillgängliga historiken.`
              ),
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
            message: toolText(
              locale,
              `${client.name}'s latest completed workout is "${latestWorkout.name}" (${latestWorkout.type}) from ${latestWorkout.date?.toISOString().slice(0, 10)}.`,
              `${client.name}s senaste genomförda pass är "${latestWorkout.name}" (${latestWorkout.type}) från ${latestWorkout.date?.toISOString().slice(0, 10)}.`
            ),
          }
        } catch (error) {
          logger.error('Error in getLatestCompletedWorkout tool', { coachUserId, clientId, athleteName }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not fetch the latest completed workout.', 'Kunde inte hämta senaste genomförda pass.'),
          }
        }
      },
    }),

    getTeamCalendarBriefing: tool({
      description: toolText(
        locale,
        'Fetch an AI-readable brief for a team calendar: missing physical content, ready sessions to assign, missing ice plans, weekly load, and concrete next steps. Use when the coach asks about the team calendar, hockey week, planning status, physical sessions needing content, or load risks.',
        'Hämta en AI-läsbar brief för ett lags kalender: saknat fysinnehåll, klara pass att tilldela, saknade isplaner, veckobelastning och konkreta nästa steg. Använd när coachen frågar om lagkalendern, hockeyveckan, planeringsläget, fys-pass som behöver innehåll eller belastningsrisker.'
      ),
      inputSchema: z.object({
        teamId: z.string().optional().describe('Team id if known.'),
        teamName: z.string().optional().describe('Team name if id is missing.'),
        from: z.string().optional().describe('Start date as ISO date, for example 2026-05-18. Defaults to Monday in the current week.'),
        to: z.string().optional().describe('End date as ISO date, for example 2026-05-24. Defaults to Sunday in the current week.'),
      }),
      execute: async ({ teamId, teamName, from, to }) => {
        try {
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
                  ? toolText(
                      locale,
                      `I found several possible teams${teamName ? ` for "${teamName}"` : ''}.`,
                      `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                    )
                  : toolText(locale, 'I need to know which team calendar to read.', 'Jag behöver veta vilket lag jag ska läsa kalendern för.'),
              candidates: candidates.map((candidate) => ({
                id: candidate.id,
                name: candidate.name,
                sportType: candidate.sportType,
              })),
            }
          }

          const defaultRange = getCoachToolWeekRange()
          const rangeStart = parseCoachToolDateBoundary(from, defaultRange.start)
          const rangeEnd = parseCoachToolDateBoundary(to, defaultRange.end, true)

          const events = await prisma.teamEvent.findMany({
            where: {
              teamId: team.id,
              startDate: { gte: rangeStart, lte: rangeEnd },
            },
            select: {
              id: true,
              title: true,
              type: true,
              location: true,
              startDate: true,
              endDate: true,
              allDay: true,
              contentStatus: true,
              contentOwner: true,
              practicePlan: true,
              linkedWorkoutId: true,
              linkedWorkoutName: true,
              assignedBroadcastId: true,
            },
            orderBy: { startDate: 'asc' },
          })

          const summaries = await getTeamCalendarAssignmentSummaries(events.map((event) => event.assignedBroadcastId))
          const coach = await prisma.user.findUnique({
            where: { id: coachUserId },
            select: { language: true },
          })
          const briefingEvents: TeamCalendarBriefingEvent[] = events.map((event) => {
            const summary = event.assignedBroadcastId ? summaries.get(event.assignedBroadcastId) : null
            return {
              id: event.id,
              title: event.title,
              type: event.type,
              location: event.location,
              startDate: event.startDate,
              endDate: event.endDate,
              allDay: event.allDay,
              contentStatus: event.contentStatus,
              contentOwner: event.contentOwner,
              practicePlan: event.practicePlan,
              linkedWorkoutId: event.linkedWorkoutId,
              linkedWorkoutName: event.linkedWorkoutName,
              assignedBroadcastId: event.assignedBroadcastId,
              assignmentSummary: summary
                ? {
                    totalAssigned: summary.totalAssigned,
                    totalCompleted: summary.totalCompleted,
                    completionRate: summary.completionRate,
                  }
                : null,
            }
          })

          const briefing = buildTeamCalendarBriefing({
            team,
            events: briefingEvents,
            rangeStart,
            rangeEnd,
            locale: coach?.language === 'sv' ? 'sv' : 'en',
          })

          return {
            success: true,
            briefing,
            message: briefing.summaryText,
          }
        } catch (error) {
          logger.error('Error in getTeamCalendarBriefing tool', {
            coachUserId,
            businessSlug,
            teamId,
            teamName,
            from,
            to,
          }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not read the team calendar right now.', 'Kunde inte läsa lagkalendern just nu.'),
          }
        }
      },
    }),

    getTeamPlannedWorkout: tool({
      description: toolText(
        locale,
        'Read a specific planned team-calendar event and its linked studio session. Use before creating a complementary session, for example "check Pitea strength on Monday". Returns the event, candidates if several match, and full linked workout data for STRENGTH, CARDIO, HYBRID, or AGILITY when linked.',
        'Läs en specifik planerad lagkalenderhändelse och dess kopplade studio-pass. Använd före du skapar ett kompletterande pass, t.ex. "kolla Piteås styrka på måndag". Returnerar eventet, kandidater om flera matchar och full linked workout-data för STRENGTH, CARDIO, HYBRID eller AGILITY när passet är kopplat.'
      ),
      inputSchema: z.object({
        teamId: z.string().optional().describe('Team id if known.'),
        teamName: z.string().optional().describe('Team name if id is missing.'),
        eventId: z.string().optional().describe('Calendar event id if known.'),
        date: z.string().optional().describe('Date as ISO date, for example 2026-05-25. If eventId is missing, date should usually be provided.'),
        workoutType: z.enum(TEAM_WORKOUT_TYPES).optional().describe('Filter by linked workout type or event type.'),
        titleIncludes: z.string().optional().describe('Optional text search in the event title when several sessions exist on the same day.'),
      }),
      execute: async ({ teamId, teamName, eventId, date, workoutType, titleIncludes }) => {
        try {
          const businessId = await resolveCoachToolBusinessId(coachUserId, businessSlug)
          if (businessId === null) {
            return {
              success: false,
              error: toolText(locale, 'The business could not be verified for this coach.', 'Verksamheten kunde inte verifieras för den här coachen.'),
            }
          }

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
                  ? toolText(
                      locale,
                      `I found several possible teams${teamName ? ` for "${teamName}"` : ''}.`,
                      `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                    )
                  : toolText(locale, 'I need to know which team calendar to read.', 'Jag behöver veta vilket lag jag ska läsa kalendern för.'),
              candidates: candidates.map((candidate) => ({
                id: candidate.id,
                name: candidate.name,
                sportType: candidate.sportType,
              })),
            }
          }

          const dayRange = getCoachToolDayRange(date)
          const events = await prisma.teamEvent.findMany({
            where: {
              teamId: team.id,
              ...(eventId ? { id: eventId } : { startDate: { gte: dayRange.start, lte: dayRange.end } }),
              ...(workoutType ? { OR: [{ type: workoutType }, { linkedWorkoutType: workoutType }] } : {}),
              ...(titleIncludes ? { title: { contains: titleIncludes, mode: 'insensitive' as const } } : {}),
            },
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              location: true,
              startDate: true,
              endDate: true,
              allDay: true,
              contentStatus: true,
              contentOwner: true,
              practicePlan: true,
              linkedWorkoutType: true,
              linkedWorkoutId: true,
              linkedWorkoutName: true,
              assignedBroadcastId: true,
              responsibleCoach: { select: { id: true, name: true, email: true } },
            },
            orderBy: { startDate: 'asc' },
            take: 8,
          })

          if (events.length === 0) {
            return {
              success: true,
              team,
              events: [],
              message: toolText(
                locale,
                `I found no planned session for ${team.name}${date ? ` ${date}` : ''}.`,
                `Jag hittade inget planerat pass för ${team.name}${date ? ` ${date}` : ''}.`
              ),
            }
          }

          if (events.length > 1 && !eventId) {
            return {
              success: false,
              needsClarification: true,
              team,
              error: toolText(
                locale,
                `I found ${events.length} possible sessions for ${team.name}. Choose which one I should use.`,
                `Jag hittade ${events.length} möjliga pass för ${team.name}. Välj vilket jag ska använda.`
              ),
              candidates: events.map((event) => ({
                id: event.id,
                name: `${event.title} · ${compactWorkoutDate(event.startDate, locale)}`,
                sportType: event.linkedWorkoutType ?? event.type,
              })),
            }
          }

          const event = events[0]
          const linkedWorkout = await getCoachToolLinkedWorkoutDetails(
            coachUserId,
            event.linkedWorkoutType,
            event.linkedWorkoutId,
            businessId
          )

          return {
            success: true,
            team,
            event: {
              ...event,
              startDate: event.startDate.toISOString(),
              endDate: event.endDate?.toISOString() ?? null,
            },
            linkedWorkout,
            message: linkedWorkout
              ? toolText(
                  locale,
                  `I found "${event.title}" and read the linked session "${event.linkedWorkoutName ?? 'unnamed'}".`,
                  `Jag hittade "${event.title}" och läste det kopplade passet "${event.linkedWorkoutName ?? 'utan namn'}".`
                )
              : event.linkedWorkoutId
                ? toolText(
                    locale,
                    `I found "${event.title}", but could not read the linked session with the current access.`,
                    `Jag hittade "${event.title}", men kunde inte läsa det kopplade passet med nuvarande behörighet.`
                  )
                : toolText(
                    locale,
                    `I found "${event.title}", but the event does not have a linked studio session yet.`,
                    `Jag hittade "${event.title}", men eventet har inget kopplat studio-pass ännu.`
                  ),
          }
        } catch (error) {
          logger.error('Error in getTeamPlannedWorkout tool', {
            coachUserId,
            businessSlug,
            teamId,
            teamName,
            eventId,
            date,
            workoutType,
          }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not read the planned team session right now.', 'Kunde inte läsa det planerade lagpasset just nu.'),
          }
        }
      },
    }),

    createComplementaryStrengthSession: tool({
      description: toolText(
        locale,
        'Create and save a new strength session that complements an existing strength session. Use after getTeamPlannedWorkout when the coach wants a second session later in the week that supports or balances the first. The tool reads the source session, avoids unnecessary exercise duplication, and saves the result in Strength Studio.',
        'Skapa och spara ett nytt styrkepass som kompletterar ett befintligt styrkepass. Använd efter getTeamPlannedWorkout när coachen vill ha ett andra pass senare i veckan som stödjer eller balanserar det första. Verktyget läser källpasset, undviker onödig övningsdubbling och sparar resultatet i Strength Studio.'
      ),
      inputSchema: z.object({
        sourceSessionId: z.string().optional().describe('ID for an existing StrengthSession if known.'),
        sourceTeamEventId: z.string().optional().describe('ID for a team calendar event with a linked strength session.'),
        teamId: z.string().optional().describe('Team id for context/access if known.'),
        teamName: z.string().optional().describe('Team name if id is missing.'),
        targetDay: z.string().optional().describe('Planned day for the new session, for example Friday or 2026-05-29.'),
        focus: z.string().optional().describe('Desired complementary direction, for example posterior chain, unilateral, prehab, or power.'),
        estimatedDuration: z.number().int().min(15).max(120).optional().describe('Desired duration in minutes. Defaults to the source session or 45 minutes.'),
        equipmentAvailable: z.array(z.string()).optional().describe('Available equipment, for example barbell, dumbbell, bands, or bodyweight.'),
      }),
      execute: async ({ sourceSessionId, sourceTeamEventId, teamId, teamName, targetDay, focus, estimatedDuration, equipmentAvailable }) => {
        try {
          const businessId = await resolveCoachToolBusinessId(coachUserId, businessSlug)
          if (businessId === null) {
            return {
              success: false,
              error: toolText(locale, 'The business could not be verified for this coach.', 'Verksamheten kunde inte verifieras för den här coachen.'),
            }
          }

          let sourceEvent: {
            id: string
            title: string
            teamId: string
            linkedWorkoutId: string | null
            linkedWorkoutType: string | null
            startDate: Date
            team: { id: string; name: string; sportType: string | null }
          } | null = null

          if (sourceTeamEventId) {
            const event = await prisma.teamEvent.findFirst({
              where: { id: sourceTeamEventId },
              select: {
                id: true,
                title: true,
                teamId: true,
                linkedWorkoutId: true,
                linkedWorkoutType: true,
                startDate: true,
                team: { select: { id: true, name: true, sportType: true } },
              },
            })
            if (!event) {
              return {
                success: false,
                error: toolText(locale, 'The source event was not found.', 'Källhändelsen hittades inte.'),
              }
            }
            const accessibleTeam = await getAccessibleTeam(coachUserId, event.teamId, businessSlug)
            if (!accessibleTeam) {
              return {
                success: false,
                error: toolText(locale, 'You do not have access to the team calendar.', 'Du har inte behörighet till lagets kalender.'),
              }
            }
            if (event.linkedWorkoutType !== 'STRENGTH' || !event.linkedWorkoutId) {
              return {
                success: false,
                error: toolText(locale, 'The source event does not have a linked strength session.', 'Källhändelsen har inget kopplat styrkepass.'),
              }
            }
            sourceEvent = event
            sourceSessionId = event.linkedWorkoutId
          }

          let teamContext: CoachToolTeam | null = sourceEvent?.team ?? null
          if (!teamContext && (teamId || teamName)) {
            const resolved = await findAccessibleCoachTeam(coachUserId, { teamId, teamName, businessSlug })
            if (!resolved.team) {
              return {
                success: false,
                needsClarification: resolved.candidates.length > 1,
                error: resolved.candidates.length > 1
                  ? toolText(
                      locale,
                      `I found several possible teams${teamName ? ` for "${teamName}"` : ''}.`,
                      `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                    )
                  : toolText(locale, 'I need to know which team the session is for.', 'Jag behöver veta vilket lag passet gäller.'),
                candidates: resolved.candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  sportType: candidate.sportType,
                })),
              }
            }
            teamContext = resolved.team
          }

          if (!sourceSessionId) {
            return {
              success: false,
              error: toolText(locale, 'I need an existing strength session or calendar event to start from.', 'Jag behöver ett befintligt styrkepass eller en kalenderhändelse att utgå från.'),
            }
          }

          const sourceSession = await prisma.strengthSession.findFirst({
            where: { id: sourceSessionId, AND: [strengthSessionAccessWhere(coachUserId, businessId)] },
            select: {
              id: true,
              name: true,
              description: true,
              phase: true,
              estimatedDuration: true,
              exercises: true,
              warmupData: true,
              prehabData: true,
              coreData: true,
              cooldownData: true,
              totalSets: true,
              totalExercises: true,
            },
          })

          if (!sourceSession) {
            return {
              success: false,
              error: toolText(locale, 'The source session was not found or is outside your access.', 'Källpasset hittades inte eller saknar behörighet.'),
            }
          }

          const exerciseLibrary = await prisma.exercise.findMany({
            where: { OR: [{ isPublic: true }, { coachId: coachUserId }] },
            select: {
              id: true,
              name: true,
              nameSv: true,
              category: true,
              biomechanicalPillar: true,
              progressionLevel: true,
              equipment: true,
              targetBodyParts: true,
            },
            orderBy: { name: 'asc' },
            take: 260,
          })

          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'balanced')
          if (!resolved) {
            return {
              success: false,
              error: toolText(locale, 'No AI keys are configured.', 'Inga AI-nycklar konfigurerade.'),
            }
          }

          let aiModel: LanguageModel
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

          const prompt = `Create a complementary strength session for a hockey/team-sport context.

Return ONLY valid JSON in this exact shape:
{
  "name": "string",
  "description": "string",
  "phase": "ANATOMICAL_ADAPTATION|MAXIMUM_STRENGTH|POWER|MAINTENANCE|TAPER",
  "estimatedDuration": 45,
  "rationale": "short explanation",
  "sections": {
    "warmup": {"duration": 8, "notes": "string", "exercises": [{"exerciseId": "optional", "exerciseName": "string", "sets": 2, "reps": "8", "restSeconds": 30, "notes": "string"}]},
    "main": {"notes": "string", "exercises": [{"exerciseId": "optional", "exerciseName": "string", "sets": 3, "reps": "5", "restSeconds": 120, "notes": "string"}]},
    "prehab": {"duration": 8, "notes": "string", "exercises": []},
    "core": {"duration": 8, "notes": "string", "exercises": []},
    "cooldown": {"duration": 5, "notes": "string", "exercises": []}
  }
}

Rules:
- Build a second session that supports the source session, not a duplicate.
- Prefer different exact exercises where possible while keeping the same training goal.
- For hockey teams, balance posterior chain, unilateral strength, trunk/anti-rotation, adductors/groin, hip stability, deceleration and shoulder robustness.
- Keep volume realistic for team planning.
- Use exerciseId from the library when a suitable match exists.
- Language: ${locale === 'sv' ? 'Write all user-facing names, descriptions, rationale, notes, and section text in Swedish.' : 'Write all user-facing names, descriptions, rationale, notes, and section text in English. Exercise library entries may contain Swedish aliases; use them only for matching unless an exercise has no English equivalent.'}

Team context:
${JSON.stringify(teamContext ?? null, null, 2)}

Source calendar event:
${JSON.stringify(sourceEvent ? { id: sourceEvent.id, title: sourceEvent.title, startDate: sourceEvent.startDate } : null, null, 2)}

Target day/date:
${targetDay || 'not specified'}

Requested focus:
${focus || 'Complement and support the source session'}

Target duration:
${estimatedDuration ?? sourceSession.estimatedDuration ?? 45} minutes

Available equipment:
${JSON.stringify(equipmentAvailable ?? ['barbell', 'dumbbell', 'bodyweight', 'bands', 'cable', 'machine'], null, 2)}

Source session:
${JSON.stringify(sourceSession, null, 2)}

Exercise library:
${JSON.stringify(exerciseLibrary, null, 2)}
`

          const result = await generateText({
            model: aiModel,
            system: 'You are an elite hockey strength and conditioning coach. Return only valid JSON.',
            prompt,
            maxOutputTokens: 5000,
          })

          const generated = extractJsonObject(result.text) as Record<string, unknown>
          const sectionsValue = generated.sections && typeof generated.sections === 'object'
            ? generated.sections as Record<string, unknown>
            : {}
          const sectionFromArray = (type: string) => Array.isArray(generated.sections)
            ? (generated.sections as Array<Record<string, unknown>>).find((section) => String(section.type || '').toLowerCase() === type)
            : undefined
          const sectionValue = (key: string) => sectionsValue[key] ?? sectionFromArray(key)

          const mainSection = normalizeStrengthSection(
            sectionValue('main') ?? { exercises: generated.exercises },
            exerciseLibrary
          )
          if (mainSection.exercises.length === 0) {
            return {
              success: false,
              error: toolText(locale, 'AI could not create a complete main session.', 'AI kunde inte skapa ett komplett huvudpass.'),
            }
          }

          const warmupSection = normalizeStrengthSection(sectionValue('warmup'), exerciseLibrary)
          const prehabSection = normalizeStrengthSection(sectionValue('prehab'), exerciseLibrary)
          const coreSection = normalizeStrengthSection(sectionValue('core'), exerciseLibrary)
          const cooldownSection = normalizeStrengthSection(sectionValue('cooldown'), exerciseLibrary)

          const phaseCandidate = String(generated.phase || sourceSession.phase)
          const phase = VALID_STRENGTH_PHASES.includes(phaseCandidate as typeof VALID_STRENGTH_PHASES[number])
            ? phaseCandidate as StrengthPhase
            : sourceSession.phase
          const duration = typeof generated.estimatedDuration === 'number' && Number.isFinite(generated.estimatedDuration)
            ? Math.round(generated.estimatedDuration)
            : estimatedDuration ?? sourceSession.estimatedDuration ?? 45
          const tags = businessId ? [getStrengthBusinessTag(businessId), 'ai-complementary'] : ['ai-complementary']

          const saved = await prisma.strengthSession.create({
            data: {
              name: typeof generated.name === 'string' && generated.name.trim()
                ? generated.name.trim()
                : toolText(locale, `Complementary session - ${sourceSession.name}`, `Kompletterande pass - ${sourceSession.name}`),
              description: typeof generated.description === 'string'
                ? generated.description
                : toolText(locale, `Complementary strength session based on ${sourceSession.name}.`, `Kompletterande styrkepass baserat på ${sourceSession.name}.`),
              phase,
              estimatedDuration: duration,
              exercises: mainSection.exercises as Prisma.InputJsonValue,
              warmupData: warmupSection.exercises.length || warmupSection.notes
                ? { exercises: warmupSection.exercises, notes: warmupSection.notes, duration: warmupSection.duration } as Prisma.InputJsonValue
                : undefined,
              prehabData: prehabSection.exercises.length || prehabSection.notes
                ? { exercises: prehabSection.exercises, notes: prehabSection.notes, duration: prehabSection.duration } as Prisma.InputJsonValue
                : undefined,
              coreData: coreSection.exercises.length || coreSection.notes
                ? { exercises: coreSection.exercises, notes: coreSection.notes, duration: coreSection.duration } as Prisma.InputJsonValue
                : undefined,
              cooldownData: cooldownSection.exercises.length || cooldownSection.notes
                ? { exercises: cooldownSection.exercises, notes: cooldownSection.notes, duration: cooldownSection.duration } as Prisma.InputJsonValue
                : undefined,
              totalSets: sumStrengthSets([
                ...mainSection.exercises,
                ...warmupSection.exercises,
                ...prehabSection.exercises,
                ...coreSection.exercises,
                ...cooldownSection.exercises,
              ]),
              totalExercises: mainSection.exercises.length + warmupSection.exercises.length + prehabSection.exercises.length + coreSection.exercises.length + cooldownSection.exercises.length,
              coachId: coachUserId,
              tags,
            },
          })

          return {
            success: true,
            sourceSessionId: sourceSession.id,
            sourceTeamEventId: sourceEvent?.id ?? null,
            savedSessionId: saved.id,
            name: saved.name,
            description: saved.description,
            phase,
            estimatedDuration: duration,
            rationale: typeof generated.rationale === 'string' ? generated.rationale : null,
            mainExercises: mainSection.exercises.map((exercise) => `${exercise.exerciseName} (${exercise.sets}x${exercise.reps})`),
            message: toolText(
              locale,
              `I created "${saved.name}" as a complementary strength session in Strength Studio.`,
              `Jag skapade "${saved.name}" som ett kompletterande styrkepass i Strength Studio.`
            ),
          }
        } catch (error) {
          logger.error('Error in createComplementaryStrengthSession tool', {
            coachUserId,
            businessSlug,
            sourceSessionId,
            sourceTeamEventId,
            teamId,
            teamName,
          }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create a complementary strength session right now.', 'Kunde inte skapa ett kompletterande styrkepass just nu.'),
          }
        }
      },
    }),

    planTeamWorkoutInCalendar: tool({
      description: toolText(
        locale,
        'Plan an existing studio session in the team calendar and link it to the event. Supports STRENGTH, CARDIO, HYBRID, and AGILITY, multiple weeks, responsible coach, and contentOwner=self for own responsibility. Use only when the coach clearly asked you to plan/create the calendar event or after confirmation.',
        'Planera ett befintligt studio-pass i lagkalendern och länka det till eventet. Stödjer STRENGTH, CARDIO, HYBRID och AGILITY, flera veckor, ansvarig tränare och contentOwner=self för "eget ansvar". Använd bara när coachen tydligt har bett dig planera/skapa kalenderhändelsen eller efter att du fått bekräftelse.'
      ),
      inputSchema: z.object({
        teamId: z.string().optional().describe('Team id if known.'),
        teamName: z.string().optional().describe('Team name if id is missing.'),
        workoutType: z.enum(TEAM_WORKOUT_TYPES).describe('Type of studio session to link.'),
        workoutId: z.string().describe('ID of the session in the correct studio.'),
        workoutName: z.string().optional().describe('Session name if known.'),
        title: z.string().optional().describe('Title in the team calendar. Defaults to workoutName.'),
        description: z.string().optional().describe('Plan/instructions in the calendar event.'),
        date: z.string().describe('Start date as ISO date, for example 2026-05-29.'),
        startTime: z.string().optional().describe('Start time HH:mm, for example 17:00.'),
        endTime: z.string().optional().describe('End time HH:mm, for example 18:00.'),
        allDay: z.boolean().default(false),
        location: z.string().optional(),
        weeks: z.number().int().min(1).max(52).default(1).describe('Number of weeks/events to create at weekly intervals.'),
        responsibleCoachId: z.string().optional().nullable().describe('Responsible coach userId. Leave empty for own responsibility/no responsible coach.'),
        responsibleCoachName: z.string().optional().nullable().describe('Responsible coach name if id is missing. Use "own responsibility" for no coach.'),
        contentOwner: z.enum(TEAM_EVENT_CONTENT_OWNERS_FOR_AI).default('physical_trainer'),
        contentStatus: z.enum(TEAM_EVENT_CONTENT_STATUSES_FOR_AI).default('CONTENT_READY'),
      }),
      execute: async ({ teamId, teamName, workoutType, workoutId, workoutName, title, description, date, startTime, endTime, allDay, location, weeks, responsibleCoachId, responsibleCoachName, contentOwner, contentStatus }) => {
        try {
          const businessId = await resolveCoachToolBusinessId(coachUserId, businessSlug)
          if (businessId === null) {
            return {
              success: false,
              error: toolText(locale, 'The business could not be verified for this coach.', 'Verksamheten kunde inte verifieras för den här coachen.'),
            }
          }

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
                  ? toolText(
                      locale,
                      `I found several possible teams${teamName ? ` for "${teamName}"` : ''}.`,
                      `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                    )
                  : toolText(locale, 'I need to know which team to plan the session for.', 'Jag behöver veta vilket lag jag ska planera passet för.'),
              candidates: candidates.map((candidate) => ({
                id: candidate.id,
                name: candidate.name,
                sportType: candidate.sportType,
              })),
            }
          }

          const eventType = eventTypeForTeamWorkoutType(workoutType)
          const writableTeam = await getTeamCalendarWritableTeam(coachUserId, team.id, businessSlug, eventType, 'create')
          if (!writableTeam) {
            return {
              success: false,
              error: toolText(locale, 'Your role cannot plan this session type for the team.', 'Din roll kan inte planera den här passtypen för laget.'),
            }
          }

          const linkedWorkoutName = workoutName || await getCoachToolLinkedWorkoutName(coachUserId, workoutType, workoutId, businessId)
          if (!linkedWorkoutName) {
            return {
              success: false,
              error: toolText(locale, 'The linked session was not found or is outside your access.', 'Det kopplade passet hittades inte eller saknar behörighet.'),
            }
          }

          const resolvedResponsibleCoach = await resolveResponsibleCoachIdFromAiInput({
            coachUserId,
            teamId: team.id,
            businessSlug,
            responsibleCoachId: contentOwner === 'self' ? null : responsibleCoachId,
            responsibleCoachName: contentOwner === 'self' ? 'eget ansvar' : responsibleCoachName,
            locale,
          })
          if ('error' in resolvedResponsibleCoach) {
            return {
              success: false,
              needsClarification: Boolean(resolvedResponsibleCoach.candidates?.length),
              error: resolvedResponsibleCoach.error,
              candidates: resolvedResponsibleCoach.candidates,
            }
          }

          const finalResponsibleCoachId = resolvedResponsibleCoach.value
          const canUseResponsibleCoach = await isAssignableTeamCoach({
            coachId: finalResponsibleCoachId,
            requestingUserId: coachUserId,
            teamId: team.id,
            businessSlug,
          })
          if (!canUseResponsibleCoach) {
            return {
              success: false,
              error: toolText(locale, 'The selected coach cannot be assigned to this team.', 'Vald tränare kan inte tilldelas det här laget.'),
            }
          }

          const startDate = buildCoachToolEventDate(date, startTime, allDay)
          const endDate = endTime && !allDay ? buildCoachToolEventDate(date, endTime, false) : null
          if (endDate && endDate <= startDate) {
            return {
              success: false,
              error: toolText(locale, 'End time must be after start time.', 'Sluttid måste vara efter starttid.'),
            }
          }

          const recurrenceCount = weeks ?? 1
          const proposedInstances = Array.from({ length: recurrenceCount }, (_, index) => ({
            startDate: addCoachToolWeeks(startDate, index),
            endDate: endDate ? addCoachToolWeeks(endDate, index) : null,
          }))
          const conflicts = (await Promise.all(proposedInstances.map((instance) => (
            findTeamCalendarLocationConflicts({
              teamId: team.id,
              location,
              startDate: instance.startDate,
              endDate: instance.endDate,
              allDay,
            })
          )))).flat()

          if (conflicts.length > 0) {
            return {
              success: false,
              code: 'LOCATION_CONFLICT',
              error: formatLocationConflictMessage(conflicts, locale),
              conflicts: conflicts.map((conflict) => ({
                ...conflict,
                startDate: conflict.startDate.toISOString(),
                endDate: conflict.endDate?.toISOString() ?? null,
              })),
            }
          }

          const baseData = {
            teamId: team.id,
            createdById: coachUserId,
            title: title || linkedWorkoutName,
            description,
            type: eventType,
            location,
            startDate,
            endDate,
            allDay,
            isRecurring: recurrenceCount > 1,
            recurrenceRule: recurrenceCount > 1 ? `FREQ=WEEKLY;INTERVAL=1;COUNT=${recurrenceCount}` : undefined,
            contentStatus,
            contentOwner,
            linkedWorkoutType: workoutType,
            linkedWorkoutId: workoutId,
            linkedWorkoutName,
            responsibleCoachId: finalResponsibleCoachId,
          }

          const events = await prisma.$transaction(async (tx) => {
            const parent = await tx.teamEvent.create({
              data: baseData,
              include: {
                responsibleCoach: { select: { id: true, name: true, email: true } },
              },
            })

            if (recurrenceCount <= 1) return [parent]

            const children = []
            for (let index = 1; index < recurrenceCount; index += 1) {
              const child = await tx.teamEvent.create({
                data: {
                  ...baseData,
                  startDate: addCoachToolWeeks(startDate, index),
                  endDate: endDate ? addCoachToolWeeks(endDate, index) : null,
                  recurrenceParentId: parent.id,
                },
                include: {
                  responsibleCoach: { select: { id: true, name: true, email: true } },
                },
              })
              children.push(child)
            }

            return [parent, ...children]
          })

          return {
            success: true,
            team,
            count: events.length,
            event: {
              id: events[0].id,
              title: events[0].title,
              startDate: events[0].startDate.toISOString(),
              endDate: events[0].endDate?.toISOString() ?? null,
              linkedWorkoutType: events[0].linkedWorkoutType,
              linkedWorkoutId: events[0].linkedWorkoutId,
              linkedWorkoutName: events[0].linkedWorkoutName,
              responsibleCoach: events[0].responsibleCoach,
            },
            events: events.map((event) => ({
              id: event.id,
              title: event.title,
              startDate: event.startDate.toISOString(),
              endDate: event.endDate?.toISOString() ?? null,
            })),
            message: events.length > 1
              ? toolText(
                  locale,
                  `I planned "${linkedWorkoutName}" for ${team.name} across ${events.length} weeks.`,
                  `Jag planerade "${linkedWorkoutName}" för ${team.name} i ${events.length} veckor.`
                )
              : toolText(
                  locale,
                  `I planned "${linkedWorkoutName}" for ${team.name} in the team calendar.`,
                  `Jag planerade "${linkedWorkoutName}" för ${team.name} i lagkalendern.`
                ),
          }
        } catch (error) {
          logger.error('Error in planTeamWorkoutInCalendar tool', {
            coachUserId,
            businessSlug,
            teamId,
            teamName,
            workoutType,
            workoutId,
            date,
          }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not plan the session in the team calendar right now.', 'Kunde inte planera passet i lagkalendern just nu.'),
          }
        }
      },
    }),

    suggestCoachNavigation: tool({
      description: locale === 'sv'
        ? 'Skapa en säker navigeringsåtgärd till rätt coach-sida. Använd när coachen ber dig öppna, visa, gå till eller ta dem till en sida, atletvy eller lagvy. Verktyget klickar inte själv, utan returnerar en app-länk som chatten kan visa som knapp.'
        : 'Create a safe navigation action to the right coach page. Use when the coach asks to open, show, go to, or take them to a page, athlete view, or team view. The tool does not click by itself; it returns an app link the chat can show as a button.',
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
        ]).describe('Target coach page.'),
        clientId: z.string().optional().describe('Athlete clientId if known.'),
        athleteName: z.string().optional().describe('Athlete name if the destination is athlete-related.'),
        teamId: z.string().optional().describe('Team id if known.'),
        teamName: z.string().optional().describe('Team name if the destination is team-related.'),
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
                    ? toolText(
                        locale,
                        `I found several possible athletes${athleteName ? ` for "${athleteName}"` : ''}.`,
                        `Jag hittade flera möjliga atleter${athleteName ? ` för "${athleteName}"` : ''}.`
                      )
                    : toolText(locale, 'I need an athlete to create that navigation.', 'Jag behöver en atlet för att skapa den navigeringen.'),
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
                label: toolText(locale, `Open ${client.name}`, `Öppna ${client.name}`),
                description: toolText(locale, 'Athlete coach profile', 'Atletens coachprofil'),
              },
              athleteLogs: {
                href: `/coach/athletes/${client.id}/logs`,
                label: toolText(locale, `Open ${client.name}'s training log`, `Öppna ${client.name}s träningslogg`),
                description: toolText(locale, 'Completed and incomplete sessions', 'Genomförda och ej genomförda pass'),
              },
              athleteCalendar: {
                href: `/coach/athletes/${client.id}/calendar`,
                label: toolText(locale, `Open ${client.name}'s calendar`, `Öppna ${client.name}s kalender`),
                description: toolText(locale, 'Athlete planned calendar', 'Atletens planerade kalender'),
              },
              athleteFueling: {
                href: `/coach/clients/${client.id}/fueling`,
                label: toolText(locale, `Open ${client.name}'s fueling`, `Öppna ${client.name}s fueling`),
                description: toolText(locale, 'Energy and hydration planning', 'Energi- och vätskeplanering'),
              },
              athleteEdit: {
                href: `/coach/clients/${client.id}/edit`,
                label: toolText(locale, `Edit ${client.name}`, `Redigera ${client.name}`),
                description: toolText(locale, 'Athlete profile settings', 'Atletens profilinställningar'),
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
              message: toolText(
                locale,
                `I prepared a shortcut to ${navigation.description.toLowerCase()} for ${client.name}.`,
                `Jag har förberett en genväg till ${navigation.description.toLowerCase()} för ${client.name}.`
              ),
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
                    ? toolText(
                        locale,
                        `I found several possible teams${teamName ? ` for "${teamName}"` : ''}.`,
                        `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                      )
                    : toolText(locale, 'I need a team to create that navigation.', 'Jag behöver ett lag för att skapa den navigeringen.'),
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
                label: toolText(locale, `Open ${team.name}`, `Öppna ${team.name}`),
                description: toolText(locale, 'Team dashboard', 'Lagdashboard'),
              },
              teamCalendar: {
                href: `/coach/teams/${team.id}/calendar`,
                label: toolText(locale, `Open ${team.name}'s calendar`, `Öppna ${team.name}s kalender`),
                description: toolText(locale, 'Team calendar', 'Lagets kalender'),
              },
              teamTests: {
                href: `/coach/teams/${team.id}/tests`,
                label: toolText(locale, `Open ${team.name}'s tests`, `Öppna ${team.name}s tester`),
                description: toolText(locale, 'Team test view', 'Lagets testvy'),
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
              message: toolText(
                locale,
                `I prepared a shortcut to ${navigation.description.toLowerCase()} for ${team.name}.`,
                `Jag har förberett en genväg till ${navigation.description.toLowerCase()} för ${team.name}.`
              ),
            }
          }

          const navigation = getStaticCoachNavigation(destination, locale)
          if (!navigation) {
            return {
              success: false,
              error: toolText(locale, 'That destination is not supported yet.', 'Den destinationen stöds inte ännu.'),
            }
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
            message: toolText(locale, `I prepared a shortcut: ${navigation.label}.`, `Jag har förberett en genväg: ${navigation.label}.`),
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
          return {
            success: false,
            error: toolText(locale, 'Could not create the navigation.', 'Kunde inte skapa navigeringen.'),
          }
        }
      },
    }),

    prepareCoachMessageDraft: tool({
      description: locale === 'sv'
        ? 'Förbered ett meddelande till en atlet, ett helt lag eller en filtrerad laggrupp. Verktyget skickar aldrig direkt utan returnerar ett bekräftelsekort som coachen måste klicka på.'
        : 'Prepare a message to one athlete, a whole team, or a filtered team group. The tool never sends directly; it returns a confirmation card the coach must click.',
      inputSchema: prepareCoachMessageDraftInputSchema,
      execute: async (params) => {
        try {
          return await buildCoachMessageAction(coachUserId, params, businessSlug, locale)
        } catch (error) {
          logger.error('Error in prepareCoachMessageDraft tool', { coachUserId, businessSlug }, error)
          return {
            success: false,
            error: locale === 'sv' ? 'Kunde inte förbereda meddelandet.' : 'Could not prepare the message.',
          }
        }
      },
    }),

    createCardioSession: tool({
      description: toolText(
        locale,
        'Create a cardio or interval session. Saves in Cardio Studio. Supports endurance sports, HYROX, functional fitness, team sports, and racket sports. For team/racket sports: make sessions sport-specific with repeated sprints, court/field intervals, change of direction, point/shift repeats, and relevant prevention.',
        'Skapa ett konditionspass/intervallpass. Sparas i Cardio Studio. Stödjer uthållighetssporter, HYROX, funktionell fitness, lagidrotter och racketsporter. För lag/racket: gör passen sportnära med repeated sprints, court/field intervals, change-of-direction, point/shift repeats och relevant prevention.'
      ),
      inputSchema: z.object({
        name: z.string().describe('Session name in the coach chat language.'),
        description: z.string().optional().describe('Short description in the coach chat language.'),
        sport: z.enum(CARDIO_TOOL_SPORTS).default('RUNNING').describe('Sport/activity. Use TEAM_ICE_HOCKEY for hockey-specific 7x40/RSA/shift repeats, TEAM_BASKETBALL for court repeats, TENNIS/PADEL for point intervals, and the corresponding sport for other team sports.'),
        segments: z.array(z.object({
          type: z.enum(['WARMUP', 'COOLDOWN', 'INTERVAL', 'STEADY', 'RECOVERY', 'HILL', 'DRILLS', 'REPEAT_GROUP']).describe('Segment type.'),
          duration: z.number().optional().describe('Time in seconds.'),
          distance: z.number().optional().describe('Distance in meters.'),
          pace: z.string().optional().describe('Pace, for example "4:30" (min/km).'),
          zone: z.number().min(1).max(5).optional().describe('Heart-rate zone 1-5.'),
          notes: z.string().optional().describe('Instructions in the coach chat language.'),
          repeats: z.number().optional().describe('Number of repeats for intervals.'),
          restDuration: z.number().optional().describe('Rest in seconds between repeats.'),
          calories: z.number().optional().describe('Calorie target for ergometers.'),
          // For REPEAT_GROUP
          steps: z.array(z.object({
            type: z.enum(['INTERVAL', 'STEADY', 'RECOVERY']).describe('Step type.'),
            duration: z.number().optional(),
            distance: z.number().optional(),
            pace: z.string().optional(),
            zone: z.number().min(1).max(5).optional(),
            notes: z.string().optional(),
            calories: z.number().optional(),
            targetType: z.string().optional().describe('Target type: watts, rpm, pace, heart rate.'),
            targetValue: z.string().optional().describe('Target value, for example "250" (W).'),
            equipment: z.string().optional().describe('Equipment, for example "Wattbike".'),
          })).optional().describe('Steps in the repeat group.'),
          restBetweenRounds: z.number().optional().describe('Rest between rounds in seconds.'),
        })).describe('Session segments in order.'),
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
            message: toolText(
              locale,
              `Cardio session "${name}" was created and saved in Cardio Studio.${distanceKm ? ` Total distance: ${distanceKm} km.` : ''} Total time: ${durationMin} min.`,
              `Konditionspass "${name}" skapat och sparat i Cardio Studio.${distanceKm ? ` Total distans: ${distanceKm} km.` : ''} Total tid: ${durationMin} min.`
            ),
          }
        } catch (error) {
          logger.error('Error in createCardioSession tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create the cardio session.', 'Kunde inte skapa konditionspass.'),
          }
        }
      },
    }),

    createHybridWorkout: tool({
      description: toolText(
        locale,
        'Create a hybrid or functional session (CrossFit-style, HYROX, hockey off-ice circuit, etc.). Saves in Hybrid Studio. Supports AMRAP, For Time, EMOM, Tabata, Chipper, Ladder, Intervals, HYROX simulation, and Custom. Use this for hockey sessions with stations such as sled, carries, SkiErg, medicine ball, and mixed circuits. Movements are defined by name and matched automatically against the exercise library.',
        'Skapa ett hybridpass/funktionellt pass (CrossFit-stil, HYROX, hockey off-ice circuit etc). Sparas i Hybrid Studio. Stödjer AMRAP, For Time, EMOM, Tabata, Chipper, Ladder, Intervals, HYROX-sim och Custom. Använd detta för hockeypass med stationer som sled, carries, SkiErg, medicine ball och mixed circuits. Övningarna definieras med namn — de matchas automatiskt mot övningsbiblioteket.'
      ),
      inputSchema: z.object({
        name: z.string().describe('Session name in the coach chat language.'),
        description: z.string().optional(),
        format: z.enum(['AMRAP', 'FOR_TIME', 'EMOM', 'TABATA', 'CHIPPER', 'LADDER', 'INTERVALS', 'HYROX_SIM', 'CUSTOM']).describe('Session format.'),
        timeCap: z.number().optional().describe('Time cap in seconds (0 = none).'),
        workTime: z.number().optional().describe('Work time per interval in seconds (EMOM/Tabata).'),
        restTime: z.number().optional().describe('Rest time per interval in seconds.'),
        totalRounds: z.number().optional().describe('Number of rounds.'),
        totalMinutes: z.number().optional().describe('Total time in minutes (for AMRAP/EMOM).'),
        repScheme: z.string().optional().describe('Rep scheme, for example "21-15-9" or "5-5-5-5-5".'),
        movements: z.array(z.object({
          exerciseName: z.string().describe('Exercise name in English or Swedish.'),
          order: z.number().describe('Order.'),
          reps: z.number().optional(),
          calories: z.number().optional(),
          distance: z.number().optional().describe('Distance in meters.'),
          duration: z.number().optional().describe('Time in seconds.'),
          weightMale: z.number().optional().describe('Male/RX weight in kg.'),
          weightFemale: z.number().optional().describe('Female/scaled weight in kg.'),
          notes: z.string().optional(),
        })).describe('Exercises/movements in the session.'),
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
              notes: m.notes
                ? `${m.exerciseName}: ${m.notes}`
                : (!match
                    ? toolText(locale, `"${m.exerciseName}" - not matched in library`, `"${m.exerciseName}" - ej matchad i biblioteket`)
                    : undefined),
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
            message: toolText(
              locale,
              `Hybrid session "${name}" (${format}) was created with ${movements.length} movements and saved in Hybrid Studio.`,
              `Hybridpass "${name}" (${format}) skapat med ${movements.length} övningar och sparat i Hybrid Studio.`
            ),
          }
        } catch (error) {
          logger.error('Error in createHybridWorkout tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create the hybrid session.', 'Kunde inte skapa hybridpass.'),
          }
        }
      },
    }),

    createSportWorkout: tool({
      description: toolText(
        locale,
        'Create a sport-specific workout with mixed sections. Can combine warmup, strength, conditioning, agility/technique, and cooldown in one session. Ideal for team sports (football, ice hockey, handball, basketball, etc.), HYROX, tennis, padel, and more. The session is saved as an AI-generated WOD for a specific athlete.',
        'Skapa ett sportspecifikt träningspass med blandade sektioner. Kan kombinera uppvärmning, styrka, kondition, agility/teknik och nedvarvning i ett pass. Idealiskt för lagsporter (fotboll, ishockey, handboll, basket etc), HYROX, tennis, padel m.m. Passet sparas som en AI-genererad WOD åt en specifik atlet.'
      ),
      inputSchema: z.object({
        clientId: z.string().describe('Athlete client ID.'),
        title: z.string().describe('Session title in the coach chat language.'),
        description: z.string().describe('Description in the coach chat language.'),
        sport: z.string().describe('Sport, for example FOOTBALL, ICE_HOCKEY, BASKETBALL, HANDBALL, HYROX, TENNIS, PADEL, RUNNING, CYCLING.'),
        duration: z.number().min(10).max(180).describe('Total time in minutes.'),
        intensity: z.enum(['recovery', 'easy', 'moderate', 'threshold']).optional(),
        sections: z.array(z.object({
          type: z.enum(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN', 'AGILITY', 'CONDITIONING']).describe('Section type.'),
          name: z.string().describe('Section name in the coach chat language.'),
          duration: z.number().describe('Section length in minutes.'),
          exercises: z.array(z.object({
            name: z.string().describe('Exercise name in English.'),
            nameSv: z.string().describe('Exercise name in Swedish, for compatibility.'),
            sets: z.number().optional(),
            reps: z.string().optional(),
            duration: z.number().optional().describe('Time in seconds.'),
            distance: z.number().optional().describe('Distance in meters.'),
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
            message: toolText(
              locale,
              `Sport workout "${title}" was created for the athlete. ${totalExercises} exercises in ${sections.length} sections (${sections.map(s => s.name).join(', ')}).`,
              `Sportpass "${title}" skapat för atleten. ${totalExercises} övningar i ${sections.length} sektioner (${sections.map(s => s.name).join(', ')}).`
            ),
          }
        } catch (error) {
          logger.error('Error in createSportWorkout tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create the sport workout.', 'Kunde inte skapa sportpass.'),
          }
        }
      },
    }),

    modifyStrengthSession: tool({
      description: toolText(
        locale,
        'Modify an existing strength session with AI. Can replace exercises, adjust volume/intensity, adapt for injuries, make it easier/harder, etc. Requires sessionId.',
        'Modifiera ett befintligt styrkepass med AI. Kan byta ut övningar, justera volym/intensitet, anpassa för skador, göra lättare/svårare etc. Kräver sessionId.'
      ),
      inputSchema: z.object({
        sessionId: z.string().describe('Strength session ID.'),
        modification: z.string().describe('What should change, for example "replace squats with leg press", "make the session easier", or "remove all jumping exercises".'),
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
              prehabData: true,
              coreData: true,
              cooldownData: true,
              coachId: true,
            },
          })

          if (!session) {
            return {
              success: false,
              error: toolText(locale, 'The session was not found.', 'Passet hittades inte.'),
            }
          }

          if (session.coachId !== coachUserId) {
            return {
              success: false,
              error: toolText(locale, 'You do not have access to this session.', 'Du har inte tillgång till detta pass.'),
            }
          }

          // Build the AI prompt
          const sessionJson = JSON.stringify({
            name: session.name,
            description: session.description,
            phase: session.phase,
            exercises: session.exercises,
            warmupData: session.warmupData,
            prehabData: session.prehabData,
            coreData: session.coreData,
            cooldownData: session.cooldownData,
          }, null, 2)

          const prompt = modifyStrengthSessionPrompt(sessionJson, modification, locale)

          // Get AI model
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'balanced')
          if (!resolved) {
            return {
              success: false,
              error: toolText(locale, 'No AI keys are configured.', 'Inga AI-nycklar konfigurerade.'),
            }
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
            system: locale === 'sv'
              ? 'Du är en expert på styrketräning. Returnera ALLTID ett giltigt JSON-objekt i ett ```json``` kodblock.'
              : 'You are an expert in strength training. ALWAYS return a valid JSON object in a ```json``` code block. Write every user-facing string in English.',
            prompt,
            maxOutputTokens: 4096,
          })

          // Parse the JSON from the response
          const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
          if (!jsonMatch?.[1]) {
            return {
              success: false,
              error: toolText(locale, 'AI could not generate a valid modified session.', 'AI kunde inte generera ett giltigt modifierat pass.'),
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
              prehabData: modified.prehabData ?? session.prehabData,
              coreData: modified.coreData ?? session.coreData,
              cooldownData: modified.cooldownData ?? session.cooldownData,
            },
          })

          // Extract explanation from AI response (text after JSON block)
          const explanation = result.text.split('```').pop()?.trim() || toolText(locale, 'The session has been updated.', 'Passet har uppdaterats.')

          return {
            success: true,
            sessionId,
            name: modified.name || session.name,
            modification,
            explanation,
            message: toolText(
              locale,
              `The session "${modified.name || session.name}" was modified: ${modification}`,
              `Passet "${modified.name || session.name}" har modifierats: ${modification}`
            ),
          }
        } catch (error) {
          logger.error('Error in modifyStrengthSession tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not modify the session.', 'Kunde inte modifiera passet.'),
          }
        }
      },
    }),

    generateTrainingProgram: tool({
      description: toolText(
        locale,
        'Start generation of a complete multi-week training program for an athlete. The program is generated in the background (1-10 min) with AI and saved automatically. Supports all sports and methodologies (Polarized, Norwegian, Canova, Pyramidal). Requires the athlete clientId; use listAthletes first if you do not have it.',
        'Starta generering av ett komplett flervekkors träningsprogram åt en atlet. Programmet genereras i bakgrunden (1-10 min) med AI och sparas automatiskt. Stödjer alla sporter och metodiker (Polarized, Norwegian, Canova, Pyramidal). Kräver atletens clientId — använd listAthletes först om du inte har det.'
      ),
      inputSchema: z.object({
        clientId: z.string().describe('Athlete client ID (fetch with listAthletes).'),
        sport: z.string().describe('Primary sport. Supports Running, Cycling, Swimming, HYROX, Triathlon, Football, Ice hockey, Handball, Floorball, Basketball, Volleyball, Tennis, Padel, and more.'),
        totalWeeks: z.number().min(1).max(52).describe('Program length in weeks.'),
        sessionsPerWeek: z.number().min(1).max(14).optional().describe('Number of sessions per week.'),
        goal: z.string().describe('Athlete main goal, for example "Run a marathon under 3:30".'),
        goalDate: z.string().optional().describe('Goal date in ISO format, for example "2026-06-15".'),
        methodology: z.enum(['POLARIZED', 'NORWEGIAN', 'CANOVA', 'PYRAMIDAL', 'GENERAL']).optional().describe('Training methodology.'),
        notes: z.string().optional().describe('Additional wishes or limitations.'),
      }),
      execute: async ({ clientId, sport, totalWeeks, sessionsPerWeek, goal, goalDate, methodology, notes }) => {
        try {
          const normalizedSport = normalizeProgramSport(sport)

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
              error: toolText(
                locale,
                'A program generation is already running for this athlete. Wait until it is finished.',
                'Det pågår redan en programgenerering för denna atlet. Vänta tills den är klar.'
              ),
            }
          }

          // Fetch client data
          const clientRecord = await prisma.client.findUnique({
            where: { id: clientId },
            select: {
              id: true,
              name: true,
              weight: true,
              height: true,
              birthDate: true,
              sportProfile: {
                select: {
                  hockeySettings: true,
                  footballSettings: true,
                  handballSettings: true,
                  floorballSettings: true,
                  basketballSettings: true,
                  volleyballSettings: true,
                  tennisSettings: true,
                  padelSettings: true,
                },
              },
            },
          })

          if (!clientRecord) {
            return {
              success: false,
              error: toolText(locale, 'The athlete was not found.', 'Atleten hittades inte.'),
            }
          }

          // Get coach's API keys
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'powerful')
          if (!resolved) {
            return {
              success: false,
              error: toolText(
                locale,
                'No AI keys are configured. Go to Settings -> AI to add API keys.',
                'Inga AI-nycklar konfigurerade. Gå till Inställningar → AI för att lägga till API-nycklar.'
              ),
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
          const sportProfile = clientRecord.sportProfile as Record<string, unknown> | null
          const sportSettings = getProgramSportSettings(normalizedSport, sportProfile)

          const generationContext: GenerationContext = {
            sport: normalizedSport,
            totalWeeks,
            locale,
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
            hockeySettings: normalizedSport === 'TEAM_ICE_HOCKEY' ? sportSettings : undefined,
            footballSettings: normalizedSport === 'TEAM_FOOTBALL' ? sportSettings : undefined,
            handballSettings: normalizedSport === 'TEAM_HANDBALL' ? sportSettings : undefined,
            floorballSettings: normalizedSport === 'TEAM_FLOORBALL' ? sportSettings : undefined,
            basketballSettings: normalizedSport === 'TEAM_BASKETBALL' ? sportSettings : undefined,
            volleyballSettings: normalizedSport === 'TEAM_VOLLEYBALL' ? sportSettings : undefined,
            tennisSettings: normalizedSport === 'TENNIS' ? sportSettings : undefined,
            padelSettings: normalizedSport === 'PADEL' ? sportSettings : undefined,
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
              query: `${normalizedSport} program: ${goal}`,
              totalWeeks,
              sport: normalizedSport,
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
            sport: normalizedSport,
            totalWeeks,
            totalPhases,
            estimatedMinutes,
            goal,
            message: toolText(
              locale,
              `Program generation started for ${clientRecord.name}. ${totalWeeks} weeks of ${normalizedSport}, ${totalPhases} phases. Estimated time: ${estimatedMinutes} minutes. The program will appear automatically on the athlete profile when it is ready.`,
              `Programgenerering startad för ${clientRecord.name}! ${totalWeeks} veckor ${normalizedSport}, ${totalPhases} faser. Beräknad tid: ${estimatedMinutes} minuter. Programmet dyker upp automatiskt på atletens profil när det är klart.`
            ),
          }
        } catch (error) {
          logger.error('Failed to start program generation via coach chat', { coachUserId }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not start program generation. Please try again.', 'Kunde inte starta programgenereringen. Försök igen.'),
          }
        }
      },
    }),
  }
}
