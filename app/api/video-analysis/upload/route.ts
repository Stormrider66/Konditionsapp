/**
 * Video Upload API
 *
 * Uses presigned URLs to bypass Vercel's 4.5MB body size limit.
 * Two-step flow:
 *   1. POST { action: 'get-upload-url', ... } → returns signed upload URL
 *   2. Client uploads directly to Supabase Storage
 *   3. POST { action: 'confirm-upload', ... } → creates DB record
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createSignedUrl, createSignedUploadUrl } from '@/lib/storage/supabase-storage-server';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
];

const ALLOWED_ANALYSIS_TYPES = [
  'STRENGTH',
  'RUNNING_GAIT',
  'SKIING_CLASSIC',
  'SKIING_SKATING',
  'SKIING_DOUBLE_POLE',
  'HYROX_STATION',
  'SPORT_SPECIFIC',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const rateLimited = await rateLimitJsonResponse('video:upload', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json();
    const { action } = body;

    if (action === 'get-upload-url') {
      return handleGetUploadUrl(body, user.id);
    }

    if (action === 'confirm-upload') {
      return handleConfirmUpload(body, user.id);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Video upload error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function handleGetUploadUrl(
  body: Record<string, unknown>,
  userId: string
) {
  const { fileName, fileType, fileSize, videoType, cameraAngle, athleteId } = body as {
    fileName?: string
    fileType?: string
    fileSize?: number
    videoType?: string
    cameraAngle?: string
    athleteId?: string
  }

  if (!fileName || !fileType || !fileSize || !videoType) {
    return NextResponse.json(
      { error: 'Missing required fields: fileName, fileType, fileSize, videoType' },
      { status: 400 }
    );
  }

  if (!ALLOWED_VIDEO_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: MP4, MOV, WebM, AVI' },
      { status: 400 }
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size: 100MB' },
      { status: 400 }
    );
  }

  if (!ALLOWED_ANALYSIS_TYPES.includes(videoType)) {
    return NextResponse.json(
      { error: 'Invalid video type' },
      { status: 400 }
    );
  }

  if (cameraAngle && !['FRONT', 'SIDE', 'BACK'].includes(cameraAngle)) {
    return NextResponse.json(
      { error: 'Invalid camera angle. Allowed: FRONT, SIDE, BACK' },
      { status: 400 }
    );
  }

  if (athleteId) {
    const hasAccess = await canAccessClient(userId, athleteId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }
  }

  const timestamp = Date.now();
  const extension = fileName.split('.').pop() || 'mp4';
  const storagePath = `${userId}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

  const { signedUrl, token, path } = await createSignedUploadUrl('video-analysis', storagePath);

  logger.debug('Video upload URL created', { path, fileSize, fileType })

  return NextResponse.json({
    signedUrl,
    token,
    path,
    contentType: fileType,
  });
}

async function handleConfirmUpload(
  body: Record<string, unknown>,
  userId: string
) {
  const { uploadPath, videoType, cameraAngle, athleteId, exerciseId, hyroxStation } = body as {
    uploadPath?: string
    videoType?: string
    cameraAngle?: string
    athleteId?: string
    exerciseId?: string
    hyroxStation?: string
  }

  if (!uploadPath || !videoType) {
    return NextResponse.json(
      { error: 'Missing required fields: uploadPath, videoType' },
      { status: 400 }
    );
  }

  if (!ALLOWED_ANALYSIS_TYPES.includes(videoType)) {
    return NextResponse.json(
      { error: 'Invalid video type' },
      { status: 400 }
    );
  }

  // Verify the file belongs to this user (path starts with userId)
  if (!uploadPath.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: 'Invalid upload path' }, { status: 403 });
  }

  const analysis = await prisma.videoAnalysis.create({
    data: {
      coachId: userId,
      athleteId: athleteId || null,
      exerciseId: exerciseId || null,
      videoUrl: uploadPath,
      videoType,
      cameraAngle: cameraAngle || null,
      status: 'PENDING',
    },
    include: {
      athlete: { select: { id: true, name: true } },
      exercise: { select: { id: true, name: true, nameSv: true } },
    },
  });

  const signedUrl = await createSignedUrl('video-analysis', uploadPath, 60 * 60);

  logger.debug('Video upload confirmed', { analysisId: analysis.id, uploadPath })

  return NextResponse.json({
    success: true,
    analysis: {
      ...analysis,
      videoUrl: signedUrl,
    },
    uploadPath,
  });
}
