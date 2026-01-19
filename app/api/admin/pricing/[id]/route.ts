import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'

const updateTierSchema = z.object({
  tierName: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  features: z.array(z.string()).optional(),
  monthlyPriceCents: z.number().min(0).optional(),
  yearlyPriceCents: z.number().nullable().optional(),
  currency: z.string().optional(),
  stripeProductId: z.string().nullable().optional(),
  stripePriceIdMonthly: z.string().nullable().optional(),
  stripePriceIdYearly: z.string().nullable().optional(),
  maxAthletes: z.number().optional(),
  aiChatLimit: z.number().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

// GET /api/admin/pricing/[id] - Get single pricing tier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { id } = await params

    const tier = await prisma.pricingTier.findUnique({
      where: { id },
      include: {
        overrides: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    if (!tier) {
      throw ApiError.notFound('Pricing tier')
    }

    return NextResponse.json({
      success: true,
      data: tier,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/pricing/[id]')
  }
}

// PUT /api/admin/pricing/[id] - Update pricing tier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const { id } = await params
    const body = await request.json()
    const data = updateTierSchema.parse(body)

    const existingTier = await prisma.pricingTier.findUnique({
      where: { id },
    })

    if (!existingTier) {
      throw ApiError.notFound('Pricing tier')
    }

    const tier = await prisma.pricingTier.update({
      where: { id },
      data: {
        ...data,
        features: data.features !== undefined
          ? data.features as Prisma.InputJsonValue
          : existingTier.features !== null
            ? existingTier.features as Prisma.InputJsonValue
            : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      data: tier,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/pricing/[id]')
  }
}
