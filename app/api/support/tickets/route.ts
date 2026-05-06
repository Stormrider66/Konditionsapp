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
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

const optionalString = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(maxLength).optional()
  )

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().email().max(254).optional()
)

const optionalCategory = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.enum(['bug', 'question', 'feature_request', 'complaint', 'other']).optional()
)

const ticketPriority = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional()
).transform((value) => value || 'NORMAL')

const optionalUpdatePriority = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional()
)

const ticketSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10000),
  category: optionalCategory,
  priority: ticketPriority,
  url: optionalString(2000),
  userAgent: optionalString(1000),
  screenshot: optionalString(20000),
  reporterEmail: optionalEmail,
  metadata: z.record(z.unknown()).optional(),
})

const ticketUpdateSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  category: optionalCategory,
  priority: optionalUpdatePriority,
  resolution: optionalString(10000),
  githubIssueUrl: optionalString(2000),
  action: z.enum(['create_github_issue', 'draft_codex_brief']).optional(),
})

function getJsonRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function buildCodexImplementationBrief(ticket: {
  id: string
  title: string
  description: string
  category: string | null
  priority: string
  status: string
  url: string | null
  userAgent: string | null
  reporterEmail: string | null
  metadata: Prisma.JsonValue | null
  agentCategory: string | null
  agentDraftResponse: string | null
  githubIssueUrl: string | null
}) {
  const metadata = getJsonRecord(ticket.metadata)
  const viewport = metadata.viewport && typeof metadata.viewport === 'object' && !Array.isArray(metadata.viewport)
    ? metadata.viewport as Record<string, unknown>
    : null
  const viewportLabel = viewport && typeof viewport.width === 'number' && typeof viewport.height === 'number'
    ? `${viewport.width} x ${viewport.height}`
    : null

  return [
    '# Codex Implementation Brief',
    '',
    `Ticket: ${ticket.id}`,
    `Priority: ${ticket.priority}`,
    `Category: ${ticket.category || ticket.agentCategory || 'unclassified'}`,
    `Status: ${ticket.status}`,
    ticket.githubIssueUrl ? `GitHub issue: ${ticket.githubIssueUrl}` : null,
    '',
    '## User Report',
    `Title: ${ticket.title}`,
    '',
    ticket.description,
    '',
    '## Context',
    ticket.url ? `Reported URL: ${ticket.url}` : null,
    getMetadataString(metadata, 'pathname') ? `Pathname: ${getMetadataString(metadata, 'pathname')}` : null,
    getMetadataString(metadata, 'appArea') ? `App area: ${getMetadataString(metadata, 'appArea')}` : null,
    getMetadataString(metadata, 'userRole') ? `User role: ${getMetadataString(metadata, 'userRole')}` : null,
    getMetadataString(metadata, 'businessSlug') ? `Business slug: ${getMetadataString(metadata, 'businessSlug')}` : null,
    getMetadataString(metadata, 'clientId') ? `Client ID: ${getMetadataString(metadata, 'clientId')}` : null,
    viewportLabel ? `Viewport: ${viewportLabel}` : null,
    getMetadataString(metadata, 'timezone') ? `Timezone: ${getMetadataString(metadata, 'timezone')}` : null,
    ticket.userAgent ? `User agent: ${ticket.userAgent}` : null,
    '',
    '## Suggested Codex Task',
    'Investigate the report, identify the likely code path, implement the smallest safe fix, and add focused verification. Preserve unrelated worktree changes.',
    '',
    '## Acceptance Criteria',
    '- The reported behavior is reproduced or explained.',
    '- The fix addresses the root cause without broad unrelated refactors.',
    '- Relevant UI/API states are handled gracefully.',
    '- Typecheck and focused tests pass, or any blockers are clearly documented.',
    '',
    '## Useful Follow-up Questions',
    '- Can this be reproduced on the reported URL with the same role and business scope?',
    '- Is this a product expectation mismatch, stale data issue, integration issue, or UI bug?',
    '- Should the fix create or update a regression test?',
    '',
    ticket.agentDraftResponse ? `## Support Agent Notes\n${ticket.agentDraftResponse}` : null,
  ].filter(Boolean).join('\n')
}

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

    const body = await req.json().catch(() => null)
    const parsed = ticketSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid ticket payload', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      title,
      description,
      category,
      priority,
      url,
      userAgent,
      screenshot,
      metadata,
      reporterEmail,
    } = parsed.data

    if (metadata && JSON.stringify(metadata).length > 20000) {
      return NextResponse.json({ error: 'metadata is too large' }, { status: 400 })
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
        priority,
        url: url || null,
        userAgent: userAgent || req.headers.get('user-agent') || null,
        screenshot: screenshot || null,
        metadata: metadata ? metadata as Prisma.InputJsonObject : undefined,
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

// ============================================================================
// PATCH — Update a ticket or create/link a GitHub issue (admin only)
// ============================================================================

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin()

    const body = await req.json().catch(() => null)
    const parsed = ticketUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid ticket update payload', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { ticketId, action, status, category, priority, resolution, githubIssueUrl } = parsed.data

    if (action === 'draft_codex_brief') {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      }

      const brief = buildCodexImplementationBrief(ticket)
      const metadata = getJsonRecord(ticket.metadata)
      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
          metadata: {
            ...metadata,
            codexImplementationBrief: {
              brief,
              draftedAt: new Date().toISOString(),
              draftedBy: admin.id,
            },
          } as Prisma.InputJsonObject,
        },
      })

      return NextResponse.json({
        success: true,
        ticket: updatedTicket,
        codex: { brief },
      })
    }

    if (action === 'create_github_issue') {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      }

      const { createGitHubIssue } = await import('@/lib/operator-agents/tools/support')
      const labels = ['support', ticket.category || 'bug'].filter(Boolean)
      const issueBody = [
        ticket.description,
        '',
        '---',
        `Ticket: ${ticket.id}`,
        ticket.url ? `URL: ${ticket.url}` : null,
        ticket.userAgent ? `User agent: ${ticket.userAgent}` : null,
        `Priority: ${ticket.priority}`,
        ticket.reporterEmail ? `Reporter: ${ticket.reporterEmail}` : null,
      ].filter(Boolean).join('\n')

      const result = await createGitHubIssue(ticket.title, issueBody, labels)
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to create GitHub issue' }, { status: 500 })
      }

      const data = result.data as { url?: string | null; draftedTitle?: string; draftedBody?: string; draftedLabels?: string[]; placeholder?: boolean }
      const updatedTicket = data.url
        ? await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
              githubIssueUrl: data.url,
              status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
            },
          })
        : ticket

      return NextResponse.json({
        success: true,
        ticket: updatedTicket,
        github: data,
      })
    }

    const updateData: Prisma.SupportTicketUpdateInput = {}

    if (status) {
      updateData.status = status
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolvedAt = new Date()
        updateData.resolvedBy = admin.id
      } else {
        updateData.resolvedAt = null
        updateData.resolvedBy = null
      }
    }
    if (category !== undefined) updateData.category = category || null
    if (priority !== undefined) updateData.priority = priority
    if (resolution !== undefined) updateData.resolution = resolution || null
    if (githubIssueUrl !== undefined) updateData.githubIssueUrl = githubIssueUrl || null

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    logger.error('[support] Failed to update ticket', {}, error)
    return NextResponse.json({ error: 'Unauthorized or error' }, { status: 401 })
  }
}
