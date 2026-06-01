/**
 * Shared helpers and context for coach chat tools.
 *
 * Internal building blocks used by the focused coach-tool modules. Not part of
 * the public surface — only `createCoachChatTools` (in `coach-chat-tools.ts`)
 * is exported for consumers.
 */

import { prisma } from '@/lib/prisma'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { getAccessibleTeam, getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { getAssignableTeamCoaches } from '@/lib/team-calendar/responsible-coach'
import {
  strengthSessionAccessWhere,
} from '@/lib/strength/session-business-scope'
import {
  agilityWorkoutAccessWhere,
  cardioSessionAccessWhere,
  hybridWorkoutAccessWhere,
} from '@/lib/workouts/business-scope'

/**
 * Context shared by every coach chat tool. Captures what the tools close over
 * (coach identity, optional business scope, and locale).
 */
export interface CoachToolContext {
  coachUserId: string
  businessSlug?: string
  locale: 'en' | 'sv'
}

export const CARDIO_TOOL_SPORTS = [
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

export const TEAM_WORKOUT_TYPES = ['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY'] as const
export const TEAM_EVENT_CONTENT_OWNERS_FOR_AI = ['coach', 'physical_trainer', 'physio', 'shared', 'self'] as const
export const TEAM_EVENT_CONTENT_STATUSES_FOR_AI = ['PLANNED', 'NEEDS_CONTENT', 'CONTENT_READY', 'ASSIGNED'] as const

export function toolText(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export const VALID_STRENGTH_PHASES = [
  'ANATOMICAL_ADAPTATION',
  'MAXIMUM_STRENGTH',
  'POWER',
  'MAINTENANCE',
  'TAPER',
] as const

export type TeamWorkoutType = (typeof TEAM_WORKOUT_TYPES)[number]

export type CoachToolClient = {
  id: string
  name: string
  email: string | null
  team: { id: string; name: string } | null
  athleteAccount: { userId: string } | null
}

export type CompletedWorkoutItem = {
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

export type CoachNavigationDestination =
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

export type CoachToolTeam = {
  id: string
  name: string
  sportType: string | null
}

export async function findAccessibleCoachClients(
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

export async function getAccessibleCoachClientById(
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

export function parseAdHocWorkoutSummary(parsedStructure: unknown) {
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

export async function findAccessibleCoachTeam(
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

export function getStaticCoachNavigation(destination: CoachNavigationDestination, locale: 'en' | 'sv') {
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

export function getCoachToolWeekRange(reference = new Date()): { start: Date; end: Date } {
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

export function parseCoachToolDateBoundary(value: string | undefined, fallback: Date, endOfDay = false): Date {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parsed.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  }

  return parsed
}

export function addCoachToolWeeks(date: Date, weeks: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + weeks * 7)
  return next
}

export function getCoachToolDayRange(dateValue: string | undefined): { start: Date; end: Date } {
  const parsed = parseCoachToolDateBoundary(dateValue, new Date())
  const start = new Date(parsed)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function parseCoachToolClockTime(value: string | undefined): { hours: number; minutes: number } | null {
  if (!value) return null
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return null
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  }
}

export function buildCoachToolEventDate(dateValue: string, timeValue: string | undefined, allDay: boolean): Date {
  const date = parseCoachToolDateBoundary(dateValue, new Date())
  const next = new Date(date)
  const clock = allDay ? null : parseCoachToolClockTime(timeValue)
  next.setHours(clock?.hours ?? 0, clock?.minutes ?? 0, 0, 0)
  return next
}

export function sumStrengthSets(exercises: unknown[]): number {
  return exercises.reduce<number>((total, exercise) => {
    if (!exercise || typeof exercise !== 'object') return total
    const sets = (exercise as { sets?: unknown }).sets
    return total + (typeof sets === 'number' && Number.isFinite(sets) ? sets : 1)
  }, 0)
}

export async function resolveCoachToolBusinessId(
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

export function compactWorkoutDate(date: Date, locale: 'en' | 'sv') {
  return date.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function eventTypeForTeamWorkoutType(workoutType: TeamWorkoutType) {
  return workoutType
}

export function normalizeStrengthExercise(
  raw: unknown,
  exerciseLibrary: Array<{ id: string; name: string; nameSv: string | null; nameEn?: string | null }>
) {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const rawName = String(value.exerciseName || value.name || value.nameSv || '').trim()
  const rawId = typeof value.exerciseId === 'string' ? value.exerciseId : undefined
  const match = rawId
    ? exerciseLibrary.find((exercise) => exercise.id === rawId)
    : exerciseLibrary.find((exercise) => {
        const candidate = rawName.toLowerCase()
        return (
          exercise.name.toLowerCase() === candidate ||
          exercise.nameSv?.toLowerCase() === candidate ||
          exercise.nameEn?.toLowerCase() === candidate
        )
      })

  const sets = typeof value.sets === 'number' && Number.isFinite(value.sets) ? value.sets : 3
  const restSeconds = typeof value.restSeconds === 'number' && Number.isFinite(value.restSeconds)
    ? value.restSeconds
    : typeof value.rest === 'number' && Number.isFinite(value.rest)
      ? value.rest
      : undefined

  return {
    exerciseId: match?.id ?? rawId,
    exerciseName: match?.nameEn ?? match?.name ?? rawName,
    sets,
    reps: typeof value.reps === 'string' || typeof value.reps === 'number' ? String(value.reps) : '6-8',
    weight: typeof value.weight === 'string' || typeof value.weight === 'number' ? value.weight : undefined,
    restSeconds,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
  }
}

export function normalizeStrengthSection(
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

export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const candidate = fenced?.[1] ?? text
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found')
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1))
}

export async function getCoachToolLinkedWorkoutDetails(
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
            exercise: { select: { id: true, name: true, nameSv: true, nameEn: true } },
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

export async function getCoachToolLinkedWorkoutName(
  coachUserId: string,
  workoutType: TeamWorkoutType,
  workoutId: string,
  businessId?: string
) {
  const details = await getCoachToolLinkedWorkoutDetails(coachUserId, workoutType, workoutId, businessId)
  return details && 'name' in details && typeof details.name === 'string' ? details.name : null
}

export async function resolveResponsibleCoachIdFromAiInput({
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
      ? toolText(locale, `I found several possible coaches for "${name}".`, `Jag hittade flera möjliga tränare för "${name}".`)
      : toolText(locale, `I could not find a responsible coach matching "${name}".`, `Jag hittade ingen ansvarig tränare som matchar "${name}".`),
    candidates: candidates.map((coach) => ({
      id: coach.id,
      name: coach.name,
      roleLabel: coach.roleLabel,
    })),
  }
}
