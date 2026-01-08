/**
 * POST /api/ergometer/classify
 *
 * Classify athlete performance against tier benchmarks
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ErgometerType, ErgometerTestProtocol, SportType } from '@prisma/client';
import { classifyPerformance, BenchmarkInput } from '@/lib/training-engine/ergometer/benchmarks';
import { logError } from '@/lib/logger-console'

const classifySchema = z.object({
  ergometerType: z.nativeEnum(ErgometerType),
  testProtocol: z.nativeEnum(ErgometerTestProtocol),
  gender: z.enum(['MALE', 'FEMALE']),
  sport: z.nativeEnum(SportType).optional().nullable(),
  avgPower: z.number().optional(),
  peakPower: z.number().optional(),
  totalTime: z.number().optional(),
  avgPace: z.number().optional(),
  totalCalories: z.number().optional(),
  bodyWeight: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = classifySchema.parse(body);

    const input: BenchmarkInput = {
      ergometerType: validated.ergometerType,
      testProtocol: validated.testProtocol,
      gender: validated.gender,
      sport: validated.sport,
      avgPower: validated.avgPower,
      peakPower: validated.peakPower,
      totalTime: validated.totalTime,
      avgPace: validated.avgPace,
      totalCalories: validated.totalCalories,
      bodyWeight: validated.bodyWeight,
    };

    const result = await classifyPerformance(prisma, input);

    return NextResponse.json({
      success: true,
      benchmark: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logError('Error classifying performance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to classify performance' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ergometer/classify
 *
 * Get available benchmarks for a specific test type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ergometerType = searchParams.get('ergometerType') as ErgometerType | null;
    const testProtocol = searchParams.get('testProtocol') as ErgometerTestProtocol | null;
    const gender = searchParams.get('gender') as 'MALE' | 'FEMALE' | null;

    const where: Record<string, unknown> = {};
    if (ergometerType) where.ergometerType = ergometerType;
    if (testProtocol) where.testProtocol = testProtocol;
    if (gender) where.gender = gender;

    const benchmarks = await prisma.ergometerBenchmark.findMany({
      where,
      orderBy: [
        { ergometerType: 'asc' },
        { testProtocol: 'asc' },
        { gender: 'asc' },
        { tier: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      benchmarks,
      count: benchmarks.length,
    });
  } catch (error) {
    logError('Error fetching benchmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch benchmarks' },
      { status: 500 }
    );
  }
}
