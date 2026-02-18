/**
 * Admin Business Application Review API
 *
 * GET /api/admin/business-applications/[id] - Get application details
 * PUT /api/admin/business-applications/[id] - Approve or reject application
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { sendApplicationApprovedEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

type RouteParams = {
  params: Promise<{ id: string }>
}

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNotes: z.string().optional(),
  // Approval-specific fields
  businessName: z.string().optional(),
  businessSlug: z.string().optional(),
  revenueShare: z.number().min(0).max(100).default(20),
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const application = await prisma.businessApplication.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Get application error', {}, error)
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    const application = await prisma.businessApplication.findUnique({
      where: { id },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Application has already been reviewed' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = reviewSchema.parse(body)

    if (data.action === 'REJECT') {
      await prisma.businessApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedById: admin.id,
          reviewNotes: data.reviewNotes || null,
          reviewedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, status: 'REJECTED' })
    }

    // APPROVE flow
    const slug = data.businessSlug || application.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check slug uniqueness
    const existingBusiness = await prisma.business.findUnique({
      where: { slug },
    })
    if (existingBusiness) {
      return NextResponse.json(
        { error: 'Business slug is already taken. Please provide a different slug.' },
        { status: 400 }
      )
    }

    // Create business + invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create business
      const business = await tx.business.create({
        data: {
          name: data.businessName || application.organizationName,
          slug,
          type: application.type,
          email: application.contactEmail,
          phone: application.contactPhone,
          website: application.website,
          city: application.city,
          country: application.country || 'SE',
          defaultRevenueShare: data.revenueShare,
        },
      })

      // Create claim invitation
      const code = randomBytes(32).toString('hex')
      const invitation = await tx.invitation.create({
        data: {
          code,
          type: 'BUSINESS_CLAIM',
          recipientEmail: application.contactEmail,
          recipientName: application.contactName,
          businessId: business.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })

      // Update application
      await tx.businessApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: admin.id,
          reviewNotes: data.reviewNotes || null,
          reviewedAt: new Date(),
          businessId: business.id,
        },
      })

      return { business, invitation }
    })

    // Send claim email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
    const claimUrl = `${baseUrl}/register/claim/${result.invitation.code}`

    sendApplicationApprovedEmail(
      application.contactEmail,
      application.contactName,
      application.organizationName,
      claimUrl
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      status: 'APPROVED',
      businessId: result.business.id,
      claimUrl,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Review application error', {}, error)
    return NextResponse.json({ error: 'Failed to review application' }, { status: 500 })
  }
}
