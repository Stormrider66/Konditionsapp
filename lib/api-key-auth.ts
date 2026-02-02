import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'
import { logger } from '@/lib/logger'
import { checkRateLimitRedis, isRedisConfigured } from '@/lib/rate-limit-redis'

// In-memory rate limit store (fallback when Redis is not configured)
const rateLimitStore = new Map<string, { minute: number; day: number; minuteReset: number; dayReset: number }>()

export interface ApiKeyContext {
  apiKeyId: string
  businessId: string
  scopes: string[]
  business: {
    id: string
    name: string
    slug: string
  }
}

export interface ApiKeyValidationResult {
  valid: boolean
  error?: string
  statusCode?: number
  context?: ApiKeyContext
}

/**
 * Validates an API key from the Authorization header
 * Format: Authorization: Bearer bak_xxxxx
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidationResult> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header', statusCode: 401 }
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid Authorization format. Use: Bearer <api_key>', statusCode: 401 }
  }

  const apiKey = authHeader.slice(7) // Remove "Bearer "

  if (!apiKey.startsWith('bak_')) {
    return { valid: false, error: 'Invalid API key format', statusCode: 401 }
  }

  // Hash the key to compare with stored hash
  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  // Find the API key in database
  const storedKey = await prisma.businessApiKey.findUnique({
    where: { keyHash },
    include: {
      business: {
        select: { id: true, name: true, slug: true, isActive: true }
      }
    }
  })

  if (!storedKey) {
    return { valid: false, error: 'Invalid API key', statusCode: 401 }
  }

  // Check if key is active
  if (!storedKey.isActive) {
    return { valid: false, error: 'API key is inactive', statusCode: 401 }
  }

  // Check if key is expired
  if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired', statusCode: 401 }
  }

  // Check if business is active
  if (!storedKey.business.isActive) {
    return { valid: false, error: 'Business is inactive', statusCode: 403 }
  }

  // Check rate limits - use Redis in production, in-memory fallback otherwise
  const rateLimitResult = await checkApiKeyRateLimit(
    storedKey.id,
    storedKey.requestsPerMinute,
    storedKey.requestsPerDay
  )
  if (!rateLimitResult.allowed) {
    return {
      valid: false,
      error: rateLimitResult.error,
      statusCode: 429
    }
  }

  // Update last used timestamp (fire and forget)
  prisma.businessApiKey.update({
    where: { id: storedKey.id },
    data: { lastUsedAt: new Date() }
  }).catch((err) => {
    logger.warn('Failed to update API key lastUsedAt', { keyId: storedKey.id }, err)
  })

  return {
    valid: true,
    context: {
      apiKeyId: storedKey.id,
      businessId: storedKey.businessId,
      scopes: storedKey.scopes,
      business: {
        id: storedKey.business.id,
        name: storedKey.business.name,
        slug: storedKey.business.slug
      }
    }
  }
}

/**
 * Check if the API key has a required scope
 */
export function hasScope(context: ApiKeyContext, requiredScope: string): boolean {
  // Wildcard scope grants all access
  if (context.scopes.includes('*')) return true

  // Check exact match
  if (context.scopes.includes(requiredScope)) return true

  // Check wildcard patterns (e.g., "read:*" matches "read:athletes")
  const [action, resource] = requiredScope.split(':')
  if (context.scopes.includes(`${action}:*`)) return true

  return false
}

/**
 * Check if the API key has all required scopes
 */
export function hasAllScopes(context: ApiKeyContext, requiredScopes: string[]): boolean {
  return requiredScopes.every(scope => hasScope(context, scope))
}

/**
 * Check if the API key has any of the required scopes
 */
export function hasAnyScope(context: ApiKeyContext, requiredScopes: string[]): boolean {
  return requiredScopes.some(scope => hasScope(context, scope))
}

/**
 * Check API key rate limits
 * Uses Redis in production for distributed rate limiting,
 * falls back to in-memory for development/single-instance deployments.
 */
