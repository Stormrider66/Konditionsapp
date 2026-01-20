import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
})

// GET /api/coach/admin/settings - Get business settings
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        locations: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        enterpriseContract: {
          select: {
            id: true,
            contractNumber: true,
            contractName: true,
            status: true,
            startDate: true,
            endDate: true,
            monthlyFee: true,
            currency: true,
            revenueSharePercent: true,
            athleteLimit: true,
            coachLimit: true,
            billingCycle: true,
            paymentTermDays: true,
            autoRenew: true,
            noticePeriodDays: true,
            customFeatures: true,
          },
        },
      },
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        description: business.description,
        email: business.email,
        phone: business.phone,
        website: business.website,
        address: business.address,
        city: business.city,
        postalCode: business.postalCode,
        country: business.country,
        logoUrl: business.logoUrl,
        primaryColor: business.primaryColor,
        isActive: business.isActive,
        defaultRevenueShare: business.defaultRevenueShare,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
        locations: business.locations,
        contract: business.enterpriseContract,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/settings')
  }
}

// PUT /api/coach/admin/settings - Update business settings
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    // Update business
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        email: validatedData.email,
        phone: validatedData.phone,
        website: validatedData.website,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        logoUrl: validatedData.logoUrl,
        primaryColor: validatedData.primaryColor,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        logoUrl: true,
        primaryColor: true,
        isActive: true,
        defaultRevenueShare: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: business,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/settings')
  }
}
