// app/api/video-imports/[id]/matches/route.ts
/**
 * Video Match Management API
 *
 * Endpoints:
 * - GET /api/video-imports/:id/matches - Get all matches for an import
 * - PATCH /api/video-imports/:id/matches - Bulk update matches
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema for updating a single match
const updateMatchSchema = z.object({
  matchId: z.string().uuid(),
  exerciseId: z.string().uuid().optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

// Schema for bulk update
const bulkUpdateSchema = z.object({
  updates: z.array(updateMatchSchema),
})

// Schema for bulk approve
const bulkApproveSchema = z.object({
  action: z.literal('approve_all'),
  minScore: z.number().min(0).max(1).optional().default(0.9),
})

/**
 * GET - Get all matches for an import with filtering
 */
export async function GET(
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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const hasMatch = searchParams.get('hasMatch')

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

    // Build where clause
    const where: Record<string, unknown> = { importId }

    if (status) {
      where.status = status.toUpperCase()
    }

    if (hasMatch === 'true') {
      where.exerciseId = { not: null }
    } else if (hasMatch === 'false') {
      where.exerciseId = null
    }

    const matches = await prisma.videoMatch.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { matchScore: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: matches,
    })
  } catch (error: unknown) {
    logger.error('Error fetching video matches', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Bulk update matches
 *
 * Supports:
 * - Individual match updates (change exercise assignment, status)
 * - Bulk approve all matches above a score threshold
 */
export async function PATCH(
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
    const body = await request.json()

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

    // Check if this is a bulk approve action
    const bulkApprove = bulkApproveSchema.safeParse(body)
    if (bulkApprove.success) {
      const { minScore } = bulkApprove.data

      // Approve all matches with score >= minScore that have an exercise assigned
      const result = await prisma.videoMatch.updateMany({
        where: {
          importId,
          status: 'PENDING',
          exerciseId: { not: null },
          matchScore: { gte: minScore },
        },
        data: {
          status: 'APPROVED',
        },
      })

      return NextResponse.json({
        success: true,
        message: `Approved ${result.count} matches with score >= ${minScore * 100}%`,
        updatedCount: result.count,
      })
    }

    // Otherwise, handle individual updates
    const validation = bulkUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { updates } = validation.data
    let updatedCount = 0

    for (const update of updates) {
      // Verify match belongs to this import
      const match = await prisma.videoMatch.findFirst({
        where: {
          id: update.matchId,
          importId,
        },
      })

      if (!match) continue

      // If changing exercise, fetch the exercise name
      let exerciseName = match.exerciseName
      if (update.exerciseId !== undefined) {
        if (update.exerciseId) {
          const exercise = await prisma.exercise.findUnique({
            where: { id: update.exerciseId },
            select: { name: true },
          })
          exerciseName = exercise?.name || null
        } else {
          exerciseName = null
        }
      }

      await prisma.videoMatch.update({
        where: { id: update.matchId },
        data: {
          ...(update.exerciseId !== undefined && {
            exerciseId: update.exerciseId,
            exerciseName,
            matchMethod: update.exerciseId ? 'MANUAL' : null,
          }),
          ...(update.status && { status: update.status }),
        },
      })

      updatedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} matches`,
      updatedCount,
    })
  } catch (error: unknown) {
    logger.error('Error updating video matches', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update matches' },
      { status: 500 }
    )
  }
}
