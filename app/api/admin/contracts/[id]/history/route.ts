import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'

// GET /api/admin/contracts/[id]/history - Get contract change history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Check contract exists
    const contract = await prisma.enterpriseContract.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!contract) {
      throw ApiError.notFound('Contract')
    }

    const [history, total] = await Promise.all([
      prisma.enterpriseContractChange.findMany({
        where: { contractId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          changedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.enterpriseContractChange.count({
        where: { contractId: id },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/contracts/[id]/history')
  }
}
