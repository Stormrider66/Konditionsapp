/**
 * Video Upload API
 *
 * POST /api/video-analysis/upload - Upload video to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, requireCoach } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { createSignedUrl } from '@/lib/storage/supabase-storage-server';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

// Next.js 15 App Router route segment config
export const maxDuration = 60; // Allow up to 60 seconds for upload
export const dynamic = 'force-dynamic';

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const rateLimited = await rateLimitJsonResponse('video:upload', user.id, {
      limit: 3,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const videoType = formData.get('videoType') as string;
    const cameraAngle = formData.get('cameraAngle') as string | null;
    const athleteId = formData.get('athleteId') as string | null;
    const exerciseId = formData.get('exerciseId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: MP4, MOV, WebM, AVI' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 100MB' },
        { status: 400 }
      );
    }

    // Validate video type
    if (!['STRENGTH', 'RUNNING_GAIT', 'SPORT_SPECIFIC'].includes(videoType)) {
      return NextResponse.json(
        { error: 'Invalid video type' },
        { status: 400 }
      );
    }

    // Validate camera angle (optional, but must be valid if provided)
    if (cameraAngle && !['FRONT', 'SIDE', 'BACK'].includes(cameraAngle)) {
      return NextResponse.json(
        { error: 'Invalid camera angle. Allowed: FRONT, SIDE, BACK' },
        { status: 400 }
      );
    }

    // Verify athlete belongs to coach if provided
    if (athleteId) {
      const hasAccess = await canAccessClient(user.id, athleteId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Athlete not found' },
          { status: 404 }
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'mp4';
    const filename = `${user.id}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
    logger.debug('Video upload validated', { size: file.size, type: file.type })

    // Upload to Supabase Storage
    const supabase = await createClient();

    // Convert file to ArrayBuffer then to Buffer
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (bufferError) {
      logger.error('Video upload: buffer conversion failed', {}, bufferError)
      return NextResponse.json(
        {
          error: 'Failed to process video file',
          details:
            process.env.NODE_ENV === 'production' ? undefined : String(bufferError),
        },
        { status: 500 }
      );
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-analysis')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Video upload: Supabase upload error', {}, uploadError)
      // Check for common errors
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'Storage bucket "video-analysis" not found. Please create it in Supabase Dashboard → Storage.' },
          { status: 500 }
        );
      }
      if (uploadError.message?.includes('exceeded') || uploadError.message?.includes('size')) {
        return NextResponse.json(
          { error: 'File too large for Supabase storage. Check bucket size limits.' },
          { status: 413 }
        );
      }
      return NextResponse.json(
        {
          error: 'Failed to upload video',
          details: process.env.NODE_ENV === 'production' ? undefined : uploadError.message,
        },
        { status: 500 }
      );
    }

    // Create video analysis record
    const analysis = await prisma.videoAnalysis.create({
      data: {
        coachId: user.id,
        athleteId: athleteId || null,
        exerciseId: exerciseId || null,
        // Store storage path (works for private buckets)
        videoUrl: uploadData.path,
        videoType,
        cameraAngle: cameraAngle || null,
        status: 'PENDING',
      },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
      },
    });

    const signedUrl = await createSignedUrl('video-analysis', uploadData.path, 60 * 60);

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        videoUrl: signedUrl,
      },
      uploadPath: uploadData.path,
    });
  } catch (error) {
    logger.error('Video upload error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}
