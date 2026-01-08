/**
 * Invitations API
 *
 * GET /api/invitations - List invitations for the current user's business
 * POST /api/invitations - Create a new invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { logError } from '@/lib/logger-console'

// Validation schema for creating an invitation
const createInvitationSchema = z.object({
  type: z.enum(['ATHLETE_SIGNUP', 'REPORT_VIEW', 'REFERRAL']),
  recipientEmail: z.string().email().optional().nullable(),
  recipientName: z.string().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().min(1).max(100).optional().default(1),
  metadata: z.record(z.unknown()).optional().nullable(),
  // For REPORT_VIEW type
  testId: z.string().uuid().optional().nullable(),
});

/**
 * Generate a unique invitation code
 */
function generateInviteCode(): string {
  // Generate 8 character alphanumeric code
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * GET - List invitations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    });

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'ATHLETE_SIGNUP' | 'REPORT_VIEW' | 'REFERRAL' | null;
    const includeUsed = searchParams.get('includeUsed') === 'true';
    const includeExpired = searchParams.get('includeExpired') === 'true';

    const now = new Date();

    const invitations = await prisma.invitation.findMany({
      where: {
        OR: [
          { senderId: user.id },
          ...(businessMember ? [{ businessId: businessMember.businessId }] : []),
        ],
        ...(type && { type }),
        ...(!includeUsed && { usedAt: null }),
        ...(!includeExpired && {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        ...inv,
        isExpired: inv.expiresAt ? inv.expiresAt < now : false,
        isUsed: inv.currentUses >= inv.maxUses,
        usesRemaining: inv.maxUses - inv.currentUses,
      })),
    });
  } catch (error) {
    logError('Get invitations error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new invitation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();

    // Validate input
    const validationResult = createInvitationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { type, recipientEmail, recipientName, expiresAt, maxUses, metadata, testId } =
      validationResult.data;

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    });

    // For REPORT_VIEW type, verify the test exists and user has access
    if (type === 'REPORT_VIEW') {
      if (!testId) {
        return NextResponse.json(
          { error: 'testId is required for REPORT_VIEW invitations' },
          { status: 400 }
        );
      }

      const test = await prisma.test.findUnique({
        where: { id: testId },
      });

      if (!test) {
        return NextResponse.json(
          { error: 'Test not found' },
          { status: 404 }
        );
      }

      // Check access
      if (test.userId !== user.id) {
        return NextResponse.json(
          { error: 'Access denied to this test' },
          { status: 403 }
        );
      }
    }

    // Generate unique code
    let code = generateInviteCode();
    let attempts = 0;

    // Ensure code is unique (retry up to 5 times)
    while (attempts < 5) {
      const existing = await prisma.invitation.findUnique({
        where: { code },
      });

      if (!existing) break;

      code = generateInviteCode();
      attempts++;
    }

    if (attempts >= 5) {
      return NextResponse.json(
        { error: 'Failed to generate unique invitation code' },
        { status: 500 }
      );
    }

    // Create the invitation
    const invitation = await prisma.invitation.create({
      data: {
        code,
        type,
        senderId: user.id,
        businessId: businessMember?.businessId,
        recipientEmail,
        recipientName,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses,
        metadata: metadata
          ? {
              ...metadata,
              ...(testId && { testId }),
            }
          : testId
            ? { testId }
            : undefined,
      },
    });

    // Generate the invitation URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = type === 'REPORT_VIEW'
      ? `${appUrl}/report/${code}`
      : `${appUrl}/invite/${code}`;

    return NextResponse.json(
      {
        invitation: {
          ...invitation,
          inviteUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logError('Create invitation error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
