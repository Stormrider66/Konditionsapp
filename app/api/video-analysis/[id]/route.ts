/**
 * Individual Video Analysis API
 *
 * GET /api/video-analysis/[id] - Get single analysis
 * DELETE /api/video-analysis/[id] - Delete analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { normalizeStoragePath } from '@/lib/storage/supabase-storage';
import { createSignedUrl } from '@/lib/storage/supabase-storage-server';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const rateLimited = await rateLimitJsonResponse('video:analysis:get', user.id, {
      limit: 120,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: {
          select: {
            id: true,
            name: true,
            nameSv: true,
            description: true,
            muscleGroup: true,
            instructions: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        videoUrl: await (async () => {
          const path = normalizeStoragePath('video-analysis', analysis.videoUrl)
          if (!path) return analysis.videoUrl
          try {
            return await createSignedUrl('video-analysis', path, 60 * 60)
          } catch {
            return analysis.videoUrl
          }
        })(),
      },
    });
  } catch (error) {
    logger.error('Get analysis error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get analysis' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const rateLimited = await rateLimitJsonResponse('video:analysis:delete', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Delete video from Supabase Storage
    if (analysis.videoUrl) {
      try {
        const admin = createAdminSupabaseClient()
        const path = normalizeStoragePath('video-analysis', analysis.videoUrl)
        if (path && path.startsWith(`${user.id}/`)) {
          await admin.storage.from('video-analysis').remove([path])
        } else if (path) {
          logger.warn('Skipping storage deletion: unexpected path prefix', { id, path })
        }
      } catch (storageError) {
        logger.warn('Storage deletion error', { id }, storageError)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    await prisma.videoAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted',
    });
  } catch (error) {
    logger.error('Delete analysis error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete analysis' },
      { status: 500 }
    );
  }
}
