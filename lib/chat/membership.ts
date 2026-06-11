// Team chat membership & authorization (design: docs/TEAM_CHAT_DESIGN.md)
//
// Single source of truth for "who can access a thread". The slice-2 Realtime
// RLS function (can_access_thread) must mirror this logic — keep them in sync
// when roster rules change.
//
// TEAM_CHANNEL access is DERIVED from the team roster (head coach, business
// staff, assistant coaches via getAccessibleTeam; rostered athletes via their
// athleteAccount) on every check, so roster removals revoke access instantly.
// ThreadParticipant rows are created lazily on first contact and hold only
// per-user state (read cursor, mute, notification prefs) — they never
// authorize TEAM_CHANNEL access.

import { prisma } from '@/lib/prisma'
import { getAccessibleTeam, getBusinessMembership } from '@/lib/coach/team-access'
import type { Thread } from '@prisma/client'

export type ChatRole = 'OWNER' | 'COACH' | 'PHYSIO' | 'ATHLETE' | 'MEMBER'

interface TeamChannelAccess {
  hasAccess: boolean
  role: ChatRole
}

/**
 * Can this user access the team's channel, and in which capacity?
 * Staff path reuses getAccessibleTeam (owner, business-wide roles, assistant
 * assignments); athlete path checks the roster via athleteAccount.
 */
export async function getTeamChannelAccess(
  userId: string,
  teamId: string,
  businessSlug?: string
): Promise<TeamChannelAccess> {
  const team = await getAccessibleTeam(userId, teamId, businessSlug)
  if (team) {
    return { hasAccess: true, role: team.userId === userId ? 'OWNER' : 'COACH' }
  }

  const rosteredClient = await prisma.client.findFirst({
    where: { teamId, athleteAccount: { userId } },
    select: { id: true },
  })
  if (rosteredClient) {
    return { hasAccess: true, role: 'ATHLETE' }
  }

  return { hasAccess: false, role: 'MEMBER' }
}

/**
 * Resolve a thread the user is allowed to read, or null.
 * TEAM_CHANNEL access is ALWAYS derived from the current roster — participant
 * rows are lazily created and never deactivated, so consulting them first
 * would let removed members keep access forever. For other thread types
 * (GROUP/DIRECT, future) the explicit participant row is the source of truth.
 */
export async function getThreadForUser(
  userId: string,
  threadId: string,
  businessSlug?: string
): Promise<{ thread: Thread; role: ChatRole } | null> {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } })
  if (!thread) return null

  if (thread.type === 'TEAM_CHANNEL' && thread.teamId) {
    const access = await getTeamChannelAccess(userId, thread.teamId, businessSlug)
    return access.hasAccess ? { thread, role: access.role } : null
  }

  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
    select: { isActive: true, role: true },
  })
  if (participant?.isActive) {
    return { thread, role: participant.role as ChatRole }
  }

  return null
}

/**
 * Reduce a mention list to users who can actually access the thread, so
 * mention fan-out (slice 3 push/notifications) can never target outsiders.
 */
export async function filterThreadMemberUserIds(
  thread: Thread,
  userIds: string[],
  businessSlug?: string
): Promise<string[]> {
  const unique = [...new Set(userIds)]
  if (unique.length === 0) return []

  if (thread.type === 'TEAM_CHANNEL' && thread.teamId) {
    const teamId = thread.teamId
    const checks = await Promise.all(
      unique.map(async (id) => {
        const access = await getTeamChannelAccess(id, teamId, businessSlug)
        return access.hasAccess ? id : null
      })
    )
    return checks.filter((id): id is string => id !== null)
  }

  const participants = await prisma.threadParticipant.findMany({
    where: { threadId: thread.id, userId: { in: unique }, isActive: true },
    select: { userId: true },
  })
  return participants.map((p) => p.userId)
}

/**
 * Get-or-create the team's channel. Authorizes first; returns null when the
 * user has no access to the team. Lazily upserts the caller's participant row.
 */
export async function ensureTeamChannel(
  userId: string,
  teamId: string,
  businessSlug?: string
): Promise<{ thread: Thread; role: ChatRole } | null> {
  const access = await getTeamChannelAccess(userId, teamId, businessSlug)
  if (!access.hasAccess) return null

  let thread = await prisma.thread.findUnique({
    where: { teamId_type: { teamId, type: 'TEAM_CHANNEL' } },
  })

  if (!thread) {
    const membership = await getBusinessMembership(userId, businessSlug)
    try {
      thread = await prisma.thread.create({
        data: {
          type: 'TEAM_CHANNEL',
          teamId,
          businessId: membership?.businessId ?? null,
          createdById: userId,
        },
      })
    } catch {
      // Unique race: another request created the channel first — use theirs.
      thread = await prisma.thread.findUnique({
        where: { teamId_type: { teamId, type: 'TEAM_CHANNEL' } },
      })
      if (!thread) throw new Error(`Failed to ensure team channel for team ${teamId}`)
    }
  }

  await touchParticipant(thread.id, userId, access.role)
  return { thread, role: access.role }
}

/**
 * Lazily create the participant row that holds per-user state.
 * Does NOT grant access by itself — access checks run before this.
 */
export async function touchParticipant(threadId: string, userId: string, role: ChatRole) {
  await prisma.threadParticipant.upsert({
    where: { threadId_userId: { threadId, userId } },
    update: {},
    create: { threadId, userId, role },
  })
}

/** Mark the thread read for this user (unread cursor). */
export async function markThreadRead(threadId: string, userId: string, role: ChatRole) {
  await prisma.threadParticipant.upsert({
    where: { threadId_userId: { threadId, userId } },
    update: { lastReadAt: new Date() },
    create: { threadId, userId, role, lastReadAt: new Date() },
  })
}
