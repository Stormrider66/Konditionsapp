import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  athleteId: z.string().optional(),
})

// GET: Get analytics for coach decisions
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = querySchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      athleteId: searchParams.get('athleteId') || undefined,
    })

    if (query.athleteId) {
      const hasAccess = await canAccessClient(user.id, query.athleteId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Athlete not found or access denied' }, { status: 404 })
      }
    }

    // Build where clause
    const where: Record<string, unknown> = {
      coachId: user.id,
    }

    if (query.athleteId) {
      where.athleteId = query.athleteId
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

    // Get all decisions for analysis
    const decisions = await prisma.coachDecision.findMany({
      where,
      select: {
        id: true,
        aiSuggestionType: true,
        reasonCategory: true,
        outcomeAssessment: true,
        modificationMagnitude: true,
        coachConfidence: true,
        aiConfidence: true,
        validated: true,
        createdAt: true,
      },
    })

    // Calculate analytics
    const totalDecisions = decisions.length
    const validatedDecisions = decisions.filter((d) => d.validated).length

    // Decisions by suggestion type
    const bySuggestionType = decisions.reduce(
      (acc, d) => {
        acc[d.aiSuggestionType] = (acc[d.aiSuggestionType] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Decisions by reason category
    const byReasonCategory = decisions.reduce(
      (acc, d) => {
        acc[d.reasonCategory] = (acc[d.reasonCategory] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Outcome distribution (only validated)
    const validatedOnes = decisions.filter((d) => d.outcomeAssessment)
    const outcomeDistribution = validatedOnes.reduce(
      (acc, d) => {
        if (d.outcomeAssessment) {
          acc[d.outcomeAssessment] = (acc[d.outcomeAssessment] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate success rate (coach was better or same as AI)
    const successfulDecisions = validatedOnes.filter(
      (d) => d.outcomeAssessment === 'BETTER_THAN_AI' || d.outcomeAssessment === 'SAME_AS_AI'
    ).length
    const successRate = validatedOnes.length > 0 ? successfulDecisions / validatedOnes.length : null

    // Coach beat AI rate
    const coachBeatAI = validatedOnes.filter(
      (d) => d.outcomeAssessment === 'BETTER_THAN_AI'
    ).length
    const coachBeatAIRate = validatedOnes.length > 0 ? coachBeatAI / validatedOnes.length : null

    // Average modification magnitude
    const modificationsWithMagnitude = decisions.filter((d) => d.modificationMagnitude !== null)
    const avgModificationMagnitude =
      modificationsWithMagnitude.length > 0
        ? modificationsWithMagnitude.reduce((sum, d) => sum + (d.modificationMagnitude || 0), 0) /
          modificationsWithMagnitude.length
        : null

    // Average coach confidence
    const decisionsWithConfidence = decisions.filter((d) => d.coachConfidence !== null)
    const avgCoachConfidence =
      decisionsWithConfidence.length > 0
        ? decisionsWithConfidence.reduce((sum, d) => sum + (d.coachConfidence || 0), 0) /
          decisionsWithConfidence.length
        : null

    // Decisions over time (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentDecisions = decisions.filter((d) => d.createdAt >= thirtyDaysAgo)
    const decisionsOverTime = recentDecisions.reduce(
      (acc, d) => {
        const dateKey = d.createdAt.toISOString().split('T')[0]
        acc[dateKey] = (acc[dateKey] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Outcome by reason (what reasons lead to better outcomes?)
    const outcomeByReason = validatedOnes.reduce(
      (acc, d) => {
        if (!acc[d.reasonCategory]) {
          acc[d.reasonCategory] = { total: 0, better: 0, same: 0, worse: 0, unknown: 0 }
        }
        acc[d.reasonCategory].total++
        if (d.outcomeAssessment === 'BETTER_THAN_AI') acc[d.reasonCategory].better++
        else if (d.outcomeAssessment === 'SAME_AS_AI') acc[d.reasonCategory].same++
        else if (d.outcomeAssessment === 'WORSE_THAN_AI') acc[d.reasonCategory].worse++
        else acc[d.reasonCategory].unknown++
        return acc
      },
      {} as Record<string, { total: number; better: number; same: number; worse: number; unknown: number }>
    )

    return NextResponse.json({
      summary: {
        totalDecisions,
        validatedDecisions,
        validationRate: totalDecisions > 0 ? validatedDecisions / totalDecisions : 0,
        successRate,
        coachBeatAIRate,
        avgModificationMagnitude,
        avgCoachConfidence,
      },
      distributions: {
        bySuggestionType,
        byReasonCategory,
        outcomeDistribution,
      },
      trends: {
        decisionsOverTime,
      },
      insights: {
        outcomeByReason,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
