// app/api/coach/admin/branding/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { getBrandingFeatures } from '@/lib/branding/feature-gate'
import { CURATED_FONTS } from '@/lib/branding/types'
import { sendReplyToVerificationEmail } from '@/lib/email/reply-to-verification'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
const publicAssetPathRegex = /^\/(?!\/)[A-Za-z0-9._~/-]+$/
const urlOrPublicAssetPath = z.union([
  z.string().url(),
  z.string().regex(publicAssetPathRegex),
])
type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function updateBrandingSchema(locale: AppLocale) {
  return z.object({
  // Tier 0: always available
  logoUrl: urlOrPublicAssetPath.optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex).optional().nullable(),
  replyToEmail: z.string().email().max(254).optional().nullable(),

  // Tier 1: CUSTOM_BRANDING
  secondaryColor: z.string().regex(hexColorRegex).optional().nullable(),
  backgroundColor: z.string().regex(hexColorRegex).optional().nullable(),
  fontFamily: z.enum(CURATED_FONTS as unknown as [string, ...string[]]).optional().nullable(),
  faviconUrl: urlOrPublicAssetPath.optional().nullable(),

  // Tier 2: WHITE_LABEL
  // Block RFC 5322 separators (<, >, @, CR, LF) so the resolved
  // From: header (`${senderName} <noreply@…>`) can't be injected through.
  emailSenderName: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[^<>@\r\n]+$/,
      t(locale, 'Sender name cannot contain < > @ or line breaks', 'Avsändarnamn får inte innehålla < > @ eller radbrytningar'),
    )
    .optional()
    .nullable(),
  pageTitle: z.string().min(1).max(100).optional().nullable(),
  hidePlatformBranding: z.boolean().optional(),
  })
}

// GET /api/coach/admin/branding - Get branding settings with feature flags
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
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
          replyToEmail: true,
          customDomain: true,
          domainVerified: true,
          domainVerifiedAt: true,
          domainTxtRecord: true,
          replyToEmailVerified: true,
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
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
    const businessId = admin.businessId
    const locale = resolveLocale(admin.language)

    const body = await request.json()
    const validatedData = updateBrandingSchema(locale).parse(body)

    const features = await getBrandingFeatures(businessId)

    // Build update object, enforcing feature gates
    const updateData: Record<string, unknown> = {}

    // Tier 0: always allowed
    if (validatedData.logoUrl !== undefined) updateData.logoUrl = validatedData.logoUrl
    if (validatedData.primaryColor !== undefined) updateData.primaryColor = validatedData.primaryColor
    // replyToEmail is handled out-of-band below — it triggers a click-to-verify
    // email when changed, and is only honored by the resolver once verified.

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

    // Out-of-band: replyToEmail. Three cases:
    //   (a) absent in body → no change
    //   (b) null/empty → clear address + verification state
    //   (c) changed → store + reset verified=false, send confirmation email
    let replyToVerificationSent = false
    if (validatedData.replyToEmail !== undefined) {
      const next = validatedData.replyToEmail?.trim().toLowerCase() || null
      const current = await prisma.business.findUnique({
        where: { id: businessId },
        select: { replyToEmail: true, name: true },
      })

      if (!next) {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            replyToEmail: null,
            replyToEmailVerified: false,
            replyToEmailVerifyToken: null,
            replyToEmailVerifyExpires: null,
          },
        })
      } else if (next !== current?.replyToEmail) {
        const result = await sendReplyToVerificationEmail({
          businessId,
          newReplyToEmail: next,
          businessName: current?.name || '',
          locale,
        })
        if (!result.success) {
          logger.warn('reply-to verification email failed to send', {
            businessId,
            error: result.error,
          })
        }
        replyToVerificationSent = result.success
      }
    }

    if (Object.keys(updateData).length === 0 && validatedData.replyToEmail === undefined) {
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
        replyToEmail: true,
        replyToEmailVerified: true,
        emailSenderName: true,
        pageTitle: true,
        hidePlatformBranding: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: business,
      replyToVerificationSent,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/branding')
  }
}
