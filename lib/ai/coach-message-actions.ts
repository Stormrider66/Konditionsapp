import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { getAccessibleTeam, getAccessibleTeamWhere } from '@/lib/coach/team-access'
import type { AssignmentStatus, Prisma } from '@prisma/client'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export const coachMessageTargetSchema = z.enum([
  'ALL',
  'LOW_READINESS',
  'MISSED_WORKOUTS',
  'INJURED',
  'SELECTED',
])

export const prepareCoachMessageDraftInputSchema = z.object({
  recipientType: z.enum(['ATHLETE', 'TEAM']).describe('ATHLETE for one athlete, TEAM for a whole team or filtered team group.'),
  content: z.string().min(1).max(1000).describe('Message content to send. Write in the coach chat language unless the coach asks for another language.'),
  subject: z.string().max(120).optional().describe('Optional subject line.'),
  clientId: z.string().uuid().optional().describe('Athlete clientId if already known.'),
  athleteName: z.string().min(2).optional().describe('Athlete name if clientId is not known.'),
  teamId: z.string().uuid().optional().describe('Team id if already known.'),
  teamName: z.string().min(2).optional().describe('Team name if teamId is not known.'),
  teamTarget: coachMessageTargetSchema.default('ALL').describe('Which team members should receive the message.'),
  clientIds: z.array(z.string().uuid()).optional().describe('Selected clientIds when teamTarget is SELECTED.'),
}).superRefine((value, ctx) => {
  if (value.recipientType === 'ATHLETE' && !value.clientId && !value.athleteName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['athleteName'],
      message: 'Provide clientId or athleteName for an athlete.',
    })
  }

  if (value.recipientType === 'TEAM' && !value.teamId && !value.teamName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['teamName'],
      message: 'Provide teamId or teamName for a team.',
    })
  }

  if (value.recipientType === 'TEAM' && value.teamTarget === 'SELECTED' && !value.clientIds?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clientIds'],
      message: 'Provide at least one clientId when teamTarget is SELECTED.',
    })
  }
})

export const sendCoachMessageActionSchema = z.object({
  actionType: z.literal('sendCoachMessage'),
  businessSlug: z.string().optional(),
  draft: prepareCoachMessageDraftInputSchema,
})

export type CoachMessageTarget = z.infer<typeof coachMessageTargetSchema>
export type PrepareCoachMessageDraftInput = z.infer<typeof prepareCoachMessageDraftInputSchema>
export type SendCoachMessageActionInput = z.infer<typeof sendCoachMessageActionSchema>

type CoachMessageClient = {
  id: string
  name: string
  email: string | null
  team: { id: string; name: string } | null
  athleteAccount: { userId: string } | null
}

type CoachMessageTeam = {
  id: string
  name: string
  sportType: string | null
}

type ResolvedCoachMessageRecipient = {
  clientId: string
  name: string
  teamName: string | null
  receiverUserId: string
}

type PublicCoachMessageRecipient = {
  clientId: string
  name: string
  teamName: string | null
}

type CoachMessageCandidate = {
  id: string
  name: string
  team?: string | null
  sportType?: string | null
}

type CoachMessageActionDraft = PrepareCoachMessageDraftInput

export type CoachMessageAction = {
  type: 'sendCoachMessage'
  title: string
  description: string
  recipientType: PrepareCoachMessageDraftInput['recipientType']
  targetLabel: string
  recipientCount: number
  recipients: PublicCoachMessageRecipient[]
  content: string
  subject: string | null
  requiresConfirmation: true
  confirmLabel: string
  confirmEndpoint: string
  reviewHref: string
  draft: CoachMessageActionDraft
}

export type BuildCoachMessageActionResult =
  | {
      success: true
      action: CoachMessageAction
      resolvedRecipients: ResolvedCoachMessageRecipient[]
      message: string
    }
  | {
      success: false
      needsClarification?: boolean
      error: string
      candidates?: CoachMessageCandidate[]
    }

export type SendCoachMessageActionResult =
  | {
      success: true
      sent: number
      recipientCount: number
      targetLabel: string
      message: string
    }
  | {
      success: false
      needsClarification?: boolean
      error: string
      candidates?: CoachMessageCandidate[]
    }

