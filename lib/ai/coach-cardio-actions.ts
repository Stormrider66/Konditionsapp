import type { AssignmentStatus, Prisma, SportType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import {
  CARDIO_TOOL_SPORTS,
  type CoachToolClient,
  type CoachToolContext,
  findAccessibleCoachTeam,
  resolveAccessibleCoachClient,
  toolText,
} from '@/lib/ai/coach-tools/shared'

type AppLocale = 'en' | 'sv'

const CARDIO_EQUIPMENT = [
  'RUN',
  'BIKE',
  'WATTBIKE',
  'BIKE_ERG',
  'ROW',
  'SKI_ERG',
  'ECHO_BIKE',
  'ASSAULT_BIKE',
  'AIR_BIKE',
  'TREADMILL',
  'OTHER',
] as const

const COACH_CARDIO_TEAM_TARGETS = ['ALL', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURED', 'SELECTED'] as const

const yyyyMmDd = /^\d{4}-\d{2}-\d{2}$/

export const createAndAssignCardioWorkoutInputSchema = z.object({
  targetType: z.enum(['ATHLETE', 'TEAM', 'SELECTED']).default('ATHLETE'),
  clientId: z.string().uuid().optional(),
  athleteName: z.string().min(2).max(120).optional(),
  teamId: z.string().uuid().optional(),
  teamName: z.string().min(2).max(120).optional(),
  teamTarget: z.enum(COACH_CARDIO_TEAM_TARGETS).default('ALL'),
  clientIds: z.array(z.string().uuid()).optional(),
  date: z.string().regex(yyyyMmDd),
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  workoutType: z.enum(['INTERVAL', 'STEADY']).default('INTERVAL'),
  sport: z.enum(CARDIO_TOOL_SPORTS).default('CYCLING'),
  equipment: z.enum(CARDIO_EQUIPMENT).optional(),
  rounds: z.number().int().min(1).max(80).optional(),
  workDurationSeconds: z.number().int().min(10).max(7200).optional(),
  restDurationSeconds: z.number().int().min(0).max(3600).optional(),
  durationSeconds: z.number().int().min(60).max(6 * 60 * 60).optional(),
  intensity: z.string().min(1).max(160),
  zone: z.number().min(1).max(5).optional(),
  targetPower: z.string().max(80).optional(),
  targetCadence: z.string().max(80).optional(),
  warmupSeconds: z.number().int().min(0).max(3600).optional(),
  cooldownSeconds: z.number().int().min(0).max(3600).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(40)).max(12).optional(),
}).superRefine((value, ctx) => {
  if (value.targetType === 'ATHLETE' && !value.clientId && !value.athleteName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['athleteName'], message: 'Provide clientId or athleteName.' })
  }
  if (value.targetType === 'TEAM' && !value.teamId && !value.teamName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['teamName'], message: 'Provide teamId or teamName.' })
  }
  if ((value.targetType === 'SELECTED' || value.teamTarget === 'SELECTED') && !value.clientIds?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clientIds'], message: 'Provide selected clientIds.' })
  }
  if (value.workoutType === 'INTERVAL') {
    if (!value.rounds) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rounds'], message: 'Provide interval rounds.' })
    if (!value.workDurationSeconds) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['workDurationSeconds'], message: 'Provide work duration.' })
    if (value.restDurationSeconds == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['restDurationSeconds'], message: 'Provide rest duration.' })
  }
  if (value.workoutType === 'STEADY' && !value.durationSeconds) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durationSeconds'], message: 'Provide steady duration.' })
  }
})

