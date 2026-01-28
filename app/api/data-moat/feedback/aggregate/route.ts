/**
 * POST /api/data-moat/feedback/aggregate
 *
 * Data Moat Phase 4: Automatic feedback aggregation
 * Analyzes decisions and predictions to extract lessons automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { extractLessonsFromDecisions, extractLessonsFromPredictions } from '@/lib/data-moat/feedback-aggregator'

// POST: Trigger feedback aggregation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role for aggregation
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const lookbackDays = body.lookbackDays || 30
    const minEvidenceCount = body.minEvidenceCount || 3

    // Extract lessons from coach decisions
    const decisionLessons = await extractLessonsFromDecisions({
      lookbackDays,
      minEvidenceCount,
    })

    // Extract lessons from prediction errors
    const predictionLessons = await extractLessonsFromPredictions({
      lookbackDays,
      minEvidenceCount,
    })

    // Save new lessons to feedback loops
    let savedCount = 0
    const allLessons = [...decisionLessons, ...predictionLessons]

    for (const lesson of allLessons) {
      try {
        // Check if similar lesson already exists
        const existing = await prisma.aIFeedbackLoop.findFirst({
          where: {
            lessonTitle: lesson.lessonTitle,
            lessonCategory: lesson.lessonCategory,
            lessonStatus: { in: ['IDENTIFIED', 'VALIDATED'] },
          },
        })

        if (existing) {
          // Update evidence count
          await prisma.aIFeedbackLoop.update({
            where: { id: existing.id },
            data: {
              evidenceCount: existing.evidenceCount + lesson.evidenceCount,
              lessonConfidence: Math.min(
                1,
                existing.lessonConfidence + (lesson.lessonConfidence * 0.1)
              ),
              evidenceData: {
                ...(existing.evidenceData as Record<string, unknown> || {}),
                ...(lesson.evidenceData || {}),
              } as Prisma.InputJsonValue,
            },
          })
        } else {
          // Create new feedback loop entry
          await prisma.aIFeedbackLoop.create({
            data: {
              feedbackCategory: lesson.feedbackCategory,
              coachDecisionId: lesson.coachDecisionId,
              predictionId: lesson.predictionId,
              lessonTitle: lesson.lessonTitle,
              lessonDescription: lesson.lessonDescription,
              lessonCategory: lesson.lessonCategory,
              lessonConfidence: lesson.lessonConfidence,
              evidenceCount: lesson.evidenceCount,
              evidenceData: (lesson.evidenceData ?? undefined) as Prisma.InputJsonValue | undefined,
              affectedPrompts: lesson.affectedPrompts ?? [],
            },
          })
          savedCount++
        }
      } catch (err) {
        console.error('Failed to save lesson:', err)
      }
    }

    // Get summary statistics
    const stats = await prisma.aIFeedbackLoop.groupBy({
      by: ['lessonStatus'],
      _count: true,
    })

    const statusCounts = stats.reduce(
      (acc, s) => {
        acc[s.lessonStatus] = s._count
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      success: true,
      lessonsExtracted: allLessons.length,
      newLessonsSaved: savedCount,
      fromDecisions: decisionLessons.length,
      fromPredictions: predictionLessons.length,
      statusSummary: statusCounts,
    })
  } catch (error) {
    console.error('Error aggregating feedback:', error)
    return NextResponse.json({ error: 'Failed to aggregate feedback' }, { status: 500 })
  }
}

// GET: Get aggregation statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Summary by category
    const byCategory = await prisma.aIFeedbackLoop.groupBy({
      by: ['feedbackCategory'],
      _count: true,
      _avg: { lessonConfidence: true },
    })

    // Summary by status
    const byStatus = await prisma.aIFeedbackLoop.groupBy({
      by: ['lessonStatus'],
      _count: true,
    })

    // Summary by lesson category
    const byLessonCategory = await prisma.aIFeedbackLoop.groupBy({
      by: ['lessonCategory'],
      _count: true,
      orderBy: { _count: { lessonCategory: 'desc' } },
      take: 10,
    })

    // Recently applied lessons
    const recentlyApplied = await prisma.aIFeedbackLoop.findMany({
      where: { lessonStatus: 'APPLIED' },
      orderBy: { appliedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        lessonTitle: true,
        lessonCategory: true,
        appliedAt: true,
        improvementPercent: true,
      },
    })

    // High-confidence pending lessons
    const pendingHighConfidence = await prisma.aIFeedbackLoop.findMany({
      where: {
        lessonStatus: 'IDENTIFIED',
        lessonConfidence: { gte: 0.7 },
        evidenceCount: { gte: 5 },
      },
      orderBy: { lessonConfidence: 'desc' },
      take: 10,
      select: {
        id: true,
        lessonTitle: true,
        lessonCategory: true,
        lessonConfidence: true,
        evidenceCount: true,
        affectedPrompts: true,
      },
    })

    return NextResponse.json({
      summary: {
        byCategory: byCategory.map((c) => ({
          category: c.feedbackCategory,
          count: c._count,
          avgConfidence: c._avg.lessonConfidence,
        })),
        byStatus: byStatus.map((s) => ({
          status: s.lessonStatus,
          count: s._count,
        })),
        byLessonCategory: byLessonCategory.map((l) => ({
          category: l.lessonCategory,
          count: l._count,
        })),
      },
      recentlyApplied,
      pendingHighConfidence,
    })
  } catch (error) {
    console.error('Error fetching aggregation stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
