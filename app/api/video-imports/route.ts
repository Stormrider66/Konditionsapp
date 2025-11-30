// app/api/video-imports/route.ts
/**
 * Video Import API
 *
 * Endpoints:
 * - GET /api/video-imports - List all imports for current user
 * - POST /api/video-imports - Start new import from YouTube playlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireCoach } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import {
  extractPlaylistId,
  fetchPlaylistVideos,
  getPlaylistDetails,
  isYouTubeConfigured,
} from '@/lib/youtube/api'
import { findBestMatch, type Exercise } from '@/lib/video-matching/matcher'

// Validation schema for new import
const createImportSchema = z.object({
  playlistUrl: z.string().min(1, 'Playlist URL is required'),
})

/**
 * GET - List all video imports for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const imports = await prisma.videoImport.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate stats for each import
    const importsWithStats = await Promise.all(
      imports.map(async (imp) => {
        const matchStats = await prisma.videoMatch.groupBy({
          by: ['status'],
          where: { importId: imp.id },
          _count: true,
        })

        const stats = {
          pending: 0,
          approved: 0,
          rejected: 0,
          applied: 0,
        }

        matchStats.forEach((stat) => {
          const status = stat.status.toLowerCase() as keyof typeof stats
          if (status in stats) {
            stats[status] = stat._count
          }
        })

        return {
          ...imp,
          stats,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: importsWithStats,
    })
  } catch (error: unknown) {
    logger.error('Error fetching video imports', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video imports' },
      { status: 500 }
    )
  }
}

/**
 * POST - Start new import from YouTube playlist
 *
 * Process:
 * 1. Validate playlist URL
 * 2. Fetch playlist details from YouTube API
 * 3. Fetch all videos from playlist
 * 4. Create VideoImport record
 * 5. Auto-match videos to exercises
 * 6. Create VideoMatch records
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    // Check if YouTube API is configured
    if (!isYouTubeConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube API is not configured. Please add YOUTUBE_API_KEY to environment variables.',
        },
        { status: 503 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = createImportSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { playlistUrl } = validation.data

    // Extract playlist ID
    const playlistId = extractPlaylistId(playlistUrl)
    if (!playlistId) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube playlist URL' },
        { status: 400 }
      )
    }

    // Fetch playlist details
    const playlistDetails = await getPlaylistDetails(playlistId)
    if (!playlistDetails) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found or is private' },
        { status: 404 }
      )
    }

    // Fetch all videos from playlist
    const videos = await fetchPlaylistVideos(playlistId)
    if (videos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Playlist is empty' },
        { status: 400 }
      )
    }

    // Fetch all exercises for matching
    const exercises = await prisma.exercise.findMany({
      select: {
        id: true,
        name: true,
        nameSv: true,
        nameEn: true,
      },
    })

    // Create import record
    const videoImport = await prisma.videoImport.create({
      data: {
        userId: user.id,
        playlistId,
        playlistTitle: playlistDetails.title,
        playlistUrl,
        status: 'PROCESSING',
        totalVideos: videos.length,
      },
    })

    // Match videos to exercises and create VideoMatch records
    let matchedCount = 0
    const matchRecords = []

    for (const video of videos) {
      const match = findBestMatch(video.title, exercises as Exercise[])

      const matchRecord = {
        importId: videoImport.id,
        videoId: video.id,
        videoTitle: video.title,
        videoUrl: video.url,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        exerciseId: match?.matchMethod !== 'NONE' ? match?.exerciseId : null,
        exerciseName: match?.matchMethod !== 'NONE' ? match?.exerciseName : null,
        matchScore: match?.score || null,
        matchMethod: match?.matchMethod || null,
        status: 'PENDING',
      }

      matchRecords.push(matchRecord)

      if (match?.matchMethod !== 'NONE') {
        matchedCount++
      }
    }

    // Bulk create match records
    await prisma.videoMatch.createMany({
      data: matchRecords,
    })

    // Update import with final stats
    const completedImport = await prisma.videoImport.update({
      where: { id: videoImport.id },
      data: {
        status: 'COMPLETED',
        matchedVideos: matchedCount,
        completedAt: new Date(),
      },
      include: {
        matches: {
          orderBy: { matchScore: 'desc' },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: completedImport,
        message: `Imported ${videos.length} videos, ${matchedCount} auto-matched`,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    logger.error('Error creating video import', {}, error)

    // If we created an import record, mark it as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { success: false, error: `Failed to import playlist: ${errorMessage}` },
      { status: 500 }
    )
  }
}
