/**
 * Deep Research Session API Routes
 *
 * GET /api/ai/deep-research/[sessionId] - Get session details and results
 * DELETE /api/ai/deep-research/[sessionId] - Cancel a running session
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { createProvider } from '@/lib/ai/deep-research'

// ============================================
// GET - Get Session Details
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
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Fetch session with ownership check
    const session = await prisma.deepResearchSession.findFirst({
      where: {
        id: sessionId,
        coachId: user.id,
      },
      include: {
        athlete: {
          select: { id: true, name: true },
        },
        savedDocument: {
          select: { id: true, name: true, fileType: true },
        },
        sharedAccess: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
        progressUpdates: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      )
    }

    // Parse sources from JSON
    let sources: Array<{ url: string; title: string; excerpt?: string }> = []
    if (session.sources) {
      try {
        sources = session.sources as typeof sources
      } catch {
        // Invalid JSON, ignore
      }
    }

    return NextResponse.json({
      id: session.id,
      provider: session.provider,
      query: session.query,
      systemPrompt: session.systemPrompt,
      contextDocuments: session.contextDocuments,
      athleteContext: session.athleteContext,

      // Status
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      progressPercent: session.progressPercent,
      progressMessage: session.progressMessage,
      currentStep: session.currentStep,

      // Results
      report: session.report,
      sources,
      reasoning: session.reasoning,

      // Usage
      tokensUsed: session.tokensUsed,
      estimatedCost: session.estimatedCost,
      searchQueries: session.searchQueries,
      sourcesAnalyzed: session.sourcesAnalyzed,

      // Error info
      errorMessage: session.errorMessage,
      errorCode: session.errorCode,
      retryCount: session.retryCount,

      // Relations
      athlete: session.athlete,
      savedDocument: session.savedDocument,
      sharedWith: session.sharedAccess.map((sa) => ({
        clientId: sa.client.id,
        clientName: sa.client.name,
        sharedAt: sa.sharedAt,
      })),

      // Recent progress
      progressHistory: session.progressUpdates.map((p) => ({
        step: p.step,
        message: p.message,
        percent: p.percent,
        timestamp: p.timestamp,
      })),

      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching deep research session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research session' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - Cancel Running Session
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
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:cancel', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Fetch session with ownership check
    const session = await prisma.deepResearchSession.findFirst({
      where: {
        id: sessionId,
        coachId: user.id,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      )
    }

    // Can only cancel running or pending sessions
    if (session.status !== 'RUNNING' && session.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot cancel session with status: ${session.status}` },
        { status: 400 }
      )
    }

    // Try to cancel with provider if running
    let providerCancelled = false

    if (session.status === 'RUNNING' && session.externalJobId) {
      try {
        const decryptedKeys = await getResolvedAiKeys(user.id)

        let apiKey: string | null = null
        if (session.provider === 'GEMINI') {
          apiKey = decryptedKeys.googleKey
        } else if (session.provider.startsWith('OPENAI')) {
          apiKey = decryptedKeys.openaiKey
        }

        if (apiKey) {
          const provider = await createProvider(session.provider, apiKey)
          if (provider.cancel) {
            providerCancelled = await provider.cancel(session.externalJobId)
          }
        }
      } catch (error) {
        console.warn('Error cancelling with provider:', error)
        // Continue with local cancellation
      }
    }

    // Update session status
    await prisma.deepResearchSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user',
      },
    })

    // Log progress
    await prisma.deepResearchProgress.create({
      data: {
        sessionId,
        step: 'cancelled',
        message: 'Research cancelled by user',
        percent: session.progressPercent || 0,
      },
    })

    return NextResponse.json({
      success: true,
      providerCancelled,
      message: 'Research session cancelled',
    })
  } catch (error) {
    console.error('Error cancelling deep research session:', error)
    return NextResponse.json(
      { error: 'Failed to cancel research session' },
      { status: 500 }
    )
  }
}
