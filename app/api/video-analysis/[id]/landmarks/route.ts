/**
 * Video Analysis Landmarks API
 *
 * PATCH /api/video-analysis/[id]/landmarks - Save pose landmarks data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  compressSkeletalData,
  decompressSkeletalData,
  toBase64,
  fromBase64,
  getCompressionStats,
  type PoseFrame,
  type TOONData,
} from '@/lib/video-analysis/skeletal-compression';

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

    // Compress landmarks data using TOON format
    // Achieves 70-90% compression through delta encoding, quantization, and RLE
    const poseFrames: PoseFrame[] = frames.map((frame) => ({
      timestamp: frame.timestamp,
      landmarks: frame.landmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
      })),
    }));

    const toonData = compressSkeletalData(poseFrames, {
      useImportantLandmarksOnly: true, // Store only 16 key landmarks
      keyframeInterval: 30, // Keyframe every 30 frames
      enableRLE: true, // Enable run-length encoding
    });

    const compressionStats = getCompressionStats(toonData);

    const compressedData = {
      version: '2.0',
      format: 'TOON',
      frameCount: frames.length,
      toonBase64: toBase64(toonData),
      compressionStats,
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

    // Decompress landmarks data - support both TOON v2 and legacy v1 formats
    const data = analysis.landmarksData as {
      version: string;
      format?: string;
      frameCount: number;
      toonBase64?: string;
      compressionStats?: object;
      frames?: Array<{
        t: number;
        l: Array<[number, number, number, number]>;
      }>;
      metadata: {
        analyzedAt: string;
        model: string;
      };
    };

    let frames: PoseFrame[];

    if (data.format === 'TOON' && data.toonBase64) {
      // Decompress TOON format
      const toonData = fromBase64(data.toonBase64);
      frames = decompressSkeletalData(toonData);

      return NextResponse.json({
        success: true,
        version: data.version,
        format: 'TOON',
        frameCount: toonData.header.frameCount,
        frames,
        compressionStats: data.compressionStats,
        metadata: data.metadata,
      });
    } else if (data.frames) {
      // Legacy v1 format
      frames = data.frames.map((frame) => ({
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
        format: 'legacy',
        frameCount: data.frameCount,
        frames,
        metadata: data.metadata,
      });
    }

    return NextResponse.json(
      { error: 'Invalid landmarks data format' },
      { status: 500 }
    );
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
