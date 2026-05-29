/**
 * Coach chat tools for reading and planning team calendar events.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { buildTeamCalendarBriefing, type TeamCalendarBriefingEvent } from '@/lib/team-calendar/briefing'
import { getTeamCalendarAssignmentSummaries } from '@/lib/team-calendar/assignment-summary'
import { findTeamCalendarLocationConflicts, formatLocationConflictMessage } from '@/lib/team-calendar/location-conflicts'
import { getTeamCalendarWritableTeam } from '@/lib/team-calendar/permissions'
import { isAssignableTeamCoach } from '@/lib/team-calendar/responsible-coach'
import {
  type CoachToolContext,
  TEAM_WORKOUT_TYPES,
  TEAM_EVENT_CONTENT_OWNERS_FOR_AI,
  TEAM_EVENT_CONTENT_STATUSES_FOR_AI,
  toolText,
  findAccessibleCoachTeam,
  getCoachToolWeekRange,
  parseCoachToolDateBoundary,
  getCoachToolDayRange,
  buildCoachToolEventDate,
  addCoachToolWeeks,
  resolveCoachToolBusinessId,
  compactWorkoutDate,
  eventTypeForTeamWorkoutType,
  getCoachToolLinkedWorkoutDetails,
  getCoachToolLinkedWorkoutName,
  resolveResponsibleCoachIdFromAiInput,
} from './shared'

export function createCalendarTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
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
  }
}
