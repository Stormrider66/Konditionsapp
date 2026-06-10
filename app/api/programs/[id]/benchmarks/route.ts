// app/api/programs/[id]/benchmarks/route.ts
//
// Field-test schedule for a training program, consumed by the athlete
// portal's BenchmarkSchedule component. FieldTestSchedule rows are keyed by
// client, so resolve the program -> client and window the schedules to the
// program's date range.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export async function GET(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params
    const program = await prisma.trainingProgram.findUnique({
      where: { id },
      select: { clientId: true, startDate: true, endDate: true },
    })

    if (!program) {
      return NextResponse.json(
        { error: t(locale, 'Program not found', 'Programmet hittades inte') },
        { status: 404 }
      )
    }

    const hasAccess = await canAccessClient(user.id, program.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Access denied', 'Åtkomst nekad') },
        { status: 403 }
      )
    }

    const schedules = await prisma.fieldTestSchedule.findMany({
      where: {
        clientId: program.clientId,
        scheduledDate: { gte: program.startDate, lte: program.endDate },
      },
      orderBy: { scheduledDate: 'asc' },
      select: {
        id: true,
        testType: true,
        scheduledDate: true,
        required: true,
        completed: true,
      },
    })

    const now = Date.now()
    const data = schedules.map(s => ({
      id: s.id,
      testType: s.testType,
      week: Math.max(
        1,
        Math.floor((s.scheduledDate.getTime() - program.startDate.getTime()) / (7 * MS_PER_DAY)) + 1
      ),
      completed: s.completed,
      required: s.required,
      daysUntil: Math.ceil((s.scheduledDate.getTime() - now) / MS_PER_DAY),
      dueDate: s.scheduledDate.toISOString(),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logError('Error fetching program benchmarks', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch benchmarks', 'Kunde inte hämta testschemat') },
      { status: 500 }
    )
  }
}