export const modifyCardioAssignmentInputSchema = z.object({
  assignmentId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  athleteName: z.string().min(2).max(120).optional(),
  currentDate: z.string().regex(yyyyMmDd).optional(),
  sessionName: z.string().min(2).max(160).optional(),
  newDate: z.string().regex(yyyyMmDd).optional(),
  name: z.string().min(2).max(160).optional(),
  workoutType: z.enum(['INTERVAL', 'STEADY']).optional(),
  sport: z.enum(CARDIO_TOOL_SPORTS).optional(),
  equipment: z.enum(CARDIO_EQUIPMENT).optional(),
  rounds: z.number().int().min(1).max(80).optional(),
  workDurationSeconds: z.number().int().min(10).max(7200).optional(),
  restDurationSeconds: z.number().int().min(0).max(3600).optional(),
  durationSeconds: z.number().int().min(60).max(6 * 60 * 60).optional(),
  intensity: z.string().min(1).max(160).optional(),
  zone: z.number().min(1).max(5).optional(),
  targetPower: z.string().max(80).optional(),
  targetCadence: z.string().max(80).optional(),
  warmupSeconds: z.number().int().min(0).max(3600).optional(),
  cooldownSeconds: z.number().int().min(0).max(3600).optional(),
  notes: z.string().max(1000).optional(),
  reason: z.string().min(2).max(600).optional(),
}).superRefine((value, ctx) => {
  if (!value.assignmentId && (!value.clientId && !value.athleteName)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['athleteName'], message: 'Provide assignmentId or an athlete.' })
  }
  if (!value.assignmentId && !value.currentDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['currentDate'], message: 'Provide currentDate when assignmentId is missing.' })
  }
  const hasChange = Boolean(
    value.newDate ||
    value.name ||
    value.workoutType ||
    value.sport ||
    value.equipment ||
    value.rounds ||
    value.workDurationSeconds ||
    value.restDurationSeconds != null ||
    value.durationSeconds ||
    value.intensity ||
    value.zone ||
    value.targetPower ||
    value.targetCadence ||
    value.warmupSeconds ||
    value.cooldownSeconds ||
    value.notes ||
    value.reason
  )
  if (!hasChange) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'Provide at least one change.' })
  }
  const type = value.workoutType
  if (type === 'INTERVAL' || value.rounds || value.workDurationSeconds || value.restDurationSeconds != null) {
    if (!value.rounds) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rounds'], message: 'Provide interval rounds.' })
    if (!value.workDurationSeconds) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['workDurationSeconds'], message: 'Provide work duration.' })
    if (value.restDurationSeconds == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['restDurationSeconds'], message: 'Provide rest duration.' })
  }
})

export type CreateAndAssignCardioWorkoutInput = z.infer<typeof createAndAssignCardioWorkoutInputSchema>
export type ModifyCardioAssignmentInput = z.infer<typeof modifyCardioAssignmentInputSchema>

type PublicRecipient = { clientId: string; name: string; teamName: string | null }
type ResolvedRecipient = PublicRecipient & { teamId: string | null }

type ResolvedTarget =
  | { success: true; recipients: ResolvedRecipient[]; targetLabel: string; teamId: string | null; teamName: string | null }
  | { success: false; needsClarification?: boolean; error: string; candidates?: Array<{ id: string; name: string; team?: string | null; sportType?: string | null }> }

type CardioSegment = {
  type: 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'REPEAT_GROUP'
  duration?: number
  equipment?: string
  zone?: number
  notes?: string
  repeats?: number
  steps?: Array<{
    type: 'INTERVAL' | 'STEADY' | 'RECOVERY'
    duration?: number
    equipment?: string
    zone?: number
    notes?: string
    targetType?: string
    targetValue?: string
  }>
  restBetweenRounds?: number
}

type BuiltCardioWorkout = {
  segments: CardioSegment[]
  totalDurationSeconds: number
  totalDistanceMeters: number | null
  avgZone: number | null
  structureLabel: string
  totalTimeLabel: string
}

type ResolvedAssignment = {
  id: string
  assignedDate: Date
  notes: string | null
  status: AssignmentStatus
  calendarEventId: string | null
  athlete: { id: string; name: string; team: { id: string; name: string } | null }
  session: {
    id: string
    name: string
    description: string | null
    sport: SportType
    segments: unknown
    totalDuration: number | null
    totalDistance: number | null
    avgZone: number | null
    teamId: string | null
    tags: string[]
  }
}

function dateFromKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function minutesLabel(seconds: number | null | undefined, locale: AppLocale): string {
  if (!seconds || seconds <= 0) return toolText(locale, 'Not specified', 'Ej angivet')
  if (seconds % 60 === 0) return `${Math.round(seconds / 60)} min`
  return `${Math.round(seconds / 60)} min`
}

