/**
 * AI Conversations API
 *
 * GET /api/ai/conversations - List conversations
 * POST /api/ai/conversations - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, requireCoach, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AIProvider } from '@prisma/client'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface CreateConversationRequest {
  modelUsed: string
  provider: string // Accept 'INTENT' as well as AIProvider values
  athleteId?: string
  contextDocuments?: string[]
  selectedSkillIds?: string[]
  webSearchEnabled?: boolean
  title?: string
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// GET - List conversations
export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    // Athlete path first (handles ATHLETE role + COACH in athlete mode):
    // athletes only ever see conversations they started themselves —
    // coach AI Studio conversations about them must stay private.
    let scopeWhere: { coachId: string } | { athleteId: string; createdByRole: 'ATHLETE' }
    let rateLimitUserId: string

    const athleteResolved = await resolveAthleteClientId()
    if (athleteResolved) {
      locale = resolveRequestLocale(request, athleteResolved.user.language)
      scopeWhere = { athleteId: athleteResolved.clientId, createdByRole: 'ATHLETE' }
      rateLimitUserId = athleteResolved.user.id
    } else {
      const user = await requireCoach()
      locale = resolveRequestLocale(request, user.language)
      scopeWhere = { coachId: user.id }
      rateLimitUserId = user.id
    }

    const rateLimited = await rateLimitJsonResponse('ai:conversations:list', rateLimitUserId, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ACTIVE'
    const limit = parseInt(searchParams.get('limit') || '20')

    const conversations = await prisma.aIConversation.findMany({
      where: {
        ...scopeWhere,
        ...(status !== 'all' ? { status } : {}),
      },
      select: {
        id: true,
        title: true,
        modelUsed: true,
        provider: true,
        contextDocuments: true,
        selectedSkillIds: true,
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to list conversations', 'Kunde inte hämta konversationer') },
      { status: 500 }
    )
  }
}

// POST - Create new conversation
export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const body: CreateConversationRequest = await request.json()
    const {
      modelUsed,
      provider,
      athleteId,
      contextDocuments = [],
      selectedSkillIds = [],
      webSearchEnabled = false,
      title,
    } = body

    if (!modelUsed) {
      return NextResponse.json(
        { error: t(locale, 'modelUsed is required', 'modelUsed krävs') },
        { status: 400 }
      )
    }

    // Resolve provider — athlete chat sends 'INTENT' which isn't a valid AIProvider enum.
    // Map it to ANTHROPIC as default; the actual provider is resolved later in the chat route.
    const validProviders = ['ANTHROPIC', 'GOOGLE', 'OPENAI'] as const
    const resolvedProvider: AIProvider = validProviders.includes(provider as typeof validProviders[number])
      ? (provider as AIProvider)
      : 'ANTHROPIC'

    // Support both coach and athlete roles
    let userId: string
    let coachId: string

    // Try athlete path first (handles ATHLETE role + COACH in athlete mode)
    const athleteResolved = await resolveAthleteClientId()
    if (athleteResolved) {
      locale = resolveRequestLocale(request, athleteResolved.user.language)
      userId = athleteResolved.user.id
      // For athletes, the coachId is the coach who owns the client record
      const clientRecord = await prisma.client.findUnique({
        where: { id: athleteResolved.clientId },
        select: { userId: true },
      })
      coachId = clientRecord?.userId || userId
    } else {
      // Fall back to coach auth
      const user = await requireCoach()
      locale = resolveRequestLocale(request, user.language)
      userId = user.id
      coachId = user.id
    }

    const rateLimited = await rateLimitJsonResponse('ai:conversations:create', userId, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Verify athlete belongs to coach if specified (coach mode only)
    if (athleteId && !athleteResolved) {
      const hasAccess = await canAccessClient(coachId, athleteId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: t(locale, 'Athlete not found or not accessible', 'Atleten hittades inte eller är inte tillgänglig') },
          { status: 404 }
        )
      }
    }

    // Verify documents belong to coach if specified
    if (contextDocuments.length > 0) {
      const docs = await prisma.coachDocument.findMany({
        where: {
          id: { in: contextDocuments },
          coachId,
        },
      })

      if (docs.length !== contextDocuments.length) {
        return NextResponse.json(
          { error: t(locale, 'One or more documents were not found or are not accessible', 'Ett eller flera dokument hittades inte eller är inte tillgängliga') },
          { status: 404 }
        )
      }
    }

    const conversation = await prisma.aIConversation.create({
      data: {
        coachId,
        athleteId: athleteResolved?.clientId || athleteId || null,
        createdByRole: athleteResolved ? 'ATHLETE' : 'COACH',
        modelUsed,
        provider: resolvedProvider,
        contextDocuments,
        selectedSkillIds,
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to create conversation', 'Kunde inte skapa konversation') },
      { status: 500 }
    )
  }
}
