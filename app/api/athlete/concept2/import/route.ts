/**
 * Athlete Concept2 Import API
 *
 * POST - Import a Concept2 workout as an ErgometerFieldTest
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAthlete, canAccessClient } from '@/lib/auth-utils';
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { logError } from '@/lib/logger-console'

// Map Concept2 equipment type to ErgometerType
function mapEquipmentType(type: string): ErgometerType {
  switch (type) {
    case 'rower':
      return 'CONCEPT2_ROW';
    case 'skierg':
      return 'CONCEPT2_SKIERG';
    case 'bike':
      return 'CONCEPT2_BIKEERG';
    default:
      return 'CONCEPT2_ROW'; // Default to rower
  }
}

// Determine protocol based on distance and time
function determineProtocol(
  distance: number,
  timeTenths: number,
  workoutType?: string
): ErgometerTestProtocol {
  const timeSeconds = timeTenths / 10;

  // Check for specific distances
  if (distance >= 1950 && distance <= 2050) {
    return 'TT_2K';
  }
  if (distance >= 950 && distance <= 1050) {
    return 'TT_1K';
  }

  // Check for time-based tests
  if (timeSeconds >= 1150 && timeSeconds <= 1250) {
    // ~20 minutes
    return 'TT_20MIN';
  }
  if (timeSeconds >= 570 && timeSeconds <= 630) {
    // ~10 minutes
    return 'TT_10MIN';
  }

  // Check for short sprints
  if (timeSeconds <= 7) {
    return 'PEAK_POWER_6S';
  }
  if (timeSeconds >= 25 && timeSeconds <= 35) {
    return 'PEAK_POWER_30S';
  }

  // Default to 2K TT for medium distances
  if (distance >= 1500 && distance <= 3000) {
    return 'TT_2K';
  }

  // For longer pieces, use 2K as approximation
  return 'TT_2K';
}

// Calculate average power from pace (Concept2 formula)
function paceToWatts(paceSeconds: number): number {
  // Watts = 2.80 / (pace/500)³
  const pacePerMeter = paceSeconds / 500;
  return Math.round(2.8 / Math.pow(pacePerMeter, 3));
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAthlete();
    const body = await request.json();
    const { clientId, concept2ResultId } = body;

    if (!clientId || !concept2ResultId) {
      return NextResponse.json(
        { error: 'Missing clientId or concept2ResultId' },
        { status: 400 }
      );
    }

    // Verify athlete has access to this client
    const hasAccess = await canAccessClient(user.id, clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch the Concept2 result
    const concept2Result = await prisma.concept2Result.findUnique({
      where: { id: concept2ResultId },
    });

    if (!concept2Result) {
      return NextResponse.json(
        { error: 'Concept2 result not found' },
        { status: 404 }
      );
    }

    // Verify the result belongs to this client
    if (concept2Result.clientId !== clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Map to ErgometerFieldTest data
    const ergometerType = mapEquipmentType(concept2Result.type);
    const protocol = determineProtocol(
      concept2Result.distance,
      concept2Result.time,
      concept2Result.workoutType || undefined
    );

    // Calculate power from pace if available
    let avgPower: number | undefined;
    if (concept2Result.pace) {
      avgPower = paceToWatts(concept2Result.pace);
    }

    // Create the ErgometerFieldTest
    const fieldTest = await prisma.ergometerFieldTest.create({
      data: {
        clientId,
        ergometerType,
        testProtocol: protocol,
        testDate: concept2Result.date,

        // Equipment settings
        dragFactor: concept2Result.dragFactor,

        // Raw data
        rawData: {
          source: 'concept2_import',
          concept2Id: concept2Result.concept2Id,
          workoutType: concept2Result.workoutType,
          splits: concept2Result.splits,
          intervals: concept2Result.intervals,
        },

        // Metrics
        avgPower,
        avgPace: concept2Result.pace,
        totalDistance: concept2Result.distance,
        totalTime: concept2Result.time / 10, // Convert tenths to seconds
        totalCalories: concept2Result.calories ? concept2Result.calories : undefined,
        strokeRate: concept2Result.strokeRate,

        // Heart rate
        avgHR: concept2Result.avgHeartRate,
        maxHR: concept2Result.maxHeartRate,

        // Validation
        valid: true,
        confidence: concept2Result.isVerified ? 'HIGH' : 'MEDIUM',
        notes: concept2Result.comments,
      },
    });

    // Return the created test with protocol name for UI
    const protocolLabels: Record<string, string> = {
      TT_2K: '2K Time Trial',
      TT_1K: '1K Time Trial',
      TT_20MIN: '20-min FTP Test',
      TT_10MIN: '10-min Max Cal',
      PEAK_POWER_6S: '6s Peak Power',
      PEAK_POWER_30S: '30s Sprint',
    };

    return NextResponse.json({
      test: fieldTest,
      protocol: protocolLabels[protocol] || protocol,
      message: 'Workout imported successfully',
    });
  } catch (error) {
    logError('Error importing Concept2 workout:', error);
    return NextResponse.json(
      { error: 'Failed to import workout' },
      { status: 500 }
    );
  }
}
