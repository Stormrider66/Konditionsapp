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
import {
  ownedStrengthSessionWhere,
  resolveStrengthBusinessScope,
  strengthSessionAccessWhere,
} from '@/lib/strength/session-business-scope';
import { checkWorkoutAssignmentRestrictions } from '@/lib/training-restrictions/assignment-enforcement';
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale';

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

type AssignmentLocale = AppLocale;
type AssignmentAthleteLocaleSource = {
  user?: { language: string | null } | null;
  athleteAccount?: { user?: { language: string | null } | null } | null;
};

function savedAssignmentLocale(value: string | null | undefined): AssignmentLocale {
  return value === 'sv' ? 'sv' : 'en';
}

function resolveAssignmentLocale(athlete?: AssignmentAthleteLocaleSource): AssignmentLocale {
  return savedAssignmentLocale(athlete?.athleteAccount?.user?.language ?? athlete?.user?.language);
}

function assignmentText(locale: AssignmentLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

function buildCalendarEventDescription(locale: AssignmentLocale, locationDisplay?: string, notes?: string): string | undefined {
  if (!locationDisplay) return notes || undefined;
  return `${assignmentText(locale, 'Location', 'Plats')}: ${locationDisplay}${notes ? `\n\n${notes}` : ''}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveStrengthBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: assignmentText(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }

    const { id } = await context.params;

    // Verify session exists and coach has access
    const session = await prisma.strengthSession.findFirst({
      where: {
        id,
        AND: [strengthSessionAccessWhere(user.id, businessScope.businessId)],
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: assignmentText(locale, 'Session not found', 'Passet hittades inte') },
        { status: 404 }
      );
    }

    const assignments = await prisma.strengthSessionAssignment.findMany({
      where: {
        sessionId: id,
        ...(businessScope.businessId ? { athlete: { businessId: businessScope.businessId } } : {}),
      },
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
      { error: assignmentText(locale, 'Failed to fetch assignments', 'Kunde inte hämta tilldelningar') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveStrengthBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: assignmentText(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }

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
        { error: assignmentText(locale, 'At least one athlete ID is required', 'Minst ett idrottar-ID krävs') },
        { status: 400 }
      );
    }

    // Verify session exists and coach owns it
    const session = await prisma.strengthSession.findFirst({
      where: ownedStrengthSessionWhere(id, user.id, businessScope.businessId),
    });

    if (!session) {
      return NextResponse.json(
        { error: assignmentText(locale, 'Session not found or you do not have permission to assign it', 'Passet hittades inte eller så saknar du behörighet att tilldela det') },
        { status: 404 }
      );
    }

    // Verify athletes belong to coach
    const athletes = await prisma.client.findMany({
      where: {
        id: { in: athleteIds },
        ...(businessScope.businessId
          ? { businessId: businessScope.businessId }
          : { userId: user.id }),
      },
      select: {
        id: true,
        name: true,
        businessId: true,
        user: { select: { language: true } },
        athleteAccount: { select: { user: { select: { language: true } } } },
      },
    });

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: assignmentText(locale, 'One or more athletes not found or not owned by you', 'En eller flera idrottare hittades inte eller tillhör inte dig') },
        { status: 400 }
      );
    }

    // Physio restriction enforcement: skip athletes blocked for this session.
    const { blockedByAthlete } = await checkWorkoutAssignmentRestrictions({
      workoutType: 'strength',
      workoutId: id,
      athleteIds,
    });
    const assignableIds = athleteIds.filter((aid: string) => !blockedByAthlete.has(aid));
    const skipped = athleteIds
      .filter((aid: string) => blockedByAthlete.has(aid))
      .map((aid: string) => ({ athleteId: aid, reasons: blockedByAthlete.get(aid)?.reasons ?? [] }));
    if (assignableIds.length === 0) {
      return NextResponse.json(
        {
          error: assignmentText(
            locale,
            'All selected athletes are blocked by an active restriction for this session',
            'Alla valda idrottare blockeras av en aktiv begränsning för detta pass'
          ),
          skipped,
        },
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
          { error: assignmentText(locale, 'Location not found', 'Platsen hittades inte') },
          { status: 400 }
        );
      }
    }

    // Create assignments
    const date = assignedDate ? new Date(assignedDate) : new Date();
    const hasScheduling = !!startTime;
    const athletesById = new Map(athletes.map((athlete) => [athlete.id, athlete]));

    const assignments = await Promise.all(
      // Create each athlete's calendar event and the assignment that links to
      // it inside one transaction, so a failed upsert can't leave an orphaned
      // calendar event behind.
      assignableIds.map((athleteId: string) =>
        prisma.$transaction(async (tx) => {
          // Create calendar event if scheduling is enabled
          let calendarEventId: string | undefined;

          if (createCalendarEvent) {
            const athleteLocale = resolveAssignmentLocale(athletesById.get(athleteId));
            const locationDisplay = locationName || (locationId ? assignmentText(athleteLocale, 'Scheduled location', 'Schemalagd plats') : undefined);

            const calendarEvent = await tx.calendarEvent.create({
              data: {
                clientId: athleteId,
                type: 'SCHEDULED_WORKOUT',
                title: `${assignmentText(athleteLocale, 'Strength', 'Styrka')}: ${session.name}`,
                description: buildCalendarEventDescription(athleteLocale, locationDisplay, notes),
                status: 'SCHEDULED',
                startDate: date,
                endDate: date,
                allDay: !hasScheduling,
                startTime,
                endTime,
                trainingImpact: 'NORMAL',
                createdById: user.id,
              },
            });
            calendarEventId = calendarEvent.id;
          }

          return tx.strengthSessionAssignment.upsert({
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
      )
    );

    return NextResponse.json({ assignments, skipped }, { status: 201 });
  } catch (error) {
    logError('Error creating assignments:', error);
    return NextResponse.json(
      { error: assignmentText(locale, 'Failed to create assignments', 'Kunde inte skapa tilldelningar') },
      { status: 500 }
    );
  }
}