function targetTypeFor(input: { targetPower?: string; targetCadence?: string }): string | undefined {
  if (input.targetPower) return 'power'
  if (input.targetCadence) return 'cadence'
  return undefined
}

function targetValueFor(input: { targetPower?: string; targetCadence?: string }): string | undefined {
  return input.targetPower || input.targetCadence || undefined
}

function buildCardioWorkout(input: {
  workoutType?: 'INTERVAL' | 'STEADY'
  rounds?: number
  workDurationSeconds?: number
  restDurationSeconds?: number
  durationSeconds?: number
  intensity?: string
  zone?: number
  equipment?: string
  targetPower?: string
  targetCadence?: string
  warmupSeconds?: number
  cooldownSeconds?: number
  notes?: string
}, locale: AppLocale): BuiltCardioWorkout {
  const segments: CardioSegment[] = []
  const warmup = input.warmupSeconds ?? 0
  const cooldown = input.cooldownSeconds ?? 0
  if (warmup > 0) {
    segments.push({
      type: 'WARMUP',
      duration: warmup,
      equipment: input.equipment,
      zone: input.zone ? Math.min(input.zone, 2) : 1,
      notes: toolText(locale, 'Warm-up', 'Uppvarmning'),
    })
  }

  const workoutType = input.workoutType ?? (input.rounds ? 'INTERVAL' : 'STEADY')
  if (workoutType === 'INTERVAL') {
    const rounds = input.rounds ?? 1
    const work = input.workDurationSeconds ?? input.durationSeconds ?? 60
    const rest = input.restDurationSeconds ?? 0
    segments.push({
      type: 'REPEAT_GROUP',
      repeats: rounds,
      restBetweenRounds: 0,
      notes: input.notes,
      steps: [
        {
          type: 'INTERVAL',
          duration: work,
          equipment: input.equipment,
          zone: input.zone,
          notes: input.intensity || input.notes,
          targetType: targetTypeFor(input),
          targetValue: targetValueFor(input),
        },
        ...(rest > 0
          ? [{
              type: 'RECOVERY' as const,
              duration: rest,
              equipment: input.equipment,
              zone: 1,
              notes: toolText(locale, 'Recovery', 'Vila'),
            }]
          : []),
      ],
    })
  } else {
    segments.push({
      type: 'STEADY',
      duration: input.durationSeconds ?? 30 * 60,
      equipment: input.equipment,
      zone: input.zone,
      notes: input.intensity || input.notes,
    })
  }

  if (cooldown > 0) {
    segments.push({
      type: 'COOLDOWN',
      duration: cooldown,
      equipment: input.equipment,
      zone: 1,
      notes: toolText(locale, 'Cool-down', 'Nedvarvning'),
    })
  }

  let totalDurationSeconds = 0
  let weightedZone = 0
  let zoneSeconds = 0
  for (const segment of segments) {
    if (segment.type === 'REPEAT_GROUP' && segment.steps) {
      const rounds = segment.repeats ?? 1
      const stepDuration = segment.steps.reduce((sum, step) => sum + (step.duration ?? 0), 0)
      totalDurationSeconds += stepDuration * rounds
      for (const step of segment.steps) {
        if (step.zone && step.duration) {
          weightedZone += step.zone * step.duration * rounds
          zoneSeconds += step.duration * rounds
        }
      }
    } else {
      totalDurationSeconds += segment.duration ?? 0
      if (segment.zone && segment.duration) {
        weightedZone += segment.zone * segment.duration
        zoneSeconds += segment.duration
      }
    }
  }

  const structureLabel = (input.workoutType ?? (input.rounds ? 'INTERVAL' : 'STEADY')) === 'INTERVAL'
    ? `${input.rounds ?? 1} x ${minutesLabel(input.workDurationSeconds ?? 0, locale)} / ${minutesLabel(input.restDurationSeconds ?? 0, locale)} ${toolText(locale, 'rest', 'vila')}`
    : `${minutesLabel(input.durationSeconds ?? totalDurationSeconds, locale)} ${toolText(locale, 'steady', 'jämnt')}`

  return {
    segments,
    totalDurationSeconds,
    totalDistanceMeters: null,
    avgZone: zoneSeconds > 0 ? weightedZone / zoneSeconds : input.zone ?? null,
    structureLabel,
    totalTimeLabel: minutesLabel(totalDurationSeconds, locale),
  }
}

