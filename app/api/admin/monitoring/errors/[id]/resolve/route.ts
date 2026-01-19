import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'

// POST /api/admin/monitoring/errors/[id]/resolve - Mark error as resolved
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { id } = await params

    const error = await prisma.systemError.findUnique({
      where: { id },
    })

    if (!error) {
      throw ApiError.notFound('System error')
    }

    if (error.isResolved) {
      return NextResponse.json({
        success: true,
        message: 'Error already resolved',
        data: error,
      })
    }

    const resolved = await prisma.systemError.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: adminUser.id,
      },
      include: {
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: resolved,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/monitoring/errors/[id]/resolve')
  }
}
