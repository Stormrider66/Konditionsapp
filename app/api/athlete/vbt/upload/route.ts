/**
 * VBT CSV Upload API
 *
 * POST /api/athlete/vbt/upload - Upload VBT CSV data
 *
 * Accepts CSV files from VBT devices (Vmaxpro, Vitruve, GymAware, etc.)
 * and parses them into the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import type { VBTDeviceType } from '@prisma/client';
import {
  parseVBTCSV,
  enrichMeasurements,
  calculateSessionMetrics,
  normalizeExerciseName,
  exerciseSimilarity,
} from '@/lib/integrations/vbt';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for CSV files

interface UploadResponse {
  success: boolean;
  sessionId?: string;
  totalReps: number;
  exerciseCount: number;
  exercises?: {
    name: string;
    sets: number;
    reps: number;
    matchedExerciseId?: string;
  }[];
  warnings?: string[];
  errors?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse | { error: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string;
    const deviceTypeParam = formData.get('deviceType') as string | null;
    const sessionDateParam = formData.get('sessionDate') as string | null;
    const notes = formData.get('notes') as string | null;
    const bodyWeight = formData.get('bodyWeight') as string | null;
    const sessionRPE = formData.get('sessionRPE') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size: 10MB' }, { status: 400 });
    }

    // Validate clientId
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Verify access to client
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

    // Read and parse CSV
    const csvContent = await file.text();
    const deviceType = (deviceTypeParam as VBTDeviceType) || undefined;
    const sessionDate = sessionDateParam ? new Date(sessionDateParam) : undefined;

    const parsed = parseVBTCSV(csvContent, {
      deviceType,
      sessionDate,
      fileName: file.name,
    });

    if (parsed.measurements.length === 0) {
      return NextResponse.json({
        success: false,
        totalReps: 0,
        exerciseCount: 0,
        errors: parsed.parseErrors.length > 0
          ? parsed.parseErrors
          : ['No valid measurements found in file'],
      });
    }

    // Enrich measurements with velocity loss and quality
    const enrichedMeasurements = enrichMeasurements(parsed.measurements);

    // Calculate session metrics
    const metrics = calculateSessionMetrics(enrichedMeasurements);

    // Try to match exercise names to existing exercises
    const exerciseMatches = await matchExercises(enrichedMeasurements);

    // Serialize data for JSON storage
    const rawDataJson = parsed.measurements as unknown as object[];
    const parseErrorsJson = parsed.parseErrors.length > 0
      ? (parsed.parseErrors as unknown as object[])
      : undefined;

    // Create session with transaction
    const session = await prisma.$transaction(async (tx) => {
      // Create VBT session
      const newSession = await tx.vBTSession.create({
        data: {
          clientId,
          coachId: isCoach ? user.id : null,
          sessionDate: parsed.sessionDate,
          deviceType: parsed.deviceType,
          deviceName: parsed.deviceName,
          fileName: parsed.fileName,
          totalSets: metrics.totalSets,
          totalReps: metrics.totalReps,
          exerciseCount: metrics.exerciseCount,
          notes: notes || null,
          sessionRPE: sessionRPE ? parseInt(sessionRPE) : null,
          bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
          rawData: rawDataJson,
          parseErrors: parseErrorsJson,
        },
      });

      // Create measurements
      const measurementData = enrichedMeasurements.map((m) => ({
        sessionId: newSession.id,
        exerciseName: m.exerciseName,
        exerciseId: exerciseMatches.get(m.exerciseName) || null,
        exerciseMatched: exerciseMatches.has(m.exerciseName),
        setNumber: m.setNumber,
        repNumber: m.repNumber,
        load: m.load ?? null,
        meanVelocity: m.meanVelocity ?? null,
        peakVelocity: m.peakVelocity ?? null,
        meanPower: m.meanPower ?? null,
        peakPower: m.peakPower ?? null,
        rom: m.rom ?? null,
        concentricTime: m.concentricTime ?? null,
        eccentricTime: m.eccentricTime ?? null,
        timeToPeakVel: m.timeToPeakVel ?? null,
        velocityLoss: m.velocityLoss ?? null,
        velocityLossSet: m.velocityLossSet ?? null,
        velocityZone: m.velocityZone ?? null,
        repQuality: m.repQuality ?? null,
        rawMetrics: (m.rawMetrics as object) ?? null,
      }));

      await tx.vBTMeasurement.createMany({
        data: measurementData,
      });

      return newSession;
    });

    // Prepare exercise summary with match info
    const exerciseSummary = metrics.exercises.map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      matchedExerciseId: exerciseMatches.get(e.name),
    }));

    const warnings: string[] = [];

    // Add warning if some exercises weren't matched
    const unmatchedCount = exerciseSummary.filter((e) => !e.matchedExerciseId).length;
    if (unmatchedCount > 0) {
      warnings.push(
        `${unmatchedCount} exercise(s) could not be matched to the exercise library`
      );
    }

    // Add parse errors as warnings
    if (parsed.parseErrors.length > 0) {
      warnings.push(...parsed.parseErrors);
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      totalReps: metrics.totalReps,
      exerciseCount: metrics.exerciseCount,
      exercises: exerciseSummary,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error('[VBT Upload] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to process VBT data' },
      { status: 500 }
    );
  }
}

/**
 * Match parsed exercise names to existing exercises in library
 */
async function matchExercises(
  measurements: { exerciseName: string }[]
): Promise<Map<string, string>> {
  const matches = new Map<string, string>();

  // Get unique exercise names
  const uniqueNames = [...new Set(measurements.map((m) => m.exerciseName))];

  // Fetch all exercises for matching
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { isPublic: true },
        // Could add coachId filter here for custom exercises
      ],
    },
    select: {
      id: true,
      name: true,
      nameSv: true,
      nameEn: true,
    },
  });

  // Match each unique name
  for (const csvName of uniqueNames) {
    const normalizedCsvName = normalizeExerciseName(csvName);
    let bestMatch: { id: string; score: number } | null = null;

    for (const exercise of exercises) {
      // Check all name variants
      const names = [exercise.name, exercise.nameSv, exercise.nameEn].filter(Boolean);

      for (const name of names) {
        if (!name) continue;
        const score = exerciseSimilarity(csvName, name);

        // Require at least 70% similarity for a match
        if (score >= 0.7 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: exercise.id, score };
        }
      }
    }

    if (bestMatch) {
      matches.set(csvName, bestMatch.id);
    }
  }

  return matches;
}
