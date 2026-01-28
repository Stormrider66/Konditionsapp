// app/api/tests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { performAllCalculations, ManualThresholdOverrides } from '@/lib/calculations'
import type { TestStatus, Threshold, TrainingZone, Test, Client, TestStage } from '@/types'

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

    // Calculate full test data including economyData and dmaxVisualization
    let fullCalculations = null
    if (test.client && test.testStages.length > 0) {
      try {
        // Prepare test with manual overrides
        const testWithOverrides = {
          ...test,
          manualLT1Lactate: test.manualLT1Lactate,
          manualLT1Intensity: test.manualLT1Intensity,
          manualLT2Lactate: test.manualLT2Lactate,
          manualLT2Intensity: test.manualLT2Intensity,
        } as unknown as Test & ManualThresholdOverrides

        fullCalculations = await performAllCalculations(testWithOverrides, test.client as unknown as Client)

        // Auto-save calculated values to database if they differ from stored values
        // This ensures profile page always shows fresh calculations
        if (fullCalculations) {
          const needsUpdate =
            test.vo2max !== fullCalculations.vo2max ||
            test.maxHR !== fullCalculations.maxHR ||
            test.maxLactate !== fullCalculations.maxLactate ||
            JSON.stringify(test.aerobicThreshold) !== JSON.stringify(fullCalculations.aerobicThreshold) ||
            JSON.stringify(test.anaerobicThreshold) !== JSON.stringify(fullCalculations.anaerobicThreshold)

          if (needsUpdate) {
            await prisma.test.update({
              where: { id },
              data: {
                vo2max: fullCalculations.vo2max,
                maxHR: fullCalculations.maxHR,
                maxLactate: fullCalculations.maxLactate,
                aerobicThreshold: fullCalculations.aerobicThreshold as Prisma.InputJsonValue,
                anaerobicThreshold: fullCalculations.anaerobicThreshold as Prisma.InputJsonValue,
                trainingZones: fullCalculations.trainingZones as Prisma.InputJsonValue,
              },
            })
            logger.info('Auto-saved fresh calculations to database', { testId: id })
          }
        }
      } catch (calcError) {
        logger.error('Error calculating test results', {}, calcError)
        // Continue without full calculations - basic data still available
      }
    }

    return NextResponse.json({
      success: true,
      data: test,
      calculations: fullCalculations,
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

    // Build update data using Prisma's UpdateInput type
    const updateData: Prisma.TestUpdateInput = {}

    if (body.status) updateData.status = body.status
    if (body.maxHR !== undefined) updateData.maxHR = body.maxHR
    if (body.maxLactate !== undefined) updateData.maxLactate = body.maxLactate
    if (body.vo2max !== undefined) updateData.vo2max = body.vo2max
    if (body.aerobicThreshold !== undefined) updateData.aerobicThreshold = body.aerobicThreshold
    if (body.anaerobicThreshold !== undefined) updateData.anaerobicThreshold = body.anaerobicThreshold
    if (body.trainingZones !== undefined) updateData.trainingZones = body.trainingZones
    if (body.notes !== undefined) updateData.notes = body.notes

    const test = await prisma.test.update({ where: { id }, data: updateData })

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

    // Build update data using Prisma's UpdateInput type
    const updateData: Prisma.TestUpdateInput = {}

    if (body.testDate !== undefined) updateData.testDate = new Date(body.testDate)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.vo2max !== undefined) updateData.vo2max = body.vo2max
    if (body.maxHR !== undefined) updateData.maxHR = body.maxHR
    if (body.maxLactate !== undefined) updateData.maxLactate = body.maxLactate
    if (body.aerobicThreshold !== undefined) updateData.aerobicThreshold = body.aerobicThreshold
    if (body.anaerobicThreshold !== undefined) updateData.anaerobicThreshold = body.anaerobicThreshold
    if (body.trainingZones !== undefined) updateData.trainingZones = body.trainingZones
    // Manual threshold overrides (set by test leader)
    if (body.manualLT1Lactate !== undefined) updateData.manualLT1Lactate = body.manualLT1Lactate
    if (body.manualLT1Intensity !== undefined) updateData.manualLT1Intensity = body.manualLT1Intensity
    if (body.manualLT2Lactate !== undefined) updateData.manualLT2Lactate = body.manualLT2Lactate
    if (body.manualLT2Intensity !== undefined) updateData.manualLT2Intensity = body.manualLT2Intensity
    // Pre-test baseline measurements
    if (body.restingLactate !== undefined) updateData.restingLactate = body.restingLactate
    if (body.restingHeartRate !== undefined) updateData.restingHeartRate = body.restingHeartRate
    // Post-test measurements (peak lactate)
    if (body.postTestMeasurements !== undefined) updateData.postTestMeasurements = body.postTestMeasurements

    // Delete old test stages if new ones provided
    if (body.stages && Array.isArray(body.stages)) {
      await prisma.testStage.deleteMany({
        where: { testId: id },
      })

      // Create new test stages
      await prisma.testStage.createMany({
        data: body.stages.map((stage: Partial<TestStage>, index: number) => ({
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
      data: updateData,
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
