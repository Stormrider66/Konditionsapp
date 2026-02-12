/**
 * Business ELITE Pricing Settings API
 *
 * GET /api/business/[id]/elite-pricing - Get current ELITE pricing config
 * PUT /api/business/[id]/elite-pricing - Set/update ELITE pricing
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'

type RouteParams = {
  params: Promise<{ id: string }>
}

const elitePricingSchema = z.object({
  elitePriceMonthly: z.number().positive('Monthly price must be positive').nullable(),
  elitePriceYearly: z.number().positive('Yearly price must be positive').nullable().optional(),
  eliteDescription: z.string().max(1000).nullable().optional(),
}).refine(
  (data) => {
    if (data.elitePriceMonthly && data.elitePriceYearly) {
      return data.elitePriceYearly < data.elitePriceMonthly * 12
    }
    return true
  },
  { message: 'Yearly price must be less than 12x monthly (should be a discount)', path: ['elitePriceYearly'] }
)

async function requireBusinessOwnerOrAdmin(userId: string, businessId: string) {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  })
  return membership
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id: businessId } = await params

    const membership = await requireBusinessOwnerOrAdmin(user.id, businessId)
    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        elitePriceMonthly: true,
        elitePriceYearly: true,
        eliteDescription: true,
      },
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json({
      elitePriceMonthly: business.elitePriceMonthly ? business.elitePriceMonthly / 100 : null, // öre → kr
      elitePriceYearly: business.elitePriceYearly ? business.elitePriceYearly / 100 : null,
      eliteDescription: business.eliteDescription,
      enabled: business.elitePriceMonthly !== null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Get ELITE pricing error', {}, error)
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id: businessId } = await params

    const membership = await requireBusinessOwnerOrAdmin(user.id, businessId)
    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const data = elitePricingSchema.parse(body)

    await prisma.business.update({
      where: { id: businessId },
      data: {
        elitePriceMonthly: data.elitePriceMonthly ? Math.round(data.elitePriceMonthly * 100) : null, // kr → öre
        elitePriceYearly: data.elitePriceYearly ? Math.round(data.elitePriceYearly * 100) : null,
        eliteDescription: data.eliteDescription ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Update ELITE pricing error', {}, error)
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
  }
}
