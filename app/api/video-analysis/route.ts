/**
 * Video Analysis API
 *
 * POST /api/video-analysis - Create new video analysis
 * GET /api/video-analysis - List video analyses for coach
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createSignedUrl, normalizeStoragePath } from '@/lib/storage/supabase-storage';

const createAnalysisSchema = z.object({
  videoUrl: z.string().url(),
  videoType: z.enum([
    'STRENGTH',
    'RUNNING_GAIT',
    'SKIING_CLASSIC',
    'SKIING_SKATING',
    'SKIING_DOUBLE_POLE',
    'HYROX_STATION',
    'SPORT_SPECIFIC',
  ]),
  athleteId: z.string().uuid().optional(),
  exerciseId: z.string().uuid().optional(),
  duration: z.number().optional(),
  landmarksData: z.any().optional(),
  hyroxStation: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();
    const validated = createAnalysisSchema.parse(body);

    // Verify athlete belongs to coach if provided
    if (validated.athleteId) {
      const athlete = await prisma.client.findFirst({
        where: { id: validated.athleteId, userId: user.id },
      });
      if (!athlete) {
        return NextResponse.json(
          { error: 'Athlete not found' },
          { status: 404 }
        );
      }
    }

    // Verify exercise exists if provided
    if (validated.exerciseId) {
      const exercise = await prisma.exercise.findUnique({
        where: { id: validated.exerciseId },
      });
      if (!exercise) {
        return NextResponse.json(
          { error: 'Exercise not found' },
          { status: 404 }
        );
      }
    }

    // Create video analysis record
    const analysis = await prisma.videoAnalysis.create({
      data: {
        coachId: user.id,
        athleteId: validated.athleteId,
        exerciseId: validated.exerciseId,
        videoUrl: validated.videoUrl,
        videoType: validated.videoType,
        hyroxStation: validated.hyroxStation,
        duration: validated.duration,
        landmarksData: validated.landmarksData,
        status: 'PENDING',
      },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
      },
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Video analysis creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create video analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();
    const { searchParams } = new URL(request.url);

    const athleteId = searchParams.get('athleteId');
    const exerciseId = searchParams.get('exerciseId');
    const status = searchParams.get('status');
    const videoType = searchParams.get('videoType');
    const limit = parseInt(searchParams.get('limit') || '20');

    const analyses = await prisma.videoAnalysis.findMany({
      where: {
        coachId: user.id,
        ...(athleteId && { athleteId }),
        ...(exerciseId && { exerciseId }),
        ...(status && { status }),
        ...(videoType && { videoType }),
      },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
        skiingTechniqueAnalysis: true,
        hyroxStationAnalysis: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return signed URLs (supports private buckets)
    const signedAnalyses = await Promise.all(
      analyses.map(async (a) => {
        const path = normalizeStoragePath('video-analysis', a.videoUrl)
        if (!path) return a
        try {
          const signedUrl = await createSignedUrl('video-analysis', path, 60 * 60)
          return { ...a, videoUrl: signedUrl }
        } catch {
          return a
        }
      })
    )

    return NextResponse.json({
      success: true,
      analyses: signedAnalyses,
    });
  } catch (error) {
    console.error('Video analysis list error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to list video analyses' },
      { status: 500 }
    );
  }
}