async function resolveTarget(ctx: CoachToolContext, input: {
  targetType: 'ATHLETE' | 'TEAM' | 'SELECTED'
  clientId?: string
  athleteName?: string
  teamId?: string
  teamName?: string
  teamTarget?: typeof COACH_CARDIO_TEAM_TARGETS[number]
  clientIds?: string[]
}): Promise<ResolvedTarget> {
  const { coachUserId, businessSlug, locale } = ctx

  if (input.targetType === 'ATHLETE') {
    const resolved = await resolveAccessibleCoachClient(ctx, input.clientId, input.athleteName)
    if (!resolved.ok) return resolved.result as ResolvedTarget
    const client = resolved.client
    return {
      success: true,
      recipients: [{
        clientId: client.id,
        name: client.name,
        teamId: client.team?.id ?? null,
        teamName: client.team?.name ?? null,
      }],
      targetLabel: client.name,
      teamId: client.team?.id ?? null,
      teamName: client.team?.name ?? null,
    }
  }

  if (input.targetType === 'SELECTED') {
    const selectedClientIds = input.clientIds ?? []
    const clients = await prisma.client.findMany({
      where: {
        id: { in: selectedClientIds },
        ...(businessSlug ? { business: { slug: businessSlug } } : {}),
      },
      select: {
        id: true,
        name: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })
    const accessible: ResolvedRecipient[] = []
    for (const client of clients) {
      const access = await canAccessAthlete(coachUserId, client.id)
      if (!access.allowed) continue
      accessible.push({
        clientId: client.id,
        name: client.name,
        teamId: client.team?.id ?? null,
        teamName: client.team?.name ?? null,
      })
    }
    if (accessible.length === 0) {
      return {
        success: false,
        error: toolText(locale, 'No selected athletes were accessible.', 'Inga valda atleter var tillgängliga.'),
      }
    }
    return {
      success: true,
      recipients: accessible,
      targetLabel: toolText(locale, `${accessible.length} selected athletes`, `${accessible.length} valda atleter`),
      teamId: null,
      teamName: null,
    }
  }

  const teamResult = await findAccessibleCoachTeam(coachUserId, {
    teamId: input.teamId,
    teamName: input.teamName,
    businessSlug,
  })
  if (!teamResult.team) {
    return {
      success: false,
      needsClarification: teamResult.candidates.length > 1,
      error: teamResult.candidates.length > 1
        ? toolText(locale, 'Several matching teams were found. Ask which team.', 'Flera matchande lag hittades. Fråga vilket lag.')
        : toolText(locale, 'The team was not found or is outside your access.', 'Laget hittades inte eller ligger utanför din behörighet.'),
      candidates: teamResult.candidates.map((team) => ({ id: team.id, name: team.name, sportType: team.sportType })),
    }
  }

  const team = teamResult.team
  const target = input.teamTarget ?? 'ALL'
  const selectedClientIds = new Set(input.clientIds ?? [])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const pendingStatuses: AssignmentStatus[] = ['PENDING', 'SCHEDULED', 'MODIFIED']

  const members = await prisma.client.findMany({
    where: {
      teamId: team.id,
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: {
      id: true,
      name: true,
      team: { select: { id: true, name: true } },
      dailyCheckIns: {
        where: { date: { lte: today } },
        select: { readinessScore: true, date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
      dailyMetrics: {
        where: { date: { lte: today } },
        select: { readinessScore: true, date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
      injuryAssessments: {
        where: { status: { in: ['ACTIVE', 'MONITORING'] }, resolved: false },
        select: { id: true },
        take: 1,
      },
      cardioSessionAssignments: {
        where: {
          OR: [
            { assignedDate: { lt: today }, status: { in: pendingStatuses } },
            { assignedDate: { gte: sevenDaysAgo, lte: today }, status: 'SKIPPED' },
          ],
        },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  })

  const recipients: ResolvedRecipient[] = []
  for (const member of members) {
    const access = await canAccessAthlete(coachUserId, member.id)
    if (!access.allowed) continue
    const readiness = member.dailyCheckIns[0]?.readinessScore ?? member.dailyMetrics[0]?.readinessScore ?? 100
    const include =
      target === 'ALL' ||
      (target === 'SELECTED' && selectedClientIds.has(member.id)) ||
      (target === 'LOW_READINESS' && readiness < 50) ||
      (target === 'MISSED_WORKOUTS' && member.cardioSessionAssignments.length > 0) ||
      (target === 'INJURED' && member.injuryAssessments.length > 0)
    if (!include) continue
    recipients.push({
      clientId: member.id,
      name: member.name,
      teamId: member.team?.id ?? team.id,
      teamName: member.team?.name ?? team.name,
    })
  }

  if (recipients.length === 0) {
    return {
      success: false,
      error: toolText(locale, 'No accessible athletes matched that team target.', 'Inga tillgängliga atleter matchade det lagurvalet.'),
    }
  }

  return {
    success: true,
    recipients,
    targetLabel: target === 'ALL'
      ? team.name
      : `${team.name} - ${target.toLowerCase().replaceAll('_', ' ')}`,
    teamId: team.id,
    teamName: team.name,
  }
}

function toPublicRecipients(recipients: ResolvedRecipient[]): PublicRecipient[] {
  return recipients.map((recipient) => ({
    clientId: recipient.clientId,
    name: recipient.name,
    teamName: recipient.teamName,
  }))
}

function buildWorkoutDetails(input: CreateAndAssignCardioWorkoutInput | ModifyCardioAssignmentInput, workout: BuiltCardioWorkout, locale: AppLocale): string[] {
  const details = [
    `${toolText(locale, 'Date', 'Datum')}: ${'date' in input && input.date ? input.date : 'newDate' in input && input.newDate ? input.newDate : toolText(locale, 'Unchanged', 'Oförändrat')}`,
    `${toolText(locale, 'Structure', 'Upplägg')}: ${workout.structureLabel}`,
    `${toolText(locale, 'Intensity', 'Intensitet')}: ${input.intensity ?? toolText(locale, 'Unchanged', 'Oförändrat')}`,
    `${toolText(locale, 'Estimated total', 'Beräknad total tid')}: ${workout.totalTimeLabel}`,
  ]
  if (input.equipment) details.push(`${toolText(locale, 'Equipment', 'Utrustning')}: ${input.equipment}`)
  if (input.targetPower) details.push(`${toolText(locale, 'Power target', 'Effektmål')}: ${input.targetPower}`)
  if (input.targetCadence) details.push(`${toolText(locale, 'Cadence target', 'Kadensmål')}: ${input.targetCadence}`)
  if (input.warmupSeconds) details.push(`${toolText(locale, 'Warmup', 'Uppvärmning')}: ${minutesLabel(input.warmupSeconds, locale)}`)
  if (input.cooldownSeconds) details.push(`${toolText(locale, 'Cooldown', 'Nedvarvning')}: ${minutesLabel(input.cooldownSeconds, locale)}`)
  return details
}

export async function buildCreateAndAssignCardioWorkoutPreview(
  coachUserId: string,
  input: CreateAndAssignCardioWorkoutInput,
  businessSlug: string | undefined,
  locale: AppLocale
) {
  const ctx: CoachToolContext = { coachUserId, businessSlug, locale }
  const target = await resolveTarget(ctx, input)
  if (!target.success) return target
  const workout = buildCardioWorkout(input, locale)
  return {
    success: true as const,
    target,
    preview: {
      title: toolText(locale, `Assign ${input.name}`, `Tilldela ${input.name}`),
      description: toolText(
        locale,
        `Creates a cardio session and assigns it to ${target.targetLabel}. Nothing is saved until confirmed.`,
        `Skapar ett konditionspass och tilldelar det till ${target.targetLabel}. Inget sparas förrän det bekräftas.`
      ),
      targetLabel: target.targetLabel,
      details: [
        `${toolText(locale, 'Workout', 'Pass')}: ${input.name}`,
        `${toolText(locale, 'Recipients', 'Mottagare')}: ${target.recipients.length}`,
        ...buildWorkoutDetails(input, workout, locale),
      ],
      recipients: toPublicRecipients(target.recipients),
      recipientCount: target.recipients.length,
      confirmLabel: toolText(locale, 'Create and assign', 'Skapa och tilldela'),
      reviewHref: '/coach/cardio',
    },
  }
}

export async function executeCreateAndAssignCardioWorkout(
  coachUserId: string,
  input: CreateAndAssignCardioWorkoutInput,
  businessSlug: string | undefined,
  locale: AppLocale
) {
  const ctx: CoachToolContext = { coachUserId, businessSlug, locale }
  const target = await resolveTarget(ctx, input)
  if (!target.success) return target
  const workout = buildCardioWorkout(input, locale)
  const assignedDate = dateFromKey(input.date)

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.cardioSession.create({
      data: {
        name: input.name,
        description: input.description || input.notes || null,
        sport: input.sport,
        segments: workout.segments as Prisma.InputJsonValue,
        totalDuration: workout.totalDurationSeconds || null,
        totalDistance: workout.totalDistanceMeters,
        avgZone: workout.avgZone,
        coachId: coachUserId,
        teamId: target.teamId,
        tags: input.tags || [],
      },
      select: { id: true, name: true },
    })

    const assignments: Array<{ id: string; athleteId: string; athleteName: string }> = []
    for (const recipient of target.recipients) {
      const calendarEvent = await tx.calendarEvent.create({
        data: {
          clientId: recipient.clientId,
          type: 'SCHEDULED_WORKOUT',
          title: `${toolText(locale, 'Cardio', 'Kondition')}: ${session.name}`,
          description: input.notes || input.description || null,
          status: 'SCHEDULED',
          startDate: assignedDate,
          endDate: assignedDate,
          allDay: true,
          trainingImpact: 'NORMAL',
          createdById: coachUserId,
        },
        select: { id: true },
      })

      const assignment = await tx.cardioSessionAssignment.create({
        data: {
          sessionId: session.id,
          athleteId: recipient.clientId,
          assignedDate,
          assignedBy: coachUserId,
          notes: input.notes || input.intensity || null,
          status: 'PENDING',
          calendarEventId: calendarEvent.id,
        },
        select: { id: true },
      })
      assignments.push({ id: assignment.id, athleteId: recipient.clientId, athleteName: recipient.name })
    }

    return { session, assignments }
  })

  return {
    success: true,
    savedSessionId: result.session.id,
    assignmentIds: result.assignments.map((assignment) => assignment.id),
    recipientCount: result.assignments.length,
    targetLabel: target.targetLabel,
    workoutName: result.session.name,
    assignedDate: input.date,
    startPath: '/coach/cardio',
    message: toolText(
      locale,
      `"${result.session.name}" was created and assigned to ${target.targetLabel} on ${input.date}.`,
      `"${result.session.name}" skapades och tilldelades till ${target.targetLabel} den ${input.date}.`
    ),
  }
}

async function resolveAssignment(ctx: CoachToolContext, input: ModifyCardioAssignmentInput): Promise<
  | { success: true; assignment: ResolvedAssignment }
  | { success: false; needsClarification?: boolean; error: string; candidates?: Array<{ id: string; name: string; date: string }> }
> {
  const { coachUserId, businessSlug, locale } = ctx
  const select = {
    id: true,
    assignedDate: true,
    notes: true,
    status: true,
    calendarEventId: true,
    athlete: { select: { id: true, name: true, team: { select: { id: true, name: true } } } },
    session: {
      select: {
        id: true,
        name: true,
        description: true,
        sport: true,
        segments: true,
        totalDuration: true,
        totalDistance: true,
        avgZone: true,
        teamId: true,
        tags: true,
      },
    },
  } satisfies Prisma.CardioSessionAssignmentSelect

  if (input.assignmentId) {
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: input.assignmentId },
      select,
    })
    if (!assignment) {
      return { success: false, error: toolText(locale, 'The cardio assignment was not found.', 'Konditionstilldelningen hittades inte.') }
    }
    const access = await canAccessAthlete(coachUserId, assignment.athlete.id)
    if (!access.allowed) {
      return { success: false, error: toolText(locale, 'The athlete is outside your access.', 'Atleten ligger utanför din behörighet.') }
    }
    return { success: true, assignment: assignment as ResolvedAssignment }
  }

  const resolved = await resolveAccessibleCoachClient(ctx, input.clientId, input.athleteName)
  if (!resolved.ok) return resolved.result as { success: false; error: string }
  const client = resolved.client as CoachToolClient
  const date = dateFromKey(input.currentDate!)
  const assignments = await prisma.cardioSessionAssignment.findMany({
    where: {
      athleteId: client.id,
      assignedDate: date,
      status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
      ...(input.sessionName ? { session: { name: { contains: input.sessionName, mode: 'insensitive' } } } : {}),
      ...(businessSlug ? { athlete: { business: { slug: businessSlug } } } : {}),
    },
    select,
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  if (assignments.length === 0) {
    return {
      success: false,
      error: toolText(locale, 'No planned cardio assignment matched that athlete and date.', 'Ingen planerad konditionstilldelning matchade den atleten och dagen.'),
    }
  }
  if (assignments.length > 1) {
    return {
      success: false,
      needsClarification: true,
      error: toolText(locale, 'Several planned cardio sessions matched. Ask which one.', 'Flera planerade konditionspass matchade. Fråga vilket pass.'),
      candidates: assignments.map((assignment) => ({
        id: assignment.id,
        name: assignment.session.name,
        date: dateKey(assignment.assignedDate),
      })),
    }
  }

  return { success: true, assignment: assignments[0] as ResolvedAssignment }
}

function hasWorkoutContentChange(input: ModifyCardioAssignmentInput): boolean {
  return Boolean(
    input.name ||
    input.workoutType ||
    input.sport ||
    input.equipment ||
    input.rounds ||
    input.workDurationSeconds ||
    input.restDurationSeconds != null ||
    input.durationSeconds ||
    input.intensity ||
    input.zone ||
    input.targetPower ||
    input.targetCadence ||
    input.warmupSeconds ||
    input.cooldownSeconds
  )
}

export async function buildModifyCardioAssignmentPreview(
  coachUserId: string,
  input: ModifyCardioAssignmentInput,
  businessSlug: string | undefined,
  locale: AppLocale
) {
  const ctx: CoachToolContext = { coachUserId, businessSlug, locale }
  const resolved = await resolveAssignment(ctx, input)
  if (!resolved.success) return resolved
  const assignment = resolved.assignment
  const workout = hasWorkoutContentChange(input)
    ? buildCardioWorkout({
        workoutType: input.workoutType,
        rounds: input.rounds,
        workDurationSeconds: input.workDurationSeconds,
        restDurationSeconds: input.restDurationSeconds,
        durationSeconds: input.durationSeconds ?? assignment.session.totalDuration ?? undefined,
        intensity: input.intensity,
        zone: input.zone ?? assignment.session.avgZone ?? undefined,
        equipment: input.equipment,
        targetPower: input.targetPower,
        targetCadence: input.targetCadence,
        warmupSeconds: input.warmupSeconds,
        cooldownSeconds: input.cooldownSeconds,
        notes: input.notes,
      }, locale)
    : null

  const details = [
    `${toolText(locale, 'Athlete', 'Atlet')}: ${assignment.athlete.name}`,
    `${toolText(locale, 'Current workout', 'Nuvarande pass')}: ${assignment.session.name}`,
    `${toolText(locale, 'Current date', 'Nuvarande datum')}: ${dateKey(assignment.assignedDate)}`,
  ]
  if (input.newDate) details.push(`${toolText(locale, 'New date', 'Nytt datum')}: ${input.newDate}`)
  if (input.reason) details.push(`${toolText(locale, 'Reason', 'Orsak')}: ${input.reason}`)
  if (workout) details.push(...buildWorkoutDetails(input, workout, locale))
  if (input.notes) details.push(`${toolText(locale, 'Notes', 'Noteringar')}: ${input.notes}`)

  return {
    success: true as const,
    assignment,
    preview: {
      title: toolText(locale, `Modify ${assignment.session.name}`, `Anpassa ${assignment.session.name}`),
      description: toolText(
        locale,
        `Prepares changes for ${assignment.athlete.name}. Nothing is changed until confirmed.`,
        `Förbereder ändringar för ${assignment.athlete.name}. Inget ändras förrän det bekräftas.`
      ),
      targetLabel: assignment.athlete.name,
      details,
      recipients: [{ clientId: assignment.athlete.id, name: assignment.athlete.name, teamName: assignment.athlete.team?.name ?? null }],
      recipientCount: 1,
      confirmLabel: toolText(locale, 'Modify assignment', 'Anpassa tilldelning'),
      reviewHref: '/coach/cardio',
    },
  }
}

export async function executeModifyCardioAssignment(
  coachUserId: string,
  input: ModifyCardioAssignmentInput,
  businessSlug: string | undefined,
  locale: AppLocale
) {
  const ctx: CoachToolContext = { coachUserId, businessSlug, locale }
  const resolved = await resolveAssignment(ctx, input)
  if (!resolved.success) return resolved
  const assignment = resolved.assignment
  const newDate = input.newDate ? dateFromKey(input.newDate) : assignment.assignedDate
  const contentChanged = hasWorkoutContentChange(input)

  const result = await prisma.$transaction(async (tx) => {
    let sessionId = assignment.session.id
    let sessionName = assignment.session.name
    if (contentChanged) {
      const workout = buildCardioWorkout({
        workoutType: input.workoutType,
        rounds: input.rounds,
        workDurationSeconds: input.workDurationSeconds,
        restDurationSeconds: input.restDurationSeconds,
        durationSeconds: input.durationSeconds ?? assignment.session.totalDuration ?? undefined,
        intensity: input.intensity,
        zone: input.zone ?? assignment.session.avgZone ?? undefined,
        equipment: input.equipment,
        targetPower: input.targetPower,
        targetCadence: input.targetCadence,
        warmupSeconds: input.warmupSeconds,
        cooldownSeconds: input.cooldownSeconds,
        notes: input.notes || input.reason,
      }, locale)
      const session = await tx.cardioSession.create({
        data: {
          name: input.name || `${assignment.session.name} (${toolText(locale, 'modified', 'anpassad')})`,
          description: input.reason || assignment.session.description,
          sport: input.sport || assignment.session.sport,
          segments: workout.segments as Prisma.InputJsonValue,
          totalDuration: workout.totalDurationSeconds || assignment.session.totalDuration,
          totalDistance: workout.totalDistanceMeters ?? assignment.session.totalDistance,
          avgZone: workout.avgZone ?? assignment.session.avgZone,
          coachId: coachUserId,
          teamId: assignment.session.teamId,
          tags: assignment.session.tags,
        },
        select: { id: true, name: true },
      })
      sessionId = session.id
      sessionName = session.name
    }

    const notes = [
      input.notes || assignment.notes || null,
      input.reason ? `${toolText(locale, 'Reason', 'Orsak')}: ${input.reason}` : null,
    ].filter(Boolean).join('\n')

    const updated = await tx.cardioSessionAssignment.update({
      where: { id: assignment.id },
      data: {
        sessionId,
        assignedDate: newDate,
        status: 'MODIFIED',
        notes: notes || null,
      },
      select: { id: true },
    })

    if (assignment.calendarEventId) {
      await tx.calendarEvent.update({
        where: { id: assignment.calendarEventId },
        data: {
          title: `${toolText(locale, 'Cardio', 'Kondition')}: ${sessionName}`,
          description: notes || null,
          startDate: newDate,
          endDate: newDate,
          trainingImpact: 'MODIFIED',
          lastModifiedById: coachUserId,
        },
      })
    }

    return { assignmentId: updated.id, sessionId, sessionName }
  })

  return {
    success: true,
    assignmentId: result.assignmentId,
    sessionId: result.sessionId,
    sessionName: result.sessionName,
    athlete: { id: assignment.athlete.id, name: assignment.athlete.name },
    assignedDate: dateKey(newDate),
    startPath: '/coach/cardio',
    message: toolText(
      locale,
      `${assignment.athlete.name}'s cardio assignment was modified for ${dateKey(newDate)}.`,
      `${assignment.athlete.name}s konditionstilldelning anpassades till ${dateKey(newDate)}.`
    ),
  }
}
