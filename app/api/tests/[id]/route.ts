// app/api/tests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { performAllCalculations, ManualThresholdOverrides } from '@/lib/calculations'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { triggerTrialAfterTest } from '@/lib/subscription/trial-trigger'
import { testStageApiSchema, detectLactateDecreases } from '@/lib/validations/schemas'
import type { Test, Client } from '@/types'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import {
  buildManualThresholdCoachDecisionData,
  detectManualThresholdChange,
  hasManualThresholdInput,
  mergeManualThresholdSources,
  THRESHOLD_DECISION_REASON_CATEGORIES,
} from '@/lib/coach/manual-threshold-decision'
import { buildTestQualityReviewUpdate } from '@/lib/testing/test-quality-review'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const thresholdDecisionReasonSchema = z.object({
  thresholdDecisionReasonCategory: z
    .enum(THRESHOLD_DECISION_REASON_CATEGORIES)
    .default('COACH_INTUITION'),
  thresholdDecisionReason: z.string().trim().min(3),
})

// GET /api/tests/[id] - Hämta specifikt test med stages
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const locale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        testStages: { orderBy: { sequence: "asc" } },
        client: true,
      },
    })

    if (!test || !(await canAccessClient(user.id, test.clientId))) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Test not found', 'Testet hittades inte'),
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
                aerobicThreshold: fullCalculations.aerobicThreshold as unknown as Prisma.InputJsonValue,
                anaerobicThreshold: fullCalculations.anaerobicThreshold as unknown as Prisma.InputJsonValue,
                trainingZones: fullCalculations.trainingZones as unknown as Prisma.InputJsonValue,
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
        error: t(locale, 'Failed to fetch test', 'Kunde inte hämta testet'),
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
  const locale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Check ownership before updating
    const existingTest = await prisma.test.findUnique({
      where: { id },
      select: { clientId: true },
    })

    const canModify = existingTest
      ? (await canAccessCoachPlatform(user.id)) && (await canAccessClient(user.id, existingTest.clientId))
      : false

    if (!existingTest || !canModify) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Test not found or unauthorized', 'Testet hittades inte eller saknar behörighet'),
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

    // Trigger trial for FREE athletes after test completion
    if (body.status === 'COMPLETED' && existingTest.clientId) {
      triggerTrialAfterTest(existingTest.clientId).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: test,
      message: t(locale, 'Test updated successfully', 'Testet uppdaterades'),
    })
  } catch (error) {
    logger.error('Error updating test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to update test', 'Kunde inte uppdatera testet'),
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
  const locale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Check ownership before updating
    const existingTest = await prisma.test.findUnique({
      where: { id },
      select: {
        clientId: true,
        testType: true,
        testDate: true,
        aerobicThreshold: true,
        anaerobicThreshold: true,
        manualLT1Lactate: true,
        manualLT1Intensity: true,
        manualLT2Lactate: true,
        manualLT2Intensity: true,
        testStages: {
          select: { lactate: true },
          orderBy: { sequence: 'asc' },
        },
      },
    })

    const canModify = existingTest
      ? (await canAccessCoachPlatform(user.id)) && (await canAccessClient(user.id, existingTest.clientId))
      : false

    if (!existingTest || !canModify) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Test not found or unauthorized', 'Testet hittades inte eller saknar behörighet'),
        },
        { status: 404 }
      )
    }

    const manualThresholdChange = hasManualThresholdInput(body)
      ? detectManualThresholdChange(
          existingTest,
          mergeManualThresholdSources(existingTest, body)
        )
      : null

    const thresholdDecisionInput = manualThresholdChange
      ? thresholdDecisionReasonSchema.safeParse({
          thresholdDecisionReasonCategory: body.thresholdDecisionReasonCategory,
          thresholdDecisionReason: body.thresholdDecisionReason,
        })
      : null

    if (thresholdDecisionInput && !thresholdDecisionInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'A reason is required when manual LT1/LT2 thresholds are changed',
            'En motivering krävs när manuella LT1/LT2-trösklar ändras'
          ),
          details: thresholdDecisionInput.error.errors,
        },
        { status: 400 }
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

    // Replace test stages if new ones provided. Stages were previously
    // written unvalidated; enforce the same per-stage schema as the create
    // route and surface lactate-curve warnings the same way.
    const warnings: Array<{ type: string; severity: string; message: string; details: unknown }> = []
    if (body.stages && Array.isArray(body.stages)) {
      // JSON payloads use null for "not provided"; the stage schema models
      // optional fields as undefined, so strip nulls before validating.
      const normalizedStages = body.stages.map((stage: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(stage ?? {}).filter(([, value]) => value !== null))
      )
      const stagesValidation = z.array(testStageApiSchema).min(1).safeParse(normalizedStages)
      if (!stagesValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: t(locale, 'Invalid test stage data', 'Ogiltiga teststegsdata'),
            details: stagesValidation.error.errors,
          },
          { status: 400 }
        )
      }
      const stages = stagesValidation.data

      const lactateDrops = detectLactateDecreases(stages)
      warnings.push(
        ...lactateDrops.map((drop) => ({
          type: 'LACTATE_DROP',
          severity: 'warning',
          message: locale === 'sv'
            ? `Laktat sjönk med ${drop.drop} mmol/L från steg ${drop.fromStage} till steg ${drop.toStage}. Testet sparades ändå, men kontrollera värdet innan du använder rapporten skarpt.`
            : `Lactate dropped by ${drop.drop} mmol/L from stage ${drop.fromStage} to stage ${drop.toStage}. The test was still saved, but check the value before using the report.`,
          details: drop,
        }))
      )

      // Replace atomically — a failed insert must not leave the test stageless
      await prisma.$transaction([
        prisma.testStage.deleteMany({
          where: { testId: id },
        }),
        prisma.testStage.createMany({
          data: stages.map((stage, index) => ({
            testId: id,
            sequence: index,
            duration: stage.duration,
            heartRate: stage.heartRate,
            lactate: stage.lactate,
            vo2: stage.vo2 ?? null,
            speed: stage.speed ?? null,
            incline: stage.incline ?? null,
            power: stage.power ?? null,
            cadence: stage.cadence ?? null,
            pace: stage.pace ?? null,
            rer: stage.rer ?? null,
            ve: stage.ve ?? null,
            vco2: stage.vco2 ?? null,
            fatPercent: stage.fatPercent ?? null,
            choPercent: stage.choPercent ?? null,
            respiratoryRate: stage.respiratoryRate ?? null,
          })),
        }),
      ])
    } else if (manualThresholdChange && existingTest.testStages.length > 0) {
      const lactateDrops = detectLactateDecreases(existingTest.testStages)
      warnings.push(
        ...lactateDrops.map((drop) => ({
          type: 'LACTATE_DROP',
          severity: 'warning',
          message: locale === 'sv'
            ? `Laktat sjönk med ${drop.drop} mmol/L från steg ${drop.fromStage} till steg ${drop.toStage}. Testet sparades ändå, men kontrollera värdet innan du använder rapporten skarpt.`
            : `Lactate dropped by ${drop.drop} mmol/L from stage ${drop.fromStage} to stage ${drop.toStage}. The test was still saved, but check the value before using the report.`,
          details: drop,
        }))
      )
    }

    if ((body.stages && Array.isArray(body.stages)) || manualThresholdChange) {
      Object.assign(updateData, buildTestQualityReviewUpdate(warnings))
    }

    const testUpdateArgs = {
      where: { id },
      data: updateData,
      include: {
        testStages: { orderBy: { sequence: 'asc' as const } },
        client: true,
      },
    } satisfies Prisma.TestUpdateArgs

    let test
    if (manualThresholdChange && thresholdDecisionInput?.success) {
      const [updatedTest] = await prisma.$transaction([
        prisma.test.update(testUpdateArgs),
        prisma.coachDecision.create({
          data: buildManualThresholdCoachDecisionData({
            coachId: user.id,
            athleteId: existingTest.clientId,
            testId: id,
            testType: existingTest.testType,
            testDate: existingTest.testDate,
            change: manualThresholdChange,
            reasonCategory: thresholdDecisionInput.data.thresholdDecisionReasonCategory,
            reasonNotes: thresholdDecisionInput.data.thresholdDecisionReason,
            calculatedThresholds: {
              aerobicThreshold: existingTest.aerobicThreshold,
              anaerobicThreshold: existingTest.anaerobicThreshold,
            },
          }),
        }),
      ])
      test = updatedTest
    } else {
      test = await prisma.test.update(testUpdateArgs)
    }

    // Recalculate thresholds/zones if stages were updated
    if (body.stages && Array.isArray(body.stages) && test.client && test.testStages.length >= 3) {
      try {
        const testForCalc = {
          ...test,
          manualLT1Lactate: test.manualLT1Lactate,
          manualLT1Intensity: test.manualLT1Intensity,
          manualLT2Lactate: test.manualLT2Lactate,
          manualLT2Intensity: test.manualLT2Intensity,
        } as unknown as Test & ManualThresholdOverrides

        const calculations = await performAllCalculations(testForCalc, test.client as unknown as Client)

        test = await prisma.test.update({
          where: { id },
          data: {
            vo2max: calculations.vo2max,
            maxHR: calculations.maxHR,
            maxLactate: calculations.maxLactate,
            aerobicThreshold: calculations.aerobicThreshold as unknown as Prisma.InputJsonValue,
            anaerobicThreshold: calculations.anaerobicThreshold as unknown as Prisma.InputJsonValue,
            trainingZones: calculations.trainingZones as unknown as Prisma.InputJsonValue,
          },
          include: {
            testStages: { orderBy: { sequence: 'asc' } },
            client: true,
          },
        })

        logger.info('Recalculated test after stage edit', { testId: id })
      } catch (calcError) {
        logger.warn('Could not recalculate after stage edit', { testId: id, error: calcError })
      }
    }

    return NextResponse.json({
      success: true,
      data: test,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: t(locale, 'Test updated successfully', 'Testet uppdaterades'),
    })
  } catch (error) {
    logger.error('Error updating test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to update test', 'Kunde inte uppdatera testet'),
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
  const locale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check ownership before deleting
    const existingTest = await prisma.test.findUnique({
      where: { id },
      select: { clientId: true },
    })

    const canModify = existingTest
      ? (await canAccessCoachPlatform(user.id)) && (await canAccessClient(user.id, existingTest.clientId))
      : false

    if (!existingTest || !canModify) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Test not found or unauthorized', 'Testet hittades inte eller saknar behörighet'),
        },
        { status: 404 }
      )
    }

    await prisma.test.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: t(locale, 'Test deleted successfully', 'Testet raderades'),
    })
  } catch (error) {
    logger.error('Error deleting test', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to delete test', 'Kunde inte radera testet'),
      },
      { status: 500 }
    )
  }
}
