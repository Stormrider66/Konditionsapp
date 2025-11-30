// app/api/video-imports/[id]/apply/route.ts
/**
 * Apply Video Matches API
 *
 * Endpoint:
 * - POST /api/video-imports/:id/apply - Apply approved matches to exercises
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * POST - Apply all approved matches to exercises
 *
 * This will:
 * 1. Find all APPROVED matches with an exercise assigned
 * 2. Update each exercise's videoUrl
 * 3. Mark matches as APPLIED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: importId } = await params

    // Verify import exists and user owns it
    const videoImport = await prisma.videoImport.findUnique({
      where: { id: importId },
    })

    if (!videoImport) {
      return NextResponse.json(
        { success: false, error: 'Import not found' },
        { status: 404 }
      )
    }

    if (videoImport.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Get all approved matches with exercise assigned
    const approvedMatches = await prisma.videoMatch.findMany({
      where: {
        importId,
        status: 'APPROVED',
        exerciseId: { not: null },
      },
    })

    if (approvedMatches.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No approved matches to apply' },
        { status: 400 }
      )
    }

    let appliedCount = 0
    const errors: string[] = []

    // Apply each match
    for (const match of approvedMatches) {
      try {
        // Update exercise with video URL
        await prisma.exercise.update({
          where: { id: match.exerciseId! },
          data: { videoUrl: match.videoUrl },
        })

        // Mark match as applied
        await prisma.videoMatch.update({
          where: { id: match.id },
          data: {
            status: 'APPLIED',
            appliedAt: new Date(),
          },
        })

        appliedCount++
      } catch (err) {
        const errorMsg = `Failed to apply video to exercise ${match.exerciseName}: ${err instanceof Error ? err.message : 'Unknown error'}`
        errors.push(errorMsg)
        logger.warn(errorMsg)
      }
    }

    // Update import stats
    await prisma.videoImport.update({
      where: { id: importId },
      data: {
        appliedVideos: { increment: appliedCount },
      },
    })

    if (errors.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Applied ${appliedCount} of ${approvedMatches.length} videos`,
        appliedCount,
        errors,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully applied ${appliedCount} videos to exercises`,
      appliedCount,
    })
  } catch (error: unknown) {
    logger.error('Error applying video matches', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to apply matches' },
      { status: 500 }
    )
  }
}
