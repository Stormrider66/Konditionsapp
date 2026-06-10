/**
 * Coach chat tool for assigning existing library sessions to one athlete.
 *
 * Mirrors the assign API routes: physio restriction enforcement, calendar
 * event + assignment upsert in one transaction. Registered as a confirmed
 * write capability, so with AI operations enabled it runs through the
 * action-draft confirmation flow.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkWorkoutAssignmentRestrictions } from '@/lib/training-restrictions/assignment-enforcement'
import { strengthSessionAccessWhere } from '@/lib/strength/session-business-scope'
import {
  agilityWorkoutAccessWhere,
  cardioSessionAccessWhere,
  hybridWorkoutAccessWhere,
} from '@/lib/workouts/business-scope'
import {
  type CoachToolContext,
  toolText,
  resolveAccessibleCoachClient,
  resolveCoachToolBusinessId,
} from './shared'

type SessionKind = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

type ResolvedSession = { id: string; name: string }

type SessionResolution =
  | { ok: true; session: ResolvedSession }
  | { ok: false; result: Record<string, unknown> }

const KIND_LABELS: Record<SessionKind, { en: string; sv: string }> = {
  STRENGTH: { en: 'Strength', sv: 'Styrka' },
  CARDIO: { en: 'Cardio', sv: 'Kondition' },
  HYBRID: { en: 'Hybrid', sv: 'Hybrid' },
  AGILITY: { en: 'Agility', sv: 'Agility' },
}

async function resolveSession(
  ctx: CoachToolContext,
  kind: SessionKind,
  sessionId: string | undefined,
  sessionName: string | undefined,
  businessId?: string
): Promise<SessionResolution> {
  const { coachUserId, locale } = ctx

  const findMany = async (): Promise<ResolvedSession[]> => {
    const nameFilter = sessionName
      ? { name: { contains: sessionName, mode: 'insensitive' as const } }
      : {}
    const idFilter = sessionId ? { id: sessionId } : {}

    switch (kind) {
      case 'STRENGTH':
        return prisma.strengthSession.findMany({
          where: { ...idFilter, ...nameFilter, AND: [strengthSessionAccessWhere(coachUserId, businessId)] },
          select: { id: true, name: true },
          take: 6,
        })
      case 'CARDIO':
        return prisma.cardioSession.findMany({
          where: { ...idFilter, ...nameFilter, AND: [cardioSessionAccessWhere(coachUserId, businessId)] },
          select: { id: true, name: true },
          take: 6,
        })
      case 'HYBRID':
        return prisma.hybridWorkout.findMany({
          where: { ...idFilter, ...nameFilter, AND: [hybridWorkoutAccessWhere(coachUserId, businessId)] },
          select: { id: true, name: true },
          take: 6,
        })
      case 'AGILITY':
        return prisma.agilityWorkout.findMany({
          where: { ...idFilter, ...nameFilter, AND: [agilityWorkoutAccessWhere(coachUserId, businessId)] },
          select: { id: true, name: true },
          take: 6,
        })
    }
  }

  if (!sessionId && !sessionName) {
    return {
      ok: false,
      result: {
        success: false,
        error: toolText(locale, 'Provide sessionId or sessionName.', 'Ange sessionId eller sessionName.'),
      },
    }
  }

  const candidates = await findMany()

  if (candidates.length === 0) {
    return {
      ok: false,
      result: {
        success: false,
        error: toolText(
          locale,
          'No accessible session matched. Check the name or create it in the studio first.',
          'Ingen tillgänglig session matchade. Kontrollera namnet eller skapa den i studion först.'
        ),
      },
    }
  }

  if (candidates.length > 1) {
    const exact = sessionName
      ? candidates.filter((c) => c.name.toLowerCase() === sessionName.toLowerCase())
      : []
    if (exact.length === 1) return { ok: true, session: exact[0] }
    return {
      ok: false,
      result: {
        success: false,
        needsClarification: true,
        candidates,
        error: toolText(locale, 'Several sessions matched — ask which one.', 'Flera sessioner matchade — fråga vilken som avses.'),
      },
    }
  }

  return { ok: true, session: candidates[0] }
}

function parseAssignedDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function createAssignmentTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    assignSessionToAthlete: tool({
      description: toolText(
        locale,
        'Assign an existing library session (strength, cardio, hybrid, or agility) to one athlete on a date. Creates the assignment plus a calendar event, and respects active injury restrictions. Use after the coach confirms which session, which athlete, and which date. To create new session content, use the generate/create tools instead.',
        'Tilldela en befintlig session från biblioteket (styrka, kondition, hybrid eller agility) till en atlet på ett datum. Skapar tilldelningen plus en kalenderhändelse, och respekterar aktiva skaderestriktioner. Använd efter att coachen bekräftat vilken session, vilken atlet och vilket datum. För att skapa nytt passinnehåll, använd generera/skapa-verktygen istället.'
      ),
      inputSchema: z.object({
        sessionType: z.enum(['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY']).describe('Kind of session to assign.'),
        sessionId: z.string().optional().describe('Session id if already known from a previous tool call.'),
        sessionName: z.string().optional().describe('Session name to search for if the id is not known.'),
        clientId: z.string().optional().describe('Athlete clientId if already known.'),
        athleteName: z.string().optional().describe('Athlete name if clientId is not known.'),
        assignedDate: z.string().describe('Date the athlete should do the session (YYYY-MM-DD).'),
        notes: z.string().optional().describe('Instructions shown to the athlete.'),
      }),
      execute: async ({ sessionType, sessionId, sessionName, clientId, athleteName, assignedDate, notes }) => {
        try {
          const date = parseAssignedDate(assignedDate)
          if (!date) {
            return {
              success: false,
              error: toolText(locale, 'assignedDate must be YYYY-MM-DD.', 'assignedDate måste vara YYYY-MM-DD.'),
            }
          }

          const resolvedClient = await resolveAccessibleCoachClient(ctx, clientId, athleteName)
          if (!resolvedClient.ok) return resolvedClient.result
          const client = resolvedClient.client

          const businessId = await resolveCoachToolBusinessId(coachUserId, businessSlug)
          const resolvedSession = await resolveSession(
            ctx,
            sessionType,
            sessionId,
            sessionName,
            businessId ?? undefined
          )
          if (!resolvedSession.ok) return resolvedSession.result
          const session = resolvedSession.session

          // Physio restriction enforcement — same gate as the assign routes.
          const { blockedByAthlete } = await checkWorkoutAssignmentRestrictions({
            workoutType: sessionType.toLowerCase() as 'strength' | 'cardio' | 'hybrid' | 'agility',
            workoutId: session.id,
            athleteIds: [client.id],
          })
          const block = blockedByAthlete.get(client.id)
          if (block) {
            return {
              success: false,
              blockedByRestriction: true,
              error: toolText(
                locale,
                `${client.name} has an active training restriction that blocks this session.`,
                `${client.name} har en aktiv träningsrestriktion som blockerar denna session.`
              ),
            }
          }

          const kindLabel = toolText(locale, KIND_LABELS[sessionType].en, KIND_LABELS[sessionType].sv)

          const assignment = await prisma.$transaction(async (tx) => {
            const calendarEvent = await tx.calendarEvent.create({
              data: {
                clientId: client.id,
                type: 'SCHEDULED_WORKOUT',
                title: `${kindLabel}: ${session.name}`,
                description: notes || null,
                status: 'SCHEDULED',
                startDate: date,
                endDate: date,
                allDay: true,
                trainingImpact: 'NORMAL',
                createdById: coachUserId,
              },
            })

            const base = {
              athleteId: client.id,
              assignedDate: date,
              assignedBy: coachUserId,
              notes,
              status: 'PENDING' as const,
              calendarEventId: calendarEvent.id,
            }

            switch (sessionType) {
              case 'STRENGTH':
                return tx.strengthSessionAssignment.upsert({
                  where: {
                    sessionId_athleteId_assignedDate: {
                      sessionId: session.id,
                      athleteId: client.id,
                      assignedDate: date,
                    },
                  },
                  update: { notes, status: 'PENDING', calendarEventId: calendarEvent.id },
                  create: { sessionId: session.id, ...base },
                  select: { id: true },
                })
              case 'CARDIO':
                return tx.cardioSessionAssignment.upsert({
                  where: {
                    sessionId_athleteId_assignedDate: {
                      sessionId: session.id,
                      athleteId: client.id,
                      assignedDate: date,
                    },
                  },
                  update: { notes, status: 'PENDING', calendarEventId: calendarEvent.id },
                  create: { sessionId: session.id, ...base },
                  select: { id: true },
                })
              case 'HYBRID':
                return tx.hybridWorkoutAssignment.upsert({
                  where: {
                    workoutId_athleteId_assignedDate: {
                      workoutId: session.id,
                      athleteId: client.id,
                      assignedDate: date,
                    },
                  },
                  update: { notes, status: 'PENDING', calendarEventId: calendarEvent.id },
                  create: { workoutId: session.id, ...base },
                  select: { id: true },
                })
              case 'AGILITY':
                return tx.agilityWorkoutAssignment.upsert({
                  where: {
                    workoutId_athleteId_assignedDate: {
                      workoutId: session.id,
                      athleteId: client.id,
                      assignedDate: date,
                    },
                  },
                  update: { notes, status: 'PENDING', calendarEventId: calendarEvent.id },
                  create: { workoutId: session.id, ...base },
                  select: { id: true },
                })
            }
          })

          logger.info('Session assigned via chat tool', {
            coachUserId,
            clientId: client.id,
            sessionType,
            sessionId: session.id,
            assignedDate,
          })

          return {
            success: true,
            assignmentId: assignment.id,
            sessionType,
            sessionName: session.name,
            athlete: { id: client.id, name: client.name },
            assignedDate,
            message: toolText(
              locale,
              `"${session.name}" was assigned to ${client.name} on ${assignedDate} and added to their calendar.`,
              `"${session.name}" tilldelades ${client.name} den ${assignedDate} och lades till i kalendern.`
            ),
          }
        } catch (error) {
          logger.error('assignSessionToAthlete tool failed', { coachUserId, sessionType }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not assign the session. Please try again.', 'Kunde inte tilldela sessionen. Försök igen.'),
          }
        }
      },
    }),
  }
}
