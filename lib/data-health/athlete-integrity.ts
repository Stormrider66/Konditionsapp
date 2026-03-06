import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  buildAthleteSubscriptionSeedFromCoachSubscription,
  buildSelfAthleteSubscriptionSeedForUser,
  ensureAthleteClientDefaultsTx,
  type AthleteSubscriptionSeed,
} from '@/lib/user-provisioning'

export const ATHLETE_DATA_HEALTH_ISSUE_CODES = [
  'ATHLETE_MISSING_ACCOUNT',
  'ATHLETE_MISSING_SUBSCRIPTION',
  'ATHLETE_MISSING_AGENT_PREFERENCES',
  'ATHLETE_MISSING_SPORT_PROFILE',
  'ATHLETE_REDUNDANT_COACH_SUBSCRIPTION',
  'ATHLETE_CONFLICTING_COACH_SUBSCRIPTION',
  'SELF_ATHLETE_MISSING_CLIENT',
  'SELF_ATHLETE_MISSING_SUBSCRIPTION',
  'SELF_ATHLETE_MISSING_AGENT_PREFERENCES',
  'SELF_ATHLETE_MISSING_SPORT_PROFILE',
] as const

export type AthleteDataHealthIssueCode = typeof ATHLETE_DATA_HEALTH_ISSUE_CODES[number]
type RepairSeedSource = 'coach_subscription' | 'self_athlete' | 'free_default'

interface SubscriptionSnapshot {
  tier: string
  status: string
  trialEndsAt: Date | null
}

interface ClientDefaultsSnapshot {
  id: string
  athleteSubscription: {
    id: string
    tier: string
    status: string
    trialEndsAt: Date | null
  } | null
  agentPreferences: { id: string } | null
  sportProfile: { id: string } | null
}

interface TrackedUser {
  id: string
  email: string
  name: string | null
  role: string
  selfAthleteClientId: string | null
  athleteAccount: {
    clientId: string
    client: ClientDefaultsSnapshot | null
  } | null
  subscription: SubscriptionSnapshot | null
}

interface RepairContext {
  repairSeedSource: RepairSeedSource
  coachSubscription?: SubscriptionSnapshot
}

export interface AthleteDataHealthIssue {
  id: string
  code: AthleteDataHealthIssueCode
  severity: 'warning' | 'error'
  fixable: boolean
  userId: string
  clientId: string | null
  role: string
  email: string
  message: string
  repairContext?: RepairContext
}

export interface AthleteDataHealthReport {
  generatedAt: string
  summary: {
    scannedUsers: number
    athleteUsers: number
    selfAthleteUsers: number
    totalIssues: number
    fixableIssues: number
    byCode: Record<AthleteDataHealthIssueCode, number>
  }
  issues: AthleteDataHealthIssue[]
}

export interface AthleteDataHealthRepairItem {
  key: string
  userId: string
  clientId: string
  issueCodes: AthleteDataHealthIssueCode[]
  status: 'applied' | 'failed'
  message: string
}

export interface AthleteDataHealthRepairResult {
  generatedAt: string
  scannedUsers: number
  targetedIssueCount: number
  repairedCount: number
  failedCount: number
  repairs: AthleteDataHealthRepairItem[]
  reportAfter: AthleteDataHealthReport
}

const DEFAULT_SCAN_LIMIT = 500
const FREE_DIRECT_SEED: AthleteSubscriptionSeed = {
  tier: 'FREE',
  status: 'ACTIVE',
  paymentSource: 'DIRECT',
  trialEndsAt: null,
}

function createByCodeSummary(): Record<AthleteDataHealthIssueCode, number> {
  return ATHLETE_DATA_HEALTH_ISSUE_CODES.reduce((acc, code) => {
    acc[code] = 0
    return acc
  }, {} as Record<AthleteDataHealthIssueCode, number>)
}

function normalizeLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_SCAN_LIMIT
  return Math.max(1, Math.min(limit, DEFAULT_SCAN_LIMIT))
}

function buildIssueId(code: AthleteDataHealthIssueCode, userId: string, clientId: string | null): string {
  return [code, userId, clientId ?? 'none'].join(':')
}

