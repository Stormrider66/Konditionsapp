/**
 * Support Tickets API
 *
 * POST /api/support/tickets — Submit a new support ticket
 * GET /api/support/tickets — List tickets (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getCurrentUser } from '@/lib/auth-utils'
import { rateLimitJsonResponse, getRequestIp } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

// ============================================================================
// POST — Submit a new ticket (authenticated or anonymous)
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP: max 10 tickets per IP per hour (prevents spam/DoS)
    const ip = getRequestIp(req)
    const rateLimited = await rateLimitJsonResponse('support:tickets:post', ip, {
      limit: 10,
      windowSeconds: 3600,
    })
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { title, description, category, url, userAgent, screenshot, metadata, reporterEmail } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'title and description are required' },
        { status: 400 }
      )
    }

    // Basic length guards against abuse
    if (typeof title !== 'string' || title.length > 500) {
      return NextResponse.json({ error: 'title must be a string under 500 chars' }, { status: 400 })
    }
    if (typeof description !== 'string' || description.length > 10000) {
      return NextResponse.json({ error: 'description must be a string under 10000 chars' }, { status: 400 })
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

    // Enqueue the Support Agent via the job queue.
    // The worker cron will pick it up within ~1 minute. This is
    // serverless-friendly: no blocking, no in-process workers.
    try {
      const { enqueueAgentJob } = await import('@/lib/operator-agents/job-queue')
      await enqueueAgentJob('SUPPORT', 'new_ticket', { ticketId: ticket.id })
    } catch (err) {
      // Queue failures don't block the response — the scheduled cron
      // still processes tickets every 30 min as a safety net.
      logger.error('[support] Failed to enqueue agent job', { ticketId: ticket.id }, err)
    }

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
