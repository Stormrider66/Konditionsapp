/**
 * Business Applications API
 *
 * POST /api/business-applications - Submit interest form (public, rate-limited)
 * GET /api/business-applications - List applications (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { z } from 'zod'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import {
  sendApplicationReceivedEmail,
  sendNewApplicationNotification,
} from '@/lib/email'

const applicationSchema = z.object({
  type: z.enum(['GYM', 'CLUB']),
  contactName: z.string().min(2, 'Name is required'),
  contactEmail: z.string().email('Valid email required'),
  contactPhone: z.string().optional(),
  organizationName: z.string().min(2, 'Organization name is required'),
  city: z.string().optional(),
  country: z.string().default('SE'),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  primarySport: z.string().optional(),
  estimatedMembers: z.number().int().positive().optional(),
  estimatedCoaches: z.number().int().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP - 3 submissions per hour
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimited = await rateLimitJsonResponse('business-application', ip, {
      limit: 3,
      windowSeconds: 3600,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const data = applicationSchema.parse(body)

    // Check for duplicate pending application
    const existing = await prisma.businessApplication.findFirst({
      where: {
        contactEmail: data.contactEmail,
        status: 'PENDING',
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a pending application' },
        { status: 400 }
      )
    }

    const application = await prisma.businessApplication.create({
      data: {
        type: data.type,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        organizationName: data.organizationName,
        city: data.city || null,
        country: data.country,
        website: data.website || null,
        description: data.description || null,
        primarySport: data.primarySport || null,
        estimatedMembers: data.estimatedMembers || null,
        estimatedCoaches: data.estimatedCoaches || null,
      },
    })

    // Send emails (fire-and-forget)
    sendApplicationReceivedEmail(
      data.contactEmail,
      data.contactName,
      data.organizationName
    ).catch(() => {})

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      sendNewApplicationNotification(
        adminEmail,
        data.organizationName,
        data.type
      ).catch(() => {})
    }

    return NextResponse.json(
      { success: true, id: application.id },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Business application error', {}, error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const applications = await prisma.businessApplication.findMany({
      where: status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return NextResponse.json({ applications })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('List applications error', {}, error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
