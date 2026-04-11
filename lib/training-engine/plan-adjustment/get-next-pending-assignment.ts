/**
 * Helper for finding the athlete's "next pending assignment".
 *
 * Today this question is answered by ad-hoc queries scattered across
 * cron jobs (coach-alerts, preworkout-nudges, …) that each re-derive
 * the same thing. This helper centralises the logic so future
 * consumers (the readiness → plan feedback loop, AI tools, UI widgets)
 * share one definition of "next".
 */

import { prisma } from '@/lib/prisma'

export type AssignmentKind = 'STRENGTH' | 'CARDIO'

export interface NextPendingAssignment {
  kind: AssignmentKind
  id: string
  sessionId: string
  sessionName: string
  assignedDate: Date
  status: string
  notes: string | null
}

export interface GetNextPendingAssignmentOptions {
  /**
   * Look this many days ahead from today. Anything scheduled later
   * is ignored. Default: 7.
   */
  horizonDays?: number
  /**
   * Which assignment kinds to consider. Default: both.
   */
  kinds?: AssignmentKind[]
  /**
   * Override "today" for deterministic testing. Defaults to new Date().
   */
  now?: Date
}

/**
 * Return the earliest pending assignment (strength OR cardio) scheduled
 * between today and today+horizonDays for the given client. Ties break
 * in favour of strength.
 *
 * Returns null when:
 * - the client has no pending assignments in the window
 * - the client exists but only has completed/skipped/modified ones
 */
export async function getNextPendingAssignment(
  clientId: string,
  options: GetNextPendingAssignmentOptions = {}
): Promise<NextPendingAssignment | null> {
  const { horizonDays = 7, kinds = ['STRENGTH', 'CARDIO'], now = new Date() } =
    options

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const horizon = new Date(startOfToday)
  horizon.setDate(horizon.getDate() + horizonDays)

  const includeStrength = kinds.includes('STRENGTH')
  const includeCardio = kinds.includes('CARDIO')

  const [strength, cardio] = await Promise.all([
    includeStrength
      ? prisma.strengthSessionAssignment.findFirst({
          where: {
            athleteId: clientId,
            status: 'PENDING',
            assignedDate: { gte: startOfToday, lte: horizon },
          },
          orderBy: { assignedDate: 'asc' },
          include: { session: { select: { id: true, name: true } } },
        })
      : Promise.resolve(null),
    includeCardio
      ? prisma.cardioSessionAssignment.findFirst({
          where: {
            athleteId: clientId,
            status: 'PENDING',
            assignedDate: { gte: startOfToday, lte: horizon },
          },
          orderBy: { assignedDate: 'asc' },
          include: { session: { select: { id: true, name: true } } },
        })
      : Promise.resolve(null),
  ])

  const strengthResult: NextPendingAssignment | null = strength
    ? {
        kind: 'STRENGTH',
        id: strength.id,
        sessionId: strength.sessionId,
        sessionName: strength.session.name,
        assignedDate: strength.assignedDate,
        status: strength.status,
        notes: strength.notes,
      }
    : null

  const cardioResult: NextPendingAssignment | null = cardio
    ? {
        kind: 'CARDIO',
        id: cardio.id,
        sessionId: cardio.sessionId,
        sessionName: cardio.session.name,
        assignedDate: cardio.assignedDate,
        status: cardio.status,
        notes: cardio.notes,
      }
    : null

  if (!strengthResult) return cardioResult
  if (!cardioResult) return strengthResult

  // Both present — return the earlier one. Strength wins ties
  // because that's the historical cron precedence (see coach-alerts).
  return cardioResult.assignedDate < strengthResult.assignedDate
    ? cardioResult
    : strengthResult
}
