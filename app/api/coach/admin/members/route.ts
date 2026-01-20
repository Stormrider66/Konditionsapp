import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

const addMemberSchema = z.object({
  userEmail: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'TESTER']).default('MEMBER'),
})

// GET /api/coach/admin/members - List business members
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const members = await prisma.businessMember.findMany({
      where: { businessId },
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
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, etc.
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: members,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/members')
  }
}

// POST /api/coach/admin/members - Add a new member
export async function POST(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const body = await request.json()
    const validatedData = addMemberSchema.parse(body)

    // Only OWNER can add another OWNER
    if (validatedData.role === 'OWNER' && admin.businessRole !== 'OWNER') {
      return NextResponse.json({
        success: false,
        error: 'Only business owners can add other owners',
      }, { status: 403 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.userEmail },
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found. They must have an account first.',
      }, { status: 404 })
    }

    // Check if already a member
    const existingMember = await prisma.businessMember.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json({
        success: false,
        error: 'User is already a member of this business',
      }, { status: 400 })
    }

    // Create membership
    const member = await prisma.businessMember.create({
      data: {
        businessId,
        userId: user.id,
        role: validatedData.role,
        isActive: true,
        acceptedAt: new Date(), // Auto-accept for now
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
    return handleApiError(error, 'POST /api/coach/admin/members')
  }
}
