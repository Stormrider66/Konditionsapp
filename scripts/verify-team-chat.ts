// One-off verification of team chat slice 1 against the live dev DB
// (docs/TEAM_CHAT_DESIGN.md). Creates a channel for a real team, exercises
// membership/messages/read-cursor, asserts authorization denials, then
// deletes the thread (cascade cleans participants + messages).
//
// Run: export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && \
//        npx tsx --tsconfig tsconfig.scripts.json scripts/verify-team-chat.ts

import { prisma } from '../lib/prisma'
import {
  ensureTeamChannel,
  getThreadForUser,
  getTeamChannelAccess,
  markThreadRead,
} from '../lib/chat/membership'

let failures = 0

function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

async function main() {
  // A team with at least one rostered athlete that has a User account.
  const team = await prisma.team.findFirst({
    where: { members: { some: { athleteAccount: { isNot: null } } } },
    select: {
      id: true,
      name: true,
      userId: true,
      members: {
        where: { athleteAccount: { isNot: null } },
        select: { id: true, athleteAccount: { select: { userId: true } } },
        take: 1,
      },
    },
  })
  if (!team) {
    console.log('No team with athlete accounts found — nothing to verify against.')
    return
  }
  const athleteUserId = team.members[0].athleteAccount!.userId
  console.log(`Team under test: ${team.name} (${team.id})`)

  const preexisting = await prisma.thread.findUnique({
    where: { teamId_type: { teamId: team.id, type: 'TEAM_CHANNEL' } },
    select: { id: true },
  })
  if (preexisting) {
    console.log('Team already has a channel — refusing to test against real data.')
    return
  }

  // A user with no relation to this team at all.
  const outsider = await prisma.user.findFirst({
    where: {
      id: { not: team.userId },
      teams: { none: {} },
      businessMemberships: { none: {} },
      athleteAccount: null,
    },
    select: { id: true },
  })

  let threadId: string | null = null
  try {
    // 1. Owner resolves (creates) the channel
    const ownerResult = await ensureTeamChannel(team.userId, team.id)
    check('owner ensureTeamChannel creates the channel', !!ownerResult)
    if (!ownerResult) return
    threadId = ownerResult.thread.id
    check('owner role is OWNER', ownerResult.role === 'OWNER', ownerResult.role)

    // 2. Second call reuses the same thread + lazy participant row exists
    const again = await ensureTeamChannel(team.userId, team.id)
    check('ensureTeamChannel is idempotent', again?.thread.id === threadId)
    const ownerParticipant = await prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId: team.userId } },
    })
    check('lazy participant row created for owner', !!ownerParticipant)

    // 3. Rostered athlete has derived access without a participant row
    const athleteAccess = await getTeamChannelAccess(athleteUserId, team.id)
    check('rostered athlete has derived access', athleteAccess.hasAccess)
    check('athlete role is ATHLETE', athleteAccess.role === 'ATHLETE', athleteAccess.role)
    const athleteThread = await getThreadForUser(athleteUserId, threadId)
    check('athlete resolves thread via roster fallback', athleteThread?.thread.id === threadId)

    // 4. Outsider is denied
    if (outsider) {
      const outsiderThread = await getThreadForUser(outsider.id, threadId)
      check('unrelated user is denied', outsiderThread === null)
    } else {
      console.log('ℹ️ no fully-unrelated user found — skipping outsider denial check')
    }

    // 5. Message write path (model level) + read cursor
    const message = await prisma.threadMessage.create({
      data: { threadId, senderId: team.userId, content: 'verify-team-chat test message' },
    })
    check('message insert works', !!message.id)
    await markThreadRead(threadId, athleteUserId, 'ATHLETE')
    const cursor = await prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId: athleteUserId } },
      select: { lastReadAt: true, role: true },
    })
    check('markThreadRead sets athlete cursor', !!cursor?.lastReadAt)
    check('athlete participant row holds ATHLETE role', cursor?.role === 'ATHLETE', cursor?.role)
  } finally {
    if (threadId) {
      await prisma.thread.delete({ where: { id: threadId } })
      const orphans = await prisma.threadParticipant.count({ where: { threadId } })
      check('cleanup: thread deleted, participants cascaded', orphans === 0)
    }
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`)
  if (failures > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
