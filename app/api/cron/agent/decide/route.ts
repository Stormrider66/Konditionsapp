/**
 * Agent Decision Cron Job
 *
 * Runs decision engine for athletes with recent perceptions.
 * Creates agent actions based on safety rules and recovery needs.
 *
 * Schedule: Every 15 minutes
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { makeDecisions, storeDecisions } from '@/lib/agent/decision/engine'
import { getLatestPerception } from '@/lib/agent/perception'
import { logger } from '@/lib/logger'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    logger.info('Starting agent decision batch')

    // Get clients with recent perceptions that haven't been processed
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    const recentPerceptions = await prisma.agentPerception.findMany({
      where: {
        perceivedAt: { gte: thirtyMinutesAgo },
        // Only get the latest perception per client with valid consent
        client: {
          agentConsent: {
            dataProcessingConsent: true,
            automatedDecisionConsent: true,
          },
        },
      },
      orderBy: { perceivedAt: 'desc' },
      distinct: ['clientId'],
      select: {
        id: true,
        clientId: true,
        readinessScore: true,
        fatigueScore: true,
        acwr: true,
        acwrZone: true,
        hasActiveInjury: true,
        hasRestrictions: true,
        detectedPatterns: true,
      },
      take: 500,
    })

    logger.info('Found perceptions to process', { count: recentPerceptions.length })

    let succeeded = 0
    let failed = 0
    let actionsCreated = 0
    const errors: { clientId: string; error: string }[] = []

    // Process in batches
    const batchSize = 10
    for (let i = 0; i < recentPerceptions.length; i += batchSize) {
      const batch = recentPerceptions.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map(async (perceptionData) => {
          // Get the full perception snapshot from the stored perception
          const perception = await getLatestPerception(perceptionData.clientId)
          if (!perception) {
            throw new Error('Perception not found')
          }
          const result = await makeDecisions(perception)
          await storeDecisions(result, perceptionData.id, perceptionData.clientId)
          return result
        })
      )

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          succeeded++
          actionsCreated += result.value?.length || 0
        } else {
          failed++
          errors.push({
            clientId: batch[index].clientId,
            error: result.reason?.message || 'Unknown error',
          })
        }
      })
    }

    const duration = Date.now() - startTime

    logger.info('Agent decision batch completed', {
      duration: `${duration}ms`,
      total: recentPerceptions.length,
      succeeded,
      failed,
      actionsCreated,
    })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        perceptionsProcessed: recentPerceptions.length,
        succeeded,
        failed,
        actionsCreated,
        errors: errors.slice(0, 10),
      },
    })
  } catch (error) {
    logger.error('Agent decision cron error', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run agent decisions',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
