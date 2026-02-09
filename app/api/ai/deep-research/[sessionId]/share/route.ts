/**
 * Share Deep Research with Athletes API
 *
 * POST /api/ai/deep-research/[sessionId]/share - Share with athlete
 * GET /api/ai/deep-research/[sessionId]/share - List current shares
 * DELETE /api/ai/deep-research/[sessionId]/share - Remove share
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'

// ============================================
// Validation Schemas
// ============================================

const ShareResearchSchema = z.object({
  athleteId: z.string().uuid(),
  notify: z.boolean().default(true),
})

const UnshareResearchSchema = z.object({
  athleteId: z.string().uuid(),
})

// ============================================
// POST - Share Research with Athlete
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Authenticate
    const user = await requireCoach()

    // Rate limit: 20 shares per minute
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:share', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse and validate request
    const body = await request.json()
    const validation = ShareResearchSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { athleteId, notify } = validation.data

    // Fetch session with ownership check
    const session = await prisma.deepResearchSession.findFirst({
      where: {
        id: sessionId,
        coachId: user.id,
      },
      select: {
        id: true,
        status: true,
        query: true,
        report: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      )
    }

    // Check if session is completed
    if (session.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Cannot share session with status: ${session.status}. Only completed sessions can be shared.` },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, athleteId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Athlete not found or not accessible' },
        { status: 404 }
      )
    }

    const athlete = await prisma.client.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        name: true,
        email: true,
        athleteAccount: {
          select: { userId: true },
        },
      },
    })

    if (!athlete) {
      return NextResponse.json(
        { error: 'Athlete not found or not accessible' },
        { status: 404 }
      )
    }

    // Check if already shared
    const existingShare = await prisma.sharedResearchAccess.findUnique({
      where: {
        sessionId_clientId: {
          sessionId,
          clientId: athleteId,
        },
      },
    })

    if (existingShare) {
      return NextResponse.json(
        { error: 'Research is already shared with this athlete' },
        { status: 409 }
      )
    }

    // Create share record
    const share = await prisma.sharedResearchAccess.create({
      data: {
        sessionId,
        clientId: athleteId,
        notified: false,
      },
    })

    // Update session's shared athletes list
    await prisma.deepResearchSession.update({
      where: { id: sessionId },
      data: {
        sharedWithAthletes: {
          push: athleteId,
        },
      },
    })

    // Send notification if requested and athlete has account
    if (notify && athlete.athleteAccount && athlete.email) {
      try {
        // TODO: Implement email notification
        // For now, just mark as notified
        await prisma.sharedResearchAccess.update({
          where: { id: share.id },
          data: { notified: true },
        })

        // Could also create an in-app notification here
        // await prisma.notification.create({ ... })
      } catch (notifyError) {
        console.error('Error sending share notification:', notifyError)
        // Continue even if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      shareId: share.id,
      athleteId,
      athleteName: athlete.name,
      notified: share.notified,
      message: `Research shared with ${athlete.name}`,
    })
  } catch (error) {
    console.error('Error sharing deep research:', error)
    return NextResponse.json(
      { error: 'Failed to share research' },
      { status: 500 }
    )
  }
}

// ============================================
// GET - List Current Shares
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Authenticate
    const user = await requireCoach()

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:share:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Verify session ownership
    const session = await prisma.deepResearchSession.findFirst({
      where: {
        id: sessionId,
        coachId: user.id,
      },
      select: { id: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      )
    }

    // Get all shares
    const shares = await prisma.sharedResearchAccess.findMany({
      where: { sessionId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { sharedAt: 'desc' },
    })

    return NextResponse.json({
      sessionId,
      shares: shares.map((s) => ({
        id: s.id,
        athleteId: s.clientId,
        athleteName: s.client.name,
        athleteEmail: s.client.email,
        sharedAt: s.sharedAt,
        notified: s.notified,
      })),
      totalShares: shares.length,
    })
  } catch (error) {
    console.error('Error listing research shares:', error)
    return NextResponse.json(
      { error: 'Failed to list shares' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - Remove Share
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Authenticate
    const user = await requireCoach()

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:unshare', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse and validate request
    const body = await request.json()
    const validation = UnshareResearchSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { athleteId } = validation.data

    // Verify session ownership
    const session = await prisma.deepResearchSession.findFirst({
      where: {
        id: sessionId,
        coachId: user.id,
      },
      select: {
        id: true,
        sharedWithAthletes: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      )
    }

    // Delete share record
    const deleteResult = await prisma.sharedResearchAccess.deleteMany({
      where: {
        sessionId,
        clientId: athleteId,
      },
    })

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      )
    }

    // Update session's shared athletes list
    const updatedSharedWith = session.sharedWithAthletes.filter((id) => id !== athleteId)
    await prisma.deepResearchSession.update({
      where: { id: sessionId },
      data: {
        sharedWithAthletes: updatedSharedWith,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Share removed successfully',
    })
  } catch (error) {
    console.error('Error removing research share:', error)
    return NextResponse.json(
      { error: 'Failed to remove share' },
      { status: 500 }
    )
  }
}
