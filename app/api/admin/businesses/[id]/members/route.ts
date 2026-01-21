import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

// Validation schema for adding a member
const addMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'COACH']).default('MEMBER'),
  permissions: z.record(z.boolean()).optional().nullable(),
}).refine((data) => data.userId || data.userEmail, {
  message: 'Either userId or userEmail must be provided',
})

// GET /api/admin/businesses/[id]/members - List members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])
    const { id: businessId } = await params

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found',
      }, { status: 404 })
    }

    const members = await prisma.businessMember.findMany({
      where: { businessId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: members,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/businesses/[id]/members')
  }
}

// POST /api/admin/businesses/[id]/members - Add member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id: businessId } = await params

    const body = await request.json()
    const validatedData = addMemberSchema.parse(body)

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found',
      }, { status: 404 })
    }

    // Find user by ID or email
    let userId = validatedData.userId
    if (!userId && validatedData.userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: validatedData.userEmail },
        select: { id: true },
      })

      if (!user) {
        return NextResponse.json({
          success: false,
          error: `User with email ${validatedData.userEmail} not found`,
        }, { status: 404 })
      }

      userId = user.id
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 })
    }

    // Check if user is already a member
    const existingMember = await prisma.businessMember.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json({
        success: false,
        error: 'User is already a member of this business',
      }, { status: 400 })
    }

    const member = await prisma.businessMember.create({
      data: {
        businessId,
        userId,
        role: validatedData.role,
        permissions: validatedData.permissions === null
          ? Prisma.JsonNull
          : validatedData.permissions,
        acceptedAt: new Date(), // Admin-added members are auto-accepted
      },
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
    })

    return NextResponse.json({
      success: true,
      data: member,
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/businesses/[id]/members')
  }
}
