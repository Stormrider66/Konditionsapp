/**
 * Today's Appointments API
 *
 * GET - Fetch all scheduled workouts for today
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { startOfDay, endOfDay } from 'date-fns';
import { logError } from '@/lib/logger-console';

export interface TodaysAppointment {
  id: string;
  type: 'strength' | 'cardio' | 'agility' | 'hybrid';
  workoutName: string;
  startTime: string;
  endTime: string | null;
  location: { id: string; name: string } | null;
  locationName: string | null;
  athletes: { id: string; name: string }[];
  teamName: string | null;
  assignedDate: Date;
  status: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Fetch all four types of assignments with scheduling info for today
    const [strengthAssignments, cardioAssignments, agilityAssignments, hybridAssignments] = await Promise.all([
      prisma.strengthSessionAssignment.findMany({
        where: {
          assignedDate: {
            gte: todayStart,
            lte: todayEnd,
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

      prisma.cardioSessionAssignment.findMany({
        where: {
          assignedDate: {
            gte: todayStart,
            lte: todayEnd,
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
            gte: todayStart,
            lte: todayEnd,
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
            gte: todayStart,
            lte: todayEnd,
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
