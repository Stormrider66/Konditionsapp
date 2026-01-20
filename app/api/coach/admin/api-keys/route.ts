import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'

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

// GET /api/coach/admin/api-keys - List business API keys
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

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
    return handleApiError(error, 'GET /api/coach/admin/api-keys')
  }
}

// POST /api/coach/admin/api-keys - Create API key
export async function POST(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const body = await request.json()
    const validatedData = createApiKeySchema.parse(body)

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
    return handleApiError(error, 'POST /api/coach/admin/api-keys')
  }
}
