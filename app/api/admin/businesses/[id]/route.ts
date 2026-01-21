import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

// Validation schema for updating a business
const updateBusinessSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(2000).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(10).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  defaultRevenueShare: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.unknown()).optional().nullable(),
})

// GET /api/admin/businesses/[id] - Get single business with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])
    const { id } = await params

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        locations: {
          select: {
            id: true,
            name: true,
            city: true,
            isActive: true,
            totalTests: true,
          },
          orderBy: { name: 'asc' },
        },
        enterpriseContract: {
          select: {
            id: true,
            contractNumber: true,
            contractName: true,
            status: true,
            monthlyFee: true,
            currency: true,
            startDate: true,
            endDate: true,
          },
        },
        _count: {
          select: {
            members: true,
            locations: true,
            testers: true,
            athleteSubscriptions: true,
            apiKeys: true,
          },
        },
      },
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found',
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: business,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/businesses/[id]')
  }
}

// PUT /api/admin/businesses/[id] - Update business
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id } = await params

    const body = await request.json()
    const validatedData = updateBusinessSchema.parse(body)

    // Check if business exists
    const existingBusiness = await prisma.business.findUnique({
      where: { id },
    })

    if (!existingBusiness) {
      return NextResponse.json({
        success: false,
        error: 'Business not found',
      }, { status: 404 })
    }

    // If slug is being changed, check uniqueness
    if (validatedData.slug && validatedData.slug !== existingBusiness.slug) {
      const slugExists = await prisma.business.findFirst({
        where: {
          slug: validatedData.slug,
          id: { not: id },
        },
      })

      if (slugExists) {
        return NextResponse.json({
          success: false,
          error: 'Slug is already in use',
        }, { status: 400 })
      }
    }

    // Build update data, handling JSON fields specially for Prisma
    const { settings, ...restData } = validatedData
    const updateData: Prisma.BusinessUpdateInput = {
      ...restData,
      ...(settings !== undefined && {
        settings: settings === null
          ? Prisma.JsonNull
          : (settings as Prisma.InputJsonValue),
      }),
    }

    const business = await prisma.business.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            members: true,
            locations: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: business,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/businesses/[id]')
  }
}

// DELETE /api/admin/businesses/[id] - Delete business (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only SUPER_ADMIN can delete businesses
    await requireAdminRole(['SUPER_ADMIN'])
    const { id } = await params

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    // Check if business exists
    const existingBusiness = await prisma.business.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            athleteSubscriptions: true,
          },
        },
      },
    })

    if (!existingBusiness) {
      return NextResponse.json({
        success: false,
        error: 'Business not found',
      }, { status: 404 })
    }

    if (hardDelete) {
      // Check for active relations before hard delete
      if (existingBusiness._count.members > 0 || existingBusiness._count.athleteSubscriptions > 0) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete business with active members or subscriptions. Remove them first or use soft delete.',
        }, { status: 400 })
      }

      await prisma.business.delete({
        where: { id },
      })

      return NextResponse.json({
        success: true,
        message: 'Business permanently deleted',
      })
    } else {
      // Soft delete - just deactivate
      await prisma.business.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        success: true,
        message: 'Business deactivated',
      })
    }
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/businesses/[id]')
  }
}
