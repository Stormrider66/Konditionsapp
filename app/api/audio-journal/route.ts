/**
 * Audio Journal Upload API
 *
 * POST /api/audio-journal - Upload audio recording for daily check-in
 * GET /api/audio-journal - List audio journals for a client
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAthlete, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { normalizeStoragePath } from '@/lib/storage/supabase-storage';
import { createSignedUrl } from '@/lib/storage/supabase-storage-server';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Can be uploaded by athlete or coach
    let user;
    let clientId: string;

    const formData = await request.formData();

    try {
      user = await requireAthlete();
      const rateLimited = await rateLimitJsonResponse('audio-journal:upload', user.id, {
        limit: 10,
        windowSeconds: 60,
      })
      if (rateLimited) return rateLimited
      // Athlete uploading for themselves
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (!athleteAccount) {
        return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
      }
      clientId = athleteAccount.clientId;
    } catch {
      // Try as coach
      user = await requireCoach();
      const rateLimited = await rateLimitJsonResponse('audio-journal:upload', user.id, {
        limit: 10,
        windowSeconds: 60,
      })
      if (rateLimited) return rateLimited
      clientId = formData.get('clientId') as string;
      if (!clientId) {
        return NextResponse.json({ error: 'clientId required for coach uploads' }, { status: 400 });
      }

      // Verify coach has access to this client
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: user.id },
      });
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
    }

    const audioFile = formData.get('audio') as File;
    const duration = parseInt(formData.get('duration') as string) || 0;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timestamp = Date.now();
    const ext = audioFile.type === 'audio/webm' ? 'webm' : audioFile.type === 'audio/mp4' ? 'm4a' : 'mp3';
    const fileName = `${clientId}/${dateStr}-${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await audioFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-journals')
      .upload(fileName, arrayBuffer, {
        contentType: audioFile.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Audio journal upload: Supabase upload error', {}, uploadError)
      return NextResponse.json(
        { error: 'Failed to upload audio file' },
        { status: 500 }
      );
    }

    // Create database record
    const audioJournal = await prisma.audioJournal.create({
      data: {
        clientId,
        date: today,
        // Store storage path (works for private buckets)
        audioUrl: uploadData.path,
        duration,
        mimeType: audioFile.type,
        fileSize: audioFile.size,
        status: 'PENDING',
      },
    });

    const signedUrl = await createSignedUrl('audio-journals', uploadData.path, 60 * 60);

    return NextResponse.json({
      success: true,
      id: audioJournal.id,
      audioUrl: signedUrl,
    });
  } catch (error) {
    logger.error('Audio journal upload error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to upload audio' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();
    const rateLimited = await rateLimitJsonResponse('audio-journal:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    // Verify coach has access
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: user.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const journals = await prisma.audioJournal.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 30,
      include: {
        dailyCheckIn: {
          select: {
            id: true,
            readinessScore: true,
            readinessDecision: true,
          },
        },
      },
    });

    // Return signed URLs for playback/download (ready for private buckets)
    const signedJournals = await Promise.all(
      journals.map(async (j) => {
        const path = normalizeStoragePath('audio-journals', j.audioUrl)
        if (!path) return j
        try {
          const signedUrl = await createSignedUrl('audio-journals', path, 60 * 60)
          return { ...j, audioUrl: signedUrl }
        } catch {
          return j
        }
      })
    )

    return NextResponse.json({ journals: signedJournals });
  } catch (error) {
    logger.error('Audio journal list error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch audio journals' },
      { status: 500 }
    );
  }
}
