/**
 * Program Generation Polling Cron Job
 *
 * POST /api/cron/poll-program-generation
 *
 * Polls pending program generation sessions and processes them.
 * Should be called every minute by Vercel Cron.
 *
 * Vercel Cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/poll-program-generation",
 *     "schedule": "* * * * *"  // Every minute
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { generateMultiPartProgram, type GenerationContext } from '@/lib/ai/program-generator'

// ============================================
// POST - Poll and Process Pending Sessions
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find pending sessions (not started or stalled)
    const pendingSessions = await prisma.programGenerationSession.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          // Also pick up stalled sessions (started but no progress in 10 minutes)
          {
            status: { in: ['GENERATING_OUTLINE', 'GENERATING_PHASE', 'MERGING'] },
            updatedAt: {
              lt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
            },
          },
        ],
      },
      select: {
        id: true,
        coachId: true,
        athleteContext: true,
        provider: true,
        modelUsed: true,
        retryCount: true,
        status: true,
      },
      take: 5, // Process up to 5 sessions per cron run
    })

    if (pendingSessions.length === 0) {
      return NextResponse.json({
        message: 'No pending sessions to process',
        processedCount: 0,
      })
    }

    const results: Array<{
      sessionId: string
      status: string
      error?: string
    }> = []

    // Process each session
    for (const session of pendingSessions) {
      try {
        // Check retry count
        if (session.retryCount >= 3) {
          await prisma.programGenerationSession.update({
            where: { id: session.id },
            data: {
              status: 'FAILED',
              errorMessage: 'Max retries exceeded',
              errorCode: 'MAX_RETRIES',
              completedAt: new Date(),
            },
          })
          results.push({ sessionId: session.id, status: 'FAILED', error: 'Max retries' })
          continue
        }

        // Get API key for provider
        const apiKeys = await getResolvedAiKeys(session.coachId)
        const provider = (session.provider as 'ANTHROPIC' | 'GOOGLE' | 'OPENAI') || 'ANTHROPIC'

        let apiKey: string | null = null
        switch (provider) {
          case 'ANTHROPIC':
            apiKey = apiKeys.anthropicKey
            break
          case 'GOOGLE':
            apiKey = apiKeys.googleKey
            break
          case 'OPENAI':
            apiKey = apiKeys.openaiKey
            break
        }

        if (!apiKey) {
          await prisma.programGenerationSession.update({
            where: { id: session.id },
            data: {
              status: 'FAILED',
              errorMessage: `No API key configured for ${provider}`,
              errorCode: 'NO_API_KEY',
              completedAt: new Date(),
            },
          })
          results.push({ sessionId: session.id, status: 'FAILED', error: 'No API key' })
          continue
        }

        // Mark as processing
        await prisma.programGenerationSession.update({
          where: { id: session.id },
          data: {
            status: 'GENERATING_OUTLINE',
            startedAt: new Date(),
            retryCount: session.status !== 'PENDING' ? { increment: 1 } : undefined,
            lastRetryAt: session.status !== 'PENDING' ? new Date() : undefined,
          },
        })

        // Start generation (this is async and will take time)
        const context = session.athleteContext as unknown as GenerationContext

        // Run in background - don't await
        generateMultiPartProgram({
          sessionId: session.id,
          context,
          apiKey,
          provider,
          modelId: session.modelUsed || undefined,
        }).catch((error) => {
          console.error(`Program generation failed for session ${session.id}:`, error)
        })

        results.push({ sessionId: session.id, status: 'PROCESSING' })
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error)

        // Increment retry count
        await prisma.programGenerationSession.update({
          where: { id: session.id },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        results.push({
          sessionId: session.id,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${pendingSessions.length} sessions`,
      processedCount: pendingSessions.length,
      results,
    })
  } catch (error) {
    console.error('Error in poll-program-generation cron:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support GET for Vercel Cron (which uses GET by default)
export async function GET(request: NextRequest) {
  return POST(request)
}

// Route config
export const maxDuration = 60 // 60 seconds max for cron job
export const dynamic = 'force-dynamic'
