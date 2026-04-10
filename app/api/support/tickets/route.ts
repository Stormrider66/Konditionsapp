/**
 * Support Tickets API
 *
 * POST /api/support/tickets — Submit a new support ticket
 * GET /api/support/tickets — List tickets (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

// ============================================================================
// POST — Submit a new ticket (authenticated or anonymous)
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, category, url, userAgent, screenshot, metadata, reporterEmail } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'title and description are required' },
        { status: 400 }
      )
    }

    // Try to get the current user (optional — anonymous submissions allowed)
    const user = await getCurrentUser().catch(() => null)

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user?.id || null,
        reporterEmail: reporterEmail || user?.email || null,
        title,
        description,
        category: category || null,
        url: url || null,
        userAgent: userAgent || req.headers.get('user-agent') || null,
        screenshot: screenshot || null,
        metadata: metadata || undefined,
      },
    })

    logger.info('[support] New ticket created', { ticketId: ticket.id, userId: user?.id })

    // Trigger support agent (fire-and-forget)
    // Only if we're not in a rapid-fire situation
    import('@/lib/operator-agents').then(({ runOperatorAgent }) => {
      runOperatorAgent('SUPPORT', { triggeredBy: 'event' }).catch(err =>
        logger.warn('[support] Failed to trigger agent', { error: String(err) })
      )
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
    })
  } catch (error) {
    logger.error('[support] Failed to create ticket', {}, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// GET — List tickets (admin only)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const tickets = await prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const counts = await prisma.supportTicket.groupBy({
      by: ['status'],
      _count: true,
    })

    return NextResponse.json({
      tickets,
      counts: Object.fromEntries(counts.map(c => [c.status, c._count])),
    })
  } catch (error) {
    logger.error('[support] Failed to list tickets', {}, error)
    return NextResponse.json({ error: 'Unauthorized or error' }, { status: 401 })
  }
}
