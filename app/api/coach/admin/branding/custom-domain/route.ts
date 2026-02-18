// app/api/coach/admin/branding/custom-domain/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { hasWhiteLabel } from '@/lib/branding/feature-gate'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const domainSchema = z.object({
  domain: z
    .string()
    .min(4)
    .max(253)
    .regex(
      /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/,
      'Invalid domain format'
    ),
})

// POST /api/coach/admin/branding/custom-domain - Set up custom domain
export async function POST(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    // Check WHITE_LABEL feature
    const hasWL = await hasWhiteLabel(businessId)
    if (!hasWL) {
      return NextResponse.json(
        { success: false, error: 'White Label feature required for custom domains' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { domain } = domainSchema.parse(body)
    const normalizedDomain = domain.toLowerCase()

    // Check if domain is already in use by another business
    const existingBusiness = await prisma.business.findUnique({
      where: { customDomain: normalizedDomain },
      select: { id: true },
    })

    if (existingBusiness && existingBusiness.id !== businessId) {
      return NextResponse.json(
        { success: false, error: 'Domain is already in use by another business' },
        { status: 409 }
      )
    }

    // Generate a TXT verification token
    const txtRecord = `trainomics-verify=${randomUUID()}`

    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        customDomain: normalizedDomain,
        domainVerified: false,
        domainVerifiedAt: null,
        domainTxtRecord: txtRecord,
      },
      select: {
        customDomain: true,
        domainVerified: true,
        domainTxtRecord: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        domain: business.customDomain,
        verified: business.domainVerified,
        txtRecord: business.domainTxtRecord,
        instructions: {
          cname: {
            host: normalizedDomain,
            value: 'cname.trainomics.app',
          },
          txt: {
            host: `_trainomics-verify.${normalizedDomain}`,
            value: txtRecord,
          },
        },
      },
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/coach/admin/branding/custom-domain')
  }
}

// PUT /api/coach/admin/branding/custom-domain - Verify custom domain
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const hasWL = await hasWhiteLabel(businessId)
    if (!hasWL) {
      return NextResponse.json(
        { success: false, error: 'White Label feature required' },
        { status: 403 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        customDomain: true,
        domainTxtRecord: true,
      },
    })

    if (!business?.customDomain || !business.domainTxtRecord) {
      return NextResponse.json(
        { success: false, error: 'No custom domain configured' },
        { status: 400 }
      )
    }

    // Verify TXT record via DNS lookup
    // Note: dns.resolveTxt is not available in Edge runtime, but this runs in Node runtime
    const { resolveTxt } = await import('dns/promises')

    let verified = false
    try {
      const records = await resolveTxt(`_trainomics-verify.${business.customDomain}`)
      const flatRecords = records.map((r) => r.join(''))
      verified = flatRecords.includes(business.domainTxtRecord)
    } catch {
      // DNS lookup failed - domain TXT record not found
      verified = false
    }

    if (!verified) {
      return NextResponse.json({
        success: false,
        error: 'TXT record not found. Please add the DNS record and try again.',
        data: {
          domain: business.customDomain,
          verified: false,
          expectedRecord: {
            host: `_trainomics-verify.${business.customDomain}`,
            value: business.domainTxtRecord,
          },
        },
      }, { status: 422 })
    }

    // Mark as verified
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        domainVerified: true,
        domainVerifiedAt: new Date(),
      },
      select: {
        customDomain: true,
        domainVerified: true,
        domainVerifiedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/branding/custom-domain')
  }
}

// DELETE /api/coach/admin/branding/custom-domain - Remove custom domain
export async function DELETE() {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    await prisma.business.update({
      where: { id: businessId },
      data: {
        customDomain: null,
        domainVerified: false,
        domainVerifiedAt: null,
        domainTxtRecord: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/coach/admin/branding/custom-domain')
  }
}
