/**
 * Video Analysis Landmarks API
 *
 * PATCH /api/video-analysis/[id]/landmarks - Save pose landmarks data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
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

// Schema for the AI pose analysis from Gemini
const aiPoseAnalysisSchema = z.object({
  interpretation: z.string(),
  technicalFeedback: z.array(z.object({
    area: z.string(),
    observation: z.string(),
    impact: z.string(),
    suggestion: z.string(),
  })),
  patterns: z.array(z.object({
    pattern: z.string(),
    significance: z.string(),
  })),
  recommendations: z.array(z.object({
    priority: z.number(),
    title: z.string(),
    description: z.string(),
    exercises: z.array(z.string()),
  })),
  overallAssessment: z.string(),
  score: z.number().optional(),
}).optional();

const updateSchema = z.object({
  frames: z.array(frameSchema),
  summary: z.string().optional(),
  aiPoseAnalysis: aiPoseAnalysisSchema.nullable(), // Allow null when no AI analysis was run
});

export const maxDuration = 60

const MAX_LANDMARKS_PAYLOAD_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_FRAMES = 10_000
const MAX_LANDMARKS_PER_FRAME = 60

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const rateLimited = await rateLimitJsonResponse('video:landmarks:patch', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const bytes = Number(contentLength)
      if (Number.isFinite(bytes) && bytes > MAX_LANDMARKS_PAYLOAD_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
      }
    }

    const body = await request.json();

    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Landmarks PATCH received', {
        keys: typeof body === 'object' && body ? Object.keys(body as Record<string, unknown>) : [],
        hasAiPoseAnalysis: !!(body as Record<string, unknown>)?.aiPoseAnalysis,
      })
    }

    const { frames, summary, aiPoseAnalysis } = updateSchema.parse(body);

    if (frames.length > MAX_FRAMES) {
      return NextResponse.json({ error: `Too many frames (max ${MAX_FRAMES})` }, { status: 413 })
    }
    if (frames.some((f) => f.landmarks.length > MAX_LANDMARKS_PER_FRAME)) {
      return NextResponse.json({ error: `Too many landmarks per frame (max ${MAX_LANDMARKS_PER_FRAME})` }, { status: 413 })
    }

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

    // Build AI analysis text combining summary and structured AI pose analysis
    let aiAnalysisText = analysis.aiAnalysis || '';

    if (summary) {
      aiAnalysisText = aiAnalysisText
        ? `${aiAnalysisText}\n\n--- Pose Analysis ---\n${summary}`
        : `--- Pose Analysis ---\n${summary}`;
    }

    if (aiPoseAnalysis) {
      // Format the AI pose analysis as structured text
      const aiPoseText = [
        '\n\n--- Gemini AI Pose Analysis ---',
        `Score: ${aiPoseAnalysis.score || 'N/A'}/100`,
        '',
        'Tolkning:',
        aiPoseAnalysis.interpretation,
        '',
        ...(aiPoseAnalysis.technicalFeedback.length > 0 ? [
          'Teknisk feedback:',
          ...aiPoseAnalysis.technicalFeedback.map((fb, i) =>
            `${i + 1}. ${fb.area}: ${fb.observation} - ${fb.suggestion}`
          ),
          '',
        ] : []),
        ...(aiPoseAnalysis.patterns.length > 0 ? [
          'Identifierade mönster:',
          ...aiPoseAnalysis.patterns.map(p => `• ${p.pattern}: ${p.significance}`),
          '',
        ] : []),
        ...(aiPoseAnalysis.recommendations.length > 0 ? [
          'Rekommendationer:',
          ...aiPoseAnalysis.recommendations.map(r =>
            `${r.priority}. ${r.title}: ${r.description}`
          ),
          '',
        ] : []),
        'Sammanfattning:',
        aiPoseAnalysis.overallAssessment,
      ].join('\n');

      aiAnalysisText = aiAnalysisText
        ? `${aiAnalysisText}${aiPoseText}`
        : aiPoseText;
    }

    // Update analysis with landmarks and AI analysis
    // Use Prisma.VideoAnalysisUpdateInput for proper typing
    const updateData: Prisma.VideoAnalysisUpdateInput = {
      // IMPORTANT: `landmarksData` contains ONLY the compressed landmarks envelope
      // (format/frameCount/toonBase64/compressionStats/metadata). Do not mix analysis objects into it.
      landmarksData: compressedData as Prisma.InputJsonValue,
      ...(aiAnalysisText && { aiAnalysis: aiAnalysisText }),
      ...(aiPoseAnalysis?.score && { formScore: aiPoseAnalysis.score }),
      ...(aiPoseAnalysis && { status: 'COMPLETED' }),
    };

    // Store structured AI pose analysis in dedicated column
    if (aiPoseAnalysis) {
      updateData.aiPoseAnalysis = aiPoseAnalysis;
    }

    const updated = await prisma.videoAnalysis.update({
      where: { id },
      data: updateData,
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
      },
    });

    return NextResponse.json({
      success: true,
      analysis: updated,
      frameCount: frames.length,
      // Also return aiPoseAnalysis explicitly for immediate use
      ...(aiPoseAnalysis ? { aiPoseAnalysis } : {}),
    });
  } catch (error) {
    logger.error('Save landmarks error', {}, error)

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
      // Legacy: some rows may have aiPoseAnalysis embedded in landmarksData (backward compat)
      aiPoseAnalysis?: object;
    };

    // Get aiPoseAnalysis from dedicated column via raw query (avoids Prisma TS type mismatch),
    // fall back to legacy embedded data if needed.
    const poseRows = await prisma.$queryRaw<
      Array<{ aiPoseAnalysis: unknown | null }>
    >`SELECT "aiPoseAnalysis" FROM "VideoAnalysis" WHERE "id" = ${id} LIMIT 1`;
    const aiPoseAnalysis = poseRows?.[0]?.aiPoseAnalysis ?? data.aiPoseAnalysis ?? null;

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
        ...(aiPoseAnalysis ? { aiPoseAnalysis } : {}),
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
        ...(aiPoseAnalysis ? { aiPoseAnalysis } : {}),
      });
    }

    return NextResponse.json(
      { error: 'Invalid landmarks data format' },
      { status: 500 }
    );
  } catch (error) {
    logger.error('Get landmarks error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get landmarks' },
      { status: 500 }
    );
  }
}