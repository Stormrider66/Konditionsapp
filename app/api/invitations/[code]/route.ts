/**
 * Individual Invitation API
 *
 * GET /api/invitations/[code] - Get invitation details (public)
 * POST /api/invitations/[code] - Use invitation (requires auth for ATHLETE_SIGNUP)
 * DELETE /api/invitations/[code] - Revoke invitation (requires auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'

interface RouteParams {
  params: Promise<{ code: string }>;
}

// Schema for using an invitation
const useInvitationSchema = z.object({
  // For ATHLETE_SIGNUP
  clientId: z.string().uuid().optional(),
  // For REFERRAL
  referralCode: z.string().optional(),
});

/**
 * GET - Get invitation details (public endpoint)
 *
 * Returns limited information for public access
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const isExpired = invitation.expiresAt ? invitation.expiresAt < now : false;
    const isUsed = invitation.currentUses >= invitation.maxUses;

    // For public access, return limited information
    const publicInfo = {
      code: invitation.code,
      type: invitation.type,
      isValid: !isExpired && !isUsed,
      isExpired,
      isUsed,
      recipientName: invitation.recipientName,
      businessName: invitation.business?.name,
      expiresAt: invitation.expiresAt,
    };

    // For REPORT_VIEW type, include the test ID from metadata
    if (invitation.type === 'REPORT_VIEW' && invitation.metadata) {
      const metadata = invitation.metadata as { testId?: string };
      return NextResponse.json({
        invitation: {
          ...publicInfo,
          testId: metadata.testId,
        },
      });
    }

    return NextResponse.json({ invitation: publicInfo });
  } catch (error) {
    logError('Get invitation error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

/**
 * POST - Use an invitation
 *
 * For ATHLETE_SIGNUP: Creates link between invitation and client
 * For REFERRAL: Records referral usage
 * For REPORT_VIEW: Just validates and increments usage
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json().catch(() => ({}));

    // Validate input
    const validationResult = useInvitationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId } = validationResult.data;

    // Get the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { code },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if expired
    const now = new Date();
    if (invitation.expiresAt && invitation.expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if already fully used
    if (invitation.currentUses >= invitation.maxUses) {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 410 }
      );
    }

    // Handle based on invitation type
    switch (invitation.type) {
      case 'ATHLETE_SIGNUP': {
        if (!clientId) {
          return NextResponse.json(
            { error: 'clientId is required for athlete signup' },
            { status: 400 }
          );
        }

        // Update invitation
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            currentUses: { increment: 1 },
            usedAt: invitation.currentUses === 0 ? now : invitation.usedAt,
            usedByClientId: clientId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Invitation used successfully',
          businessId: invitation.businessId,
        });
      }

      case 'REPORT_VIEW': {
        // Just increment usage counter
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            currentUses: { increment: 1 },
            usedAt: invitation.currentUses === 0 ? now : invitation.usedAt,
          },
        });

        // Return the test ID for the frontend to redirect
        const metadata = invitation.metadata as { testId?: string } | null;
        return NextResponse.json({
          success: true,
          testId: metadata?.testId,
        });
      }

      case 'REFERRAL': {
        // Update invitation
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            currentUses: { increment: 1 },
            usedAt: invitation.currentUses === 0 ? now : invitation.usedAt,
            usedByClientId: clientId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Referral recorded',
          senderId: invitation.senderId,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown invitation type' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError('Use invitation error:', error);

    return NextResponse.json(
      { error: 'Failed to use invitation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Revoke an invitation
 *
 * Only the sender or business admin can revoke
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { code } = await params;

    // Get the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { code },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this invitation
    const canDelete = invitation.senderId === user.id;

    if (!canDelete && invitation.businessId) {
      // Check if user is admin of the business
      const businessMember = await prisma.businessMember.findFirst({
        where: {
          userId: user.id,
          businessId: invitation.businessId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });
      if (!businessMember) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (!canDelete) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id: invitation.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Delete invitation error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}
