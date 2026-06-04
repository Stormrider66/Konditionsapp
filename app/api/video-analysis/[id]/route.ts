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
