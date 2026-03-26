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
import {
  createGarminWorkout,
  scheduleGarminWorkout,
  serializeWorkoutToGarmin,
} from '@/lib/integrations/garmin/training'

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

// Cardio segment type as stored in DB JSON
interface CardioSegment {
  type: string
  duration?: number  // seconds
  distance?: number  // meters
  zone?: number
  pace?: string      // "5:00/km"
  heartRate?: string // "140-150 bpm"
  notes?: string
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
  zone?: number
  pace?: string
  heartRate?: string
  notes?: string     // equipment description
  targetType?: string // 'power' | 'pace' | 'cadence' | 'hr' | 'none'
  targetValue?: string // "250", "62", "2:05"
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    // Verify session exists and coach has access
    const session = await prisma.cardioSession.findFirst({
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

    const assignments = await prisma.cardioSessionAssignment.findMany({
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
        { error: 'At least one athlete ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists and coach owns it
    const session = await prisma.cardioSession.findFirst({
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

    // If Garmin push requested, check which athletes have Garmin connected
    let garminTokensByAthlete: Map<string, boolean> = new Map();
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

    // Prepare Garmin workout once if needed (same workout for all athletes)
    let garminWorkoutPayload: ReturnType<typeof serializeWorkoutToGarmin> | null = null;
    if (pushToGarmin && garminTokensByAthlete.size > 0) {
      const segments = (session.segments as unknown as CardioSegment[]) || [];
      const garminSegments = segments.map((s) => {
        // REPEAT_GROUP: multi-step repeat block
        if (s.type === 'REPEAT_GROUP' && s.steps && s.steps.length > 0) {
          const childSteps = s.steps.map((step) => ({
            type: mapSegmentType(step.type),
            durationSeconds: step.duration || undefined,
            distanceMeters: step.distance || undefined,
            targetType: resolveChildTargetType(step),
            targetLow: resolveChildTargetLow(step),
            targetHigh: resolveChildTargetHigh(step),
            description: step.notes || undefined,
          }));

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
          const workStep = {
            type: 'interval' as const,
            durationSeconds: s.duration || undefined,
            distanceMeters: s.distance || undefined,
            targetType: resolveTargetType(s),
            targetLow: resolveTargetLow(s),
            targetHigh: resolveTargetHigh(s),
          };

          const steps: typeof workStep[] = [workStep];

          if (s.restDuration && s.restDuration > 0) {
            steps.push({
              type: 'recovery' as const,
              durationSeconds: s.restDuration,
              distanceMeters: undefined,
              targetType: undefined,
              targetLow: undefined,
              targetHigh: undefined,
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

        if (hasScheduling && createCalendarEvent) {
          const locationDisplay = locationName || (locationId ? 'Scheduled location' : undefined);

          const calendarEvent = await prisma.calendarEvent.create({
            data: {
              clientId: athleteId,
              type: 'SCHEDULED_WORKOUT',
              title: `Kondition: ${session.name}`,
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

        // Push to Garmin if requested and athlete has connection
        let garminWorkoutId: string | undefined;
        let garminPushedAt: Date | undefined;

        if (pushToGarmin && garminWorkoutPayload && garminTokensByAthlete.has(athleteId)) {
          try {
            const created = await createGarminWorkout(athleteId, garminWorkoutPayload);

            if (created.workoutId) {
              // Schedule on the assigned date
              try {
                await scheduleGarminWorkout(athleteId, {
                  workoutId: created.workoutId,
                  calendarDate: dateStr,
                });
              } catch (schedErr) {
                // Workout was created but scheduling failed — still save the workout ID
                logError('Garmin schedule failed (workout created):', schedErr);
              }

              garminWorkoutId = created.workoutId;
              garminPushedAt = new Date();
              garminResults.push({ athleteId, success: true });
            }
          } catch (garminErr) {
            logError('Garmin push failed for athlete:', garminErr);
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
      { error: 'Failed to create assignments' },
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
  segment: { heartRate?: string; pace?: string; zone?: number }
): 'hr' | 'pace' | 'none' {
  if (segment.heartRate) return 'hr'
  if (segment.pace) return 'pace'
  return 'none'
}

function resolveTargetLow(
  segment: { heartRate?: string; pace?: string }
): number | undefined {
  if (segment.heartRate) {
    const match = segment.heartRate.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : undefined
  }
  if (segment.pace) {
    return parsePaceToMetersPerSecond(segment.pace)
  }
  return undefined
}

function resolveTargetHigh(
  segment: { heartRate?: string; pace?: string }
): number | undefined {
  if (segment.heartRate) {
    const match = segment.heartRate.match(/(\d+)\s*[-–]\s*(\d+)/)
    return match ? parseInt(match[2], 10) : undefined
  }
  if (segment.pace) {
    return parsePaceToMetersPerSecond(segment.pace)
  }
  return undefined
}

function parsePaceToMetersPerSecond(pace: string): number | undefined {
  const match = pace.match(/(\d+):(\d+)/)
  if (!match) return undefined
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  const totalSeconds = minutes * 60 + seconds
  if (totalSeconds === 0) return undefined
  return 1000 / totalSeconds
}

// ─── Child Step Target Helpers (for REPEAT_GROUP steps) ─────────────────────

function resolveChildTargetType(
  step: CardioChildStep
): 'hr' | 'pace' | 'power' | 'cadence' | 'none' | undefined {
  if (step.targetType && step.targetType !== 'none') {
    return step.targetType as 'hr' | 'pace' | 'power' | 'cadence'
  }
  // Fall back to legacy fields
  if (step.heartRate) return 'hr'
  if (step.pace) return 'pace'
  return undefined
}

function resolveChildTargetLow(step: CardioChildStep): number | undefined {
  if (step.targetType && step.targetType !== 'none' && step.targetValue) {
    if (step.targetType === 'pace') {
      return parsePaceToMetersPerSecond(step.targetValue)
    }
    // Parse numeric value (handles "250", "240-260")
    const match = step.targetValue.match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : undefined
  }
  // Fall back to legacy
  return resolveTargetLow(step)
}

function resolveChildTargetHigh(step: CardioChildStep): number | undefined {
  if (step.targetType && step.targetType !== 'none' && step.targetValue) {
    if (step.targetType === 'pace') {
      return parsePaceToMetersPerSecond(step.targetValue)
    }
    // Parse range "240-260" or single value
    const rangeMatch = step.targetValue.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
    if (rangeMatch) return parseFloat(rangeMatch[2])
    // Single value — same as low
    const match = step.targetValue.match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : undefined
  }
  return resolveTargetHigh(step)
}
