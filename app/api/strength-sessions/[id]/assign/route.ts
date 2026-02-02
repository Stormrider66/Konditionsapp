/**
 * Strength Session Assignment API
 *
 * GET  - List assignments for a session
 * POST - Assign session to athlete(s) with optional scheduling
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AssignmentRequest {
  athleteIds: string[];
  assignedDate: string;
  notes?: string;
  responsibleCoachId?: string; // Coach who should see this in their calendar
  // Scheduling fields
  startTime?: string;      // "HH:mm" format
  endTime?: string;        // "HH:mm" format
  locationId?: string;
  locationName?: string;
  createCalendarEvent?: boolean;  // default true if startTime provided
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    // Verify session exists and coach has access
    const session = await prisma.strengthSession.findFirst({
      where: {
        id,
        OR: [
          { coachId: user.id },
          { isPublic: true },
        ],
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const assignments = await prisma.strengthSessionAssignment.findMany({
      where: { sessionId: id },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { assignedDate: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    logError('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;
    const body: AssignmentRequest = await request.json();

    const {
      athleteIds,
      assignedDate,
      notes,
      responsibleCoachId,
      startTime,
      endTime,
      locationId,
      locationName,
      createCalendarEvent = true,
    } = body;

    // Validate input
    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one athlete ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists and coach owns it
    const session = await prisma.strengthSession.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to assign it' },
        { status: 404 }
      );
    }

    // Verify athletes belong to coach
    const athletes = await prisma.client.findMany({
      where: {
        id: { in: athleteIds },
        userId: user.id,
      },
      select: { id: true, name: true },
    });

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: 'One or more athletes not found or not owned by you' },
        { status: 400 }
      );
    }

    // Verify location if provided
    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true },
      });
      if (!location) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 400 }
        );
      }
    }

    // Create assignments
    const date = assignedDate ? new Date(assignedDate) : new Date();
    const hasScheduling = !!startTime;

    const assignments = await Promise.all(
      athleteIds.map(async (athleteId: string) => {
        // Create calendar event if scheduling is enabled
        let calendarEventId: string | undefined;

        if (hasScheduling && createCalendarEvent) {
          const athlete = athletes.find(a => a.id === athleteId);
          const locationDisplay = locationName || (locationId ? 'Scheduled location' : undefined);

          const calendarEvent = await prisma.calendarEvent.create({
            data: {
              clientId: athleteId,
              type: 'SCHEDULED_WORKOUT',
              title: `Styrka: ${session.name}`,
              description: locationDisplay
                ? `Plats: ${locationDisplay}${notes ? `\n\n${notes}` : ''}`
                : notes || undefined,
              status: 'SCHEDULED',
              startDate: date,
              endDate: date,
              allDay: false,
              startTime,
              endTime,
              trainingImpact: 'NORMAL',
              createdById: user.id,
            },
          });
          calendarEventId = calendarEvent.id;
        }

        return prisma.strengthSessionAssignment.upsert({
          where: {
            sessionId_athleteId_assignedDate: {
              sessionId: id,
              athleteId,
              assignedDate: date,
            },
          },
          update: {
            notes,
            status: 'PENDING',
            startTime,
            endTime,
            locationId,
            locationName,
            scheduledBy: hasScheduling ? user.id : undefined,
            responsibleCoachId: responsibleCoachId || undefined,
            calendarEventId,
          },
          create: {
            sessionId: id,
            athleteId,
            assignedDate: date,
            assignedBy: user.id,
            notes,
            status: 'PENDING',
            startTime,
            endTime,
            locationId,
            locationName,
            scheduledBy: hasScheduling ? user.id : undefined,
            responsibleCoachId: responsibleCoachId || undefined,
            calendarEventId,
          },
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      })
    );

    return NextResponse.json({ assignments }, { status: 201 });
  } catch (error) {
    logError('Error creating assignments:', error);
    return NextResponse.json(
      { error: 'Failed to create assignments' },
      { status: 500 }
    );
  }
}
