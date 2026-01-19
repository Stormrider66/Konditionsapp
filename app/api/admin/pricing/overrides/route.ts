import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'

const createOverrideSchema = z.object({
  tierId: z.string().uuid(),
  businessId: z.string().uuid(),
  monthlyPriceCents: z.number().nullable().optional(),
  yearlyPriceCents: z.number().nullable().optional(),
  maxAthletes: z.number().nullable().optional(),
  aiChatLimit: z.number().nullable().optional(),
  validFrom: z.string().optional().transform((s) => s ? new Date(s) : undefined),
  validUntil: z.string().nullable().optional().transform((s) => s ? new Date(s) : null),
})

// GET /api/admin/pricing/overrides - List all pricing overrides
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const tierId = searchParams.get('tierId')

    const where: Record<string, unknown> = {}

    if (businessId) {
      where.businessId = businessId
    }

    if (tierId) {
      where.tierId = tierId
    }

    const overrides = await prisma.pricingOverride.findMany({
      where,
      include: {
        tier: {
          select: {
            id: true,
            tierType: true,
            tierName: true,
            displayName: true,
            monthlyPriceCents: true,
            currency: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: overrides,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/pricing/overrides')
  }
}

// POST /api/admin/pricing/overrides - Create a pricing override
export async function POST(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const body = await request.json()
    const data = createOverrideSchema.parse(body)

    // Check tier exists
    const tier = await prisma.pricingTier.findUnique({
      where: { id: data.tierId },
    })

    if (!tier) {
      throw ApiError.notFound('Pricing tier')
    }

    // Check business exists
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
    })

    if (!business) {
      throw ApiError.notFound('Business')
    }

    // Check for existing override
    const existing = await prisma.pricingOverride.findUnique({
      where: {
        tierId_businessId: {
          tierId: data.tierId,
          businessId: data.businessId,
        },
      },
    })

    if (existing) {
      throw ApiError.conflict('Override already exists for this tier and business')
    }

    const override = await prisma.pricingOverride.create({
      data: {
        tierId: data.tierId,
        businessId: data.businessId,
        monthlyPriceCents: data.monthlyPriceCents ?? null,
        yearlyPriceCents: data.yearlyPriceCents ?? null,
        maxAthletes: data.maxAthletes ?? null,
        aiChatLimit: data.aiChatLimit ?? null,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      },
      include: {
        tier: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: override,
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/pricing/overrides')
  }
}
