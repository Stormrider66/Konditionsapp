/**
 * Quick Lactate Capture API
 *
 * Simple endpoint for athletes to log single lactate readings during training.
 * Stores values for later analysis and links to workouts when applicable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const quickCaptureSchema = z.object({
  clientId: z.string().min(1),
  workoutId: z.string().optional(),
  lactateValue: z.number().min(0).max(25),
  heartRate: z.number().min(40).max(220).optional(),
  rpe: z.number().min(1).max(10).optional(),
  context: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  intervalNumber: z.number().optional(),
  timestamp: z.string().datetime().optional(),
});
const QUICK_CAPTURE_NOTE_MARKER = 'quick_capture'

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json();
    const data = quickCaptureSchema.parse(body);

    const hasAccess = await canAccessClient(user.id, data.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klient hittades inte eller saknar behörighet') },
        { status: 403 }
      );
    }

    // Build notes with context
    const notesParts: string[] = [];
    notesParts.push(QUICK_CAPTURE_NOTE_MARKER);
    if (data.context) notesParts.push(`${t(locale, 'Workout', 'Träningspass')}: ${data.context}`);
    if (data.intervalNumber) notesParts.push(`${t(locale, 'Interval', 'Intervall')}: #${data.intervalNumber}`);
    if (data.rpe) notesParts.push(`RPE: ${data.rpe}`);
    if (data.confidence) notesParts.push(`${t(locale, 'AI confidence', 'AI-konfidens')}: ${Math.round(data.confidence * 100)}%`);
    notesParts.push(t(locale, 'Quick capture during training', 'Snabbregistrering under träning'));

    // Create the lactate reading using the correct schema fields
    const lactateReading = await prisma.selfReportedLactate.create({
      data: {
        clientId: data.clientId,
        date: new Date(data.timestamp || new Date()),
        measurementType: 'WORKOUT',
        workoutType: data.context?.toUpperCase().includes('INTERVALL') ? 'INTERVALS' : 'THRESHOLD',
        lactate: data.lactateValue,
        heartRate: data.heartRate,
        rpe: data.rpe,
        workoutId: data.workoutId,
        notes: notesParts.join('\n'),
        confidence: data.confidence && data.confidence >= 0.8 ? 'HIGH' : data.confidence && data.confidence >= 0.5 ? 'MEDIUM' : 'LOW',
        validated: true, // Quick captures are auto-validated
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: lactateReading.id,
        lactateValue: data.lactateValue,
        heartRate: data.heartRate,
        rpe: data.rpe,
        timestamp: lactateReading.date,
      },
    });
  } catch (error) {
    logError('Quick lactate capture error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Invalid data', 'Ogiltig data'), details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: t(locale, 'Could not save the lactate value', 'Kunde inte spara laktatvärdet') },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language)

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const workoutId = searchParams.get('workoutId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId is required', 'clientId krävs') },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klient hittades inte eller saknar behörighet') },
        { status: 403 }
      );
    }

    // Get recent quick captures
    const readings = await prisma.selfReportedLactate.findMany({
      where: {
        clientId,
        ...(workoutId ? { workoutId } : {}),
        OR: [
          { notes: { contains: QUICK_CAPTURE_NOTE_MARKER } },
          { notes: { contains: 'Snabbregistrering' } },
        ],
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    const formattedReadings = readings.map((r) => ({
      id: r.id,
      lactateValue: r.lactate,
      heartRate: r.heartRate,
      rpe: r.rpe,
      timestamp: r.date,
      notes: r.notes,
    }));

    return NextResponse.json({
      success: true,
      data: formattedReadings,
    });
  } catch (error) {
    logError('Get quick captures error:', error);
    return NextResponse.json(
      { error: t(locale, 'Could not fetch lactate values', 'Kunde inte hämta laktatvärden') },
      { status: 500 }
    );
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
