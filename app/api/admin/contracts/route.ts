import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'

const createContractSchema = z.object({
  businessId: z.string().uuid(),
  contractName: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  monthlyFee: z.number().min(0),
  currency: z.string().default('SEK'),
  revenueSharePercent: z.number().min(0).max(100).default(75),
  athleteLimit: z.number().default(-1),
  coachLimit: z.number().default(-1),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  paymentTermDays: z.number().default(30),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().optional().transform((s) => s ? new Date(s) : undefined),
  autoRenew: z.boolean().default(true),
  noticePeriodDays: z.number().default(90),
  customFeatures: z.any().optional(),
})

// GET /api/admin/contracts - List all contracts
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { contractName: { contains: search, mode: 'insensitive' } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [contracts, total] = await Promise.all([
      prisma.enterpriseContract.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.enterpriseContract.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        contracts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/contracts')
  }
}

// POST /api/admin/contracts - Create a new contract
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const body = await request.json()
    const data = createContractSchema.parse(body)

    // Check if business already has a contract
    const existingContract = await prisma.enterpriseContract.findUnique({
      where: { businessId: data.businessId },
    })

    if (existingContract) {
      throw ApiError.conflict('This business already has an enterprise contract')
    }

    // Generate contract number
    const year = new Date().getFullYear()
    const lastContract = await prisma.enterpriseContract.findFirst({
      where: {
        contractNumber: {
          startsWith: `EC-${year}-`,
        },
      },
      orderBy: { contractNumber: 'desc' },
    })

    let nextNumber = 1
    if (lastContract) {
      const parts = lastContract.contractNumber.split('-')
      nextNumber = parseInt(parts[2]) + 1
    }

    const contractNumber = `EC-${year}-${String(nextNumber).padStart(3, '0')}`

    // Create contract and audit entry in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      const newContract = await tx.enterpriseContract.create({
        data: {
          ...data,
          contractNumber,
          endDate: data.endDate ?? null,
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
          contractId: newContract.id,
          changeType: 'CREATED',
          changedById: adminUser.id,
          newData: JSON.parse(JSON.stringify(newContract)) as Prisma.InputJsonValue,
          notes: 'Contract created',
        },
      })

      return newContract
    })

    return NextResponse.json({
      success: true,
      data: contract,
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/contracts')
  }
}
