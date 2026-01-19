import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'

// POST /api/admin/contracts/[id]/activate - Activate a contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const { id } = await params

    const contract = await prisma.enterpriseContract.findUnique({
      where: { id },
    })

    if (!contract) {
      throw ApiError.notFound('Contract')
    }

    // Only DRAFT or PENDING_APPROVAL contracts can be activated
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(contract.status)) {
      throw ApiError.badRequest(`Cannot activate contract with status: ${contract.status}`)
    }

    // Activate contract and create audit entry
    const activatedContract = await prisma.$transaction(async (tx) => {
      const now = new Date()

      const updated = await tx.enterpriseContract.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          activatedAt: now,
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      })

      await tx.enterpriseContractChange.create({
        data: {
          contractId: id,
          changeType: 'ACTIVATED',
          changedById: adminUser.id,
          previousData: { status: contract.status },
          newData: { status: 'ACTIVE', activatedAt: now },
          notes: 'Contract activated',
        },
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      data: activatedContract,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/contracts/[id]/activate')
  }
}
