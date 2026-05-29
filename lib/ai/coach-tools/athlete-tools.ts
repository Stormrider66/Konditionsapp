/**
 * Coach chat tools for finding athletes and reading their completed activity.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  type CoachToolContext,
  type CoachToolClient,
  type CompletedWorkoutItem,
  toolText,
  findAccessibleCoachClients,
  getAccessibleCoachClientById,
  parseAdHocWorkoutSummary,
} from './shared'

export function createAthleteTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    listAthletes: tool({
      description: toolText(
        locale,
        'List the coach athletes so one can be selected for strength-session generation.',
        'Lista coachens atleter för att kunna välja en atlet att generera styrkepass för.'
      ),
      inputSchema: z.object({
        search: z.string().optional().describe('Search by name.'),
      }),
      execute: async ({ search }) => {
        try {
          const clients = await prisma.client.findMany({
            where: {
              userId: coachUserId,
              ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
            },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
            take: 20,
          })
          return {
            success: true,
            athletes: clients.map((c) => ({ id: c.id, name: c.name })),
          }
        } catch {
          return {
            success: false,
            error: toolText(locale, 'Could not fetch athletes.', 'Kunde inte hämta atleter.'),
          }
        }
      },
    }),

    findAthleteByName: tool({
      description: toolText(
        locale,
        'Search for an athlete the coach can access. Use when the coach mentions an athlete by name and you need the clientId before fetching data or creating something.',
        'Sök efter en atlet som coachen har behörighet till. Använd när coachen nämner en atlet vid namn och du behöver clientId innan du hämtar data eller skapar något.'
      ),
      inputSchema: z.object({
        name: z.string().min(2).describe('Name or part of the name to search for.'),
        limit: z.number().int().min(1).max(10).default(5).describe('Maximum number of matches to return.'),
      }),
      execute: async ({ name, limit }) => {
        try {
          const clients = await findAccessibleCoachClients(coachUserId, name, businessSlug, limit)
          return {
            success: true,
            matchCount: clients.length,
            athletes: clients.map((client) => ({
              id: client.id,
              name: client.name,
              email: client.email,
              team: client.team?.name ?? null,
              hasLinkedAthleteAccount: Boolean(client.athleteAccount?.userId),
            })),
            message:
              clients.length === 0
                ? toolText(locale, `I found no accessible athlete matching "${name}".`, `Jag hittade ingen tillgänglig atlet som matchar "${name}".`)
                : clients.length === 1
                  ? toolText(locale, `I found ${clients[0].name}.`, `Jag hittade ${clients[0].name}.`)
                  : toolText(
                      locale,
                      `I found ${clients.length} possible athletes. Ask the coach to choose the right clientId if the name is ambiguous.`,
                      `Jag hittade ${clients.length} möjliga atleter. Be coachen välja rätt clientId om namnet är otydligt.`
                    ),
          }
        } catch (error) {
          logger.error('Error in findAthleteByName tool', { coachUserId, name }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not search for the athlete.', 'Kunde inte söka efter atleten.'),
          }
        }
      },
    }),

    getLatestCompletedWorkout: tool({
      description: toolText(
        locale,
        'Fetch the latest completed training activity for a specific athlete. Can take clientId directly or search by athleteName. Covers program logs, ad-hoc workouts, Garmin, strength, cardio, hybrid, agility, and AI-generated WODs.',
        'Hämta den senaste genomförda träningsaktiviteten för en specifik atlet. Kan ta clientId direkt eller söka med athleteName. Täcker programloggar, ad-hoc-pass, Garmin, styrka, kondition, hybrid, agility och AI-genererade WODs.'
      ),
      inputSchema: z.object({
        clientId: z.string().optional().describe('Athlete clientId if already known.'),
        athleteName: z.string().optional().describe('Athlete name if clientId is not known.'),
      }),
      execute: async ({ clientId, athleteName }) => {
        try {
          let client: CoachToolClient | null = null
          let candidates: CoachToolClient[] = []

          if (clientId) {
            client = await getAccessibleCoachClientById(coachUserId, clientId, businessSlug)
            if (!client) {
              return {
                success: false,
                error: toolText(locale, 'The athlete was not found or is outside your access.', 'Atleten hittades inte eller ligger utanför din behörighet.'),
              }
            }
          } else if (athleteName) {
            candidates = await findAccessibleCoachClients(coachUserId, athleteName, businessSlug, 6)
            const exactMatches = candidates.filter(
              (candidate) => candidate.name.toLowerCase() === athleteName.toLowerCase()
            )
            if (exactMatches.length === 1) {
              client = exactMatches[0]
            } else if (candidates.length === 1) {
              client = candidates[0]
            } else {
              return {
                success: false,
                needsClarification: candidates.length > 1,
                error:
                  candidates.length === 0
                    ? toolText(locale, `I found no accessible athlete matching "${athleteName}".`, `Jag hittade ingen tillgänglig atlet som matchar "${athleteName}".`)
                    : toolText(locale, `I found several possible athletes matching "${athleteName}".`, `Jag hittade flera möjliga atleter som matchar "${athleteName}".`),
                candidates: candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  team: candidate.team?.name ?? null,
                })),
              }
            }
          } else {
            return {
              success: false,
              error: toolText(locale, 'Provide clientId or athleteName.', 'Ange clientId eller athleteName.'),
            }
          }

          const athleteUserId = client.athleteAccount?.userId
          if (!athleteUserId) {
            return {
              success: false,
              athlete: { id: client.id, name: client.name },
              error: toolText(
                locale,
                'The athlete does not have a linked athlete account yet, so completed workouts cannot be fetched from history.',
                'Atleten har inget länkat atletkonto ännu, så genomförda pass kan inte hämtas från historiken.'
              ),
            }
          }

          const [
            programLog,
            adHocWorkout,
            garminActivity,
            strengthAssignment,
            cardioAssignment,
            hybridAssignment,
            agilityAssignment,
            completedWOD,
          ] = await Promise.all([
            prisma.workoutLog.findFirst({
              where: {
                athleteId: athleteUserId,
                completed: true,
                completedAt: { not: null },
                workout: {
                  day: {
                    week: {
                      program: { clientId: client.id },
                    },
                  },
                },
              },
              include: {
                workout: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    intensity: true,
                    distance: true,
                    duration: true,
                    day: {
                      select: {
                        week: {
                          select: {
                            program: { select: { id: true, name: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.adHocWorkout.findFirst({
              where: {
                athleteId: client.id,
                status: 'CONFIRMED',
              },
              select: {
                id: true,
                workoutDate: true,
                workoutName: true,
                parsedType: true,
                parsedStructure: true,
                inputType: true,
              },
              orderBy: { workoutDate: 'desc' },
            }),
            prisma.garminActivity.findFirst({
              where: { clientId: client.id },
              select: {
                id: true,
                name: true,
                type: true,
                mappedType: true,
                startDate: true,
                duration: true,
                distance: true,
                averageHeartrate: true,
                maxHeartrate: true,
                averageWatts: true,
                tss: true,
                deviceName: true,
              },
              orderBy: { startDate: 'desc' },
            }),
            prisma.strengthSessionAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                duration: true,
                rpe: true,
                session: { select: { name: true, phase: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.cardioSessionAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                actualDuration: true,
                actualDistance: true,
                avgHeartRate: true,
                session: { select: { name: true, sport: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.hybridWorkoutAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                workout: { select: { name: true, format: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.agilityWorkoutAssignment.findFirst({
              where: {
                athleteId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                completedAt: true,
                workout: { select: { name: true } },
              },
              orderBy: { completedAt: 'desc' },
            }),
            prisma.aIGeneratedWOD.findFirst({
              where: {
                clientId: client.id,
                status: 'COMPLETED',
                completedAt: { not: null },
              },
              select: {
                id: true,
                title: true,
                primarySport: true,
                actualDuration: true,
                requestedDuration: true,
                sessionRPE: true,
                completedAt: true,
                source: true,
              },
              orderBy: { completedAt: 'desc' },
            }),
          ])

          const adHocSummary = parseAdHocWorkoutSummary(adHocWorkout?.parsedStructure)
          const completedItems = ([
            programLog && {
              source: 'program-log',
              id: programLog.id,
              date: programLog.completedAt,
              name: programLog.workout.name,
              type: programLog.workout.type,
              programName: programLog.workout.day.week.program.name,
              durationMinutes: programLog.duration ?? programLog.workout.duration,
              distanceKm: programLog.distance ?? programLog.workout.distance,
              rpe: programLog.perceivedEffort,
              metrics: {
                avgHR: programLog.avgHR,
                maxHR: programLog.maxHR,
                avgPower: programLog.avgPower,
                tss: programLog.tss,
                feeling: programLog.feeling,
              },
            },
            adHocWorkout && {
              source: 'ad-hoc',
              id: adHocWorkout.id,
              date: adHocWorkout.workoutDate,
              name: adHocSummary.name ?? adHocWorkout.workoutName ?? 'Ad-hoc pass',
              type: adHocSummary.type ?? adHocWorkout.parsedType ?? 'OTHER',
              durationMinutes: adHocSummary.duration,
              distanceKm: adHocSummary.distance,
              rpe: adHocSummary.perceivedEffort,
              metrics: { inputType: adHocWorkout.inputType },
            },
            garminActivity && {
              source: 'garmin',
              id: garminActivity.id,
              date: garminActivity.startDate,
              name: garminActivity.name ?? garminActivity.type,
              type: garminActivity.mappedType ?? garminActivity.type,
              durationMinutes: garminActivity.duration ? Math.round(garminActivity.duration / 60) : null,
              distanceKm: garminActivity.distance ? garminActivity.distance / 1000 : null,
              rpe: null,
              metrics: {
                avgHR: garminActivity.averageHeartrate,
                maxHR: garminActivity.maxHeartrate,
                avgPower: garminActivity.averageWatts,
                tss: garminActivity.tss,
                deviceName: garminActivity.deviceName,
              },
            },
            strengthAssignment && {
              source: 'strength-assignment',
              id: strengthAssignment.id,
              date: strengthAssignment.completedAt,
              name: strengthAssignment.session.name,
              type: 'STRENGTH',
              durationMinutes: strengthAssignment.duration,
              distanceKm: null,
              rpe: strengthAssignment.rpe,
              metrics: { phase: strengthAssignment.session.phase },
            },
            cardioAssignment && {
              source: 'cardio-assignment',
              id: cardioAssignment.id,
              date: cardioAssignment.completedAt,
              name: cardioAssignment.session.name,
              type: cardioAssignment.session.sport,
              durationMinutes: cardioAssignment.actualDuration ? Math.round(cardioAssignment.actualDuration / 60) : null,
              distanceKm: cardioAssignment.actualDistance ? cardioAssignment.actualDistance / 1000 : null,
              rpe: null,
              metrics: { avgHR: cardioAssignment.avgHeartRate },
            },
            hybridAssignment && {
              source: 'hybrid-assignment',
              id: hybridAssignment.id,
              date: hybridAssignment.completedAt,
              name: hybridAssignment.workout.name,
              type: 'HYBRID',
              durationMinutes: null,
              distanceKm: null,
              rpe: null,
              metrics: { format: hybridAssignment.workout.format },
            },
            agilityAssignment && {
              source: 'agility-assignment',
              id: agilityAssignment.id,
              date: agilityAssignment.completedAt,
              name: agilityAssignment.workout.name,
              type: 'AGILITY',
              durationMinutes: null,
              distanceKm: null,
              rpe: null,
              metrics: {},
            },
            completedWOD && {
              source: completedWOD.source === 'chat' ? 'ai-chat-wod' : 'wod',
              id: completedWOD.id,
              date: completedWOD.completedAt,
              name: completedWOD.title,
              type: completedWOD.primarySport ?? 'WOD',
              durationMinutes: completedWOD.actualDuration ?? completedWOD.requestedDuration,
              distanceKm: null,
              rpe: completedWOD.sessionRPE,
              metrics: {},
            },
          ] as Array<CompletedWorkoutItem | null | false>).filter(
            (item): item is CompletedWorkoutItem => typeof item === 'object' && item !== null && Boolean(item.date)
          )
            .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

          const latestWorkout = completedItems[0] ?? null

          if (!latestWorkout) {
            return {
              success: true,
              athlete: { id: client.id, name: client.name, team: client.team?.name ?? null },
              latestWorkout: null,
              message: toolText(
                locale,
                `${client.name} has no completed workouts in the available history.`,
                `${client.name} har inga genomförda pass i den tillgängliga historiken.`
              ),
            }
          }

          return {
            success: true,
            athlete: { id: client.id, name: client.name, team: client.team?.name ?? null },
            latestWorkout: {
              ...latestWorkout,
              completedAt: latestWorkout.date?.toISOString(),
            },
            checkedSources: completedItems.length,
            message: toolText(
              locale,
              `${client.name}'s latest completed workout is "${latestWorkout.name}" (${latestWorkout.type}) from ${latestWorkout.date?.toISOString().slice(0, 10)}.`,
              `${client.name}s senaste genomförda pass är "${latestWorkout.name}" (${latestWorkout.type}) från ${latestWorkout.date?.toISOString().slice(0, 10)}.`
            ),
          }
        } catch (error) {
          logger.error('Error in getLatestCompletedWorkout tool', { coachUserId, clientId, athleteName }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not fetch the latest completed workout.', 'Kunde inte hämta senaste genomförda pass.'),
          }
        }
      },
    }),
  }
}
