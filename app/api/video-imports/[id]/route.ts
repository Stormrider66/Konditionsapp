// app/api/video-imports/[id]/route.ts
/**
 * Single Video Import API
 *
 * Endpoints:
 * - GET /api/video-imports/:id - Get import details with matches
 * - DELETE /api/video-imports/:id - Delete import and all matches
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * GET - Get single import with all matches
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

    const { id } = await params

    const videoImport = await prisma.videoImport.findUnique({
      where: { id },
      include: {
        matches: {
          orderBy: [
            { status: 'asc' }, // PENDING first
            { matchScore: 'desc' },
          ],
        },
      },
    })

    if (!videoImport) {
      return NextResponse.json(
        { success: false, error: 'Import not found' },
        { status: 404 }
      )
    }

    // Authorization: only owner can view
    if (videoImport.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this import' },
        { status: 403 }
      )
    }

    // Calculate stats
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      applied: 0,
      unmatched: 0,
    }

    videoImport.matches.forEach((match) => {
      const status = match.status.toLowerCase() as keyof typeof stats
      if (status in stats) {
        stats[status]++
      }
      if (!match.exerciseId) {
        stats.unmatched++
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...videoImport,
        stats,
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching video import', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video import' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete import and all associated matches
 */
export async function DELETE(
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

    const { id } = await params

    const videoImport = await prisma.videoImport.findUnique({
      where: { id },
    })

    if (!videoImport) {
      return NextResponse.json(
        { success: false, error: 'Import not found' },
        { status: 404 }
      )
    }

    // Authorization: only owner can delete
    if (videoImport.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this import' },
        { status: 403 }
      )
    }

    // Delete import (cascades to matches)
    await prisma.videoImport.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Import deleted successfully',
    })
  } catch (error: unknown) {
    logger.error('Error deleting video import', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete video import' },
      { status: 500 }
    )
  }
}
