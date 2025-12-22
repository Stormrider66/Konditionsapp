/**
 * Business Members API
 *
 * GET /api/business/[id]/members - List business members
 * POST /api/business/[id]/members - Invite a new member
 * DELETE /api/business/[id]/members - Remove a member
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for inviting a member
const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// Validation schema for removing a member
const removeMemberSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function canManageMembers(userId: string, businessId: string) {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  return membership !== null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    // Check if user has access to this business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId: id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const members = await prisma.businessMember.findMany({
      where: { businessId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
      })),
      currentUserRole: membership.role,
    });
  } catch (error) {
    console.error('Get business members error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch business members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;
    const body = await request.json();

    // Check if user can manage members
    if (!(await canManageMembers(user.id, id))) {
      return NextResponse.json(
        { error: 'Only owners and admins can invite members' },
        { status: 403 }
      );
    }

    // Validate input
    const validationResult = inviteMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // Find user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      // TODO: In the future, create an invitation record and send email
      return NextResponse.json(
        {
          error: 'User not found. They must create an account first.',
          suggestion: 'Send them an invitation link to create an account',
        },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.businessMember.findFirst({
      where: {
        userId: invitedUser.id,
        businessId: id,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this business' },
        { status: 400 }
      );
    }

    // Check if user is already in another business
    const otherMembership = await prisma.businessMember.findFirst({
      where: { userId: invitedUser.id },
    });

    if (otherMembership) {
      return NextResponse.json(
        { error: 'User is already a member of another business' },
        { status: 400 }
      );
    }

    // Add member
    const membership = await prisma.businessMember.create({
      data: {
        userId: invitedUser.id,
        businessId: id,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        member: {
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          role: membership.role,
          joinedAt: membership.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Invite member error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = removeMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { userId: targetUserId } = validationResult.data;

    // Get current user's membership
    const currentMembership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId: id,
      },
    });

    if (!currentMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get target user's membership
    const targetMembership = await prisma.businessMember.findFirst({
      where: {
        userId: targetUserId,
        businessId: id,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in this business' },
        { status: 404 }
      );
    }

    // Permission checks
    // Can't remove the owner
    if (targetMembership.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove the business owner' },
        { status: 403 }
      );
    }

    // Members can only remove themselves
    if (currentMembership.role === 'MEMBER' && targetUserId !== user.id) {
      return NextResponse.json(
        { error: 'Members can only remove themselves' },
        { status: 403 }
      );
    }

    // Admins can only remove members (not other admins)
    if (currentMembership.role === 'ADMIN' && targetMembership.role === 'ADMIN' && targetUserId !== user.id) {
      return NextResponse.json(
        { error: 'Admins cannot remove other admins' },
        { status: 403 }
      );
    }

    // Remove the member
    await prisma.businessMember.delete({
      where: {
        id: targetMembership.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