async function findAccessibleCoachClients(
  coachUserId: string,
  search: string,
  businessSlug?: string,
  limit = 6
): Promise<CoachMessageClient[]> {
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

  const accessible: CoachMessageClient[] = []
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
): Promise<CoachMessageClient | null> {
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

async function findAccessibleCoachTeam(
  coachUserId: string,
  params: { teamId?: string; teamName?: string; businessSlug?: string }
): Promise<{ team: CoachMessageTeam | null; candidates: CoachMessageTeam[] }> {
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

function getTeamTargetLabel(target: CoachMessageTarget, locale: AppLocale = 'en') {
  switch (target) {
    case 'LOW_READINESS':
      return t(locale, 'athletes with readiness below 50', 'atleter med beredskap under 50')
    case 'MISSED_WORKOUTS':
      return t(locale, 'athletes with missed or overdue workouts', 'atleter med missade eller försenade pass')
    case 'INJURED':
      return t(locale, 'athletes with active injury or monitoring', 'atleter med aktiv skada eller monitorering')
    case 'SELECTED':
      return t(locale, 'selected athletes', 'valda atleter')
    case 'ALL':
    default:
      return t(locale, 'all athletes', 'alla atleter')
  }
}

function toPublicRecipients(recipients: ResolvedCoachMessageRecipient[]): PublicCoachMessageRecipient[] {
  return recipients.map((recipient) => ({
    clientId: recipient.clientId,
    name: recipient.name,
    teamName: recipient.teamName,
  }))
}

async function resolveAthleteRecipients(
  coachUserId: string,
  input: PrepareCoachMessageDraftInput,
  businessSlug?: string,
  locale: AppLocale = 'en'
): Promise<
  | { success: true; client: CoachMessageClient; recipients: ResolvedCoachMessageRecipient[] }
  | { success: false; needsClarification?: boolean; error: string; candidates?: CoachMessageCandidate[] }
> {
  let client: CoachMessageClient | null = null
  let candidates: CoachMessageClient[] = []

  if (input.clientId) {
    client = await getAccessibleCoachClientById(coachUserId, input.clientId, businessSlug)
  } else if (input.athleteName) {
    candidates = await findAccessibleCoachClients(coachUserId, input.athleteName, businessSlug, 6)
    const exactMatches = candidates.filter(
      (candidate) => candidate.name.toLowerCase() === input.athleteName?.toLowerCase()
    )
    client = exactMatches.length === 1 ? exactMatches[0] : candidates.length === 1 ? candidates[0] : null
  }

  if (!client) {
    return {
      success: false,
      needsClarification: candidates.length > 1,
      error:
        candidates.length > 1
          ? t(
              locale,
              `I found several possible athletes${input.athleteName ? ` for "${input.athleteName}"` : ''}.`,
              `Jag hittade flera möjliga atleter${input.athleteName ? ` för "${input.athleteName}"` : ''}.`
            )
          : t(locale, 'The athlete was not found or is outside your access.', 'Atleten hittades inte eller ligger utanför din behörighet.'),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        team: candidate.team?.name ?? null,
      })),
    }
  }

  if (!client.athleteAccount?.userId) {
    return {
      success: false,
      error: t(
        locale,
        `${client.name} does not have a linked athlete account yet, so the message cannot be sent in the app.`,
        `${client.name} har inget länkat atletkonto ännu, så meddelandet kan inte skickas i appen.`
      ),
    }
  }

  return {
    success: true,
    client,
    recipients: [{
      clientId: client.id,
      name: client.name,
      teamName: client.team?.name ?? null,
      receiverUserId: client.athleteAccount.userId,
    }],
  }
}

async function resolveTeamRecipients(
  coachUserId: string,
  input: PrepareCoachMessageDraftInput,
  businessSlug?: string,
  locale: AppLocale = 'en'
): Promise<
  | { success: true; team: CoachMessageTeam; recipients: ResolvedCoachMessageRecipient[] }
  | { success: false; needsClarification?: boolean; error: string; candidates?: Array<{ id: string; name: string; sportType: string | null }> }
