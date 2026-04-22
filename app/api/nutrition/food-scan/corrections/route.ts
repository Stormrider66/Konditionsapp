/**
 * Food Scan Correction Capture
 *
 * POST /api/nutrition/food-scan/corrections
 *
 * Called by FoodPhotoScanner after /api/meals returns. Records the delta
 * between what the AI proposed and what the user actually saved so later
 * phases (fingerprint cron) can weight corrections higher than passive logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { classifyCorrection, type DiffableItem } from '@/lib/nutrition/classify-correction'

const MAX_ITEMS_PER_SIDE = 50

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const itemSchema = z
  .object({
    name: z.string().min(1),
    estimatedGrams: z.number().finite(),
  })
  .passthrough() // keep extra macro fields — we want them in aiItemsJson for later analysis

const bodySchema = z.object({
  mealLogId: z.string().optional().nullable(),
  aiItems: z.array(itemSchema).min(1).max(MAX_ITEMS_PER_SIDE),
  finalItems: z.array(itemSchema).min(1).max(MAX_ITEMS_PER_SIDE),
  aiConfidence: z.number().min(0).max(1).optional().nullable(),
  wentThroughRefine: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId, user } = resolved

    // Match the rate-limit shape used by /api/ai/food-scan — cheaper endpoint
    // so a slightly higher ceiling is fine.
    const rateLimited = await rateLimitJsonResponse('nutrition:corrections', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const json = await request.json()
    const body = bodySchema.parse(json)

    const aiDiffable: DiffableItem[] = body.aiItems.map((i) => ({
      name: i.name,
      estimatedGrams: i.estimatedGrams,
    }))
    const finalDiffable: DiffableItem[] = body.finalItems.map((i) => ({
      name: i.name,
      estimatedGrams: i.estimatedGrams,
    }))

    const correctionType = classifyCorrection(aiDiffable, finalDiffable)
    if (!correctionType) {
      // Nothing meaningful changed — don't pollute the corrections table.
      return NextResponse.json({ success: true, recorded: false })
    }

    const row = await prisma.foodScanCorrection.create({
      data: {
        clientId,
        mealLogId: body.mealLogId ?? null,
        aiItemsJson: body.aiItems as unknown as Prisma.InputJsonValue,
        finalItemsJson: body.finalItems as unknown as Prisma.InputJsonValue,
        correctionType,
        aiConfidence: body.aiConfidence ?? null,
        wentThroughRefine: body.wentThroughRefine ?? false,
      },
      select: { id: true, correctionType: true },
    })

    return NextResponse.json({ success: true, recorded: true, correction: row })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Food scan correction capture failed', {}, error as Error)
    // Deliberately succeed silently so the user-facing save flow isn't blocked
    // by any correction-capture issue. The meal is already saved by this point.
    return NextResponse.json({ success: true, recorded: false })
  }
}
