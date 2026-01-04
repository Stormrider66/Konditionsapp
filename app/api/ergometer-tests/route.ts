/**
 * Ergometer Field Test API
 *
 * POST /api/ergometer-tests - Submit a new ergometer field test
 * GET /api/ergometer-tests - List tests with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client'
import {
  analyze4x4IntervalTest,
  calculate3MinuteAllOut,
  calculateMultiTrialCP,
  analyze6SecondPeakPower,
  analyze7StrokeMaxPower,
  analyze30SecondSprint,
  calculateZonesFromCP,
  calculateZonesFrom2K,
  calculateZonesFrom1K,
  calculateZonesFromFTP,
  calculateZonesFromIntervalTest,
  calculateZonesFromMAP,
  paceToWatts,
  wattsToPace,
} from '@/lib/training-engine/ergometer'
import type {
  Interval4x4RawData,
  CP3MinRawData,
  CPMultiTrialRawData,
  PeakPowerRawData,
  SevenStrokeRawData,
  TT2KRawData,
  TT1KRawData,
  MAPRampRawData,
  TT10MinRawData,
} from '@/lib/training-engine/ergometer'

// ==================== ZOD SCHEMAS ====================

// Base schema for all tests
const baseTestSchema = z.object({
  clientId: z.string().uuid(),
  ergometerType: z.nativeEnum(ErgometerType),
  testDate: z.string().datetime().or(z.date()),
  dragFactor: z.number().int().min(80).max(200).optional(),
  damperSetting: z.number().int().min(1).max(10).optional(),
  airResistance: z.number().int().min(1).max(10).optional(),
  magnetResistance: z.number().int().min(1).max(4).optional(),
  bikeBrand: z.string().optional(),
  conditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    altitude: z.number().optional(),
  }).optional(),
  avgHR: z.number().optional(),
  maxHR: z.number().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
})

// 4×4min Interval Test
const interval4x4Schema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.INTERVAL_4X4),
  rawData: z.object({
    intervals: z.array(z.object({
      intervalNumber: z.number().int().min(1).max(4),
      duration: z.number().default(240), // 4 minutes
      avgPower: z.number(),
      avgHR: z.number(),
      maxHR: z.number().optional(),
      avgPace: z.number().optional(), // sec/500m for Concept2
      avgStrokeRate: z.number().optional(),
    })).length(4),
    restDuration: z.number().default(180),
    totalDuration: z.number().optional(),
  }),
})

// 3-Minute All-Out CP Test
const cp3MinSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.CP_3MIN_ALL_OUT),
  rawData: z.object({
    powerSamples: z.array(z.number()).min(170).max(190), // ~180 samples at 1Hz
    avgHR: z.number().optional(),
    maxHR: z.number().optional(),
  }),
})

// Multi-Trial CP Test
const cpMultiTrialSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.CP_MULTI_TRIAL),
  rawData: z.object({
    trials: z.array(z.object({
      duration: z.number(), // seconds
      avgPower: z.number(),
      avgHR: z.number().optional(),
    })).min(2).max(5),
  }),
})

// 6-Second Peak Power
const peakPower6sSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.PEAK_POWER_6S),
  rawData: z.object({
    duration: z.number().default(6),
    peakPower: z.number(),
    avgPower: z.number(),
    powerSamples: z.array(z.number()).optional(),
    peakRPM: z.number().optional(),
    avgRPM: z.number().optional(),
    bodyWeight: z.number().optional(),
  }),
})

// 7-Stroke Max (Concept2)
const peakPower7StrokeSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.PEAK_POWER_7_STROKE),
  rawData: z.object({
    strokes: z.array(z.object({
      strokeNumber: z.number().int().min(1).max(7),
      power: z.number(),
      pace: z.number(), // sec/500m
    })).length(7),
    peakPower: z.number(),
    avgPower: z.number(),
    bodyWeight: z.number().optional(),
  }),
})

// 30-Second Sprint (Wingate proxy)
const peakPower30sSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.PEAK_POWER_30S),
  rawData: z.object({
    duration: z.number().default(30),
    peakPower: z.number(),
    avgPower: z.number(),
    minPower: z.number().optional(),
    powerSamples: z.array(z.number()).optional(),
    bodyWeight: z.number().optional(),
  }),
})

// 1K Time Trial (SkiErg)
const tt1kSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.TT_1K),
  rawData: z.object({
    distance: z.literal(1000).default(1000),
    time: z.number(), // Total time in seconds
    splits: z.array(z.number()).optional(), // Split times
    avgPace: z.number(), // sec/500m
    avgPower: z.number(),
    avgStrokeRate: z.number(),
    hrData: z.array(z.number()).optional(),
    avgHR: z.number().optional(),
    maxHR: z.number().optional(),
  }),
})

// 2K Time Trial
const tt2kSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.TT_2K),
  rawData: z.object({
    distance: z.literal(2000).default(2000),
    time: z.number(), // Total time in seconds
    splits: z.array(z.number()).optional(), // 500m split times
    avgPace: z.number(), // sec/500m
    avgPower: z.number(),
    avgStrokeRate: z.number(),
    hrData: z.array(z.number()).optional(),
    avgHR: z.number().optional(),
    maxHR: z.number().optional(),
  }),
})

// 10-Minute Air Bike Test
const tt10MinSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.TT_10MIN),
  rawData: z.object({
    totalCalories: z.number(),
    totalDistance: z.number().optional(),
    avgRPM: z.number().optional(),
    avgPower: z.number().optional(), // Some bikes display power
    splits: z.array(z.object({
      minute: z.number(),
      calories: z.number(),
      rpm: z.number().optional(),
    })).optional(),
  }),
})

// 20-Minute FTP Test (Wattbike)
const tt20MinSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.TT_20MIN),
  rawData: z.object({
    avgPower: z.number(),
    normalizedPower: z.number().optional(),
    variabilityIndex: z.number().optional(),
    avgCadence: z.number().optional(),
    correctionFactor: z.number().default(0.95), // 0.90 for non-cyclists
  }),
})

// MAP Ramp Test
const mapRampSchema = baseTestSchema.extend({
  testProtocol: z.literal(ErgometerTestProtocol.MAP_RAMP),
  rawData: z.object({
    startPower: z.number(),
    increment: z.number(), // watts per minute
    stages: z.array(z.object({
      minute: z.number(),
      targetPower: z.number(),
      actualPower: z.number(),
      hr: z.number().optional(),
      completed: z.boolean(),
    })),
    peakPower: z.number().optional(),
    mapWatts: z.number(), // Highest completed minute average
    maxHR: z.number().optional(),
    timeToExhaustion: z.number(), // Total seconds
  }),
})

// Discriminated union of all test types
const ergometerTestSchema = z.discriminatedUnion('testProtocol', [
  interval4x4Schema,
  cp3MinSchema,
  cpMultiTrialSchema,
  peakPower6sSchema,
  peakPower7StrokeSchema,
  peakPower30sSchema,
  tt1kSchema,
  tt2kSchema,
  tt10MinSchema,
  tt20MinSchema,
  mapRampSchema,
])

// Query params for GET
const listQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  ergometerType: z.nativeEnum(ErgometerType).optional(),
  testProtocol: z.nativeEnum(ErgometerTestProtocol).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

// ==================== POST HANDLER ====================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const validationResult = ergometerTestSchema.safeParse(body)

    if (!validationResult.success) {
      return errorResponse(
        'Invalid request body',
        400,
        validationResult.error.flatten()
      )
    }

    const data = validationResult.data

    // Verify client exists and user has access
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        userId: user.id,
      },
    })

    if (!client) {
      return errorResponse('Client not found or access denied', 404)
    }

    // Process test based on protocol
    const analysis = await analyzeTest(data)

    // Create the test record
    const test = await prisma.ergometerFieldTest.create({
      data: {
        clientId: data.clientId,
        ergometerType: data.ergometerType,
        testProtocol: data.testProtocol,
        testDate: new Date(data.testDate),
        dragFactor: data.dragFactor,
        damperSetting: data.damperSetting,
        airResistance: data.airResistance,
        magnetResistance: data.magnetResistance,
        bikeBrand: data.bikeBrand,
        conditions: data.conditions,
        rawData: data.rawData,
        avgHR: data.avgHR,
        maxHR: data.maxHR,
        rpe: data.rpe,
        notes: data.notes,
        // Derived metrics from analysis
        peakPower: analysis.peakPower,
        avgPower: analysis.avgPower,
        endPower: analysis.endPower,
        avgPace: analysis.avgPace,
        bestPace: analysis.bestPace,
        criticalPower: analysis.criticalPower,
        wPrime: analysis.wPrime,
        totalDistance: analysis.totalDistance,
        totalTime: analysis.totalTime,
        totalCalories: analysis.totalCalories,
        strokeRate: analysis.strokeRate,
        hrAtEnd: analysis.hrAtEnd,
        intervalData: analysis.intervalData as object | undefined,
        r2: analysis.r2,
        confidence: analysis.confidence,
        modelFit: analysis.modelFit,
        valid: analysis.valid,
        warnings: analysis.warnings,
        errors: analysis.errors,
      },
    })

    // Get benchmark classification if available
    const benchmark = await classifyPerformance(
      data.ergometerType,
      data.testProtocol,
      analysis,
      client
    )

    return successResponse(
      {
        test,
        analysis: analysis.details,
        benchmark,
        recommendations: analysis.recommendations,
      },
      undefined, // no message
      201
    )
  } catch (error) {
    console.error('Error creating ergometer test:', error)
    return errorResponse('Failed to create ergometer test', 500)
  }
}

// ==================== GET HANDLER ====================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const queryResult = listQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!queryResult.success) {
      return errorResponse(
        'Invalid query parameters',
        400,
        queryResult.error.flatten()
      )
    }

    const { clientId, ergometerType, testProtocol, limit, offset } = queryResult.data

    // Build where clause
    const where: Record<string, unknown> = {
      client: {
        userId: user.id,
      },
    }

    if (clientId) {
      where.clientId = clientId
    }
    if (ergometerType) {
      where.ergometerType = ergometerType
    }
    if (testProtocol) {
      where.testProtocol = testProtocol
    }

    const [tests, total] = await Promise.all([
      prisma.ergometerFieldTest.findMany({
        where,
        orderBy: { testDate: 'desc' },
        take: limit,
        skip: offset,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.ergometerFieldTest.count({ where }),
    ])

    return successResponse({
      tests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tests.length < total,
      },
    })
  } catch (error) {
    console.error('Error listing ergometer tests:', error)
    return errorResponse('Failed to list ergometer tests', 500)
  }
}

// ==================== ANALYSIS FUNCTIONS ====================

interface AnalysisResult {
  peakPower?: number
  avgPower?: number
  endPower?: number
  avgPace?: number
  bestPace?: number
  criticalPower?: number
  wPrime?: number
  totalDistance?: number
  totalTime?: number
  totalCalories?: number
  strokeRate?: number
  hrAtEnd?: number
  intervalData?: unknown
  r2?: number
  confidence?: string
  modelFit?: string
  valid: boolean
  warnings: string[]
  errors: string[]
  recommendations: string[]
  details: Record<string, unknown>
}

async function analyzeTest(
  data: z.infer<typeof ergometerTestSchema>
): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    valid: true,
    warnings: [],
    errors: [],
    recommendations: [],
    details: {},
  }

  try {
    switch (data.testProtocol) {
      case ErgometerTestProtocol.INTERVAL_4X4: {
        const rawData = data.rawData as Interval4x4RawData
        const analysis = analyze4x4IntervalTest(rawData)

        result.avgPower = analysis.avgPower
        result.criticalPower = analysis.estimatedCP
        result.confidence = analysis.confidence
        result.intervalData = analysis.intervalPowers
        result.warnings = analysis.warnings
        result.recommendations = analysis.recommendations
        result.details = {
          consistency: analysis.consistency,
          decoupling: analysis.decoupling,
          hrDrift: analysis.hrDrift,
          intervalPowers: analysis.intervalPowers,
        }
        break
      }

      case ErgometerTestProtocol.CP_3MIN_ALL_OUT: {
        const rawData = data.rawData as CP3MinRawData
        const analysis = calculate3MinuteAllOut(rawData.powerSamples)

        result.criticalPower = analysis.criticalPower
        result.wPrime = analysis.wPrime
        result.endPower = analysis.criticalPower // CP is the end power
        result.confidence = analysis.confidence
        result.modelFit = analysis.modelFit
        result.warnings = analysis.warnings
        result.recommendations = analysis.recommendations
        result.details = {
          criticalPower: analysis.criticalPower,
          wPrime: analysis.wPrime,
          wPrimeKJ: analysis.wPrimeKJ,
          modelFit: analysis.modelFit,
        }
        break
      }

      case ErgometerTestProtocol.CP_MULTI_TRIAL: {
        const rawData = data.rawData as CPMultiTrialRawData
        const analysis = calculateMultiTrialCP(rawData.trials)

        result.criticalPower = analysis.criticalPower
        result.wPrime = analysis.wPrime
        result.r2 = analysis.r2
        result.confidence = analysis.confidence
        result.modelFit = analysis.modelFit
        result.warnings = analysis.warnings
        result.recommendations = analysis.recommendations
        result.details = {
          trials: rawData.trials,
          regression: {
            slope: analysis.criticalPower,
            intercept: analysis.wPrime,
            r2: analysis.r2,
          },
        }
        break
      }

      case ErgometerTestProtocol.PEAK_POWER_6S: {
        const rawData = data.rawData as PeakPowerRawData
        const analysis = analyze6SecondPeakPower(rawData)

        result.peakPower = analysis.peakPower
        result.avgPower = analysis.avgPower
        result.confidence = analysis.confidence
        result.recommendations = analysis.recommendations
        result.details = {
          peakPower: analysis.peakPower,
          avgPower: analysis.avgPower,
          peakToAvgRatio: analysis.peakToAvgRatio,
          powerDecay: analysis.powerDecay,
          quality: analysis.quality,
        }
        break
      }

      case ErgometerTestProtocol.PEAK_POWER_7_STROKE: {
        const rawData = data.rawData as SevenStrokeRawData
        const analysis = analyze7StrokeMaxPower(rawData)

        result.peakPower = analysis.peakPower
        result.avgPower = analysis.avgPower
        result.confidence = analysis.confidence
        result.recommendations = analysis.recommendations
        result.details = {
          strokes: rawData.strokes,
          peakStroke: analysis.peakStroke,
          avgPower: analysis.avgPower,
          consistency: analysis.consistency,
          powerProfile: analysis.powerProfile,
          quality: analysis.quality,
        }
        break
      }

      case ErgometerTestProtocol.PEAK_POWER_30S: {
        const rawData = data.rawData as (PeakPowerRawData & { minPower?: number })
        const analysis = analyze30SecondSprint(rawData)

        result.peakPower = analysis.peakPower
        result.avgPower = analysis.avgPower
        result.confidence = analysis.confidence
        result.recommendations = analysis.recommendations
        result.details = {
          peakPower: analysis.peakPower,
          avgPower: analysis.avgPower,
          minPower: analysis.minPower,
          fatigueIndex: analysis.fatigueIndex,
          fatigueRating: analysis.fatigueRating,
          anaerobicCapacity: analysis.anaerobicCapacity,
          totalWork: analysis.totalWork,
        }
        break
      }

      case ErgometerTestProtocol.TT_1K: {
        const rawData = data.rawData as TT1KRawData
        result.totalTime = rawData.time
        result.avgPower = rawData.avgPower
        result.avgPace = rawData.avgPace
        result.totalDistance = 1000
        result.strokeRate = rawData.avgStrokeRate

        // Calculate zones from 1K performance
        const zones = calculateZonesFrom1K(rawData.avgPower, data.ergometerType)
        result.recommendations = zones.recommendations
        result.details = {
          avgPower: rawData.avgPower,
          avgPace: rawData.avgPace,
          splits: rawData.splits,
          estimatedThreshold: Math.round(rawData.avgPower * 0.86),
        }
        break
      }

      case ErgometerTestProtocol.TT_2K: {
        const rawData = data.rawData as TT2KRawData
        result.totalTime = rawData.time
        result.avgPower = rawData.avgPower
        result.avgPace = rawData.avgPace
        result.totalDistance = 2000
        result.strokeRate = rawData.avgStrokeRate

        // Calculate zones from 2K performance
        const zones = calculateZonesFrom2K(rawData.avgPower, data.ergometerType)
        result.recommendations = zones.recommendations
        result.details = {
          avgPower: rawData.avgPower,
          avgPace: rawData.avgPace,
          splits: rawData.splits,
          estimatedThreshold: Math.round(rawData.avgPower * 0.92),
        }
        break
      }

      case ErgometerTestProtocol.TT_10MIN: {
        const rawData = data.rawData as TT10MinRawData
        result.totalCalories = rawData.totalCalories
        result.avgPower = rawData.avgPower
        result.totalTime = 600 // 10 minutes

        result.details = {
          totalCalories: rawData.totalCalories,
          calsPerMinute: rawData.caloriesPerMinute,
          avgRPM: rawData.avgRPM,
          peakRPM: rawData.peakRPM,
        }

        // Air bike recommendations
        result.recommendations = [
          `Total calories: ${rawData.totalCalories} in 10 minutes`,
          `Average: ${(rawData.totalCalories / 10).toFixed(1)} cal/min`,
        ]
        if (rawData.avgPower) {
          result.recommendations.push(`Average power: ${rawData.avgPower}W`)
        }
        break
      }

      case ErgometerTestProtocol.TT_20MIN: {
        const rawData = data.rawData as { avgPower: number; normalizedPower?: number; correctionFactor: number }
        const ftp = Math.round(rawData.avgPower * rawData.correctionFactor)

        result.avgPower = rawData.avgPower
        result.criticalPower = ftp // FTP as threshold estimate
        result.totalTime = 1200 // 20 minutes

        const zones = calculateZonesFromFTP(
          rawData.avgPower,
          rawData.correctionFactor,
          data.ergometerType
        )
        result.recommendations = zones.recommendations
        result.details = {
          avgPower: rawData.avgPower,
          normalizedPower: rawData.normalizedPower,
          correctionFactor: rawData.correctionFactor,
          estimatedFTP: ftp,
        }
        break
      }

      case ErgometerTestProtocol.MAP_RAMP: {
        const rawData = data.rawData as MAPRampRawData
        result.peakPower = rawData.peakPower
        result.avgPower = rawData.mapWatts

        const zones = calculateZonesFromMAP(rawData.mapWatts, data.ergometerType)
        result.recommendations = zones.recommendations
        result.details = {
          mapWatts: rawData.mapWatts,
          peakPower: rawData.peakPower,
          stages: rawData.stages,
          completedStages: rawData.stages.filter(s => s.completed).length,
        }
        break
      }
    }
  } catch (error) {
    console.error('Analysis error:', error)
    result.valid = false
    result.errors.push(error instanceof Error ? error.message : 'Analysis failed')
  }

  return result
}

// ==================== BENCHMARK CLASSIFICATION ====================

interface BenchmarkResult {
  tier?: string
  percentile?: number
  comparedTo?: string
  message?: string
}

async function classifyPerformance(
  ergometerType: ErgometerType,
  testProtocol: ErgometerTestProtocol,
  analysis: AnalysisResult,
  client: { id: string; name: string }
): Promise<BenchmarkResult> {
  // Get client's gender for benchmark comparison
  const clientData = await prisma.client.findUnique({
    where: { id: client.id },
    select: { gender: true },
  })

  // For now, return basic benchmark info
  // Full benchmark classification will be implemented in Phase 6
  const benchmark: BenchmarkResult = {
    message: 'Benchmark classification will be available after reference data is seeded',
  }

  // If we have peak power analysis with tier, use it
  if (analysis.details.tier) {
    benchmark.tier = analysis.details.tier as string
    benchmark.comparedTo = clientData?.gender === 'FEMALE' ? 'Female athletes' : 'Male athletes'
  }

  return benchmark
}