function sameDate(a: Date | null, b: Date | null): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.getTime() === b.getTime()
}

function athleteSubscriptionMatchesSeed(
  athleteSubscription: ClientDefaultsSnapshot['athleteSubscription'],
  seed: AthleteSubscriptionSeed
): boolean {
  if (!athleteSubscription) return false

  return (
    athleteSubscription.tier === seed.tier &&
    athleteSubscription.status === seed.status &&
    sameDate(athleteSubscription.trialEndsAt, seed.trialEndsAt ?? null)
  )
}

function createIssue(input: Omit<AthleteDataHealthIssue, 'id'>): AthleteDataHealthIssue {
  return {
    ...input,
    id: buildIssueId(input.code, input.userId, input.clientId),
  }
}

function getRepairSeedSource(
  kind: 'athlete' | 'self_athlete',
  user: Pick<TrackedUser, 'subscription'>
): RepairSeedSource {
  if (kind === 'self_athlete') {
    return 'self_athlete'
  }
  return user.subscription ? 'coach_subscription' : 'free_default'
}

function appendClientDefaultIssues(
  issues: AthleteDataHealthIssue[],
  kind: 'athlete' | 'self_athlete',
  user: TrackedUser,
  client: ClientDefaultsSnapshot
) {
  const seedSource = getRepairSeedSource(kind, user)
  const repairContext: RepairContext = {
    repairSeedSource: seedSource,
    ...(user.subscription ? { coachSubscription: user.subscription } : {}),
  }

  if (!client.athleteSubscription) {
    issues.push(createIssue({
      code: kind === 'athlete' ? 'ATHLETE_MISSING_SUBSCRIPTION' : 'SELF_ATHLETE_MISSING_SUBSCRIPTION',
      severity: 'error',
      fixable: true,
      userId: user.id,
      clientId: client.id,
      role: user.role,
      email: user.email,
      message:
        kind === 'athlete'
          ? 'Athlete client is missing AthleteSubscription'
          : 'Self-athlete client is missing AthleteSubscription',
      repairContext,
    }))
  }

  if (!client.agentPreferences) {
    issues.push(createIssue({
      code: kind === 'athlete' ? 'ATHLETE_MISSING_AGENT_PREFERENCES' : 'SELF_ATHLETE_MISSING_AGENT_PREFERENCES',
      severity: 'warning',
      fixable: true,
      userId: user.id,
      clientId: client.id,
      role: user.role,
      email: user.email,
      message:
        kind === 'athlete'
          ? 'Athlete client is missing AgentPreferences'
          : 'Self-athlete client is missing AgentPreferences',
      repairContext,
    }))
  }

  if (!client.sportProfile) {
    issues.push(createIssue({
      code: kind === 'athlete' ? 'ATHLETE_MISSING_SPORT_PROFILE' : 'SELF_ATHLETE_MISSING_SPORT_PROFILE',
      severity: 'warning',
      fixable: true,
      userId: user.id,
      clientId: client.id,
      role: user.role,
      email: user.email,
      message:
        kind === 'athlete'
          ? 'Athlete client is missing SportProfile'
          : 'Self-athlete client is missing SportProfile',
      repairContext,
    }))
  }
}

async function loadTrackedUsers(limit?: number): Promise<{
  users: TrackedUser[]
  selfAthleteClients: Map<string, ClientDefaultsSnapshot>
}> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'ATHLETE' },
        { selfAthleteClientId: { not: null } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: normalizeLimit(limit),
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      selfAthleteClientId: true,
      athleteAccount: {
        select: {
          clientId: true,
          client: {
            select: {
              id: true,
              athleteSubscription: {
                select: {
                  id: true,
                  tier: true,
                  status: true,
                  trialEndsAt: true,
                },
              },
              agentPreferences: { select: { id: true } },
              sportProfile: { select: { id: true } },
            },
          },
        },
      },
      subscription: {
        select: {
          tier: true,
          status: true,
          trialEndsAt: true,
        },
      },
    },
  })

  const selfAthleteClientIds = [...new Set(users
    .map(user => user.selfAthleteClientId)
    .filter((clientId): clientId is string => !!clientId))]

  const selfAthleteClients = selfAthleteClientIds.length > 0
    ? await prisma.client.findMany({
        where: { id: { in: selfAthleteClientIds } },
        select: {
          id: true,
          athleteSubscription: {
            select: {
              id: true,
              tier: true,
              status: true,
              trialEndsAt: true,
            },
          },
          agentPreferences: { select: { id: true } },
          sportProfile: { select: { id: true } },
        },
      })
    : []

  return {
    users,
    selfAthleteClients: new Map(selfAthleteClients.map(client => [client.id, client])),
  }
}

