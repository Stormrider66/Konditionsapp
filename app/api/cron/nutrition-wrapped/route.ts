/**
 * Nutrition Wrapped Cron Job
 *
 * Runs monthly on the 1st — generates previous month's wrapped for all athletes.
 * On January 1st, also generates yearly wrapped for the previous year.
 *
 * Schedule: 0 6 1 * * (6 AM on the 1st of each month)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNutritionWrapped } from '@/lib/nutrition/wrapped-generator'
import { logger } from '@/lib/logger'

export const maxDuration = 300

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 4
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

interface NutritionWrappedClient {
  id: string
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1-12
  const currentYear = now.getFullYear()

  // Previous month
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const batchLimit = parseBoundedInt(
    request.nextUrl.searchParams.get('limit'),
    DEFAULT_BATCH_LIMIT,
    1,
    500
  )
  const pageSize = parseBoundedInt(
    request.nextUrl.searchParams.get('pageSize'),
    DEFAULT_PAGE_SIZE,
    25,
    500
  )
  const concurrency = parseBoundedInt(
    request.nextUrl.searchParams.get('concurrency'),
    DEFAULT_CONCURRENCY,
    1,
    20
  )
  const executionBudgetMs = parseBoundedInt(
    request.nextUrl.searchParams.get('budgetMs'),
    DEFAULT_EXECUTION_BUDGET_MS,
    30_000,
    DEFAULT_EXECUTION_BUDGET_MS
  )
  const startTime = Date.now()

  try {
    const startDate = new Date(prevMonthYear, prevMonth - 1, 1)
    const endDate = new Date(prevMonthYear, prevMonth, 0, 23, 59, 59)

    logger.info('Nutrition wrapped cron: processing', {
      month: prevMonth,
      year: prevMonthYear,
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
    })

    let scanned = 0
    let processed = 0
    let monthlyGenerated = 0
    let yearlyGenerated = 0
    let errors = 0
    let exhausted = false
    let timedOut = false
    let hasMore = false
    let cursor: string | null = null

    while (processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        timedOut = true
        break
      }

      const clients: NutritionWrappedClient[] = await prisma.client.findMany({
        where: {
          mealLogs: {
            some: {
              date: { gte: startDate, lte: endDate },
            },
          },
        },
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        take: pageSize,
        orderBy: { id: 'asc' },
        select: {
          id: true,
        },
      })

      if (clients.length === 0) {
        exhausted = true
        break
      }

      scanned += clients.length
      cursor = clients[clients.length - 1].id

      const remainingCapacity = batchLimit - processed
      if (clients.length > remainingCapacity) {
        hasMore = true
      }
      const clientsToProcess = clients.slice(0, remainingCapacity)

      for (let i = 0; i < clientsToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          timedOut = true
          break
        }

        const chunk = clientsToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(
          chunk.map((client) =>
            processNutritionWrappedClient(client.id, prevMonthYear, prevMonth, currentMonth, currentYear)
          )
        )

        for (const outcome of outcomes) {
          processed++
          if (outcome.monthlyGenerated) {
            monthlyGenerated++
          }
          if (outcome.yearlyGenerated) {
            yearlyGenerated++
          }
          if (outcome.status === 'error') {
            errors++
          }
        }

        if (processed >= batchLimit) {
          break
        }
      }

      if (timedOut) {
        break
      }

      if (clients.length < pageSize) {
        exhausted = true
        break
      }

      hasMore = true
    }

    return NextResponse.json({
      success: true,
      scanned,
      processed,
      monthlyGenerated,
      yearlyGenerated,
      errors,
      exhausted,
      timedOut,
      hasMore,
    })
  } catch (error) {
    logger.error('Nutrition wrapped cron error', {}, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processNutritionWrappedClient(
  clientId: string,
  prevMonthYear: number,
  prevMonth: number,
  currentMonth: number,
  currentYear: number
): Promise<{
  status: 'success' | 'error'
  monthlyGenerated: boolean
  yearlyGenerated: boolean
}> {
  try {
    const monthly = await generateNutritionWrapped(clientId, 'MONTHLY', prevMonthYear, prevMonth)
    let yearly = null

    if (currentMonth === 1) {
      yearly = await generateNutritionWrapped(clientId, 'YEARLY', currentYear - 1)
    }

    return {
      status: 'success',
      monthlyGenerated: Boolean(monthly),
      yearlyGenerated: Boolean(yearly),
    }
  } catch (error) {
    logger.error('Failed to generate wrapped for client', { clientId }, error)
    return {
      status: 'error',
      monthlyGenerated: false,
      yearlyGenerated: false,
    }
  }
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback

  return Math.min(Math.max(parsed, min), max)
}