async function checkApiKeyRateLimit(
  keyId: string,
  maxPerMinute: number,
  maxPerDay: number
): Promise<{ allowed: boolean; error?: string }> {
  // Use Redis if configured (production multi-instance)
  if (isRedisConfigured()) {
    // Check minute limit
    const minuteResult = await checkRateLimitRedis(
      `apikey:minute:${keyId}`,
      { limit: maxPerMinute, windowSeconds: 60 }
    )

    if (!minuteResult.success) {
      const retryAfter = Math.ceil((minuteResult.resetTime - Date.now()) / 1000)
      return {
        allowed: false,
        error: `Rate limit exceeded. Max ${maxPerMinute} requests per minute. Retry after ${retryAfter}s`
      }
    }

    // Check day limit
    const dayResult = await checkRateLimitRedis(
      `apikey:day:${keyId}`,
      { limit: maxPerDay, windowSeconds: 86400 }
    )

    if (!dayResult.success) {
      const retryAfter = Math.ceil((dayResult.resetTime - Date.now()) / 1000)
      return {
        allowed: false,
        error: `Daily limit exceeded. Max ${maxPerDay} requests per day. Retry after ${retryAfter}s`
      }
    }

    return { allowed: true }
  }

  // Fallback to in-memory rate limiting
  return checkInMemoryRateLimit(keyId, maxPerMinute, maxPerDay)
}

/**
 * In-memory rate limiter (fallback for development/single-instance)
 */
function checkInMemoryRateLimit(
  keyId: string,
  maxPerMinute: number,
  maxPerDay: number
): { allowed: boolean; error?: string } {
  const now = Date.now()
  const minuteWindow = 60 * 1000
  const dayWindow = 24 * 60 * 60 * 1000

  let entry = rateLimitStore.get(keyId)

  if (!entry) {
    entry = {
      minute: 0,
      day: 0,
      minuteReset: now + minuteWindow,
      dayReset: now + dayWindow
    }
    rateLimitStore.set(keyId, entry)
  }

  // Reset counters if windows have passed
  if (now > entry.minuteReset) {
    entry.minute = 0
    entry.minuteReset = now + minuteWindow
  }
  if (now > entry.dayReset) {
    entry.day = 0
    entry.dayReset = now + dayWindow
  }

  // Check limits
  if (entry.minute >= maxPerMinute) {
    const retryAfter = Math.ceil((entry.minuteReset - now) / 1000)
    return {
      allowed: false,
      error: `Rate limit exceeded. Max ${maxPerMinute} requests per minute. Retry after ${retryAfter}s`
    }
  }

  if (entry.day >= maxPerDay) {
    const retryAfter = Math.ceil((entry.dayReset - now) / 1000)
    return {
      allowed: false,
      error: `Daily limit exceeded. Max ${maxPerDay} requests per day. Retry after ${retryAfter}s`
    }
  }

  // Increment counters
  entry.minute++
  entry.day++

  return { allowed: true }
}

/**
 * Middleware wrapper for API key protected routes
 *
 * Usage:
 * ```ts
 * export const GET = withApiKey(async (request, context) => {
 *   // context.apiKey contains business info and scopes
 *   return NextResponse.json({ data: 'protected' })
 * })
 * ```
 */
export function withApiKey(
  handler: (
    request: NextRequest,
    context: { apiKey: ApiKeyContext; params?: Record<string, string> }
  ) => Promise<NextResponse>,
  options?: {
    requiredScopes?: string[]
    requireAllScopes?: boolean // default: true (AND logic), false = OR logic
  }
): (request: NextRequest, routeContext: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext: { params: Promise<Record<string, string>> }) => {
    const validation = await validateApiKey(request)

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: validation.statusCode || 401 }
      )
    }

    // Check scopes if required
    if (options?.requiredScopes && options.requiredScopes.length > 0) {
      const requireAll = options.requireAllScopes !== false
      const hasRequiredScopes = requireAll
        ? hasAllScopes(validation.context!, options.requiredScopes)
        : hasAnyScope(validation.context!, options.requiredScopes)

      if (!hasRequiredScopes) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient permissions. Required scopes: ${options.requiredScopes.join(', ')}`
          },
          { status: 403 }
        )
      }
    }

    // Resolve params
    const params = await routeContext.params

    return handler(request, { apiKey: validation.context!, params })
  }
}

/**
 * Available scopes for documentation
 */
export const AVAILABLE_SCOPES = [
  // Read scopes
  'read:athletes',
  'read:tests',
  'read:programs',
  'read:workouts',
  'read:analytics',

  // Write scopes
  'write:athletes',
  'write:tests',
  'write:programs',
  'write:workouts',

  // Admin scopes
  'admin:business',
  'admin:members',

  // Wildcard
  '*', // Full access
] as const

export type ApiScope = typeof AVAILABLE_SCOPES[number]
