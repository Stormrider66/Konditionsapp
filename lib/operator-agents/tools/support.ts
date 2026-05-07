import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'
import * as github from '../integrations/github'
import { sendFounderEmail } from './_shared'
import { alertFounder } from './platform-health'

export async function getOpenSupportTickets(): Promise<OperatorToolResult> {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        agentClassified: false,
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        userId: true,
        reporterEmail: true,
        priority: true,
        url: true,
        createdAt: true,
      },
    })

    return { success: true, data: { count: tickets.length, tickets } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getTicket(ticketId: string): Promise<OperatorToolResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    })
    if (!ticket) return { success: false, error: 'Ticket not found' }
    return { success: true, data: ticket }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function searchSimilarTickets(query: string): Promise<OperatorToolResult> {
  try {
    // Simple keyword search — can be upgraded to embedding search later
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5)
    const similar = await prisma.supportTicket.findMany({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        OR: words.map(w => ({
          OR: [
            { title: { contains: w, mode: 'insensitive' as const } },
            { description: { contains: w, mode: 'insensitive' as const } },
          ],
        })),
      },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        resolution: true,
      },
    })

    return { success: true, data: { count: similar.length, tickets: similar } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function classifyTicket(
  ticketId: string,
  category: string,
  priority: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        agentCategory: category,
        category,
        priority,
        agentClassified: true,
      },
    })
    return { success: true, data: { ticketId, category, priority } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function draftTicketResponse(
  ticketId: string,
  body: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { agentDraftResponse: body },
    })
    return { success: true, data: { ticketId, drafted: true } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function markAsFeatureRequest(ticketId: string): Promise<OperatorToolResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) return { success: false, error: 'Ticket not found' }

    // Create a FeatureRequest from the ticket
    const featureRequest = await prisma.featureRequest.create({
      data: {
        submittedBy: ticket.userId || 'anonymous',
        title: ticket.title,
        description: ticket.description,
        status: 'OPEN',
      },
    })

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        category: 'feature_request',
        featureRequestId: featureRequest.id,
        status: 'RESOLVED',
        resolution: 'Reclassified as feature request',
        resolvedAt: new Date(),
      },
    })

    return { success: true, data: { ticketId, featureRequestId: featureRequest.id } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function escalateToFounder(
  ticketId: string,
  reason: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        priority: 'URGENT',
        metadata: { escalationReason: reason, escalatedAt: new Date().toISOString() } as never,
      },
    })

    // Also send alert email
    await alertFounder('URGENT', `Escalated ticket: ${ticketId}`, reason)

    return { success: true, data: { ticketId, escalated: true } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUserContext(userId: string): Promise<OperatorToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) return { success: false, error: 'User not found' }

    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Create a GitHub issue for a confirmed bug.
 *
 * Uses the GitHub REST API via lib/operator-agents/integrations/github.ts.
 * Requires GITHUB_TOKEN and GITHUB_REPO env vars. If not configured,
 * preserves the draft so the founder can create the issue manually.
 */
export async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[] = []
): Promise<OperatorToolResult> {
  const result = await github.createIssue({ title, body, labels })

  if (!result.configured) {
    return {
      success: true,
      data: {
        url: null,
        draftedTitle: title,
        draftedBody: body,
        draftedLabels: labels,
        note: 'GitHub not configured (missing GITHUB_TOKEN or GITHUB_REPO). Draft preserved.',
        placeholder: true,
      },
    }
  }

  if (!result.created) {
    return {
      success: false,
      error: result.error || 'Unknown error creating GitHub issue',
      data: {
        draftedTitle: title,
        draftedBody: body,
        draftedLabels: labels,
      },
    }
  }

  return {
    success: true,
    data: {
      url: result.url,
      issueNumber: result.issueNumber,
      created: true,
    },
  }
}

export async function linkGitHubIssue(
  ticketId: string,
  url: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { githubIssueUrl: url },
    })
    return { success: true, data: { ticketId, url } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// COST GUARDIAN TOOLS
