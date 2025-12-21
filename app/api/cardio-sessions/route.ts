/**
 * Cardio Sessions API
 *
 * GET  - List coach's cardio sessions with filtering
 * POST - Create new cardio session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { SportType } from '@prisma/client';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') as SportType | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      OR: [
        { coachId: user.id },
        { isPublic: true },
      ],
    };

    if (sport) {
      where.sport = sport;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.cardioSession.findMany({
        where,
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cardioSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching cardio sessions', {}, error);
    return NextResponse.json(
      { error: 'Failed to fetch cardio sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();

    const {
      name,
      description,
      sport,
      segments,
      tags,
      isPublic,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Calculate totals from segments
    const segmentList = segments || [];
    const totalDuration = segmentList.reduce(
      (sum: number, s: { duration?: number }) => sum + (s.duration || 0),
      0
    );
    const totalDistance = segmentList.reduce(
      (sum: number, s: { distance?: number }) => sum + (s.distance || 0),
      0
    );

    // Calculate average zone (weighted by duration)
    let avgZone: number | null = null;
    const zonesWithDuration = segmentList.filter(
      (s: { zone?: number; duration?: number }) => s.zone && s.duration
    );
    if (zonesWithDuration.length > 0) {
      const totalZoneDuration = zonesWithDuration.reduce(
        (sum: number, s: { duration?: number }) => sum + (s.duration || 0),
        0
      );
      const weightedZoneSum = zonesWithDuration.reduce(
        (sum: number, s: { zone?: number; duration?: number }) =>
          sum + (s.zone || 0) * (s.duration || 0),
        0
      );
      avgZone = totalZoneDuration > 0 ? weightedZoneSum / totalZoneDuration : null;
    }

    const session = await prisma.cardioSession.create({
      data: {
        name,
        description,
        sport: sport || 'RUNNING',
        segments: segments || [],
        totalDuration: totalDuration > 0 ? totalDuration : null,
        totalDistance: totalDistance > 0 ? totalDistance : null,
        avgZone,
        coachId: user.id,
        isPublic: isPublic || false,
        tags: tags || [],
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    logger.error('Error creating cardio session', {}, error);
    return NextResponse.json(
      { error: 'Failed to create cardio session' },
      { status: 500 }
    );
  }
}
