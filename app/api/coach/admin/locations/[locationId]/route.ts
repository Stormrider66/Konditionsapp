// app/api/coach/admin/locations/[locationId]/route.ts
// Business admin: Single location management

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { z } from 'zod'

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  openingHours: z.record(z.string()).optional().nullable(),
  capabilities: z.array(z.string()).optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.any()).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ locationId: string }>
}

// GET single location details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { locationId } = await params

    const location = await prisma.location.findFirst({
      where: { id: locationId, businessId },
      include: {
        equipment: {
          include: {
            equipment: true
          },
          orderBy: {
            equipment: { category: 'asc' }
          }
        },
        services: {
          orderBy: { serviceType: 'asc' }
        },
        staff: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { isPrimary: 'desc' }
        },
        _count: {
          select: {
            tests: true,
            equipment: true,
            services: true,
            staff: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: location
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

// PUT update location
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { locationId } = await params

    // Verify location belongs to business
    const existing = await prisma.location.findFirst({
      where: { id: locationId, businessId }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = updateLocationSchema.parse(body)

    // If changing to primary, unset other primary locations
    if (data.isPrimary && !existing.isPrimary) {
      await prisma.location.updateMany({
        where: { businessId, isPrimary: true },
        data: { isPrimary: false }
      })
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.location.findFirst({
        where: { businessId, slug: data.slug, NOT: { id: locationId } }
      })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug already exists for another location' },
          { status: 400 }
        )
      }
    }

    // Build update data with proper JSON field handling for Prisma
    const updateData: Prisma.LocationUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.openingHours !== undefined && {
        openingHours: data.openingHours === null
          ? Prisma.JsonNull
          : (data.openingHours as Prisma.InputJsonValue)
      }),
      ...(data.capabilities !== undefined && { capabilities: data.capabilities }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.settings !== undefined && {
        settings: data.settings === null
          ? Prisma.JsonNull
          : (data.settings as Prisma.InputJsonValue)
      }),
    }

    const location = await prisma.location.update({
      where: { id: locationId },
      data: updateData,
      include: {
        _count: {
          select: {
            tests: true,
            equipment: true,
            services: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: location
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

// DELETE location
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { locationId } = await params

    // Verify location belongs to business
    const existing = await prisma.location.findFirst({
      where: { id: locationId, businessId },
      include: { _count: { select: { tests: true } } }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    // Warn if location has tests
    if (existing._count.tests > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete location with ${existing._count.tests} associated tests. Please reassign or delete tests first.`
        },
        { status: 400 }
      )
    }

    await prisma.location.delete({
      where: { id: locationId }
    })

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}
