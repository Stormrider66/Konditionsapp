// app/api/tests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { TestStatus, Threshold, TrainingZone } from '@/types'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// GET /api/tests/[id] - Hämta specifikt test med stages
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const test = await prisma.test.findUnique({
      where: { id, userId: user.id },
      include: {
        testStages: { orderBy: { sequence: "asc" } },
        client: true,
      },
    })

    if (!test) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: test,
    })
  } catch (error) {
    logger.error('Error fetching test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch test',
      },
      { status: 500 }
    )
  }
}

// PUT /api/tests/[id] - Uppdatera test (för att spara beräkningsresultat)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Check ownership before updating
    const existingTest = await prisma.test.findUnique({
      where: { id },
    })

    if (!existingTest || existingTest.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test not found or unauthorized',
        },
        { status: 404 }
      )
    }

    // Build update data - cast as 'any' to work with Prisma JSON fields
    const updateData: Record<string, any> = {}

    if (body.status) updateData.status = body.status
    if (body.maxHR !== undefined) updateData.maxHR = body.maxHR
    if (body.maxLactate !== undefined) updateData.maxLactate = body.maxLactate
    if (body.vo2max !== undefined) updateData.vo2max = body.vo2max
    if (body.aerobicThreshold !== undefined) updateData.aerobicThreshold = body.aerobicThreshold
    if (body.anaerobicThreshold !== undefined) updateData.anaerobicThreshold = body.anaerobicThreshold
    if (body.trainingZones !== undefined) updateData.trainingZones = body.trainingZones
    if (body.notes !== undefined) updateData.notes = body.notes

    const test = await prisma.test.update({ where: { id }, data: updateData as any })

    return NextResponse.json({
      success: true,
      data: test,
      message: 'Test updated successfully',
    })
  } catch (error) {
    logger.error('Error updating test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update test',
      },
      { status: 500 }
    )
  }
}

// PATCH /api/tests/[id] - Update test stages and recalculate (for editing)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Check ownership before updating
    const existingTest = await prisma.test.findUnique({
      where: { id },
    })

    if (!existingTest || existingTest.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test not found or unauthorized',
        },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, any> = {}

    if (body.testDate !== undefined) updateData.testDate = new Date(body.testDate)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.vo2max !== undefined) updateData.vo2max = body.vo2max
    if (body.maxHR !== undefined) updateData.maxHR = body.maxHR
    if (body.maxLactate !== undefined) updateData.maxLactate = body.maxLactate
    if (body.aerobicThreshold !== undefined) updateData.aerobicThreshold = body.aerobicThreshold
    if (body.anaerobicThreshold !== undefined) updateData.anaerobicThreshold = body.anaerobicThreshold
    if (body.trainingZones !== undefined) updateData.trainingZones = body.trainingZones

    // Delete old test stages if new ones provided
    if (body.stages && Array.isArray(body.stages)) {
      await prisma.testStage.deleteMany({
        where: { testId: id },
      })

      // Create new test stages
      await prisma.testStage.createMany({
        data: body.stages.map((stage: any, index: number) => ({
          testId: id,
          sequence: index,
          duration: stage.duration,
          heartRate: stage.heartRate,
          lactate: stage.lactate,
          vo2: stage.vo2 || null,
          speed: stage.speed || null,
          incline: stage.incline || null,
          power: stage.power || null,
          cadence: stage.cadence || null,
        })),
      })
    }

    // Update test with calculations
    const test = await prisma.test.update({
      where: { id },
      data: updateData as any,
      include: {
        testStages: { orderBy: { sequence: 'asc' } },
        client: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: test,
      message: 'Test updated successfully',
    })
  } catch (error) {
    logger.error('Error updating test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update test',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/tests/[id] - Ta bort test
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check ownership before deleting
    const existingTest = await prisma.test.findUnique({
      where: { id },
    })

    if (!existingTest || existingTest.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test not found or unauthorized',
        },
        { status: 404 }
      )
    }

    await prisma.test.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Test deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete test',
      },
      { status: 500 }
    )
  }
}
