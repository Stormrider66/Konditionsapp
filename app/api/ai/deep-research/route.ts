/**
 * Deep Research API Routes
 *
 * POST /api/ai/deep-research - Start a new research session
 * GET /api/ai/deep-research - List research sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { createProvider, PROVIDER_COST_ESTIMATES, ResearchConfig } from '@/lib/ai/deep-research'
import { checkBudget, logUsage } from '@/lib/ai/deep-research/budget-manager'
import { searchSimilarChunks } from '@/lib/ai/embeddings'
import { DeepResearchProvider, DeepResearchStatus } from '@prisma/client'

// ============================================
// Validation Schemas
// ============================================

const StartResearchSchema = z.object({
  query: z.string().min(10, 'Query must be at least 10 characters').max(5000),
  provider: z.nativeEnum(DeepResearchProvider),
  athleteId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).optional(),
  systemPrompt: z.string().max(10000).optional(),
})

// ============================================
// POST - Start Research Session
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireCoach()

    // Rate limit: 5 research sessions per minute
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:start', user.id, {
      limit: 5,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse and validate request
    const body = await request.json()
    const validation = StartResearchSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { query, provider, athleteId, documentIds, systemPrompt } = validation.data

    // Check for LangChain (not yet implemented)
    if (provider === 'LANGCHAIN') {
      return NextResponse.json(
        { error: 'LangChain provider is not yet implemented' },
        { status: 501 }
      )
    }

    // Get API keys
    const decryptedKeys = await getResolvedAiKeys(user.id)

    // Determine which key is needed
    let apiKey: string | null = null
    if (provider === 'GEMINI') {
      apiKey = decryptedKeys.googleKey
    } else if (provider.startsWith('OPENAI')) {
      apiKey = decryptedKeys.openaiKey
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: `No API key configured for provider: ${provider}` },
        { status: 400 }
      )
    }

    // Get cost estimate
    const costEstimate = PROVIDER_COST_ESTIMATES[provider]

    // Check budget
    const budgetCheck = await checkBudget(user.id, costEstimate.maxCost, 'research')
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Budget exceeded',
          message: budgetCheck.warning,
          remaining: budgetCheck.remaining,
          monthlyBudget: budgetCheck.monthlyBudget,
        },
        { status: 402 } // Payment Required
      )
    }

    // Verify athlete belongs to coach (if provided)
    if (athleteId) {
      const access = await canAccessAthlete(user.id, athleteId)
      if (!access.allowed) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Verify documents belong to coach (if provided)
    if (documentIds && documentIds.length > 0) {
      const documents = await prisma.coachDocument.findMany({
        where: { id: { in: documentIds }, coachId: user.id },
        select: { id: true },
      })

      if (documents.length !== documentIds.length) {
        return NextResponse.json(
          { error: 'One or more documents not found or not accessible' },
          { status: 404 }
        )
      }
    }

    // Build context from documents if provided
    let documentContext: string | undefined

    if (documentIds && documentIds.length > 0 && decryptedKeys.openaiKey) {
      try {
        const chunks = await searchSimilarChunks(
          query,
          user.id,
          decryptedKeys.openaiKey,
          {
            matchThreshold: 0.75,
            matchCount: 10,
            documentIds,
          }
        )

        if (chunks.length > 0) {
          const docs = await prisma.coachDocument.findMany({
            where: { id: { in: chunks.map((c) => c.documentId) } },
            select: { id: true, name: true },
          })
          const docMap = new Map(docs.map((d) => [d.id, d.name]))

          documentContext = chunks
            .map(
              (c, i) =>
                `### Source ${i + 1}: ${docMap.get(c.documentId) || 'Document'}\n${c.content}`
            )
            .join('\n\n---\n\n')
        }
      } catch (error) {
        console.error('Error fetching document context:', error)
        // Continue without document context
      }
    }

    // Build athlete context if provided
    let athleteContext: Record<string, unknown> | undefined

    if (athleteId) {
      const athlete = await prisma.client.findUnique({
        where: { id: athleteId },
        select: {
          gender: true,
          birthDate: true,
          height: true,
          weight: true,
          sportProfile: {
            select: {
              primarySport: true,
              secondarySports: true,
              onboardingCompleted: true,
            },
          },
        },
      })

      if (athlete) {
        const age = athlete.birthDate
          ? Math.floor(
              (Date.now() - new Date(athlete.birthDate).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null

        // GDPR: Do not include name or birthDate - only anonymized data
        athleteContext = {
          gender: athlete.gender,
          age,
          height: athlete.height,
          weight: athlete.weight,
          sport: athlete.sportProfile?.primarySport,
          secondarySports: athlete.sportProfile?.secondarySports,
        }
      }
    }

    // Create research session in database
    const session = await prisma.deepResearchSession.create({
      data: {
        coachId: user.id,
        athleteId,
        provider,
        query,
        systemPrompt,
        contextDocuments: documentIds || [],
        athleteContext: athleteContext as object | undefined,
        status: 'PENDING',
      },
    })

    // Start the research with the provider
    try {
      const researchProvider = await createProvider(provider, apiKey)

      const config: ResearchConfig = {
        query,
        systemPrompt,
        context: documentContext,
        athleteContext,
        documentIds,
      }

      const result = await researchProvider.start(config)

      // Update session with external job ID
      await prisma.deepResearchSession.update({
        where: { id: session.id },
        data: {
          externalJobId: result.externalJobId,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      })

      // Log initial progress
      await prisma.deepResearchProgress.create({
        data: {
          sessionId: session.id,
          step: 'initializing',
          message: 'Research started',
          percent: 0,
        },
      })

      return NextResponse.json({
        sessionId: session.id,
        status: 'RUNNING',
        estimatedMinutes: result.estimatedMinutes,
        pollingEndpoint: `/api/ai/deep-research/${session.id}/progress`,
        budgetWarning: budgetCheck.warning,
      })
    } catch (error) {
      // Update session to failed
      await prisma.deepResearchSession.update({
        where: { id: session.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      throw error
    }
  } catch (error) {
    console.error('Error starting deep research:', error)
    return NextResponse.json(
      { error: 'Failed to start research', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ============================================
// GET - List Research Sessions
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireCoach()

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as DeepResearchStatus | null
    const athleteId = searchParams.get('athleteId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    const where: {
      coachId: string
      status?: DeepResearchStatus
      athleteId?: string
    } = {
      coachId: user.id,
    }

    if (status) {
      where.status = status
    }

    if (athleteId) {
      const access = await canAccessAthlete(user.id, athleteId)
      if (!access.allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.athleteId = athleteId
    }

    // Fetch sessions
    const [sessions, total] = await Promise.all([
      prisma.deepResearchSession.findMany({
        where,
        select: {
          id: true,
          provider: true,
          query: true,
          status: true,
          progressPercent: true,
          progressMessage: true,
          startedAt: true,
          completedAt: true,
          estimatedCost: true,
          tokensUsed: true,
          savedDocumentId: true,
          athlete: {
            select: { id: true, name: true },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.deepResearchSession.count({ where }),
    ])

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        provider: s.provider,
        queryPreview: s.query.substring(0, 100) + (s.query.length > 100 ? '...' : ''),
        status: s.status,
        progressPercent: s.progressPercent,
        progressMessage: s.progressMessage,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        estimatedCost: s.estimatedCost,
        tokensUsed: s.tokensUsed,
        hasSavedDocument: !!s.savedDocumentId,
        athlete: s.athlete,
        createdAt: s.createdAt,
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error listing deep research sessions:', error)
    return NextResponse.json(
      { error: 'Failed to list research sessions' },
      { status: 500 }
    )
  }
}

// Route config
export const maxDuration = 30 // 30 seconds for starting research
