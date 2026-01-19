import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'

const updateOverrideSchema = z.object({
  monthlyPriceCents: z.number().nullable().optional(),
  yearlyPriceCents: z.number().nullable().optional(),
  maxAthletes: z.number().nullable().optional(),
  aiChatLimit: z.number().nullable().optional(),
  validFrom: z.string().optional().transform((s) => s ? new Date(s) : undefined),
  validUntil: z.string().nullable().optional().transform((s) => s ? new Date(s) : null),
})

// PUT /api/admin/pricing/overrides/[id] - Update a pricing override
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const { id } = await params
    const body = await request.json()
    const data = updateOverrideSchema.parse(body)

    const existing = await prisma.pricingOverride.findUnique({
      where: { id },
    })

    if (!existing) {
      throw ApiError.notFound('Pricing override')
    }

    const override = await prisma.pricingOverride.update({
      where: { id },
      data,
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
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/pricing/overrides/[id]')
  }
}

// DELETE /api/admin/pricing/overrides/[id] - Delete a pricing override
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const { id } = await params

    const existing = await prisma.pricingOverride.findUnique({
      where: { id },
    })

    if (!existing) {
      throw ApiError.notFound('Pricing override')
    }

    await prisma.pricingOverride.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Override deleted',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/pricing/overrides/[id]')
  }
}
