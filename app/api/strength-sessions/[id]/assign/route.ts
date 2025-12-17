/**
 * Strength Session Assignment API
 *
 * GET  - List assignments for a session
 * POST - Assign session to athlete(s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    // Verify session exists and coach has access
    const session = await prisma.strengthSession.findFirst({
      where: {
        id,
        OR: [
          { coachId: user.id },
          { isPublic: true },
        ],
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const assignments = await prisma.strengthSessionAssignment.findMany({
      where: { sessionId: id },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { assignedDate: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;
    const body = await request.json();

    const { athleteIds, assignedDate, notes } = body;

    // Validate input
    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one athlete ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists and coach owns it
    const session = await prisma.strengthSession.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to assign it' },
        { status: 404 }
      );
    }

    // Verify athletes belong to coach
    const athletes = await prisma.client.findMany({
      where: {
        id: { in: athleteIds },
        userId: user.id,
      },
      select: { id: true },
    });

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: 'One or more athletes not found or not owned by you' },
        { status: 400 }
      );
    }

    // Create assignments
    const date = assignedDate ? new Date(assignedDate) : new Date();

    const assignments = await Promise.all(
      athleteIds.map((athleteId: string) =>
        prisma.strengthSessionAssignment.upsert({
          where: {
            sessionId_athleteId_assignedDate: {
              sessionId: id,
              athleteId,
              assignedDate: date,
            },
          },
          update: {
            notes,
            status: 'PENDING',
          },
          create: {
            sessionId: id,
            athleteId,
            assignedDate: date,
            assignedBy: user.id,
            notes,
            status: 'PENDING',
          },
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json({ assignments }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignments:', error);
    return NextResponse.json(
      { error: 'Failed to create assignments' },
      { status: 500 }
    );
  }
}