> {
  const { team, candidates } = await findAccessibleCoachTeam(coachUserId, {
    teamId: input.teamId,
    teamName: input.teamName,
    businessSlug,
  })

  if (!team) {
    return {
      success: false,
      needsClarification: candidates.length > 1,
      error:
        candidates.length > 1
          ? t(
              locale,
              `I found several possible teams${input.teamName ? ` for "${input.teamName}"` : ''}.`,
              `Jag hittade flera möjliga lag${input.teamName ? ` för "${input.teamName}"` : ''}.`
            )
          : t(locale, 'The team was not found or is outside your access.', 'Laget hittades inte eller ligger utanför din behörighet.'),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        sportType: candidate.sportType,
      })),
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const pendingMissedStatuses: AssignmentStatus[] = ['PENDING', 'SCHEDULED', 'MODIFIED']
  const missedStrengthAssignmentWhere: Prisma.StrengthSessionAssignmentWhereInput = {
    OR: [
      {
        assignedDate: { lt: today },
        status: { in: pendingMissedStatuses },
      },
      {
        assignedDate: { gte: sevenDaysAgo, lte: today },
        status: 'SKIPPED',
      },
    ],
  }
  const missedCardioAssignmentWhere: Prisma.CardioSessionAssignmentWhereInput = {
    OR: [
      {
        assignedDate: { lt: today },
        status: { in: pendingMissedStatuses },
      },
      {
        assignedDate: { gte: sevenDaysAgo, lte: today },
        status: 'SKIPPED',
      },
    ],
  }
  const missedHybridAssignmentWhere: Prisma.HybridWorkoutAssignmentWhereInput = {
    OR: [
      {
        assignedDate: { lt: today },
        status: { in: pendingMissedStatuses },
      },
      {
        assignedDate: { gte: sevenDaysAgo, lte: today },
        status: 'SKIPPED',
      },
    ],
  }
  const missedAgilityAssignmentWhere: Prisma.AgilityWorkoutAssignmentWhereInput = {
    OR: [
      {
        assignedDate: { lt: today },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      {
        assignedDate: { gte: sevenDaysAgo, lte: today },
        status: 'SKIPPED',
      },
    ],
  }

  const members = await prisma.client.findMany({
    where: {
      teamId: team.id,
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: {
      id: true,
      name: true,
      athleteAccount: { select: { userId: true } },
      dailyMetrics: {
        where: { date: { gte: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) } },
        select: { readinessScore: true, date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
      injuryAssessments: {
        where: {
          status: { in: ['ACTIVE', 'MONITORING'] },
          resolved: false,
        },
        select: { id: true },
        take: 1,
      },
      strengthSessionAssignments: {
        where: missedStrengthAssignmentWhere,
        select: { id: true },
        take: 1,
      },
      cardioSessionAssignments: {
        where: missedCardioAssignmentWhere,
        select: { id: true },
        take: 1,
      },
      hybridWorkoutAssignments: {
        where: missedHybridAssignmentWhere,
        select: { id: true },
        take: 1,
      },
      agilityWorkoutAssignments: {
        where: missedAgilityAssignmentWhere,
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  })

  const selectedClientIds = new Set(input.clientIds ?? [])
  const recipients = members
    .filter((member) => {
      if (!member.athleteAccount?.userId) return false

      switch (input.teamTarget) {
        case 'LOW_READINESS':
          return (member.dailyMetrics[0]?.readinessScore ?? 100) < 50
        case 'MISSED_WORKOUTS':
          return (
            member.strengthSessionAssignments.length > 0 ||
            member.cardioSessionAssignments.length > 0 ||
            member.hybridWorkoutAssignments.length > 0 ||
            member.agilityWorkoutAssignments.length > 0
          )
        case 'INJURED':
          return member.injuryAssessments.length > 0
        case 'SELECTED':
          return selectedClientIds.has(member.id)
        case 'ALL':
        default:
          return true
      }
    })
    .map((member) => ({
      clientId: member.id,
      name: member.name,
      teamName: team.name,
      receiverUserId: member.athleteAccount!.userId,
    }))

  if (recipients.length === 0) {
    return {
      success: false,
      error: t(
        locale,
        `No athletes in ${team.name} matched "${getTeamTargetLabel(input.teamTarget, locale)}" and had a linked athlete account.`,
        `Inga atleter i ${team.name} matchade "${getTeamTargetLabel(input.teamTarget, locale)}" och hade länkat atletkonto.`
      ),
    }
  }

  return { success: true, team, recipients }
}

export async function buildCoachMessageAction(
  coachUserId: string,
  input: PrepareCoachMessageDraftInput,
  businessSlug?: string,
  locale: AppLocale = 'en'
): Promise<BuildCoachMessageActionResult> {
  const content = input.content.trim()
  const subject = input.subject?.trim() || null

  if (input.recipientType === 'ATHLETE') {
    const resolved = await resolveAthleteRecipients(coachUserId, input, businessSlug, locale)
    if (!resolved.success) return resolved

    const draft: CoachMessageActionDraft = {
      recipientType: 'ATHLETE',
      clientId: resolved.client.id,
      content,
      ...(subject ? { subject } : {}),
      teamTarget: 'ALL',
    }

    const action: CoachMessageAction = {
      type: 'sendCoachMessage',
      title: t(locale, `Send message to ${resolved.client.name}`, `Skicka meddelande till ${resolved.client.name}`),
      description: t(
        locale,
        'The message will be sent in the app message feed when you confirm.',
        'Meddelandet skickas i appens meddelandeflöde när du bekräftar.'
      ),
      recipientType: 'ATHLETE',
      targetLabel: resolved.client.name,
      recipientCount: 1,
      recipients: toPublicRecipients(resolved.recipients),
      content,
      subject,
      requiresConfirmation: true,
      confirmLabel: t(locale, 'Send message', 'Skicka meddelande'),
      confirmEndpoint: '/api/ai/chat/actions/coach-message',
      reviewHref: '/coach/messages',
      draft,
    }

    return {
      success: true,
      action,
      resolvedRecipients: resolved.recipients,
      message: t(
        locale,
        `I prepared a message to ${resolved.client.name}. Confirm in the card if it should be sent.`,
        `Jag har förberett ett meddelande till ${resolved.client.name}. Bekräfta i kortet om det ska skickas.`
      ),
    }
  }

  const resolved = await resolveTeamRecipients(coachUserId, input, businessSlug, locale)
  if (!resolved.success) return resolved

  const targetLabel = `${resolved.team.name}: ${getTeamTargetLabel(input.teamTarget, locale)}`
  const draft: CoachMessageActionDraft = {
    recipientType: 'TEAM',
    teamId: resolved.team.id,
    teamTarget: input.teamTarget,
    content,
    ...(subject ? { subject } : {}),
    ...(input.teamTarget === 'SELECTED' && input.clientIds?.length ? { clientIds: input.clientIds } : {}),
  }

  const action: CoachMessageAction = {
    type: 'sendCoachMessage',
    title: t(locale, 'Send team message', 'Skicka lagmeddelande'),
    description: t(
      locale,
      'The message will be sent to matched athletes only after you confirm.',
      'Meddelandet skickas till matchade atleter först när du bekräftar.'
    ),
    recipientType: 'TEAM',
    targetLabel,
    recipientCount: resolved.recipients.length,
    recipients: toPublicRecipients(resolved.recipients),
    content,
    subject: subject ?? t(locale, `Team message: ${resolved.team.name}`, `Lagmeddelande: ${resolved.team.name}`),
    requiresConfirmation: true,
    confirmLabel: t(locale, `Send to ${resolved.recipients.length}`, `Skicka till ${resolved.recipients.length}`),
    confirmEndpoint: '/api/ai/chat/actions/coach-message',
    reviewHref: '/coach/messages',
    draft,
  }

  return {
    success: true,
    action,
    resolvedRecipients: resolved.recipients,
    message: t(
      locale,
      `I prepared a team message to ${resolved.recipients.length} recipients in ${resolved.team.name}. Confirm in the card if it should be sent.`,
      `Jag har förberett ett lagmeddelande till ${resolved.recipients.length} mottagare i ${resolved.team.name}. Bekräfta i kortet om det ska skickas.`
    ),
  }
}

export async function sendCoachMessageAction(
  coachUserId: string,
  input: SendCoachMessageActionInput,
  businessSlug?: string,
  locale: AppLocale = 'en'
): Promise<SendCoachMessageActionResult> {
  const result = await buildCoachMessageAction(coachUserId, input.draft, businessSlug, locale)
  if (!result.success) return result

  const uniqueRecipients = Array.from(
    new Map(result.resolvedRecipients.map((recipient) => [recipient.receiverUserId, recipient])).values()
  )

  await prisma.message.createMany({
    data: uniqueRecipients.map((recipient) => ({
      senderId: coachUserId,
      receiverId: recipient.receiverUserId,
      content: result.action.content,
      subject: result.action.subject,
    })),
  })

  return {
    success: true,
    sent: uniqueRecipients.length,
    recipientCount: uniqueRecipients.length,
    targetLabel: result.action.targetLabel,
    message:
      uniqueRecipients.length === 1
        ? t(locale, `The message was sent to ${uniqueRecipients[0].name}.`, `Meddelandet skickades till ${uniqueRecipients[0].name}.`)
        : t(locale, `The message was sent to ${uniqueRecipients.length} recipients.`, `Meddelandet skickades till ${uniqueRecipients.length} mottagare.`),
  }
}
