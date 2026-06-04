// app/api/field-tests/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const scheduleTestSchema = z.object({
  clientId: z.string().uuid(),
  testType: z.enum([
    '30MIN_TT',
    '20MIN_TT',
    'HR_DRIFT',
    'CRITICAL_VELOCITY',
    'TALK_TEST',
    'RACE_BASED',
  ]),
  scheduledDate: z.string().datetime(),
  required: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const validatedData = scheduleTestSchema.parse(body)

    // Check if coach can access this client
    const hasAccess = await canAccessClient(user.id, validatedData.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Access denied for this client', 'Åtkomst nekad till denna klient') },
        { status: 403 }
      )
    }

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
      select: { id: true, name: true },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found', 'Klienten hittades inte') },
        { status: 404 }
      )
    }

    const scheduledDate = new Date(validatedData.scheduledDate)

    // Check for existing test on same date
    const existingSchedule = await prisma.fieldTestSchedule.findFirst({
      where: {
        clientId: validatedData.clientId,
        testType: validatedData.testType,
        scheduledDate: {
          gte: new Date(scheduledDate.setHours(0, 0, 0, 0)),
          lt: new Date(scheduledDate.setHours(23, 59, 59, 999)),
        },
      },
    })

    if (existingSchedule) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'There is already a scheduled test of this type for this date',
            'Det finns redan ett schemalagt test av denna typ för detta datum'
          ),
        },
        { status: 400 }
      )
    }

    // Create the scheduled test
    const schedule = await prisma.fieldTestSchedule.create({
      data: {
        clientId: validatedData.clientId,
        testType: validatedData.testType,
        scheduledDate: new Date(validatedData.scheduledDate),
        required: validatedData.required,
        notes: validatedData.notes || null,
      },
    })

    return NextResponse.json({
      success: true,
      schedule: {
        id: schedule.id,
        testType: schedule.testType,
        scheduledDate: schedule.scheduledDate,
        required: schedule.required,
        notes: schedule.notes,
      },
      message: t(locale, 'Test scheduled', 'Testet har schemalagts'),
    })
  } catch (error) {
    logError('Error scheduling field test:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid data', 'Ogiltig data'),
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: t(locale, 'Could not schedule the test', 'Kunde inte schemalägga testet') },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'clientId is required', 'clientId krävs') },
        { status: 400 }
      )
    }

    // Check if coach can access this client
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Access denied', 'Åtkomst nekad') },
        { status: 403 }
      )
    }

    const schedules = await prisma.fieldTestSchedule.findMany({
      where: {
        clientId,
        completed: false,
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      schedules,
    })
  } catch (error) {
    logError('Error fetching scheduled tests:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not fetch scheduled tests', 'Kunde inte hämta schemalagda tester') },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