export async function auditAthleteDataHealth(options?: {
  limit?: number
}): Promise<AthleteDataHealthReport> {
  const { users, selfAthleteClients } = await loadTrackedUsers(options?.limit)
  const issues: AthleteDataHealthIssue[] = []

  for (const user of users) {
    if (user.role === 'ATHLETE') {
      const athleteClient = user.athleteAccount?.client ?? null

      if (!athleteClient) {
        issues.push(createIssue({
          code: 'ATHLETE_MISSING_ACCOUNT',
          severity: 'error',
          fixable: false,
          userId: user.id,
          clientId: null,
          role: user.role,
          email: user.email,
          message: 'Athlete user is missing AthleteAccount or linked client',
        }))
      } else {
        appendClientDefaultIssues(issues, 'athlete', user, athleteClient)
      }

      if (user.subscription) {
        const mappedSeed = buildAthleteSubscriptionSeedFromCoachSubscription(user.subscription)
        const canSafelyCleanUp =
          !!athleteClient &&
          (
            !athleteClient.athleteSubscription ||
            athleteSubscriptionMatchesSeed(athleteClient.athleteSubscription, mappedSeed)
          )

        issues.push(createIssue({
          code: canSafelyCleanUp
            ? 'ATHLETE_REDUNDANT_COACH_SUBSCRIPTION'
            : 'ATHLETE_CONFLICTING_COACH_SUBSCRIPTION',
          severity: canSafelyCleanUp ? 'warning' : 'error',
          fixable: canSafelyCleanUp,
          userId: user.id,
          clientId: athleteClient?.id ?? null,
          role: user.role,
          email: user.email,
          message: canSafelyCleanUp
            ? 'Athlete user still has a redundant coach Subscription row'
            : 'Athlete user has a coach Subscription row that conflicts with AthleteSubscription state',
          repairContext: canSafelyCleanUp
            ? {
                repairSeedSource: 'coach_subscription',
                coachSubscription: user.subscription,
              }
            : undefined,
        }))
      }
    }

    if (user.selfAthleteClientId) {
      const selfAthleteClient = selfAthleteClients.get(user.selfAthleteClientId) ?? null

      if (!selfAthleteClient) {
        issues.push(createIssue({
          code: 'SELF_ATHLETE_MISSING_CLIENT',
          severity: 'error',
          fixable: false,
          userId: user.id,
          clientId: user.selfAthleteClientId,
          role: user.role,
          email: user.email,
          message: 'Self-athlete client reference points to a missing client row',
        }))
      } else {
        appendClientDefaultIssues(issues, 'self_athlete', user, selfAthleteClient)
      }
    }
  }

  const byCode = createByCodeSummary()
  for (const issue of issues) {
    byCode[issue.code] += 1
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      scannedUsers: users.length,
      athleteUsers: users.filter(user => user.role === 'ATHLETE').length,
      selfAthleteUsers: users.filter(user => !!user.selfAthleteClientId).length,
      totalIssues: issues.length,
      fixableIssues: issues.filter(issue => issue.fixable).length,
      byCode,
    },
    issues,
  }
}

interface RepairAction {
  key: string
  userId: string
  clientId: string
  issueCodes: Set<AthleteDataHealthIssueCode>
  seedSource: RepairSeedSource
  coachSubscription?: SubscriptionSnapshot
  syncSubscription: boolean
  deleteCoachSubscription: boolean
}

function issueMatchesFilter(
  issue: AthleteDataHealthIssue,
  issueCodes?: AthleteDataHealthIssueCode[]
): boolean {
  if (!issueCodes || issueCodes.length === 0) {
    return true
  }

  return issueCodes.includes(issue.code)
}

