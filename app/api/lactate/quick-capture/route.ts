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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = quickCaptureSchema.parse(body);

    const hasAccess = await canAccessClient(user.id, data.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Klient hittades inte eller saknar behörighet' },
        { status: 403 }
      );
    }

    // Build notes with context
    const notesParts: string[] = [];
    if (data.context) notesParts.push(`Träningspass: ${data.context}`);
    if (data.intervalNumber) notesParts.push(`Intervall: #${data.intervalNumber}`);
    if (data.rpe) notesParts.push(`RPE: ${data.rpe}`);
    if (data.confidence) notesParts.push(`AI-konfidens: ${Math.round(data.confidence * 100)}%`);
    notesParts.push('Snabbregistrering under träning');

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
        { error: 'Ogiltig data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Kunde inte spara laktatvärdet' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const workoutId = searchParams.get('workoutId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId krävs' },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Klient hittades inte eller saknar behörighet' },
        { status: 403 }
      );
    }

    // Get recent quick captures
    const readings = await prisma.selfReportedLactate.findMany({
      where: {
        clientId,
        ...(workoutId ? { workoutId } : {}),
        notes: {
          contains: 'Snabbregistrering',
        },
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
      { error: 'Kunde inte hämta laktatvärden' },
      { status: 500 }
    );
  }
}
