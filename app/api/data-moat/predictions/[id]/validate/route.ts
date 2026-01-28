import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const validatePredictionSchema = z.object({
  actualValue: z.any(),
  occurredAt: z.string().datetime(),
  environmentalFactors: z.record(z.any()).optional(),
  validationSource: z.enum([
    'AUTO_STRAVA_IMPORT',
    'AUTO_GARMIN_IMPORT',
    'AUTO_RACE_RESULT',
    'AUTO_TEST_RESULT',
    'MANUAL_ENTRY',
    'DEVICE_SYNC',
  ]),
  validationQuality: z.number().min(0).max(1),
  errorExplanation: z.string().optional(),
})

// Helper to calculate error metrics
function calculateErrorMetrics(predicted: unknown, actual: unknown): {
  absoluteError: number
  percentageError: number
  withinConfidenceInterval: boolean
} {
  // Handle numeric predictions
  if (typeof predicted === 'number' && typeof actual === 'number') {
    const absoluteError = Math.abs(predicted - actual)
    const percentageError = predicted !== 0 ? (absoluteError / Math.abs(predicted)) * 100 : 0
    return {
      absoluteError,
      percentageError,
      withinConfidenceInterval: false, // Will be calculated separately if CI exists
    }
  }

  // Handle time predictions (stored as seconds or ISO strings)
  if (
    typeof predicted === 'object' &&
    predicted !== null &&
    'seconds' in predicted &&
    typeof actual === 'object' &&
    actual !== null &&
    'seconds' in actual
  ) {
    const predictedSeconds = (predicted as { seconds: number }).seconds
    const actualSeconds = (actual as { seconds: number }).seconds
    const absoluteError = Math.abs(predictedSeconds - actualSeconds)
    const percentageError =
      predictedSeconds !== 0 ? (absoluteError / Math.abs(predictedSeconds)) * 100 : 0
    return {
      absoluteError,
      percentageError,
      withinConfidenceInterval: false,
    }
  }

  // Default fallback for complex objects
  return {
    absoluteError: 0,
    percentageError: 0,
    withinConfidenceInterval: false,
  }
}

// POST: Validate a prediction with actual outcome
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify prediction exists and belongs to user
    const prediction = await prisma.aIPrediction.findUnique({
      where: { id },
      include: {
        validation: true,
      },
    })

    if (!prediction) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 })
    }

    if (prediction.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if already validated
    if (prediction.validation) {
      return NextResponse.json(
        { error: 'Prediction has already been validated' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = validatePredictionSchema.parse(body)

    // Calculate error metrics
    const errorMetrics = calculateErrorMetrics(prediction.predictedValue, validatedData.actualValue)

    // Check if within confidence interval (if bounds exist)
    let withinCI = false
    if (
      prediction.confidenceLower !== null &&
      prediction.confidenceUpper !== null &&
      typeof validatedData.actualValue === 'number'
    ) {
      withinCI =
        validatedData.actualValue >= prediction.confidenceLower &&
        validatedData.actualValue <= prediction.confidenceUpper
    }

    // Create validation record and update prediction
    const [validation] = await prisma.$transaction([
      prisma.predictionValidation.create({
        data: {
          predictionId: id,
          actualValue: validatedData.actualValue,
          occurredAt: new Date(validatedData.occurredAt),
          absoluteError: errorMetrics.absoluteError,
          percentageError: errorMetrics.percentageError,
          withinConfidenceInterval: withinCI,
          environmentalFactors: validatedData.environmentalFactors,
          validationSource: validatedData.validationSource,
          validationQuality: validatedData.validationQuality,
          errorExplanation: validatedData.errorExplanation,
        },
      }),
      prisma.aIPrediction.update({
        where: { id },
        data: { validated: true },
      }),
    ])

    // Fetch the complete updated prediction
    const updatedPrediction = await prisma.aIPrediction.findUnique({
      where: { id },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
        validation: true,
      },
    })

    return NextResponse.json({
      prediction: updatedPrediction,
      validation,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error validating prediction:', error)
    return NextResponse.json({ error: 'Failed to validate prediction' }, { status: 500 })
  }
}
