/**
 * VBT Session Detail API
 *
 * GET /api/athlete/vbt/[sessionId] - Get session with all measurements
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'
import {
  calculateLoadVelocityProfile,
  VELOCITY_ZONES,
  getVelocityZone,
} from '@/lib/integrations/vbt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    // Fetch session with measurements
    const session = await prisma.vBTSession.findUnique({
      where: { id: sessionId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            userId: true,
            athleteAccount: { select: { userId: true } }
          },
        },
        measurements: {
          orderBy: [
            { exerciseName: 'asc' },
            { setNumber: 'asc' },
            { repNumber: 'asc' },
          ],
          include: {
            exercise: {
              select: { id: true, name: true, nameSv: true },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const hasAccess = await canAccessClient(user.id, session.clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Group measurements by exercise
    type ExerciseGroup = {
      exerciseName: string;
      exerciseId?: string;
      exerciseMatched: boolean;
      sets: Map<
        number,
        {
          setNumber: number;
          reps: typeof session.measurements;
          velocityLossSet?: number;
        }
      >;
      loadVelocityData: { load: number; velocity: number }[];
    };

    const exerciseGroups = new Map<string, ExerciseGroup>();

    for (const m of session.measurements) {
      const existingGroup = exerciseGroups.get(m.exerciseName);
      const group: ExerciseGroup = existingGroup || {
        exerciseName: m.exerciseName,
        exerciseId: m.exerciseId || undefined,
        exerciseMatched: m.exerciseMatched,
        sets: new Map(),
        loadVelocityData: [] as { load: number; velocity: number }[],
      };

      // Add to set
      const set = group.sets.get(m.setNumber) || {
        setNumber: m.setNumber,
        reps: [],
        velocityLossSet: m.velocityLossSet || undefined,
      };
      set.reps.push(m);
      group.sets.set(m.setNumber, set);

      // Add to load-velocity data if valid
      if (m.load && m.meanVelocity) {
        group.loadVelocityData.push({
          load: m.load,
          velocity: m.meanVelocity,
        });
      }

      exerciseGroups.set(m.exerciseName, group);
    }

    // Calculate load-velocity profiles for each exercise
    const exercisesWithProfiles = Array.from(exerciseGroups.values()).map(
      (group) => {
        const profile =
          group.loadVelocityData.length >= 2
            ? calculateLoadVelocityProfile(group.loadVelocityData, group.exerciseName)
            : null;

        // Sort sets and convert to array
        const setsArray = Array.from(group.sets.values())
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({
            setNumber: set.setNumber,
            velocityLossSet: set.velocityLossSet,
            reps: set.reps.map((r) => ({
              repNumber: r.repNumber,
              load: r.load,
              meanVelocity: r.meanVelocity,
              peakVelocity: r.peakVelocity,
              meanPower: r.meanPower,
              peakPower: r.peakPower,
              rom: r.rom,
              velocityLoss: r.velocityLoss,
              velocityZone: r.velocityZone,
              repQuality: r.repQuality,
            })),
          }));

        // Calculate summary stats
        const allReps = session.measurements.filter(
          (m) => m.exerciseName === group.exerciseName
        );
        const velocities = allReps
          .map((r) => r.meanVelocity)
          .filter((v): v is number => v !== null);
        const loads = allReps
          .map((r) => r.load)
          .filter((l): l is number => l !== null);
        const powers = allReps
          .map((r) => r.meanPower)
          .filter((p): p is number => p !== null);

        return {
          exerciseName: group.exerciseName,
          exerciseId: group.exerciseId,
          exerciseMatched: group.exerciseMatched,
          totalSets: group.sets.size,
          totalReps: allReps.length,
          sets: setsArray,
          stats: {
            avgMeanVelocity:
              velocities.length > 0
                ? Math.round((velocities.reduce((a, b) => a + b, 0) / velocities.length) * 100) / 100
                : null,
            maxMeanVelocity:
              velocities.length > 0
                ? Math.round(Math.max(...velocities) * 100) / 100
                : null,
            minMeanVelocity:
              velocities.length > 0
                ? Math.round(Math.min(...velocities) * 100) / 100
                : null,
            avgLoad:
              loads.length > 0
                ? Math.round((loads.reduce((a, b) => a + b, 0) / loads.length) * 10) / 10
                : null,
            maxLoad: loads.length > 0 ? Math.max(...loads) : null,
            avgPower:
              powers.length > 0
                ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length)
                : null,
            maxPower: powers.length > 0 ? Math.max(...powers) : null,
          },
          loadVelocityProfile: profile
            ? {
                isValid: profile.isValid,
                e1RM: profile.isValid
                  ? Math.round(profile.e1RM_0_2 * 10) / 10
                  : null,
                rSquared:
                  Math.round(profile.rSquared * 100) / 100,
                dataPoints: profile.dataPoints.length,
              }
            : null,
        };
      }
    );

    // Calculate overall session velocity distribution
    const allVelocities = session.measurements
      .map((m) => m.meanVelocity)
      .filter((v): v is number => v !== null);

    const velocityDistribution = {
      STRENGTH: 0,
      STRENGTH_SPEED: 0,
      POWER: 0,
      SPEED_STRENGTH: 0,
      SPEED: 0,
    };

    for (const v of allVelocities) {
      const zone = getVelocityZone(v);
      velocityDistribution[zone]++;
    }

    return NextResponse.json({
      session: {
        id: session.id,
        clientId: session.clientId,
        clientName: session.client.name,
        sessionDate: session.sessionDate,
        deviceType: session.deviceType,
        deviceName: session.deviceName,
        fileName: session.fileName,
        totalSets: session.totalSets,
        totalReps: session.totalReps,
        exerciseCount: session.exerciseCount,
        notes: session.notes,
        sessionRPE: session.sessionRPE,
        bodyWeight: session.bodyWeight,
        createdAt: session.createdAt,
      },
      exercises: exercisesWithProfiles,
      velocityDistribution,
      velocityZones: VELOCITY_ZONES,
    });
  } catch (error) {
    logError('[VBT Session Detail] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    );
  }
}
