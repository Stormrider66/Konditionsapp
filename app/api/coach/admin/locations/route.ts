// app/api/coach/admin/locations/route.ts
// Business admin: Manage locations

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { z } from 'zod'

const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingHours: z.record(z.string()).optional(),
  isPrimary: z.boolean().default(false),
})

// GET all locations for the business
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const locations = await prisma.location.findMany({
      where: { businessId },
      include: {
        equipment: {
          include: {
            equipment: true
          }
        },
        services: true,
        staff: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            tests: true,
            equipment: true,
            services: true,
            staff: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: locations
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

// POST create a new location
export async function POST(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const body = await request.json()
    const data = createLocationSchema.parse(body)

    // Generate slug if not provided
    let slug = data.slug
    if (!slug && data.name) {
      slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    // Check if slug is unique within business
    if (slug) {
      const existing = await prisma.location.findFirst({
        where: { businessId, slug }
      })
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`
      }
    }

    // If this is primary, unset other primary locations
    if (data.isPrimary) {
      await prisma.location.updateMany({
        where: { businessId, isPrimary: true },
        data: { isPrimary: false }
      })
    }

    const location = await prisma.location.create({
      data: {
        businessId,
        name: data.name,
        slug,
        city: data.city,
        address: data.address,
        postalCode: data.postalCode,
        phone: data.phone,
        email: data.email || null,
        latitude: data.latitude,
        longitude: data.longitude,
        openingHours: data.openingHours,
        isPrimary: data.isPrimary,
        capabilities: [],
      },
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
    console.error('Error creating location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
