import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'

const updateContractSchema = z.object({
  contractName: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().nullable().optional(),
  monthlyFee: z.number().min(0).optional(),
  currency: z.string().optional(),
  revenueSharePercent: z.number().min(0).max(100).optional(),
  athleteLimit: z.number().optional(),
  coachLimit: z.number().optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  paymentTermDays: z.number().optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().nullable().transform((s) => s ? new Date(s) : null).optional(),
  autoRenew: z.boolean().optional(),
  noticePeriodDays: z.number().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED']).optional(),
  customFeatures: z.any().optional(),
  notes: z.string().optional(),
})

// GET /api/admin/contracts/[id] - Get single contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { id } = await params

    const contract = await prisma.enterpriseContract.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
          },
        },
        changeHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!contract) {
      throw ApiError.notFound('Contract')
    }

    return NextResponse.json({
      success: true,
      data: contract,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/contracts/[id]')
  }
}

// PUT /api/admin/contracts/[id] - Update contract
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const { id } = await params
    const body = await request.json()
    const { notes, ...data } = updateContractSchema.parse(body)

    const existingContract = await prisma.enterpriseContract.findUnique({
      where: { id },
    })

    if (!existingContract) {
      throw ApiError.notFound('Contract')
    }

    // Update contract and create audit entry
    const contract = await prisma.$transaction(async (tx) => {
      const updatedContract = await tx.enterpriseContract.update({
        where: { id },
        data,
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
          changeType: 'UPDATED',
          changedById: adminUser.id,
          previousData: JSON.parse(JSON.stringify(existingContract)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(updatedContract)) as Prisma.InputJsonValue,
          notes: notes || null,
        },
      })

      return updatedContract
    })

    return NextResponse.json({
      success: true,
      data: contract,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/contracts/[id]')
  }
}

// DELETE /api/admin/contracts/[id] - Delete contract (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminRole(['SUPER_ADMIN'])

    const { id } = await params

    const contract = await prisma.enterpriseContract.findUnique({
      where: { id },
    })

    if (!contract) {
      throw ApiError.notFound('Contract')
    }

    // Only allow deletion of DRAFT contracts
    if (contract.status !== 'DRAFT') {
      throw ApiError.badRequest('Only DRAFT contracts can be deleted. Cancel the contract instead.')
    }

    await prisma.enterpriseContract.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Contract deleted',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/contracts/[id]')
  }
}
