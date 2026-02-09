/**
 * POST /api/race-results/[id]/analysis
 *
 * Data Moat: Save post-race analysis and link to predictions for validation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const analysisSchema = z.object({
  satisfactionScore: z.number().min(1).max(5),
  goalAchieved: z.boolean(),
  linkedPredictionId: z.string().optional(),
  conditionFactors: z.object({
    heat: z.boolean(),
    cold: z.boolean(),
    humidity: z.boolean(),
    wind: z.boolean(),
    altitude: z.boolean(),
    illness: z.boolean(),
    injury: z.boolean(),
    travel: z.boolean(),
    poorSleep: z.boolean(),
    nutritionIssues: z.boolean(),
    mentalStress: z.boolean(),
    courseConditions: z.boolean(),
  }),
  coachAnalysis: z.object({
    pacingExecution: z.enum(['excellent', 'good', 'fair', 'poor']).nullable(),
    pacingNotes: z.string(),
    tacticalExecution: z.enum(['excellent', 'good', 'fair', 'poor']).nullable(),
    tacticalNotes: z.string(),
    nutritionExecution: z.enum(['excellent', 'good', 'fair', 'poor']).nullable(),
    nutritionNotes: z.string(),
    mentalExecution: z.enum(['excellent', 'good', 'fair', 'poor']).nullable(),
    mentalNotes: z.string(),
    keyLearnings: z.string(),
    recommendations: z.string(),
  }),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireCoach()

    // Get the race result
    const raceResult = await prisma.raceResult.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    })

    if (!raceResult) {
      return NextResponse.json({ error: 'Race result not found' }, { status: 404 })
    }

    const hasAccess = await canAccessClient(user.id, raceResult.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = analysisSchema.parse(body)

    // If linking to a prediction, verify it exists and validate it
    let predictionValidated = false
    if (validatedData.linkedPredictionId) {
      const prediction = await prisma.aIPrediction.findUnique({
        where: { id: validatedData.linkedPredictionId },
      })

      if (prediction && prediction.athleteId === raceResult.clientId) {
        // Calculate prediction error
        const predictedValue = prediction.predictedValue as { timeSeconds?: number }
        const actualTimeSeconds = raceResult.timeMinutes * 60

        if (predictedValue?.timeSeconds) {
          const absoluteError = Math.abs(predictedValue.timeSeconds - actualTimeSeconds)
          const percentageError = (absoluteError / predictedValue.timeSeconds) * 100

          // Check if within confidence interval
          let withinCI = false
          if (prediction.confidenceLower && prediction.confidenceUpper) {
            withinCI =
              actualTimeSeconds >= prediction.confidenceLower &&
              actualTimeSeconds <= prediction.confidenceUpper
          }

          // Create validation record
          await prisma.predictionValidation.create({
            data: {
              predictionId: validatedData.linkedPredictionId,
              actualValue: { timeSeconds: actualTimeSeconds },
              occurredAt: raceResult.raceDate,
              absoluteError,
              percentageError,
              withinConfidenceInterval: withinCI,
              environmentalFactors: validatedData.conditionFactors,
              validationSource: 'MANUAL_ENTRY',
              validationQuality: 1.0,
            },
          })

          // Mark prediction as validated
          await prisma.aIPrediction.update({
            where: { id: validatedData.linkedPredictionId },
            data: { validated: true },
          })

          predictionValidated = true
        }
      }
    }

    // Update the race result with analysis data
    const updatedRaceResult = await prisma.raceResult.update({
      where: { id },
      data: {
        satisfactionScore: validatedData.satisfactionScore,
        goalAchieved: validatedData.goalAchieved,
        linkedPredictionId: validatedData.linkedPredictionId || null,
        conditionFactors: validatedData.conditionFactors,
        coachAnalysis: validatedData.coachAnalysis,
      },
    })

    return NextResponse.json({
      success: true,
      raceResult: updatedRaceResult,
      predictionValidated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error saving post-race analysis:', error)
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    )
  }
}

// GET: Retrieve post-race analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireCoach()

    const raceResult = await prisma.raceResult.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
            name: true,
          },
        },
        linkedPrediction: {
          include: {
            validation: true,
          },
        },
      },
    })

    if (!raceResult) {
      return NextResponse.json({ error: 'Race result not found' }, { status: 404 })
    }

    const hasAccess = await canAccessClient(user.id, raceResult.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      raceResult: {
        id: raceResult.id,
        raceName: raceResult.raceName,
        raceDate: raceResult.raceDate,
        timeFormatted: raceResult.timeFormatted,
        goalTime: raceResult.goalTime,
        satisfactionScore: raceResult.satisfactionScore,
        goalAchieved: raceResult.goalAchieved,
        conditionFactors: raceResult.conditionFactors,
        coachAnalysis: raceResult.coachAnalysis,
      },
      linkedPrediction: raceResult.linkedPrediction
        ? {
            id: raceResult.linkedPrediction.id,
            predictedValue: raceResult.linkedPrediction.predictedValue,
            confidenceScore: raceResult.linkedPrediction.confidenceScore,
            validation: raceResult.linkedPrediction.validation,
          }
        : null,
      athlete: {
        id: raceResult.client.id,
        name: raceResult.client.name,
      },
    })
  } catch (error) {
    console.error('Error fetching post-race analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    )
  }
}
