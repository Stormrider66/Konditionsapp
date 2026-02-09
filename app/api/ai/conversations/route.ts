/**
 * AI Conversations API
 *
 * GET /api/ai/conversations - List conversations
 * POST /api/ai/conversations - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AIProvider } from '@prisma/client'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

interface CreateConversationRequest {
  modelUsed: string
  provider: AIProvider
  athleteId?: string
  contextDocuments?: string[]
  webSearchEnabled?: boolean
  title?: string
}

// GET - List conversations
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:conversations:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ACTIVE'
    const limit = parseInt(searchParams.get('limit') || '20')

    const conversations = await prisma.aIConversation.findMany({
      where: {
        coachId: user.id,
        ...(status !== 'all' ? { status } : {}),
      },
      select: {
        id: true,
        title: true,
        modelUsed: true,
        provider: true,
        contextDocuments: true,
        webSearchEnabled: true,
        totalTokensUsed: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      conversations,
    })
  } catch (error) {
    logger.error('List conversations error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    )
  }
}

// POST - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:conversations:create', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body: CreateConversationRequest = await request.json()
    const {
      modelUsed,
      provider,
      athleteId,
      contextDocuments = [],
      webSearchEnabled = false,
      title,
    } = body

    if (!modelUsed || !provider) {
      return NextResponse.json(
        { error: 'modelUsed and provider are required' },
        { status: 400 }
      )
    }

    // Verify athlete belongs to coach if specified
    if (athleteId) {
      const hasAccess = await canAccessClient(user.id, athleteId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Athlete not found or not accessible' },
          { status: 404 }
        )
      }
    }

    // Verify documents belong to coach if specified
    if (contextDocuments.length > 0) {
      const docs = await prisma.coachDocument.findMany({
        where: {
          id: { in: contextDocuments },
          coachId: user.id,
        },
      })

      if (docs.length !== contextDocuments.length) {
        return NextResponse.json(
          { error: 'One or more documents not found or not accessible' },
          { status: 404 }
        )
      }
    }

    const conversation = await prisma.aIConversation.create({
      data: {
        coachId: user.id,
        athleteId: athleteId || null,
        modelUsed,
        provider,
        contextDocuments,
        webSearchEnabled,
        title: title || null,
        status: 'ACTIVE',
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        conversation,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Create conversation error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
