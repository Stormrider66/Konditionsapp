/**
 * Cardio Session Assignment API
 *
 * GET  - List assignments for a session
 * POST - Assign session to athlete(s) with optional scheduling and Garmin push
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'
import { logger } from '@/lib/logger'
import {
  cardioSessionAccessWhere,
  ownedCardioSessionWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope'
import {
  createGarminWorkout,
  parseNumberTargetBounds,
  parsePaceTargetBounds,
  resolveGarminWorkoutId,
  scheduleGarminWorkout,
  serializeWorkoutToGarmin,
} from '@/lib/integrations/garmin/training'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AssignmentRequest {
  athleteIds: string[];
  assignedDate: string;
  notes?: string;
  pushToGarmin?: boolean;
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

// Cardio segment type as stored in DB JSON
interface CardioSegment {
  type: string
  duration?: number  // seconds
  distance?: number  // meters
  calories?: number  // kcal
  zone?: number
  pace?: string      // "5:00/km"
  heartRate?: string // "140-150 bpm"
  power?: string     // "250" or "240-260"
  cadence?: string   // "90" or "85-95"
  notes?: string
  equipment?: string
  targetType?: string
  targetValue?: string
  repeats?: number
  restDuration?: number // seconds
  // Repeat group fields
  steps?: CardioChildStep[]
  restBetweenRounds?: number // seconds
}

interface CardioChildStep {
  type: string
  duration?: number  // seconds
  distance?: number  // meters
  calories?: number  // kcal (Garmin uses LAP_BUTTON for calorie steps)
  zone?: number
  pace?: string
  heartRate?: string
  notes?: string     // equipment description
  equipment?: string
  targetType?: string // 'power' | 'pace' | 'cadence' | 'hr' | 'calories' | 'none'
  targetValue?: string // "250", "62", "2:05"
}

function buildGarminStepDescription(input: {
  notes?: string
  equipment?: string
  calories?: number
  targetType?: string
  targetValue?: string
}): string | undefined {
  const parts: string[] = []
  if (input.equipment) parts.push(input.equipment)
  if (input.notes) parts.push(input.notes)
  if (input.calories) parts.push(`${input.calories} cal`)
  if (input.targetType === 'calories' && input.targetValue) parts.push(`${input.targetValue} cal`)
  return parts.length > 0 ? parts.join(' — ') : undefined
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: assignmentText(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }
    const { id } = await context.params;

    // Verify session exists and coach has access
    const session = await prisma.cardioSession.findFirst({
      where: {
        id,
        AND: [cardioSessionAccessWhere(user.id, businessScope.businessId)],
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: assignmentText(locale, 'Session not found', 'Passet hittades inte') },
        { status: 404 }
      );
    }

    const assignments = await prisma.cardioSessionAssignment.findMany({
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
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: assignmentText(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }
    const { id } = await context.params;
    const body: AssignmentRequest = await request.json();

    const {
      athleteIds,
      assignedDate,
      notes,
      pushToGarmin,
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
    const session = await prisma.cardioSession.findFirst({
      where: ownedCardioSessionWhere(id, user.id, businessScope.businessId),
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

    // If Garmin push requested, check which athletes have Garmin connected
    const garminTokensByAthlete: Map<string, boolean> = new Map();
    if (pushToGarmin) {
      const garminTokens = await prisma.integrationToken.findMany({
        where: {
          clientId: { in: athleteIds },
          type: 'GARMIN',
          syncEnabled: true,
        },
        select: { clientId: true },
      });
      for (const t of garminTokens) {
        garminTokensByAthlete.set(t.clientId, true);
      }
    }

    // Create assignments
    const date = assignedDate ? new Date(assignedDate) : new Date();
    const dateStr = assignedDate || new Date().toISOString().split('T')[0];
    const hasScheduling = !!startTime;
    const athletesById = new Map(athletes.map((athlete) => [athlete.id, athlete]));

    // Prepare Garmin workout once if needed (same workout for all athletes)
    let garminWorkoutPayload: ReturnType<typeof serializeWorkoutToGarmin> | null = null;
    if (pushToGarmin && garminTokensByAthlete.size > 0) {
      const segments = (session.segments as unknown as CardioSegment[]) || [];
      const garminSegments = segments
        .filter((s) => s.type !== 'CORE' && s.type !== 'PREHAB' && s.type !== 'PLYOMETRIC')
        .map((s) => {
        // REPEAT_GROUP: multi-step repeat block
        if (s.type === 'REPEAT_GROUP' && s.steps && s.steps.length > 0) {
          const childSteps = s.steps.map((step) => {
            const description = buildGarminStepDescription(step);

            return {
              type: mapSegmentType(step.type),
              // Calorie steps use LAP_BUTTON (athlete presses lap when done)
              ...(step.calories && !step.duration && !step.distance
                ? { durationIsLapButton: true }
                : {}),
              durationSeconds: step.duration || undefined,
              distanceMeters: step.distance || undefined,
              targetType: resolveChildTargetType(step),
              targetLow: resolveChildTargetLow(step),
              targetHigh: resolveChildTargetHigh(step),
              description,
            };
          });

          // Add rest between rounds if specified
          if (s.restBetweenRounds && s.restBetweenRounds > 0) {
            childSteps.push({
              type: 'recovery' as const,
              durationSeconds: s.restBetweenRounds,
              distanceMeters: undefined,
              targetType: undefined,
              targetLow: undefined,
              targetHigh: undefined,
              description: undefined,
            });
          }

          return {
            type: 'interval' as const,
            repeats: s.repeats || 1,
            steps: childSteps,
          };
        }

        // Single-step repeat block (legacy intervals with repeats)
        if (s.repeats && s.repeats > 1) {
          const isCalorieBased = s.calories && !s.duration && !s.distance;
          const workStep = {
            type: 'interval' as const,
            durationSeconds: s.duration || undefined,
            distanceMeters: s.distance || undefined,
            ...(isCalorieBased ? { durationIsLapButton: true } : {}),
            targetType: resolveTargetType(s),
            targetLow: resolveTargetLow(s),
            targetHigh: resolveTargetHigh(s),
            description: buildGarminStepDescription(s),
          };

          const steps: Array<{
            type: string;
            durationSeconds?: number;
            distanceMeters?: number;
            durationIsLapButton?: boolean;
            targetType?: string;
            targetLow?: number;
            targetHigh?: number;
            description?: string;
          }> = [workStep];

          if (s.restDuration && s.restDuration > 0) {
            steps.push({
              type: 'recovery',
              durationSeconds: s.restDuration,
            });
          }

          return {
            type: mapSegmentType(s.type),
            repeats: s.repeats,
            steps,
          };
        }

        // Single step (warmup, cooldown, steady, etc.)
        return {
          type: mapSegmentType(s.type),
          durationSeconds: s.duration || undefined,
          distanceMeters: s.distance || undefined,
          repeats: undefined,
          targetType: resolveTargetType(s),
          targetLow: resolveTargetLow(s),
          targetHigh: resolveTargetHigh(s),
          description: buildGarminStepDescription(s),
        };
      });

      if (garminSegments.length > 0) {
        garminWorkoutPayload = serializeWorkoutToGarmin({
          name: session.name,
          description: session.description || undefined,
          sportType: session.sport,
          segments: garminSegments as Parameters<typeof serializeWorkoutToGarmin>[0]['segments'],
        });
      }
    }

    const garminResults: Array<{ athleteId: string; success: boolean; error?: string }> = [];

    const assignments = await Promise.all(
      athleteIds.map(async (athleteId: string) => {
        // Create calendar event if scheduling is enabled
        let calendarEventId: string | undefined;

        if (createCalendarEvent) {
          const athleteLocale = resolveAssignmentLocale(athletesById.get(athleteId));
          const locationDisplay = locationName || (locationId ? assignmentText(athleteLocale, 'Scheduled location', 'Schemalagd plats') : undefined);

          const calendarEvent = await prisma.calendarEvent.create({
            data: {
              clientId: athleteId,
              type: 'SCHEDULED_WORKOUT',
              title: `${assignmentText(athleteLocale, 'Cardio', 'Kondition')}: ${session.name}`,
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

        // Push to Garmin if requested and athlete has connection
        let garminWorkoutId: string | undefined;
        let garminPushedAt: Date | undefined;

        if (pushToGarmin && garminWorkoutPayload && garminTokensByAthlete.has(athleteId)) {
          try {
            logger.info('[Garmin Push] Sending workout', { athleteId, payload: JSON.stringify(garminWorkoutPayload, null, 2).slice(0, 2000) });
            const created = await createGarminWorkout(athleteId, garminWorkoutPayload);

            const workoutIdStr = resolveGarminWorkoutId(created);
            if (workoutIdStr) {
              // Schedule on the assigned date
              if (dateStr) {
                try {
                  logger.info('[Garmin Schedule]', { workoutId: workoutIdStr, date: dateStr })
                  await scheduleGarminWorkout(athleteId, {
                    workoutId: workoutIdStr,
                    calendarDate: dateStr,
                  });
                } catch (schedErr) {
                  logError('Garmin schedule failed (workout created):', schedErr);
                }
              }

              garminWorkoutId = workoutIdStr;
              garminPushedAt = new Date();
              garminResults.push({ athleteId, success: true });
            } else {
              garminResults.push({
                athleteId,
                success: false,
                error: 'Garmin did not return a workout ID',
              });
            }
          } catch (garminErr) {
            logError('Garmin push failed for athlete:', athleteId, garminErr);
            garminResults.push({
              athleteId,
              success: false,
              error: garminErr instanceof Error ? garminErr.message : 'Unknown error',
            });
          }
        }

        return prisma.cardioSessionAssignment.upsert({
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
            calendarEventId,
            ...(garminWorkoutId && { garminWorkoutId, garminPushedAt }),
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
            calendarEventId,
            ...(garminWorkoutId && { garminWorkoutId, garminPushedAt }),
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

    return NextResponse.json({
      assignments,
      ...(pushToGarmin && { garminResults }),
    }, { status: 201 });
  } catch (error) {
    logError('Error creating assignments:', error);
    return NextResponse.json(
      { error: assignmentText(locale, 'Failed to create assignments', 'Kunde inte skapa tilldelningar') },
      { status: 500 }
    );
  }
}

// ─── Garmin Segment Helpers ──────────────────────────────────────────────────

function mapSegmentType(
  type: string
): 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest' | 'steady' {
  const map: Record<string, 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest' | 'steady'> = {
    warmup: 'warmup',
    WARMUP: 'warmup',
    cooldown: 'cooldown',
    COOLDOWN: 'cooldown',
    interval: 'interval',
    INTERVAL: 'interval',
    recovery: 'recovery',
    RECOVERY: 'recovery',
    rest: 'rest',
    REST: 'rest',
    steady: 'steady',
    STEADY: 'steady',
    HILL: 'interval',
    DRILLS: 'warmup',
  }
  return map[type] || 'interval'
}

function resolveTargetType(
  segment: { heartRate?: string; pace?: string; power?: string; cadence?: string; targetType?: string; targetValue?: string; zone?: number }
): 'hr' | 'pace' | 'power' | 'cadence' | 'none' {
  if (segment.targetType === 'hr' || segment.targetType === 'pace' || segment.targetType === 'power' || segment.targetType === 'cadence') {
    return segment.targetType
  }
  if (segment.power) return 'power'
  if (segment.cadence) return 'cadence'
  if (segment.heartRate) return 'hr'
  if (segment.pace) return 'pace'
  return 'none'
}

function resolveTargetLow(
  segment: { heartRate?: string; pace?: string; power?: string; cadence?: string; targetType?: string; targetValue?: string }
): number | undefined {
  if (segment.targetType && segment.targetType !== 'none' && segment.targetValue) {
    if (segment.targetType === 'calories') return undefined
    if (segment.targetType === 'pace') return parsePaceTargetBounds(segment.targetValue).low
    return parseNumberTargetBounds(segment.targetValue).low
  }
  if (segment.power) return parseNumberTargetBounds(segment.power).low
  if (segment.cadence) return parseNumberTargetBounds(segment.cadence).low
  if (segment.heartRate) {
    const match = segment.heartRate.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : undefined
  }
  if (segment.pace) {
    return parsePaceTargetBounds(segment.pace).low
  }
  return undefined
}

function resolveTargetHigh(
  segment: { heartRate?: string; pace?: string; power?: string; cadence?: string; targetType?: string; targetValue?: string }
): number | undefined {
  if (segment.targetType && segment.targetType !== 'none' && segment.targetValue) {
    if (segment.targetType === 'calories') return undefined
    if (segment.targetType === 'pace') return parsePaceTargetBounds(segment.targetValue).high
    return parseNumberTargetBounds(segment.targetValue).high
  }
  if (segment.power) return parseNumberTargetBounds(segment.power).high
  if (segment.cadence) return parseNumberTargetBounds(segment.cadence).high
  if (segment.heartRate) {
    const match = segment.heartRate.match(/(\d+)\s*[-–]\s*(\d+)/)
    return match ? parseInt(match[2], 10) : undefined
  }
  if (segment.pace) {
    return parsePaceTargetBounds(segment.pace).high
  }
  return undefined
}

// ─── Child Step Target Helpers (for REPEAT_GROUP steps) ─────────────────────

function resolveChildTargetType(
  step: CardioChildStep
): 'hr' | 'pace' | 'power' | 'cadence' | 'none' | undefined {
  if (step.targetType === 'hr' || step.targetType === 'pace' || step.targetType === 'power' || step.targetType === 'cadence') {
    return step.targetType
  }
  // Fall back to legacy fields
  if (step.heartRate) return 'hr'
  if (step.pace) return 'pace'
  return undefined
}

function resolveChildTargetLow(step: CardioChildStep): number | undefined {
  if (step.targetType && step.targetType !== 'none' && step.targetValue) {
    if (step.targetType === 'calories') return undefined
    if (step.targetType === 'pace') {
      return parsePaceTargetBounds(step.targetValue).low
    }
    return parseNumberTargetBounds(step.targetValue).low
  }
  // Fall back to legacy
  return resolveTargetLow(step)
}

function resolveChildTargetHigh(step: CardioChildStep): number | undefined {
  if (step.targetType && step.targetType !== 'none' && step.targetValue) {
    if (step.targetType === 'calories') return undefined
    if (step.targetType === 'pace') {
      return parsePaceTargetBounds(step.targetValue).high
    }
    return parseNumberTargetBounds(step.targetValue).high
  }
  return resolveTargetHigh(step)
}
