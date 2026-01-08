/**
 * Public Report Share API
 *
 * POST /api/reports/[testId]/share - Generate public link for a test report
 * DELETE /api/reports/[testId]/share - Revoke public link
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { logError } from '@/lib/logger-console'

/**
 * Generate a cryptographically secure random token
 */
function generatePublicToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const user = await requireCoach();
    const { testId } = await params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const expiresInDays = body.expiresInDays ?? 30; // Default 30 days

    // Verify test exists and user owns it
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        userId: user.id,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Check if test already has a valid public token
    if (test.publicToken && test.publicExpiresAt && test.publicExpiresAt > new Date()) {
      // Return existing token
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.json({
        success: true,
        publicUrl: `${baseUrl}/report/${test.publicToken}`,
        expiresAt: test.publicExpiresAt,
        isExisting: true,
      });
    }

    // Generate new token
    const publicToken = generatePublicToken();
    const publicExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // Update test with public token
    await prisma.test.update({
      where: { id: testId },
      data: {
        publicToken,
        publicExpiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      success: true,
      publicUrl: `${baseUrl}/report/${publicToken}`,
      expiresAt: publicExpiresAt,
      isExisting: false,
    });
  } catch (error) {
    logError('Generate public link error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to generate public link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const user = await requireCoach();
    const { testId } = await params;

    // Verify test exists and user owns it
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        userId: user.id,
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Remove public token
    await prisma.test.update({
      where: { id: testId },
      data: {
        publicToken: null,
        publicExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Public link revoked',
    });
  } catch (error) {
    logError('Revoke public link error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to revoke public link' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const user = await requireCoach();
    const { testId } = await params;

    // Verify test exists and user owns it
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        userId: user.id,
      },
      select: {
        publicToken: true,
        publicExpiresAt: true,
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    if (!test.publicToken || !test.publicExpiresAt) {
      return NextResponse.json({
        hasPublicLink: false,
        publicUrl: null,
        expiresAt: null,
      });
    }

    const isExpired = test.publicExpiresAt < new Date();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      hasPublicLink: !isExpired,
      publicUrl: isExpired ? null : `${baseUrl}/report/${test.publicToken}`,
      expiresAt: test.publicExpiresAt,
      isExpired,
    });
  } catch (error) {
    logError('Get public link error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get public link status' },
      { status: 500 }
    );
  }
}
