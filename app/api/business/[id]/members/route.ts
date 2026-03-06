/**
 * Business Members API
 *
 * GET /api/business/[id]/members - List business members
 * POST /api/business/[id]/members - Invite a new member
 * DELETE /api/business/[id]/members - Remove a member
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, requireBusinessMembership } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { sendGenericEmail } from '@/lib/email';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'
import crypto from 'crypto'
import { ApiError, handleApiError } from '@/lib/api-error'
import { getLastOwnerGuardError } from '@/lib/business-member-guards'

// Validation schema for inviting a member
const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'MEMBER', 'COACH']).default('MEMBER'),
});

// Validation schema for removing a member
const removeMemberSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const { role: currentUserRole } = await requireBusinessMembership(user.id, id)

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
      currentUserRole,
    });
  } catch (error) {
    logError('Get business members error:', error);
    return handleApiError(error, 'GET /api/business/[id]/members')
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;
    const body = await request.json();

    await requireBusinessMembership(user.id, id, { roles: ['OWNER', 'ADMIN'] })

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
      // Create invitation for non-existing user
      const invitationCode = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30-day expiry

      const business = await prisma.business.findUnique({
        where: { id },
        select: { name: true },
      })

      const invitation = await prisma.invitation.create({
        data: {
          code: invitationCode,
          type: 'BUSINESS_CLAIM',
          senderId: user.id,
          businessId: id,
          recipientEmail: email,
          expiresAt,
          metadata: { role, businessName: business?.name },
        },
      })

      // Send invitation email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
      const acceptLink = `${appUrl}/signup?invitation=${invitationCode}`

      try {
        await sendGenericEmail({
          to: email,
          subject: `Inbjudan till ${business?.name || 'ett team'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Du har blivit inbjuden!</h2>
              <p>Du har blivit inbjuden att gå med i <strong>${business?.name || 'ett team'}</strong> som ${role === 'ADMIN' ? 'administratör' : 'medlem'}.</p>
              <p>
                <a href="${acceptLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Acceptera inbjudan
                </a>
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Denna inbjudan är giltig i 30 dagar.
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        logError('Failed to send invitation email:', emailError)
      }

      return NextResponse.json(
        {
          invitation: {
            id: invitation.id,
            code: invitationCode,
            email,
            role,
            expiresAt,
          },
          message: `Invitation sent to ${email}`,
        },
        { status: 201 }
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
        acceptedAt: new Date(),
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
    logError('Invite member error:', error);
    return handleApiError(error, 'POST /api/business/[id]/members')
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

    const currentMembership = await requireBusinessMembership(user.id, id)

    // Get target user's membership
    const targetMembership = await prisma.businessMember.findFirst({
      where: {
        userId: targetUserId,
        businessId: id,
        isActive: true,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in this business' },
        { status: 404 }
      );
    }

    const isSelfRemoval = targetUserId === user.id

    if ((currentMembership.role === 'MEMBER' || currentMembership.role === 'COACH') && !isSelfRemoval) {
      return NextResponse.json(
        { error: 'Only owners and admins can remove other members' },
        { status: 403 }
      );
    }

    if (
      currentMembership.role === 'ADMIN' &&
      !isSelfRemoval &&
      (targetMembership.role === 'ADMIN' || targetMembership.role === 'OWNER')
    ) {
      return NextResponse.json(
        { error: 'Admins cannot remove other admins' },
        { status: 403 }
      );
    }

    if (currentMembership.role !== 'OWNER' && targetMembership.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Only owners can remove other owners' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const ownerGuardError = await getLastOwnerGuardError(tx, targetMembership, { remove: true })
      if (ownerGuardError) {
        throw ApiError.badRequest(ownerGuardError)
      }

      await tx.businessMember.delete({
        where: {
          id: targetMembership.id,
        },
      });
    })

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Remove member error:', error);
    return handleApiError(error, 'DELETE /api/business/[id]/members')
  }
}
