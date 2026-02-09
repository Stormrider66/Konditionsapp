/**
 * Athlete Research Session Details API
 *
 * GET /api/athlete/research/[sessionId] - Get research report details
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'

// ============================================
// GET - Get Research Details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Authenticate as athlete
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { user, clientId } = resolved

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('athlete:research:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Verify athlete has access to this research
    const sharedAccess = await prisma.sharedResearchAccess.findUnique({
      where: {
        sessionId_clientId: {
          sessionId,
          clientId: clientId,
        },
      },
      include: {
        session: {
          include: {
            coach: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!sharedAccess) {
      return NextResponse.json(
        { error: 'Research not found or not shared with you' },
        { status: 404 }
      )
    }

    const session = sharedAccess.session

    // Only show completed research
    if (session.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Research is not yet completed' },
        { status: 400 }
      )
    }

    // Mark as viewed if first view
    if (!sharedAccess.notified) {
      await prisma.sharedResearchAccess.update({
        where: { id: sharedAccess.id },
        data: { notified: true },
      })
    }

    // Parse sources
    let sources: Array<{ url: string; title: string; excerpt?: string }> = []
    if (session.sources) {
      try {
        sources = session.sources as typeof sources
      } catch {
        // Invalid JSON, ignore
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      provider: session.provider,
      query: session.query,

      // Report content
      report: session.report,
      sources,

      // Metadata
      completedAt: session.completedAt,
      sharedAt: sharedAccess.sharedAt,

      // Coach info
      coach: {
        id: session.coach.id,
        name: session.coach.name,
      },

      // Usage stats (optional, may hide from athletes)
      tokensUsed: session.tokensUsed,
      searchQueries: session.searchQueries,
      sourcesAnalyzed: session.sourcesAnalyzed,
    })
  } catch (error) {
    console.error('Error fetching athlete research:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research' },
      { status: 500 }
    )
  }
}
