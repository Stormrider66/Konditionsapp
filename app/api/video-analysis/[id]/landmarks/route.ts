/**
 * Video Analysis Landmarks API
 *
 * PATCH /api/video-analysis/[id]/landmarks - Save pose landmarks data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const landmarkSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  visibility: z.number().optional(),
});

const frameSchema = z.object({
  timestamp: z.number(),
  landmarks: z.array(landmarkSchema),
});

const updateSchema = z.object({
  frames: z.array(frameSchema),
  summary: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const body = await request.json();
    const { frames, summary } = updateSchema.parse(body);

    // Verify ownership
    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Compress landmarks data for storage
    // Store as TOON format: timestamp + flattened landmark coordinates
    const compressedData = {
      version: '1.0',
      frameCount: frames.length,
      frames: frames.map((frame) => ({
        t: Math.round(frame.timestamp * 1000), // ms
        l: frame.landmarks.map((lm) => [
          Math.round(lm.x * 10000) / 10000,
          Math.round(lm.y * 10000) / 10000,
          Math.round(lm.z * 10000) / 10000,
          lm.visibility ? Math.round(lm.visibility * 100) / 100 : 1,
        ]),
      })),
      metadata: {
        analyzedAt: new Date().toISOString(),
        model: 'mediapipe-blazepose-1.0',
      },
    };

    // Update analysis with landmarks
    const updated = await prisma.videoAnalysis.update({
      where: { id },
      data: {
        landmarksData: compressedData,
        ...(summary && {
          aiAnalysis: analysis.aiAnalysis
            ? `${analysis.aiAnalysis}\n\n--- Pose Analysis ---\n${summary}`
            : `--- Pose Analysis ---\n${summary}`,
        }),
      },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
      },
    });

    return NextResponse.json({
      success: true,
      analysis: updated,
      frameCount: frames.length,
    });
  } catch (error) {
    console.error('Save landmarks error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to save landmarks' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
      select: {
        id: true,
        landmarksData: true,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    if (!analysis.landmarksData) {
      return NextResponse.json(
        { error: 'No landmarks data available' },
        { status: 404 }
      );
    }

    // Decompress landmarks data
    const data = analysis.landmarksData as {
      version: string;
      frameCount: number;
      frames: Array<{
        t: number;
        l: Array<[number, number, number, number]>;
      }>;
      metadata: {
        analyzedAt: string;
        model: string;
      };
    };

    const frames = data.frames.map((frame) => ({
      timestamp: frame.t / 1000,
      landmarks: frame.l.map(([x, y, z, visibility]) => ({
        x,
        y,
        z,
        visibility,
      })),
    }));

    return NextResponse.json({
      success: true,
      version: data.version,
      frameCount: data.frameCount,
      frames,
      metadata: data.metadata,
    });
  } catch (error) {
    console.error('Get landmarks error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get landmarks' },
      { status: 500 }
    );
  }
}
