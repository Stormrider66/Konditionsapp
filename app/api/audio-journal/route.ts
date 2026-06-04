/**
 * Audio Journal Upload API
 *
 * POST /api/audio-journal - Upload audio recording for daily check-in
 * GET /api/audio-journal - List audio journals for a client
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteClientId, requireCoach, canAccessClient } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { normalizeStoragePath } from '@/lib/storage/supabase-storage';
import { createSignedUrl } from '@/lib/storage/supabase-storage-server';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const supabase = createAdminSupabaseClient()

    // Can be uploaded by athlete or coach
    let user;
    let clientId: string;

    const formData = await request.formData();

    // Try as athlete (or coach in athlete mode) first
    const resolved = await resolveAthleteClientId();
    if (resolved) {
      user = resolved.user;
      locale = resolveRequestLocale(request, user.language)
      const rateLimited = await rateLimitJsonResponse('audio-journal:upload', user.id, {
        limit: 10,
        windowSeconds: 60,
      })
      if (rateLimited) return rateLimited
      clientId = resolved.clientId;
    } else {
      // Try as coach
      user = await requireCoach();
      locale = resolveRequestLocale(request, user.language)
      const rateLimited = await rateLimitJsonResponse('audio-journal:upload', user.id, {
        limit: 10,
        windowSeconds: 60,
      })
      if (rateLimited) return rateLimited
      clientId = formData.get('clientId') as string;
      if (!clientId) {
        return NextResponse.json({ error: t(locale, 'clientId required for coach uploads', 'clientId krävs för coachuppladdningar') }, { status: 400 });
      }

      const hasAccess = await canAccessClient(user.id, clientId);
      if (!hasAccess) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 });
      }
    }

    const audioFile = formData.get('audio') as File;
    const duration = parseInt(formData.get('duration') as string) || 0;

    if (!audioFile) {
      return NextResponse.json({ error: t(locale, 'Audio file required', 'Ljudfil krävs') }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      return NextResponse.json(
        { error: t(locale, `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`, `Ogiltig filtyp. Tillåtna: ${ALLOWED_TYPES.join(', ')}`) },
        { status: 400 }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: t(locale, `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`, `Filen är för stor. Maxstorlek: ${MAX_FILE_SIZE / 1024 / 1024} MB`) },
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
        { error: t(locale, 'Failed to upload audio file', 'Kunde inte ladda upp ljudfilen') },
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to upload audio', 'Kunde inte ladda upp ljud') },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
    const rateLimited = await rateLimitJsonResponse('audio-journal:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId required', 'clientId krävs') }, { status: 400 });
    }

    const hasAccess = await canAccessClient(user.id, clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 });
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to fetch audio journals', 'Kunde inte hämta ljudjournaler') },
      { status: 500 }
    );
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
