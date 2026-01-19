import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

// GET /api/admin/monitoring/errors - List system errors
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const level = searchParams.get('level')
    const resolved = searchParams.get('resolved')
    const route = searchParams.get('route')

    const where: Record<string, unknown> = {}

    if (level) {
      where.level = level
    }

    if (resolved !== null && resolved !== '') {
      where.isResolved = resolved === 'true'
    }

    if (route) {
      where.route = { contains: route }
    }

    const [errors, total] = await Promise.all([
      prisma.systemError.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          resolvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.systemError.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        errors,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/monitoring/errors')
  }
}
