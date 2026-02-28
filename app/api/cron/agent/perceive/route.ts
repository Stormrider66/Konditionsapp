/**
 * Agent Perception Cron Job
 *
 * Runs perception for all athletes with agent enabled.
 * Creates perception snapshots that drive agent decisions.
 *
 * Schedule: Every 30 minutes
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPerception, storePerception } from '@/lib/agent/perception'
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
    logger.info('Starting agent perception batch')

    // Get all athletes with agent enabled and required consents
    const eligibleClients = await prisma.client.findMany({
      where: {
        agentConsent: {
          dataProcessingConsent: true,
          healthDataProcessingConsent: true,
        },
        agentPreferences: {
          isNot: null,
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 500, // Batch limit
    })

    logger.info('Found eligible clients for perception', { count: eligibleClients.length })

    let succeeded = 0
    let failed = 0
    const errors: { clientId: string; error: string }[] = []

    // Process in batches of 10 to avoid overwhelming the system
    const batchSize = 10
    for (let i = 0; i < eligibleClients.length; i += batchSize) {
      const batch = eligibleClients.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map(async (client) => {
          const perception = await createPerception(client.id)
          await storePerception(perception)
          return perception
        })
      )

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          succeeded++
        } else {
          failed++
          const error = result.status === 'rejected' ? result.reason?.message : 'Unknown error'
          errors.push({
            clientId: batch[index].id,
            error,
          })
        }
      })
    }

    const duration = Date.now() - startTime

    logger.info('Agent perception batch completed', {
      duration: `${duration}ms`,
      total: eligibleClients.length,
      succeeded,
      failed,
    })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        total: eligibleClients.length,
        succeeded,
        failed,
        errors: errors.slice(0, 10), // Limit errors in response
      },
    })
  } catch (error) {
    logger.error('Agent perception cron error', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run agent perception',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
