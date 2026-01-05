// app/api/field-tests/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
  try {
    const user = await requireCoach()

    const body = await request.json()
    const validatedData = scheduleTestSchema.parse(body)

    // Check if coach can access this client
    const hasAccess = await canAccessClient(user.id, validatedData.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Åtkomst nekad till denna klient' },
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
        { success: false, error: 'Klienten hittades inte' },
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
          error: 'Det finns redan ett schemalagt test av denna typ för detta datum',
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
      message: 'Testet har schemalagts',
    })
  } catch (error) {
    console.error('Error scheduling field test:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ogiltig data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Kunde inte schemalägga testet' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId krävs' },
        { status: 400 }
      )
    }

    // Check if coach can access this client
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Åtkomst nekad' },
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
    console.error('Error fetching scheduled tests:', error)
    return NextResponse.json(
      { success: false, error: 'Kunde inte hämta schemalagda tester' },
      { status: 500 }
    )
  }
}
