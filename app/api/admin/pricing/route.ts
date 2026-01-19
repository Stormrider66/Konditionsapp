import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

const createTierSchema = z.object({
  tierType: z.enum(['COACH', 'ATHLETE']),
  tierName: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  features: z.array(z.string()),
  monthlyPriceCents: z.number().min(0),
  yearlyPriceCents: z.number().optional(),
  currency: z.string().default('SEK'),
  maxAthletes: z.number().default(0),
  aiChatLimit: z.number().default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
})

// GET /api/admin/pricing - List all pricing tiers
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { searchParams } = new URL(request.url)
    const tierType = searchParams.get('tierType')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}

    if (tierType) {
      where.tierType = tierType
    }

    if (!includeInactive) {
      where.isActive = true
    }

    const tiers = await prisma.pricingTier.findMany({
      where,
      orderBy: [{ tierType: 'asc' }, { sortOrder: 'asc' }],
      include: {
        _count: {
          select: { overrides: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: tiers,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/pricing')
  }
}

// POST /api/admin/pricing - Create a new pricing tier
export async function POST(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const body = await request.json()
    const data = createTierSchema.parse(body)

    const tier = await prisma.pricingTier.create({
      data: {
        ...data,
        features: data.features,
      },
    })

    return NextResponse.json({
      success: true,
      data: tier,
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/pricing')
  }
}
