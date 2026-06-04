/**
 * Ergometer Performance Prediction API
 *
 * POST - Predict performance based on CP model
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { ErgometerType } from '@prisma/client';
import { logError } from '@/lib/logger-console'
import {
  predictPowerForDuration,
  predictTimeForDistance,
  generatePowerCurve,
  generateDistancePredictions,
  projectImprovement,
  generateProjectionCurve,
} from '@/lib/training-engine/ergometer/predictions';
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await getCurrentUser();
    locale = resolveRequestLocale(request, user?.language);

    if (!user) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      clientId,
      ergometerType,
      targetDuration,
      targetDistance,
      projectionWeeks,
      includeFactors = true,
      includePowerCurve = false,
      includeDistancePredictions = false,
    } = body;

    if (!clientId || !ergometerType) {
      return NextResponse.json(
        { success: false, error: t(locale, 'clientId and ergometerType are required', 'clientId och ergometerType krävs') },
        { status: 400 }
      );
    }

    // Fetch client's latest threshold
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
          error: t(locale, 'No CP data found. Perform a threshold test first.', 'Ingen CP-data hittades. Genomför ett tröskeltest först.'),
          code: 'NO_CP_DATA',
        },
        { status: 404 }
      );
    }

    // Get client weight for W/kg calculations
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { weight: true },
    });

    const predictionInput = {
      criticalPower: threshold.criticalPower,
      wPrime: threshold.wPrime || 20000, // Default W' if not available
      ergometerType: ergometerType as ErgometerType,
      athleteWeight: client?.weight ?? undefined,
    };

    const response: Record<string, unknown> = {
      success: true,
      threshold: {
        criticalPower: threshold.criticalPower,
        wPrime: threshold.wPrime,
        testDate: threshold.testDate,
      },
    };

    // Predict power for specific duration
    if (targetDuration) {
      response.powerPrediction = predictPowerForDuration(predictionInput, targetDuration);
    }

    // Predict time for specific distance (Concept2 only)
    if (targetDistance) {
      const timePrediction = predictTimeForDistance(predictionInput, targetDistance);
      if (timePrediction) {
        response.timePrediction = timePrediction;
      } else {
        response.timePredictionError = t(locale, 'Distance prediction is only available for Concept2 machines', 'Distansprognos är endast tillgänglig för Concept2-maskiner');
      }
    }

    // Generate full power curve
    if (includePowerCurve) {
      response.powerCurve = generatePowerCurve(predictionInput);
    }

    // Generate distance predictions (Concept2 only)
    if (includeDistancePredictions) {
      response.distancePredictions = generateDistancePredictions(predictionInput);
    }

    // Project improvement over time
    if (projectionWeeks) {
      // Fetch training load data
      const trainingLoads = await prisma.trainingLoad.findMany({
        where: { clientId },
        orderBy: { date: 'desc' },
        take: 42, // 6 weeks
      });

      // Fetch historical tests
      const historicalTests = await prisma.ergometerFieldTest.findMany({
        where: {
          clientId,
          ergometerType: ergometerType as ErgometerType,
          valid: true,
          criticalPower: { not: null },
        },
        orderBy: { testDate: 'desc' },
        take: 10,
        select: {
          testDate: true,
          criticalPower: true,
          wPrime: true,
        },
      });

      // Calculate training load metrics
      let trainingLoadData;
      if (trainingLoads.length >= 7) {
        const recentLoads = trainingLoads.slice(0, 7);
        const chronicLoads = trainingLoads.slice(0, 42);

        const atl = recentLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / recentLoads.length;
        const ctl = chronicLoads.reduce((sum, l) => sum + (l.dailyLoad || 0), 0) / chronicLoads.length;

        // Calculate consistency (days with training / total days)
        const daysWithTraining = trainingLoads.filter(l => (l.dailyLoad || 0) > 0).length;
        const consistency = daysWithTraining / trainingLoads.length;

        trainingLoadData = {
          ctl: ctl || 50,
          atl: atl || 50,
          tsb: (ctl || 50) - (atl || 50),
          weeklyTSS: atl * 7,
          consistency,
        };
      }

      const projection = projectImprovement(
        threshold.criticalPower,
        threshold.wPrime || 20000,
        ergometerType as ErgometerType,
        projectionWeeks,
        {
          trainingLoad: trainingLoadData,
          historicalTests: historicalTests.map(t => ({
            date: t.testDate,
            criticalPower: t.criticalPower!,
            wPrime: t.wPrime || 20000,
          })),
          locale,
        }
      );

      response.improvement = projection;

      // Include projection curve
      if (includeFactors) {
        response.projectionCurve = generateProjectionCurve(
          threshold.criticalPower,
          threshold.wPrime || 20000,
          ergometerType as ErgometerType,
          {
            trainingLoad: trainingLoadData,
            historicalTests: historicalTests.map(t => ({
              date: t.testDate,
              criticalPower: t.criticalPower!,
              wPrime: t.wPrime || 20000,
            })),
            locale,
          }
        );
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    logError('Error generating prediction:', error);
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to generate prediction', 'Kunde inte skapa prognos') },
      { status: 500 }
    );
  }
}
