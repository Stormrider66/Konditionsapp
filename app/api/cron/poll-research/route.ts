/**
 * Deep Research Polling Cron Job
 *
 * POST /api/cron/poll-research
 *
 * Polls running research sessions for status updates.
 * Should be called every 30 seconds by Vercel Cron.
 *
 * Vercel Cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/poll-research",
 *     "schedule": "* * * * *"  // Every minute (Vercel minimum)
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProvider } from '@/lib/ai/deep-research'
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'
import { logUsage } from '@/lib/ai/deep-research/budget-manager'
import { DeepResearchProvider } from '@prisma/client'

// ============================================
// POST - Poll Running Research Sessions
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all running sessions
    const runningSessions = await prisma.deepResearchSession.findMany({
      where: {
        status: 'RUNNING',
        externalJobId: { not: null },
      },
      select: {
        id: true,
        coachId: true,
        provider: true,
        externalJobId: true,
        startedAt: true,
        retryCount: true,
      },
    })

    if (runningSessions.length === 0) {
      return NextResponse.json({
        message: 'No running sessions to poll',
        polledCount: 0,
      })
    }

    const results: Array<{
      sessionId: string
      status: string
      error?: string
    }> = []

    // Process each session
    for (const session of runningSessions) {
      try {
        // Check for timeout (60 minutes max)
        const startedAt = session.startedAt || new Date()
        const minutesRunning = (Date.now() - startedAt.getTime()) / 1000 / 60

        if (minutesRunning > 60) {
          await handleTimeout(session.id)
          results.push({ sessionId: session.id, status: 'TIMEOUT' })
          continue
        }

        // Get API key for provider
        const decryptedKeys = await getDecryptedUserApiKeys(session.coachId)

        let apiKey: string | null = null
        if (session.provider === 'GEMINI') {
          apiKey = decryptedKeys.googleKey
        } else if (session.provider.startsWith('OPENAI')) {
          apiKey = decryptedKeys.openaiKey
        }

        if (!apiKey) {
          await handleError(session.id, 'API key not available for polling')
          results.push({ sessionId: session.id, status: 'ERROR', error: 'No API key' })
          continue
        }

        // Poll provider
        const provider = await createProvider(session.provider, apiKey)
        const pollResult = await provider.poll(session.externalJobId!)

        // Handle poll result
        if (pollResult.status === 'COMPLETED') {
          await handleCompletion(session.id, session.coachId, session.provider, pollResult)
          results.push({ sessionId: session.id, status: 'COMPLETED' })
        } else if (pollResult.status === 'FAILED') {
          await handleError(session.id, pollResult.error || 'Research failed')
          results.push({ sessionId: session.id, status: 'FAILED', error: pollResult.error })
        } else {
          // Still running - update progress
          await updateProgress(session.id, pollResult)
          results.push({ sessionId: session.id, status: 'RUNNING' })
        }
      } catch (error) {
        console.error(`Error polling session ${session.id}:`, error)

        // Increment retry count
        const updatedSession = await prisma.deepResearchSession.update({
          where: { id: session.id },
          data: { retryCount: { increment: 1 } },
          select: { retryCount: true },
        })

        // Fail after 5 retries
        if (updatedSession.retryCount >= 5) {
          await handleError(session.id, 'Max retries exceeded')
          results.push({ sessionId: session.id, status: 'FAILED', error: 'Max retries' })
        } else {
          results.push({
            sessionId: session.id,
            status: 'RETRY',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    return NextResponse.json({
      message: `Polled ${runningSessions.length} sessions`,
      polledCount: runningSessions.length,
      results,
    })
  } catch (error) {
    console.error('Error in poll-research cron:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ============================================
// Helper Functions
// ============================================

async function handleCompletion(
  sessionId: string,
  coachId: string,
  provider: DeepResearchProvider,
  pollResult: {
    report?: string
    sources?: Array<{ url: string; title: string; excerpt?: string }>
    reasoning?: string
    tokensUsed?: number
    searchQueries?: number
    sourcesAnalyzed?: number
  }
) {
  // Estimate cost based on tokens
  const tokensUsed = pollResult.tokensUsed || 0
  let estimatedCost = 0

  // Cost estimation per provider (rough estimates)
  switch (provider) {
    case 'GEMINI':
      estimatedCost = (tokensUsed / 1000000) * 1.25 // $1.25 per 1M tokens
      break
    case 'OPENAI_QUICK':
      estimatedCost = (tokensUsed / 1000000) * 0.15 // $0.15 per 1M input tokens (gpt-5-mini)
      break
    case 'OPENAI_STANDARD':
      estimatedCost = (tokensUsed / 1000000) * 2.5 // $2.50 per 1M tokens (gpt-5.2)
      break
    case 'OPENAI_DEEP':
      estimatedCost = (tokensUsed / 1000000) * 3.0 // $3.00 per 1M tokens (o4-mini)
      break
    case 'OPENAI_EXPERT':
      estimatedCost = (tokensUsed / 1000000) * 15.0 // $15.00 per 1M tokens (o3)
      break
    default:
      estimatedCost = (tokensUsed / 1000000) * 2.0
  }

  // Update session
  await prisma.deepResearchSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      progressPercent: 100,
      progressMessage: 'Research complete',
      report: pollResult.report,
      sources: pollResult.sources as object,
      reasoning: pollResult.reasoning,
      tokensUsed: pollResult.tokensUsed,
      estimatedCost,
      searchQueries: pollResult.searchQueries,
      sourcesAnalyzed: pollResult.sourcesAnalyzed,
    },
  })

  // Log progress
  await prisma.deepResearchProgress.create({
    data: {
      sessionId,
      step: 'completed',
      message: 'Research completed successfully',
      percent: 100,
      metadata: {
        tokensUsed,
        estimatedCost,
        sourcesCount: pollResult.sources?.length || 0,
      },
    },
  })

  // Log usage for budget tracking
  await logUsage({
    userId: coachId,
    category: 'research',
    provider: provider,
    model: getModelForProvider(provider),
    inputTokens: Math.floor(tokensUsed * 0.8), // Estimate 80% input
    outputTokens: Math.floor(tokensUsed * 0.2), // Estimate 20% output
    estimatedCost,
    researchSessionId: sessionId,
  })
}

async function handleError(sessionId: string, errorMessage: string) {
  await prisma.deepResearchSession.update({
    where: { id: sessionId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorMessage,
      errorCode: 'RESEARCH_FAILED',
    },
  })

  await prisma.deepResearchProgress.create({
    data: {
      sessionId,
      step: 'failed',
      message: errorMessage,
      percent: 0,
    },
  })
}

async function handleTimeout(sessionId: string) {
  await prisma.deepResearchSession.update({
    where: { id: sessionId },
    data: {
      status: 'TIMEOUT',
      completedAt: new Date(),
      errorMessage: 'Research timed out after 60 minutes',
      errorCode: 'TIMEOUT',
    },
  })

  await prisma.deepResearchProgress.create({
    data: {
      sessionId,
      step: 'timeout',
      message: 'Research timed out',
      percent: 0,
    },
  })
}

async function updateProgress(
  sessionId: string,
  pollResult: {
    progressPercent?: number
    progressMessage?: string
    currentStep?: string
  }
) {
  await prisma.deepResearchSession.update({
    where: { id: sessionId },
    data: {
      progressPercent: pollResult.progressPercent,
      progressMessage: pollResult.progressMessage,
      currentStep: pollResult.currentStep,
    },
  })

  // Only log progress if there's meaningful information
  if (pollResult.progressMessage || pollResult.currentStep) {
    await prisma.deepResearchProgress.create({
      data: {
        sessionId,
        step: pollResult.currentStep || 'processing',
        message: pollResult.progressMessage || 'Processing...',
        percent: pollResult.progressPercent,
      },
    })
  }
}

function getModelForProvider(provider: DeepResearchProvider): string {
  switch (provider) {
    case 'GEMINI':
      return 'deep-research-pro-preview-12-2025'
    case 'OPENAI_QUICK':
      return 'gpt-5-mini'
    case 'OPENAI_STANDARD':
      return 'gpt-5.2'
    case 'OPENAI_DEEP':
      return 'o4-mini-deep-research'
    case 'OPENAI_EXPERT':
      return 'o3-deep-research'
    case 'LANGCHAIN':
      return 'langchain-research'
    default:
      return 'unknown'
  }
}

// Also support GET for Vercel Cron (which uses GET by default)
export async function GET(request: NextRequest) {
  return POST(request)
}

// Route config
export const maxDuration = 60 // 60 seconds max for cron job
export const dynamic = 'force-dynamic'
