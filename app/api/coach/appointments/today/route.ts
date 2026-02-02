/**
 * Today's Appointments API
 *
 * GET - Fetch all scheduled workouts for today, including external calendar events (Bokadirekt, Zoezi, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { startOfDay, endOfDay, format, parseISO, isWithinInterval } from 'date-fns';
import { logError } from '@/lib/logger-console';
import { fetchAndParseICalUrl } from '@/lib/calendar/ical-parser';

export interface TodaysAppointment {
  id: string;
  type: 'strength' | 'cardio' | 'agility' | 'hybrid' | 'external';
  workoutName: string;
  startTime: string;
  endTime: string | null;
  location: { id: string; name: string } | null;
  locationName: string | null;
  athletes: { id: string; name: string }[];
  teamName: string | null;
  assignedDate: Date;
  status: string;
  // External calendar fields
  source?: string; // 'BOKADIREKT', 'ZOEZI', etc.
  description?: string;
  color?: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    // Support date parameter for viewing other days
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Fetch all four types of assignments with scheduling info for today
    const [strengthAssignments, cardioAssignments, agilityAssignments, hybridAssignments] = await Promise.all([
      prisma.strengthSessionAssignment.findMany({
        where: {
          assignedDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          startTime: { not: null },
          OR: [
            { session: { coachId: user.id } },
            { responsibleCoachId: user.id },
          ],
        },
        include: {
          session: {
            select: { id: true, name: true },
          },
          athlete: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true },
          },
          teamBroadcast: {
            select: {
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),

      prisma.cardioSessionAssignment.findMany({
        where: {
          assignedDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          startTime: { not: null },
          session: {
            coachId: user.id,
          },
        },
        include: {
          session: {
            select: { id: true, name: true },
          },
          athlete: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true },
          },
          teamBroadcast: {
            select: {
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),

      prisma.agilityWorkoutAssignment.findMany({
        where: {
          assignedDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          startTime: { not: null },
          workout: {
            coachId: user.id,
          },
        },
        include: {
          workout: {
            select: { id: true, name: true },
          },
          athlete: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true },
          },
          teamBroadcast: {
            select: {
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),

      prisma.hybridWorkoutAssignment.findMany({
        where: {
          assignedDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          startTime: { not: null },
          workout: {
            coachId: user.id,
          },
        },
        include: {
          workout: {
            select: { id: true, name: true },
          },
          athlete: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true },
          },
          teamBroadcast: {
            select: {
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    // Group assignments by session/workout and time to combine athletes
    const groupedAppointments = new Map<string, TodaysAppointment>();

    // Process strength assignments
    for (const assignment of strengthAssignments) {
      const key = `strength-${assignment.sessionId}-${assignment.startTime}`;
      const existing = groupedAppointments.get(key);

      if (existing) {
        existing.athletes.push(assignment.athlete);
      } else {
        groupedAppointments.set(key, {
          id: assignment.id,
          type: 'strength',
          workoutName: assignment.session.name,
          startTime: assignment.startTime!,
          endTime: assignment.endTime,
          location: assignment.location,
          locationName: assignment.locationName,
          athletes: [assignment.athlete],
          teamName: assignment.teamBroadcast?.team?.name || null,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
        });
      }
    }

    // Process cardio assignments
    for (const assignment of cardioAssignments) {
      const key = `cardio-${assignment.sessionId}-${assignment.startTime}`;
      const existing = groupedAppointments.get(key);

      if (existing) {
        existing.athletes.push(assignment.athlete);
      } else {
        groupedAppointments.set(key, {
          id: assignment.id,
          type: 'cardio',
          workoutName: assignment.session.name,
          startTime: assignment.startTime!,
          endTime: assignment.endTime,
          location: assignment.location,
          locationName: assignment.locationName,
          athletes: [assignment.athlete],
          teamName: assignment.teamBroadcast?.team?.name || null,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
        });
      }
    }

    // Process agility assignments
    for (const assignment of agilityAssignments) {
      const key = `agility-${assignment.workoutId}-${assignment.startTime}`;
      const existing = groupedAppointments.get(key);

      if (existing) {
        existing.athletes.push(assignment.athlete);
      } else {
        groupedAppointments.set(key, {
          id: assignment.id,
          type: 'agility',
          workoutName: assignment.workout.name || 'Agility workout',
          startTime: assignment.startTime!,
          endTime: assignment.endTime,
          location: assignment.location,
          locationName: assignment.locationName,
          athletes: [assignment.athlete],
          teamName: assignment.teamBroadcast?.team?.name || null,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
        });
      }
    }

    // Process hybrid assignments
    for (const assignment of hybridAssignments) {
      const key = `hybrid-${assignment.workoutId}-${assignment.startTime}`;
      const existing = groupedAppointments.get(key);

      if (existing) {
        existing.athletes.push(assignment.athlete);
      } else {
        groupedAppointments.set(key, {
          id: assignment.id,
          type: 'hybrid',
          workoutName: assignment.workout.name || 'Hybrid workout',
          startTime: assignment.startTime!,
          endTime: assignment.endTime,
          location: assignment.location,
          locationName: assignment.locationName,
          athletes: [assignment.athlete],
          teamName: assignment.teamBroadcast?.team?.name || null,
          assignedDate: assignment.assignedDate,
          status: assignment.status,
        });
      }
    }

    // Fetch external calendar events (Bokadirekt, Zoezi, etc.)
    const externalConnections = await prisma.externalCalendarConnection.findMany({
      where: {
        userId: user.id,
        syncEnabled: true,
        icalUrl: { not: null },
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        icalUrl: true,
        color: true,
      },
    });

    // Fetch and parse external calendar events for today
    for (const connection of externalConnections) {
      if (!connection.icalUrl) continue;

      try {
        const parseResult = await fetchAndParseICalUrl(connection.icalUrl);

        if (parseResult.success || parseResult.events.length > 0) {
          // Filter events for the target date
          for (const event of parseResult.events) {
            const eventStart = new Date(event.startDate);
            const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;

            // Check if event falls on the target day
            const eventFallsOnDay =
              isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
              isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
              (eventStart <= dayStart && eventEnd >= dayEnd);

            if (eventFallsOnDay) {
              // Extract time from the event
              let startTime = '00:00';
              let endTime: string | null = null;

              if (!event.allDay) {
                startTime = format(eventStart, 'HH:mm');
                if (event.endDate) {
                  endTime = format(new Date(event.endDate), 'HH:mm');
                }
              }

              const key = `external-${connection.id}-${event.uid}`;

              if (!groupedAppointments.has(key)) {
                groupedAppointments.set(key, {
                  id: `ext-${event.uid}`,
                  type: 'external',
                  workoutName: event.summary || 'Unnamed event',
                  startTime,
                  endTime,
                  location: null,
                  locationName: event.location || null,
                  athletes: [],
                  teamName: null,
                  assignedDate: eventStart,
                  status: 'SCHEDULED',
                  source: connection.provider,
                  description: event.description || undefined,
                  color: connection.color || undefined,
                });
              }
            }
          }

          // Update last sync time
          await prisma.externalCalendarConnection.update({
            where: { id: connection.id },
            data: {
              lastSyncAt: new Date(),
              lastSyncError: null,
            },
          });
        }
      } catch (error) {
        // Log error but don't fail the whole request
        logError(`Error fetching external calendar ${connection.calendarName}:`, error);

        // Update connection with error
        await prisma.externalCalendarConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // Convert to array and sort by start time
    const appointments = Array.from(groupedAppointments.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    return NextResponse.json({ appointments });
  } catch (error) {
    logError('Error fetching today\'s appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