function getOrCreateRepairAction(
  actions: Map<string, RepairAction>,
  issue: AthleteDataHealthIssue
): RepairAction {
  const clientId = issue.clientId as string
  const key = `${issue.userId}:${clientId}`
  const existing = actions.get(key)
  if (existing) {
    return existing
  }

  const action: RepairAction = {
    key,
    userId: issue.userId,
    clientId,
    issueCodes: new Set<AthleteDataHealthIssueCode>(),
    seedSource: issue.repairContext?.repairSeedSource ?? 'free_default',
    coachSubscription: issue.repairContext?.coachSubscription,
    syncSubscription: false,
    deleteCoachSubscription: false,
  }
  actions.set(key, action)
  return action
}

async function resolveRepairSeed(action: RepairAction): Promise<AthleteSubscriptionSeed> {
  if (action.seedSource === 'self_athlete') {
    return buildSelfAthleteSubscriptionSeedForUser(action.userId)
  }

  if (action.seedSource === 'coach_subscription' && action.coachSubscription) {
    return buildAthleteSubscriptionSeedFromCoachSubscription(action.coachSubscription)
  }

  return FREE_DIRECT_SEED
}

export async function repairAthleteDataHealth(options?: {
  limit?: number
  issueCodes?: AthleteDataHealthIssueCode[]
}): Promise<AthleteDataHealthRepairResult> {
  const report = await auditAthleteDataHealth({ limit: options?.limit })
  const candidateIssues = report.issues.filter(
    issue => issue.fixable && issue.clientId && issueMatchesFilter(issue, options?.issueCodes)
  )

  const actions = new Map<string, RepairAction>()
  for (const issue of candidateIssues) {
    const action = getOrCreateRepairAction(actions, issue)
    action.issueCodes.add(issue.code)

    if (
      issue.code === 'ATHLETE_MISSING_SUBSCRIPTION' ||
      issue.code === 'SELF_ATHLETE_MISSING_SUBSCRIPTION' ||
      issue.code === 'ATHLETE_REDUNDANT_COACH_SUBSCRIPTION'
    ) {
      action.syncSubscription = true
    }

    if (issue.code === 'ATHLETE_REDUNDANT_COACH_SUBSCRIPTION') {
      action.deleteCoachSubscription = true
    }

    if (issue.repairContext?.repairSeedSource === 'self_athlete') {
      action.seedSource = 'self_athlete'
      action.coachSubscription = undefined
    } else if (issue.repairContext?.repairSeedSource === 'coach_subscription') {
      action.seedSource = 'coach_subscription'
      action.coachSubscription = issue.repairContext.coachSubscription
    }
  }

  const repairs: AthleteDataHealthRepairItem[] = []

  for (const action of actions.values()) {
    try {
      const subscriptionSeed = action.syncSubscription
        ? await resolveRepairSeed(action)
        : undefined

      await prisma.$transaction(async (tx) => {
        await ensureAthleteClientDefaultsTx(tx, action.clientId, {
          ...(subscriptionSeed ? { subscriptionSeed } : {}),
        })

        if (action.deleteCoachSubscription) {
          await tx.subscription.delete({
            where: { userId: action.userId },
          })
        }
      })

      repairs.push({
        key: action.key,
        userId: action.userId,
        clientId: action.clientId,
        issueCodes: [...action.issueCodes],
        status: 'applied',
        message: 'Applied athlete integrity repair successfully',
      })
    } catch (error) {
      logger.error('Failed to repair athlete data health issues', {
        userId: action.userId,
        clientId: action.clientId,
        issueCodes: [...action.issueCodes],
      }, error)

      repairs.push({
        key: action.key,
        userId: action.userId,
        clientId: action.clientId,
        issueCodes: [...action.issueCodes],
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown repair error',
      })
    }
  }

  const reportAfter = await auditAthleteDataHealth({ limit: options?.limit })

  return {
    generatedAt: new Date().toISOString(),
    scannedUsers: report.summary.scannedUsers,
    targetedIssueCount: candidateIssues.length,
    repairedCount: repairs.filter(repair => repair.status === 'applied').length,
    failedCount: repairs.filter(repair => repair.status === 'failed').length,
    repairs,
    reportAfter,
  }
}
