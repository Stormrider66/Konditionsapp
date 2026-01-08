// app/api/tests/[id]/recalculate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { performAllCalculations, ManualThresholdOverrides } from '@/lib/calculations'
import type { Test, Client } from '@/types'
import { logDebug } from '@/lib/logger-console'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// POST /api/tests/[id]/recalculate - Force recalculation of test thresholds
export async function POST(
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

    if (!test.client || test.testStages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test has no client or test stages',
        },
        { status: 400 }
      )
    }

    logDebug('=== FORCE RECALCULATE ===')
    logDebug('Test ID:', id)
    logDebug('Test stages:', test.testStages.length)

    // Prepare test with manual overrides
    const testWithOverrides = {
      ...test,
      manualLT1Lactate: test.manualLT1Lactate,
      manualLT1Intensity: test.manualLT1Intensity,
      manualLT2Lactate: test.manualLT2Lactate,
      manualLT2Intensity: test.manualLT2Intensity,
    } as unknown as Test & ManualThresholdOverrides

    const calculations = await performAllCalculations(testWithOverrides, test.client as unknown as Client)

    if (!calculations) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to calculate test results',
        },
        { status: 500 }
      )
    }

    logDebug('New calculations:')
    logDebug('  vo2max:', calculations.vo2max)
    logDebug('  maxHR:', calculations.maxHR)
    logDebug('  maxLactate:', calculations.maxLactate)
    logDebug('  aerobicThreshold:', JSON.stringify(calculations.aerobicThreshold))
    logDebug('  anaerobicThreshold:', JSON.stringify(calculations.anaerobicThreshold))

    // Update the test with fresh calculations
    const updatedTest = await prisma.test.update({
      where: { id },
      data: {
        vo2max: calculations.vo2max,
        maxHR: calculations.maxHR,
        maxLactate: calculations.maxLactate,
        aerobicThreshold: calculations.aerobicThreshold as any,
        anaerobicThreshold: calculations.anaerobicThreshold as any,
        trainingZones: calculations.trainingZones as any,
      },
    })

    logDebug('✅ Test updated successfully')
    logger.info('Force recalculated test thresholds', { testId: id })

    return NextResponse.json({
      success: true,
      message: 'Test recalculated successfully',
      data: {
        testId: id,
        vo2max: calculations.vo2max,
        maxHR: calculations.maxHR,
        maxLactate: calculations.maxLactate,
        aerobicThreshold: calculations.aerobicThreshold,
        anaerobicThreshold: calculations.anaerobicThreshold,
      },
    })
  } catch (error) {
    logger.error('Error recalculating test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to recalculate test',
      },
      { status: 500 }
    )
  }
}
