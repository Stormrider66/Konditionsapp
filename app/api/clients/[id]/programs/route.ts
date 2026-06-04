/**
 * Client Programs API
 *
 * GET /api/clients/[id]/programs - Get all programs for a client
 * Query params:
 *   - active: boolean - Filter by active status
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') },
        { status: 404 }
      );
    }

    // Get programs
    const programs = await prisma.trainingProgram.findMany({
      where: {
        clientId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            weeks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ programs });
  } catch (error) {
    logError('Get client programs error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to get programs', 'Misslyckades med att hämta program') },
      { status: 500 }
    );
  }
}
