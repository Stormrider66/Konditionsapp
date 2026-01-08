/**
 * Load-Velocity Profile API
 *
 * GET /api/athlete/vbt/profile - Get load-velocity profiles for a client
 * POST /api/athlete/vbt/profile - Calculate/update a load-velocity profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateLoadVelocityProfile, getExerciseMVT } from '@/lib/integrations/vbt';
import { logError } from '@/lib/logger-console'

// GET query schema
const getQuerySchema = z.object({
  clientId: z.string().uuid(),
  exerciseId: z.string().uuid().optional(),
});

// POST body schema
const postBodySchema = z.object({
  clientId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  daysBack: z.number().min(7).max(365).optional().default(90),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      clientId: searchParams.get('clientId'),
      exerciseId: searchParams.get('exerciseId'),
    };

    const validationResult = getQuerySchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, exerciseId } = validationResult.data;

    // Verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const isCoach = client.userId === user.id;
    const isAthlete = client.athleteAccount?.userId === user.id;

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch profiles
    const profiles = await prisma.loadVelocityProfile.findMany({
      where: {
        clientId,
        ...(exerciseId && { exerciseId }),
      },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedProfiles = profiles.map((p) => ({
      id: p.id,
      exerciseId: p.exerciseId,
      exerciseName: p.exercise.nameSv || p.exercise.name,
      isValid: p.isValid,
      dataPointCount: p.dataPointCount,
      e1RM_0_2: p.e1RM_0_2 ? Math.round(p.e1RM_0_2 * 10) / 10 : null,
      e1RM_0_15: p.e1RM_0_15 ? Math.round(p.e1RM_0_15 * 10) / 10 : null,
      e1RM_0_3: p.e1RM_0_3 ? Math.round(p.e1RM_0_3 * 10) / 10 : null,
      rSquared: p.rSquared ? Math.round(p.rSquared * 100) / 100 : null,
      mvt: p.mvt,
      minLoad: p.minLoad,
      maxLoad: p.maxLoad,
      loadRange: p.loadRange ? Math.round(p.loadRange) : null,
      lastMeasurementAt: p.lastMeasurementAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ profiles: formattedProfiles });
  } catch (error) {
    logError('[VBT Profile GET] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = postBodySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, exerciseId, daysBack } = validationResult.data;

    // Verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const isCoach = client.userId === user.id;
    const isAthlete = client.athleteAccount?.userId === user.id;

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get exercise info
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true, nameSv: true },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Fetch all measurements for this exercise within date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const measurements = await prisma.vBTMeasurement.findMany({
      where: {
        exerciseId,
        session: {
          clientId,
          sessionDate: { gte: startDate },
        },
        load: { not: null },
        meanVelocity: { not: null },
      },
      select: {
        load: true,
        meanVelocity: true,
        session: { select: { sessionDate: true } },
      },
      orderBy: {
        session: { sessionDate: 'desc' },
      },
    });

    if (measurements.length < 2) {
      return NextResponse.json(
        {
          error: 'Not enough data',
          message: `Need at least 2 measurements with different loads. Found: ${measurements.length}`,
        },
        { status: 400 }
      );
    }

    // Calculate profile
    const dataPoints = measurements.map((m) => ({
      load: m.load!,
      velocity: m.meanVelocity!,
    }));

    const profile = calculateLoadVelocityProfile(
      dataPoints,
      exercise.nameSv || exercise.name
    );

    // Get most recent measurement date
    const lastMeasurementAt = measurements[0]?.session?.sessionDate || new Date();

    // Calculate load range
    const minLoad = Math.min(...profile.dataPoints.map((p) => p.load));
    const maxLoad = Math.max(...profile.dataPoints.map((p) => p.load));
    const loadRange = profile.e1RM_0_2 > 0
      ? ((maxLoad - minLoad) / profile.e1RM_0_2) * 100
      : 0;

    // Serialize dataPoints for JSON storage
    const dataPointsJson = profile.dataPoints as unknown as object[];

    // Upsert profile
    const savedProfile = await prisma.loadVelocityProfile.upsert({
      where: {
        clientId_exerciseId: {
          clientId,
          exerciseId,
        },
      },
      update: {
        dataPoints: dataPointsJson,
        slope: profile.slope,
        intercept: profile.intercept,
        rSquared: profile.rSquared,
        e1RM_0_3: profile.e1RM_0_3 || null,
        e1RM_0_2: profile.e1RM_0_2 || null,
        e1RM_0_15: profile.e1RM_0_15 || null,
        mvt: profile.mvt,
        minLoad,
        maxLoad,
        loadRange,
        dataPointCount: profile.dataPoints.length,
        isValid: profile.isValid,
        lastMeasurementAt,
      },
      create: {
        clientId,
        exerciseId,
        dataPoints: dataPointsJson,
        slope: profile.slope,
        intercept: profile.intercept,
        rSquared: profile.rSquared,
        e1RM_0_3: profile.e1RM_0_3 || null,
        e1RM_0_2: profile.e1RM_0_2 || null,
        e1RM_0_15: profile.e1RM_0_15 || null,
        mvt: profile.mvt,
        minLoad,
        maxLoad,
        loadRange,
        dataPointCount: profile.dataPoints.length,
        isValid: profile.isValid,
        lastMeasurementAt,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: savedProfile.id,
        exerciseId,
        exerciseName: exercise.nameSv || exercise.name,
        isValid: profile.isValid,
        dataPointCount: profile.dataPoints.length,
        e1RM_0_2: profile.e1RM_0_2 ? Math.round(profile.e1RM_0_2 * 10) / 10 : null,
        e1RM_0_15: profile.e1RM_0_15 ? Math.round(profile.e1RM_0_15 * 10) / 10 : null,
        e1RM_0_3: profile.e1RM_0_3 ? Math.round(profile.e1RM_0_3 * 10) / 10 : null,
        rSquared: Math.round(profile.rSquared * 100) / 100,
        mvt: profile.mvt,
        minLoad: Math.round(minLoad * 10) / 10,
        maxLoad: Math.round(maxLoad * 10) / 10,
        loadRange: Math.round(loadRange),
      },
      warnings: !profile.isValid
        ? [
            profile.dataPoints.length < 3
              ? 'Need at least 3 data points for a reliable profile'
              : profile.rSquared < 0.8
              ? 'Low R² value - data has high variability'
              : loadRange < 20
              ? 'Need wider load range (at least 20% of e1RM)'
              : 'Profile validation failed',
          ]
        : undefined,
    });
  } catch (error) {
    logError('[VBT Profile POST] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to calculate profile' },
      { status: 500 }
    );
  }
}
