/**
 * Single Hybrid Workout Assignment API
 *
 * GET, PUT, DELETE for individual assignments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach, getCurrentUser } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/hybrid-assignments/[id] - Get single assignment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id },
      include: {
        workout: {
          include: {
            movements: {
              include: { exercise: true },
              orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
            },
          },
        },
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check access: athlete can only see their own assignments
    if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (athleteAccount?.clientId !== assignment.athleteId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    logError('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}

// PUT /api/hybrid-assignments/[id] - Update assignment
// Body: { status?, notes?, customScaling?, scalingNotes?, resultId? }
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes, customScaling, scalingNotes, resultId } = body;

    // Build update data based on user role
    const updateData: any = {};

    if (user.role === 'ATHLETE') {
      // Athlete can only update status and resultId
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (athleteAccount?.clientId !== assignment.athleteId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (status) {
        updateData.status = status;
        if (status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }
      }
      if (resultId) {
        updateData.resultId = resultId;
      }
    } else {
      // Coach can update everything
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (customScaling !== undefined) updateData.customScaling = customScaling;
      if (scalingNotes !== undefined) updateData.scalingNotes = scalingNotes;
      if (resultId !== undefined) updateData.resultId = resultId;
    }

    const updated = await prisma.hybridWorkoutAssignment.update({
      where: { id },
      data: updateData,
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            format: true,
          },
        },
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    logError('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

// DELETE /api/hybrid-assignments/[id] - Delete assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireCoach();

    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    await prisma.hybridWorkoutAssignment.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Assignment deleted' });
  } catch (error) {
    logError('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
