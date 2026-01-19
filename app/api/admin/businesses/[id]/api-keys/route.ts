import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'

// Validation schema for creating an API key
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  requestsPerMinute: z.number().int().min(1).max(1000).default(60),
  requestsPerDay: z.number().int().min(1).max(100000).default(10000),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional().nullable(),
})

function generateApiKey(): { plainKey: string; keyHash: string; keyPrefix: string } {
  const keyBytes = randomBytes(32)
  const plainKey = `bak_${keyBytes.toString('base64url')}`
  const keyHash = createHash('sha256').update(plainKey).digest('hex')
  const keyPrefix = plainKey.substring(0, 12)
  return { plainKey, keyHash, keyPrefix }
}

// GET /api/admin/businesses/[id]/api-keys - List API keys
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
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

    const apiKeys = await prisma.businessApiKey.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        requestsPerMinute: true,
        requestsPerDay: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: apiKeys,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/businesses/[id]/api-keys')
  }
}

// POST /api/admin/businesses/[id]/api-keys - Create API key
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id: businessId } = await params

    const body = await request.json()
    const validatedData = createApiKeySchema.parse(body)

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

    // Generate the API key
    const { plainKey, keyHash, keyPrefix } = generateApiKey()

    const apiKey = await prisma.businessApiKey.create({
      data: {
        businessId,
        name: validatedData.name,
        keyHash,
        keyPrefix,
        requestsPerMinute: validatedData.requestsPerMinute,
        requestsPerDay: validatedData.requestsPerDay,
        scopes: validatedData.scopes,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        requestsPerMinute: true,
        requestsPerDay: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // Return the plain key only on creation - it cannot be retrieved again
    return NextResponse.json({
      success: true,
      data: {
        ...apiKey,
        key: plainKey, // Only shown once!
      },
      message: 'API key created. Save the key now - it cannot be retrieved again.',
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/businesses/[id]/api-keys')
  }
}
