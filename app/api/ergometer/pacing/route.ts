/**
 * Race Day Pacing API
 *
 * POST - Generate race pacing plan based on CP model
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ErgometerType } from '@prisma/client';
import { logError } from '@/lib/logger-console'
import {
  generateRacePacing,
  compareStrategies,
  recommendStrategy,
  PacingStrategy,
  RaceEffort,
} from '@/lib/training-engine/ergometer/pacing';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      clientId,
      ergometerType,
      targetDistance,
      strategy,
      goalTime,
      goalEffort,
      compareAll = false,
      includeRecommendation = true,
    } = body;

    // Validate required fields
    if (!clientId || !ergometerType || !targetDistance) {
      return NextResponse.json(
        { success: false, error: 'clientId, ergometerType, and targetDistance are required' },
        { status: 400 }
      );
    }

    // Validate distance
    if (targetDistance < 500 || targetDistance > 42195) {
      return NextResponse.json(
        { success: false, error: 'targetDistance must be between 500m and 42195m' },
        { status: 400 }
      );
    }

    // Fetch client's threshold data
    const threshold = await prisma.ergometerThreshold.findUnique({
      where: {
        clientId_ergometerType: {
          clientId,
          ergometerType: ergometerType as ErgometerType,
        },
      },
    });

    if (!threshold || !threshold.criticalPower) {
      return NextResponse.json(
        {
          success: false,
          error: 'No CP data found. Perform a threshold test first.',
          code: 'NO_CP_DATA',
        },
        { status: 404 }
      );
    }

    // Get client data for weight and HR
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { weight: true },
    });

    // Build pacing input
    const pacingInput = {
      criticalPower: threshold.criticalPower,
      wPrime: threshold.wPrime || 20000,
      ergometerType: ergometerType as ErgometerType,
      targetDistance,
      strategy: (strategy || 'EVEN') as PacingStrategy,
      goalTime: goalTime || undefined,
      goalEffort: (goalEffort || 'RACE') as RaceEffort,
      athleteWeight: client?.weight ?? undefined,
      thresholdHR: threshold.thresholdHR ?? undefined,
    };

    const response: Record<string, unknown> = {
      success: true,
      threshold: {
        criticalPower: threshold.criticalPower,
        wPrime: threshold.wPrime,
        wPrimeKJ: threshold.wPrime ? Math.round(threshold.wPrime / 100) / 10 : null,
      },
    };

    // Generate pacing plan
    if (compareAll) {
      // Compare all strategies
      const comparison = compareStrategies(pacingInput, ['EVEN', 'NEGATIVE', 'POSITIVE']);
      response.comparison = comparison;

      // Find fastest strategy
      const fastest = Object.entries(comparison).reduce((best, [strat, result]) => {
        if (!best || result.summary.predictedTime < best.result.summary.predictedTime) {
          return { strategy: strat, result };
        }
        return best;
      }, null as { strategy: string; result: typeof comparison.EVEN } | null);

      response.fastestStrategy = fastest?.strategy;
      response.pacing = fastest?.result;
    } else {
      // Generate single strategy
      const pacing = generateRacePacing(pacingInput);
      response.pacing = pacing;
    }

    // Get strategy recommendation
    if (includeRecommendation) {
      // Determine experience level from test history
      const testCount = await prisma.ergometerFieldTest.count({
        where: {
          clientId,
          ergometerType: ergometerType as ErgometerType,
          valid: true,
        },
      });

      let experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' = 'BEGINNER';
      if (testCount >= 10) experienceLevel = 'ELITE';
      else if (testCount >= 5) experienceLevel = 'ADVANCED';
      else if (testCount >= 2) experienceLevel = 'INTERMEDIATE';

      const recommendation = recommendStrategy(
        threshold.criticalPower,
        threshold.wPrime || 20000,
        targetDistance,
        experienceLevel
      );

      response.recommendation = {
        ...recommendation,
        experienceLevel,
        testCount,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    logError('Error generating pacing plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate pacing plan' },
      { status: 500 }
    );
  }
}
