// app/api/coach/admin/branding/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { getBrandingFeatures } from '@/lib/branding/feature-gate'
import { CURATED_FONTS } from '@/lib/branding/types'
import { z } from 'zod'

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

const updateBrandingSchema = z.object({
  // Tier 0: always available
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex).optional().nullable(),

  // Tier 1: CUSTOM_BRANDING
  secondaryColor: z.string().regex(hexColorRegex).optional().nullable(),
  backgroundColor: z.string().regex(hexColorRegex).optional().nullable(),
  fontFamily: z.enum(CURATED_FONTS as unknown as [string, ...string[]]).optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),

  // Tier 2: WHITE_LABEL
  emailSenderName: z.string().min(1).max(100).optional().nullable(),
  pageTitle: z.string().min(1).max(100).optional().nullable(),
  hidePlatformBranding: z.boolean().optional(),
})

// GET /api/coach/admin/branding - Get branding settings with feature flags
export async function GET() {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const [business, features] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          backgroundColor: true,
          fontFamily: true,
          faviconUrl: true,
          customDomain: true,
          domainVerified: true,
          domainVerifiedAt: true,
          domainTxtRecord: true,
          emailSenderName: true,
          pageTitle: true,
          hidePlatformBranding: true,
        },
      }),
      getBrandingFeatures(businessId),
    ])

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...business,
        hasCustomBranding: features.hasCustomBranding,
        hasWhiteLabel: features.hasWhiteLabel,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/branding')
  }
}

// PUT /api/coach/admin/branding - Update branding settings
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const body = await request.json()
    const validatedData = updateBrandingSchema.parse(body)

    const features = await getBrandingFeatures(businessId)

    // Build update object, enforcing feature gates
    const updateData: Record<string, unknown> = {}

    // Tier 0: always allowed
    if (validatedData.logoUrl !== undefined) updateData.logoUrl = validatedData.logoUrl
    if (validatedData.primaryColor !== undefined) updateData.primaryColor = validatedData.primaryColor

    // Tier 1: require CUSTOM_BRANDING
    if (validatedData.secondaryColor !== undefined) {
      if (!features.hasCustomBranding) {
        return NextResponse.json(
          { success: false, error: 'Custom Branding feature required for secondary color' },
          { status: 403 }
        )
      }
      updateData.secondaryColor = validatedData.secondaryColor
    }
    if (validatedData.backgroundColor !== undefined) {
      if (!features.hasCustomBranding) {
        return NextResponse.json(
          { success: false, error: 'Custom Branding feature required for background color' },
          { status: 403 }
        )
      }
      updateData.backgroundColor = validatedData.backgroundColor
    }
    if (validatedData.fontFamily !== undefined) {
      if (!features.hasCustomBranding) {
        return NextResponse.json(
          { success: false, error: 'Custom Branding feature required for font family' },
          { status: 403 }
        )
      }
      updateData.fontFamily = validatedData.fontFamily
    }
    if (validatedData.faviconUrl !== undefined) {
      if (!features.hasCustomBranding) {
        return NextResponse.json(
          { success: false, error: 'Custom Branding feature required for favicon' },
          { status: 403 }
        )
      }
      updateData.faviconUrl = validatedData.faviconUrl
    }

    // Tier 2: require WHITE_LABEL
    if (validatedData.emailSenderName !== undefined) {
      if (!features.hasWhiteLabel) {
        return NextResponse.json(
          { success: false, error: 'White Label feature required for custom sender name' },
          { status: 403 }
        )
      }
      updateData.emailSenderName = validatedData.emailSenderName
    }
    if (validatedData.pageTitle !== undefined) {
      if (!features.hasWhiteLabel) {
        return NextResponse.json(
          { success: false, error: 'White Label feature required for custom page title' },
          { status: 403 }
        )
      }
      updateData.pageTitle = validatedData.pageTitle
    }
    if (validatedData.hidePlatformBranding !== undefined) {
      if (!features.hasWhiteLabel) {
        return NextResponse.json(
          { success: false, error: 'White Label feature required for hiding platform branding' },
          { status: 403 }
        )
      }
      updateData.hidePlatformBranding = validatedData.hidePlatformBranding
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        backgroundColor: true,
        fontFamily: true,
        faviconUrl: true,
        emailSenderName: true,
        pageTitle: true,
        hidePlatformBranding: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: business,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/branding')
  }
}
