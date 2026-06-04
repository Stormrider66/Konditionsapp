/**
 * API Route: Yearly Training Summary
 *
 * GET - Retrieve yearly training summaries for a client
 *
 * Query params:
 * - clientId: Client ID
 * - year: Specific year (optional, defaults to current year)
 * - count: Number of years to return (default 3)
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { saveYearlySummary, getRecentYearlySummaries } from '@/lib/training/summary-calculator'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function resolveAuthenticatedLocale(request: Request, userId: string): Promise<AppLocale> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true },
  })
  return resolveRequestLocale(request, dbUser?.language)
}

export async function GET(request: Request) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = await resolveAuthenticatedLocale(request, user.id)

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const yearParam = searchParams.get('year')
    const count = parseInt(searchParams.get('count') || '3', 10)

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId is required', 'clientId krävs') },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 })
    }

    // If specific year requested
    if (yearParam) {
      const year = parseInt(yearParam, 10)

      // Check if summary exists
      let summary = await prisma.yearlySummary.findUnique({
        where: {
          clientId_year: { clientId, year },
        },
      })

      // Calculate if not found or outdated (more than 1 day old)
      if (!summary || new Date().getTime() - summary.updatedAt.getTime() > 24 * 60 * 60 * 1000) {
        await saveYearlySummary(clientId, year)
        summary = await prisma.yearlySummary.findUnique({
          where: {
            clientId_year: { clientId, year },
          },
        })
      }

      return NextResponse.json({
        clientId,
        year,
        summary,
      })
    }

    // Return multiple years
    const summaries = await getRecentYearlySummaries(clientId, count)

    // If current year not in summaries, calculate it
    const currentYear = new Date().getFullYear()
    const hasCurrentYear = summaries.some(s => s.year === currentYear)

    if (!hasCurrentYear) {
      try {
        await saveYearlySummary(clientId, currentYear)
        const updatedSummaries = await getRecentYearlySummaries(clientId, count)
        return NextResponse.json({
          clientId,
          summaries: updatedSummaries,
        })
      } catch (error) {
        // Continue with existing summaries if calculation fails
        console.warn('Failed to calculate current year summary:', error)
      }
    }

    return NextResponse.json({
      clientId,
      summaries,
    })
  } catch (error) {
    console.error('Yearly summary API error:', error)
    return NextResponse.json(
      { error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}

/**
 * POST - Force recalculate yearly summary
 */
export async function POST(request: Request) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = await resolveAuthenticatedLocale(request, user.id)

    const body = await request.json()
    const { clientId, year } = body

    if (!clientId || !year) {
      return NextResponse.json(
        { error: t(locale, 'clientId and year are required', 'clientId och year krävs') },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 })
    }

    // Recalculate
    const summaryId = await saveYearlySummary(clientId, year)
    const summary = await prisma.yearlySummary.findUnique({
      where: { id: summaryId },
    })

    return NextResponse.json({
      message: t(locale, 'Yearly summary recalculated', 'Årssammanfattningen räknades om'),
      summary,
    })
  } catch (error) {
    console.error('Yearly summary recalculation error:', error)
    return NextResponse.json(
      { error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}
