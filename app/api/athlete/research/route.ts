/**
 * Athlete Research Access API
 *
 * GET /api/athlete/research - List research shared with athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'

// ============================================
// GET - List Shared Research
// ============================================

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    // Authenticate as athlete
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    const { user, clientId } = resolved

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('athlete:research:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get research shared with this athlete
    const [sharedResearch, total] = await Promise.all([
      prisma.sharedResearchAccess.findMany({
        where: {
          clientId: clientId,
        },
        include: {
          session: {
            select: {
              id: true,
              provider: true,
              query: true,
              status: true,
              report: true,
              sources: true,
              completedAt: true,
              coach: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { sharedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.sharedResearchAccess.count({
        where: { clientId: clientId },
      }),
    ])

    return NextResponse.json({
      research: sharedResearch
        .filter((sr) => sr.session.status === 'COMPLETED')
        .map((sr) => ({
          shareId: sr.id,
          sessionId: sr.session.id,
          sharedAt: sr.sharedAt,
          notified: sr.notified,
          provider: sr.session.provider,
          query: sr.session.query,
          queryPreview: sr.session.query.substring(0, 100) + (sr.session.query.length > 100 ? '...' : ''),
          completedAt: sr.session.completedAt,
          coachName: sr.session.coach.name,
          hasReport: !!sr.session.report,
          hasSources: !!(sr.session.sources && Array.isArray(sr.session.sources) && (sr.session.sources as unknown[]).length > 0),
        })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error listing athlete research:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to list research', 'Kunde inte hämta research') },
      { status: 500 }
    )
  }
}
