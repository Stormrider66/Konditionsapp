import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

// Validation schema for creating a business
const createBusinessSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(2000).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(10).default('SE'),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  defaultRevenueShare: z.number().min(0).max(100).optional(),
  isActive: z.boolean().default(true),
  settings: z.record(z.unknown()).optional().nullable(),
})

// GET /api/admin/businesses - List all businesses
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const hasContract = searchParams.get('hasContract')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}

    if (!includeInactive) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (hasContract === 'false') {
      where.enterpriseContract = null
    } else if (hasContract === 'true') {
      where.enterpriseContract = { isNot: null }
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          website: true,
          city: true,
          isActive: true,
          createdAt: true,
          enterpriseContract: {
            select: {
              id: true,
              contractNumber: true,
              status: true,
            },
          },
          _count: {
            select: {
              members: true,
              locations: true,
              athleteSubscriptions: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.business.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        businesses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/businesses')
  }
}

// POST /api/admin/businesses - Create a new business
export async function POST(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const body = await request.json()
    const validatedData = createBusinessSchema.parse(body)

    // Generate slug if not provided
    let slug = validatedData.slug
    if (!slug) {
      slug = validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    // Check if slug is unique
    const existingBusiness = await prisma.business.findUnique({
      where: { slug },
    })

    if (existingBusiness) {
      // Append a random suffix to make it unique
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Build create data, handling JSON fields specially for Prisma
    const { settings, ...restData } = validatedData
    const createData: Prisma.BusinessCreateInput = {
      ...restData,
      slug,
      ...(settings !== undefined && {
        settings: settings === null
          ? Prisma.JsonNull
          : (settings as Prisma.InputJsonValue),
      }),
    }

    const business = await prisma.business.create({
      data: createData,
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
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/businesses')
  }
}
