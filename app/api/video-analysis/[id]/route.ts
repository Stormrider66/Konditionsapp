/**
 * Individual Video Analysis API
 *
 * GET /api/video-analysis/[id] - Get single analysis
 * DELETE /api/video-analysis/[id] - Delete analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { normalizeStoragePath } from '@/lib/storage/supabase-storage';
import { createSignedUrl } from '@/lib/storage/supabase-storage-server';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const updateAnalysisSchema = z.object({
  sourceContext: z.record(z.unknown()).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params;

    const rateLimited = await rateLimitJsonResponse('video:analysis:get', user.id, {
      limit: 120,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
      include: {
        athlete: { select: { id: true, name: true, height: true, weight: true } },
        exercise: {
          select: {
            id: true,
            name: true,
            nameSv: true,
            nameEn: true,
            description: true,
            muscleGroup: true,
            instructions: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: t(locale, 'Analysis not found', 'Analysen hittades inte') },
        { status: 404 }
      );
    }

    const signVideoUrl = async (videoUrl: string) => {
      const path = normalizeStoragePath('video-analysis', videoUrl)
      if (!path) return videoUrl
      try {
        return await createSignedUrl('video-analysis', path, 60 * 60)
      } catch {
        return videoUrl
      }
    }

    // Multi-view capture group: include every view so the UI can show them together.
    let groupVideos: Array<{ id: string; cameraAngle: string | null; isPrimaryView: boolean; videoUrl: string }> | undefined
    if (analysis.captureGroupId) {
      const members = await prisma.videoAnalysis.findMany({
        where: { captureGroupId: analysis.captureGroupId, coachId: user.id },
        select: { id: true, cameraAngle: true, isPrimaryView: true, videoUrl: true },
        orderBy: { createdAt: 'asc' },
      })
      if (members.length > 1) {
        groupVideos = await Promise.all(
          members.map(async (m) => ({
            id: m.id,
            cameraAngle: m.cameraAngle,
            isPrimaryView: m.isPrimaryView,
            videoUrl: await signVideoUrl(m.videoUrl),
          }))
        )
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        videoUrl: await signVideoUrl(analysis.videoUrl),
        groupVideos,
      },
    });
  } catch (error) {
    logger.error('Get analysis error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to get analysis', 'Kunde inte hämta analysen') },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params;

    const rateLimited = await rateLimitJsonResponse('video:analysis:update', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const parsed = updateAnalysisSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: parsed.error.errors },
        { status: 400 }
      )
    }

    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
      select: { id: true, comparisonData: true },
    })

    if (!analysis) {
      return NextResponse.json(
        { error: t(locale, 'Analysis not found', 'Analysen hittades inte') },
        { status: 404 }
      );
    }

    const existingComparisonData =
      analysis.comparisonData && typeof analysis.comparisonData === 'object' && !Array.isArray(analysis.comparisonData)
        ? analysis.comparisonData as Record<string, unknown>
        : {}

    const sourceContext = parsed.data.sourceContext
      ? Object.fromEntries(Object.entries(parsed.data.sourceContext).filter(([, value]) => value !== undefined))
      : null

    const comparisonData = (sourceContext
      ? {
          ...existingComparisonData,
          ...sourceContext,
        }
      : existingComparisonData) as Prisma.InputJsonValue

    const updated = await prisma.videoAnalysis.update({
      where: { id },
      data: {
        comparisonData,
      },
    })

    return NextResponse.json({ success: true, analysis: updated })
  } catch (error) {
    logger.error('Update analysis error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to update analysis', 'Kunde inte uppdatera analysen') },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
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
        { error: t(locale, 'Analysis not found', 'Analysen hittades inte') },
        { status: 404 }
      );
    }

    // Multi-view capture groups are deleted as a unit — sibling views are
    // hidden from the list UI, so leaving them would orphan their videos.
    const records = analysis.captureGroupId
      ? await prisma.videoAnalysis.findMany({
          where: { captureGroupId: analysis.captureGroupId, coachId: user.id },
          select: { id: true, videoUrl: true },
        })
      : [{ id: analysis.id, videoUrl: analysis.videoUrl }]

    // Delete videos from Supabase Storage
    const storagePaths: string[] = []
    for (const record of records) {
      if (!record.videoUrl) continue
      const path = normalizeStoragePath('video-analysis', record.videoUrl)
      if (path && path.startsWith(`${user.id}/`)) {
        storagePaths.push(path)
      } else if (path) {
        logger.warn('Skipping storage deletion: unexpected path prefix', { id: record.id, path })
      }
    }
    if (storagePaths.length > 0) {
      try {
        const admin = createAdminSupabaseClient()
        await admin.storage.from('video-analysis').remove(storagePaths)
      } catch (storageError) {
        logger.warn('Storage deletion error', { id }, storageError)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    await prisma.videoAnalysis.deleteMany({
      where: { id: { in: records.map((r) => r.id) } },
    });

    return NextResponse.json({
      success: true,
      message: t(locale, 'Analysis deleted', 'Analysen raderades'),
    });
  } catch (error) {
    logger.error('Delete analysis error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to delete analysis', 'Kunde inte radera analysen') },
      { status: 500 }
    );
  }
}
