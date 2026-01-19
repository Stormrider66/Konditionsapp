/**
 * API Error Handling Utilities
 *
 * Provides standardized error handling for all API routes:
 * - ApiError class for typed errors with HTTP status codes
 * - Error response helpers for consistent JSON responses
 * - withErrorHandler wrapper for automatic error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'

/**
 * Standard error codes for API responses
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'
  | 'DEPENDENCY_ERROR'

/**
 * API Error class with HTTP status code and error code
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static badRequest(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details)
  }

  static validation(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message, details)
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }

  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message)
  }

  static notFound(resource: string): ApiError {
    return new ApiError(404, 'NOT_FOUND', `${resource} not found`)
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message)
  }

  static rateLimited(message = 'Too many requests'): ApiError {
    return new ApiError(429, 'RATE_LIMITED', message)
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message)
  }
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string
  code: ApiErrorCode
  details?: Record<string, unknown>
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error: message,
    code,
  }

  if (details) {
    response.details = details
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Convert an unknown error to an ApiError
 */
function toApiError(error: unknown): ApiError {
  // Already an ApiError
  if (error instanceof ApiError) {
    return error
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new ApiError(409, 'CONFLICT', 'A record with this value already exists', {
          fields: error.meta?.target,
        })
      case 'P2025':
        return new ApiError(404, 'NOT_FOUND', 'Record not found')
      case 'P2003':
        return new ApiError(400, 'BAD_REQUEST', 'Foreign key constraint failed', {
          field: error.meta?.field_name,
        })
      default:
        return new ApiError(500, 'INTERNAL_ERROR', 'Database error occurred')
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Invalid data provided')
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error messages from auth-utils
    if (error.message.includes('Unauthorized') || error.message.includes('not authenticated')) {
      return new ApiError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    if (error.message.includes('Forbidden') || error.message.includes('Access denied')) {
      return new ApiError(403, 'FORBIDDEN', 'Access denied')
    }

    return new ApiError(500, 'INTERNAL_ERROR', error.message)
  }

  // Unknown error type
  return new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
}

/**
 * Handle an error and return a proper API response
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  const apiError = toApiError(error)

  // Log the error with context
  logger.error(
    context || 'API Error',
    {
      code: apiError.code,
      statusCode: apiError.statusCode,
      details: apiError.details,
    },
    error instanceof Error ? error : new Error(String(error))
  )

  // Capture to Sentry and database for 500-level errors
  if (apiError.statusCode >= 500) {
    const sentryEventId = Sentry.captureException(error, {
      tags: {
        errorCode: apiError.code,
        context: context || 'unknown',
      },
      extra: {
        statusCode: apiError.statusCode,
        details: apiError.details,
      },
    })

    // Record to database for monitoring dashboard (fire and forget)
    prisma.systemError.create({
      data: {
        level: apiError.statusCode >= 500 ? 'ERROR' : 'WARN',
        message: apiError.message,
        stack: error instanceof Error ? error.stack : undefined,
        route: context,
        statusCode: apiError.statusCode,
        sentryEventId: sentryEventId || undefined,
        metadata: apiError.details as object || undefined,
      },
    }).catch(() => {
      // Silently ignore database errors to prevent error loops
    })
  }

  return createErrorResponse(
    apiError.statusCode,
    apiError.code,
    apiError.message,
    apiError.details
  )
}

/**
 * Type for API route handlers
 */
type ApiHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>

/**
 * Wrapper for API route handlers that provides automatic error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData()
 *   return NextResponse.json(data)
 * }, 'GET /api/resource')
 * ```
 */
export function withErrorHandler(
  handler: ApiHandler,
  context: string
): ApiHandler {
  return async (request, params) => {
    try {
      return await handler(request, params)
    } catch (error) {
      return handleApiError(error, context)
    }
  }
}

/**
 * Validate required fields in request body
 * @throws ApiError if validation fails
 */
export function validateRequired(
  body: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  )

  if (missing.length > 0) {
    throw ApiError.validation(`Missing required fields: ${missing.join(', ')}`, {
      missingFields: missing,
    })
  }
}

/**
 * Parse and validate request body as JSON
 * @throws ApiError if body is not valid JSON
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest
): Promise<T> {
  try {
    return await request.json()
  } catch {
    throw ApiError.badRequest('Invalid JSON in request body')
  }
}
