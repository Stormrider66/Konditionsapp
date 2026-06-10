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
import { verifyCronAuth } from '@/lib/api/cron-auth'
import { prisma } from '@/lib/prisma'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { generateMultiPartProgram, type GenerationContext } from '@/lib/ai/program-generator'
import { getAiAllowanceStatus, hasAiAllowanceRemaining } from '@/lib/ai/billing/allowance'
import { AI_ALLOWANCE_MINIMUM_REMAINING_SEK } from '@/lib/ai/billing/require-ai-allowance'

// ============================================
// POST - Poll and Process Pending Sessions
// ============================================

export async function POST(request: NextRequest) {
  try {
    const authError = verifyCronAuth(request)
    if (authError) return authError

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
        athleteId: true,
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

        // Re-check the athlete's AI allowance at execution time. Creation
        // gates it too, but allowance can drain between request and pickup,
        // and a multi-part generation is the most expensive AI call there
        // is. Fail terminally — a blocked PENDING session would otherwise
        // occupy one of the 5 per-run slots forever.
        if (session.athleteId) {
          const { account, remainingSek } = await getAiAllowanceStatus(session.athleteId)
          if (
            account.status !== 'ACTIVE' ||
            !hasAiAllowanceRemaining(account) ||
            remainingSek < AI_ALLOWANCE_MINIMUM_REMAINING_SEK.longRunning
          ) {
            await prisma.programGenerationSession.update({
              where: { id: session.id },
              data: {
                status: 'FAILED',
                errorMessage: 'AI allowance exhausted',
                errorCode: 'AI_ALLOWANCE_EXHAUSTED',
                completedAt: new Date(),
              },
            })
            results.push({ sessionId: session.id, status: 'FAILED', error: 'AI allowance exhausted' })
            continue
          }
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
