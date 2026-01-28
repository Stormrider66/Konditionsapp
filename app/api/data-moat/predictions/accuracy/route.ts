import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  predictionType: z.string().optional(),
  athleteId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// GET: Get prediction accuracy statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = querySchema.parse({
      predictionType: searchParams.get('predictionType') || undefined,
      athleteId: searchParams.get('athleteId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    // Build where clause for predictions
    const where: Record<string, unknown> = {
      coachId: user.id,
      validated: true,
    }

    if (query.athleteId) {
      where.athleteId = query.athleteId
    }

    if (query.predictionType) {
      where.predictionType = query.predictionType
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) {
        ;(where.createdAt as Record<string, Date>).gte = new Date(query.startDate)
      }
      if (query.endDate) {
        ;(where.createdAt as Record<string, Date>).lte = new Date(query.endDate)
      }
    }

    // Get validated predictions with their validations
    const predictions = await prisma.aIPrediction.findMany({
      where,
      include: {
        validation: true,
      },
    })

    // Calculate overall accuracy metrics
    const validations = predictions
      .map((p) => p.validation)
      .filter((v): v is NonNullable<typeof v> => v !== null)

    const totalValidated = validations.length

    if (totalValidated === 0) {
      return NextResponse.json({
        summary: {
          totalPredictions: predictions.length,
          totalValidated: 0,
          message: 'No validated predictions yet',
        },
        byType: {},
        trends: {},
      })
    }

    // Overall metrics
    const avgAbsoluteError =
      validations.reduce((sum, v) => sum + v.absoluteError, 0) / totalValidated
    const avgPercentageError =
      validations.reduce((sum, v) => sum + v.percentageError, 0) / totalValidated
    const withinCICount = validations.filter((v) => v.withinConfidenceInterval).length
    const withinCIRate = withinCICount / totalValidated

    // Metrics by prediction type
    const byType: Record<
      string,
      {
        count: number
        avgAbsoluteError: number
        avgPercentageError: number
        withinCIRate: number
      }
    > = {}

    for (const prediction of predictions) {
      if (!prediction.validation) continue

      const type = prediction.predictionType
      if (!byType[type]) {
        byType[type] = {
          count: 0,
          avgAbsoluteError: 0,
          avgPercentageError: 0,
          withinCIRate: 0,
        }
      }
      byType[type].count++
    }

    // Calculate averages per type
    for (const type of Object.keys(byType)) {
      const typeValidations = predictions
        .filter((p) => p.predictionType === type && p.validation)
        .map((p) => p.validation!)

      if (typeValidations.length > 0) {
        byType[type].avgAbsoluteError =
          typeValidations.reduce((sum, v) => sum + v.absoluteError, 0) / typeValidations.length
        byType[type].avgPercentageError =
          typeValidations.reduce((sum, v) => sum + v.percentageError, 0) / typeValidations.length
        byType[type].withinCIRate =
          typeValidations.filter((v) => v.withinConfidenceInterval).length / typeValidations.length
      }
    }

    // Accuracy trends over time (by month)
    const byMonth: Record<
      string,
      {
        count: number
        avgPercentageError: number
        withinCIRate: number
      }
    > = {}

    for (const prediction of predictions) {
      if (!prediction.validation) continue

      const monthKey = prediction.createdAt.toISOString().slice(0, 7) // YYYY-MM
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          count: 0,
          avgPercentageError: 0,
          withinCIRate: 0,
        }
      }
      byMonth[monthKey].count++
    }

    // Calculate monthly averages
    for (const month of Object.keys(byMonth)) {
      const monthPredictions = predictions.filter(
        (p) => p.createdAt.toISOString().slice(0, 7) === month && p.validation
      )
      const monthValidations = monthPredictions.map((p) => p.validation!)

      if (monthValidations.length > 0) {
        byMonth[month].avgPercentageError =
          monthValidations.reduce((sum, v) => sum + v.percentageError, 0) / monthValidations.length
        byMonth[month].withinCIRate =
          monthValidations.filter((v) => v.withinConfidenceInterval).length / monthValidations.length
      }
    }

    // Sort months chronologically
    const sortedMonths = Object.keys(byMonth).sort()
    const trends: Record<string, typeof byMonth[string]> = {}
    for (const month of sortedMonths) {
      trends[month] = byMonth[month]
    }

    // Confidence score vs actual error correlation
    const predictionErrorPairs = predictions
      .filter((p) => p.validation)
      .map((p) => ({
        confidenceScore: p.confidenceScore,
        percentageError: p.validation!.percentageError,
      }))

    // Simple correlation: do higher confidence predictions have lower errors?
    const highConfidence = predictionErrorPairs.filter((p) => p.confidenceScore >= 0.7)
    const lowConfidence = predictionErrorPairs.filter((p) => p.confidenceScore < 0.7)

    const confidenceCorrelation = {
      highConfidenceCount: highConfidence.length,
      highConfidenceAvgError:
        highConfidence.length > 0
          ? highConfidence.reduce((sum, p) => sum + p.percentageError, 0) / highConfidence.length
          : null,
      lowConfidenceCount: lowConfidence.length,
      lowConfidenceAvgError:
        lowConfidence.length > 0
          ? lowConfidence.reduce((sum, p) => sum + p.percentageError, 0) / lowConfidence.length
          : null,
    }

    return NextResponse.json({
      summary: {
        totalPredictions: predictions.length,
        totalValidated,
        avgAbsoluteError,
        avgPercentageError,
        withinCIRate,
        validationRate: totalValidated / predictions.length,
      },
      byType,
      trends,
      confidenceCorrelation,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching accuracy:', error)
    return NextResponse.json({ error: 'Failed to fetch accuracy' }, { status: 500 })
  }
}
