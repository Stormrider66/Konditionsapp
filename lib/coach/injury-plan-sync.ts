import { prisma } from '@/lib/prisma'
import { AssignmentStatus } from '@prisma/client'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'

/**
 * When an INJURY_RECOVERY individual plan is created, the player should drop the
 * team's broadcast workouts for the plan window — they follow the rehab approach
 * instead. We do this NON-destructively: matching team-broadcast assignments are
 * marked SKIPPED (with an injury note) rather than deleted, so the record and the
 * calendar entries are preserved and a coach can reverse it later.
 *
 * Scope: only team-broadcast assignments (teamBroadcastId set) for this athlete,
 * within [planStart, planEnd], that are still active (not completed/skipped). The
 * athlete's own (non-team) assignments are left untouched.
 */

const ACTIVE_STD: AssignmentStatus[] = [
  AssignmentStatus.PENDING,
  AssignmentStatus.SCHEDULED,
  AssignmentStatus.MODIFIED,
]
const ACTIVE_AGILITY = ['ASSIGNED', 'IN_PROGRESS']
const INJURY_NOTE = '[Skadeplan – auto-överhoppad]'

function withInjuryNote(existing: string | null): string {
  if (!existing) return INJURY_NOTE
  if (existing.includes(INJURY_NOTE)) return existing
  return `${existing} · ${INJURY_NOTE}`
}

export async function skipTeamWorkoutsForInjuryPlan(params: {
  clientId: string
  planStart: Date
  planEnd: Date
}): Promise<number> {
  const { clientId, planStart, planEnd } = params
  const assignedDate = { gte: planStart, lte: planEnd }
  const stdWhere = { athleteId: clientId, teamBroadcastId: { not: null }, assignedDate, status: { in: ACTIVE_STD } }

  const [strength, cardio, hybrid, agility] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({ where: stdWhere, select: { id: true, notes: true } }),
    prisma.cardioSessionAssignment.findMany({ where: stdWhere, select: { id: true, notes: true } }),
    prisma.hybridWorkoutAssignment.findMany({ where: stdWhere, select: { id: true, notes: true } }),
    prisma.agilityWorkoutAssignment.findMany({
      where: { athleteId: clientId, teamBroadcastId: { not: null }, assignedDate, status: { in: ACTIVE_AGILITY } },
      select: { id: true, notes: true },
    }),
  ])

  const ops = [
    ...strength.map((a) => prisma.strengthSessionAssignment.update({ where: { id: a.id }, data: { status: 'SKIPPED', notes: withInjuryNote(a.notes) } })),
    ...cardio.map((a) => prisma.cardioSessionAssignment.update({ where: { id: a.id }, data: { status: 'SKIPPED', notes: withInjuryNote(a.notes) } })),
    ...hybrid.map((a) => prisma.hybridWorkoutAssignment.update({ where: { id: a.id }, data: { status: 'SKIPPED', notes: withInjuryNote(a.notes) } })),
    ...agility.map((a) => prisma.agilityWorkoutAssignment.update({ where: { id: a.id }, data: { status: 'SKIPPED', notes: withInjuryNote(a.notes) } })),
  ]

  if (ops.length === 0) return 0
  await prisma.$transaction(ops)
  await invalidateUnifiedCalendarCacheForClient(clientId).catch(() => {})
  return ops.length
}
