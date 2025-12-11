/**
 * Video Upload API
 *
 * POST /api/video-analysis/upload - Upload video to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

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
    console.log('[Video Upload] Starting upload...');
    const user = await requireCoach();
    console.log('[Video Upload] User authenticated:', user.id);

    const formData = await request.formData();
    console.log('[Video Upload] FormData received');
    const file = formData.get('file') as File | null;
    const videoType = formData.get('videoType') as string;
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

    // Verify athlete belongs to coach if provided
    if (athleteId) {
      const athlete = await prisma.client.findFirst({
        where: { id: athleteId, userId: user.id },
      });
      if (!athlete) {
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
    console.log('[Video Upload] File validated, filename:', filename, 'size:', file.size);

    // Upload to Supabase Storage
    const supabase = await createClient();

    // Convert file to ArrayBuffer then to Buffer
    console.log('[Video Upload] Converting to buffer...');
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('[Video Upload] Buffer created, size:', buffer.length);
    } catch (bufferError) {
      console.error('[Video Upload] Buffer conversion failed:', bufferError);
      return NextResponse.json(
        { error: 'Failed to process video file', details: String(bufferError) },
        { status: 500 }
      );
    }

    console.log('[Video Upload] Uploading to Supabase storage bucket "video-analysis"...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-analysis')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Video Upload] Supabase upload error:', uploadError);
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
        { error: 'Failed to upload video', details: uploadError.message },
        { status: 500 }
      );
    }

    console.log('[Video Upload] Upload successful, path:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video-analysis')
      .getPublicUrl(filename);

    // Create video analysis record
    const analysis = await prisma.videoAnalysis.create({
      data: {
        coachId: user.id,
        athleteId: athleteId || null,
        exerciseId: exerciseId || null,
        videoUrl: urlData.publicUrl,
        videoType,
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
      uploadPath: uploadData.path,
    });
  } catch (error) {
    console.error('Video upload error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}
