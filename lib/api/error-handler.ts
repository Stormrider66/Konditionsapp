/**
 * Standardized API Error Handler
 *
 * Provides consistent error handling and responses across all API routes.
 * Maps Prisma errors, Zod validation errors, and other common errors
 * to appropriate HTTP responses without leaking sensitive information.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
}

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Standard error codes for API responses
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Map Prisma error codes to user-friendly messages
 */
function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
  message: string
  code: ErrorCode
  status: number
} {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      const target = (error.meta?.target as string[])?.join(', ') || 'field'
      return {
        message: `A record with this ${target} already exists`,
        code: ErrorCodes.ALREADY_EXISTS,
        status: 409,
      }

    case 'P2003': // Foreign key constraint violation
      return {
        message: 'Referenced record not found',
        code: ErrorCodes.NOT_FOUND,
        status: 400,
      }

    case 'P2025': // Record not found for update/delete
      return {
        message: 'Record not found',
        code: ErrorCodes.NOT_FOUND,
        status: 404,
      }

    case 'P2014': // Invalid ID
      return {
        message: 'Invalid relationship reference',
        code: ErrorCodes.INVALID_INPUT,
        status: 400,
      }

    default:
      return {
        message: 'Database operation failed',
        code: ErrorCodes.DATABASE_ERROR,
        status: 500,
      }
  }
}

/**
 * Format Zod validation errors for API response
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
  return issues[0] || 'Validation failed'
}

/**
 * Handle any error and return appropriate NextResponse
 *
 * @param error - The error to handle
 * @param context - Context string for logging (e.g., "POST /api/users")
 * @returns NextResponse with appropriate status and error message
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse<ApiErrorResponse> {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const message = formatZodError(error)
    logger.warn(`Validation error in ${context}`, { issues: error.issues })
    return NextResponse.json(
      {
        success: false as const,
        error: message,
        code: ErrorCodes.VALIDATION_ERROR,
      },
      { status: 400 }
    )
  }

  // Handle Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(error)
    logger.warn(`Prisma error in ${context}`, {
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      {
        success: false as const,
        error: mapped.message,
        code: mapped.code,
      },
      { status: mapped.status }
    )
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.warn(`Prisma validation error in ${context}`)
    return NextResponse.json(
      {
        success: false as const,
        error: 'Invalid data provided',
        code: ErrorCodes.VALIDATION_ERROR,
      },
      { status: 400 }
    )
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for specific error messages that should map to specific responses
    if (error.message.includes('Access denied') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        {
          success: false as const,
          error: 'Access denied',
          code: ErrorCodes.FORBIDDEN,
        },
        { status: 403 }
      )
    }

    if (error.message.includes('not found') || error.message.includes('Not found')) {
      return NextResponse.json(
        {
          success: false as const,
          error: 'Resource not found',
          code: ErrorCodes.NOT_FOUND,
        },
        { status: 404 }
      )
    }

    if (error.message.includes('Unauthorized') || error.message.includes('unauthorized')) {
      return NextResponse.json(
        {
          success: false as const,
          error: 'Authentication required',
          code: ErrorCodes.UNAUTHORIZED,
        },
        { status: 401 }
      )
    }

    // Log full error for debugging but return generic message
    logger.error(`Error in ${context}`, {}, error)
    return NextResponse.json(
      {
        success: false as const,
        error: 'An unexpected error occurred',
        code: ErrorCodes.INTERNAL_ERROR,
      },
      { status: 500 }
    )
  }

  // Handle unknown errors
  logger.error(`Unknown error in ${context}`, { error })
  return NextResponse.json(
    {
      success: false as const,
      error: 'An unexpected error occurred',
      code: ErrorCodes.INTERNAL_ERROR,
    },
    { status: 500 }
  )
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data?: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      ...(data !== undefined && { data }),
      ...(message && { message }),
    },
    { status }
  )
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number,
  code?: ErrorCode
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error,
      ...(code && { code }),
    },
    { status }
  )
}

/**
 * Common error responses
 */
export const CommonErrors = {
  unauthorized: () => errorResponse('Authentication required', 401, ErrorCodes.UNAUTHORIZED),
  forbidden: () => errorResponse('Access denied', 403, ErrorCodes.FORBIDDEN),
  notFound: (resource = 'Resource') => errorResponse(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),
  badRequest: (message = 'Invalid request') => errorResponse(message, 400, ErrorCodes.INVALID_INPUT),
  conflict: (message = 'Resource already exists') => errorResponse(message, 409, ErrorCodes.CONFLICT),
  rateLimited: () => errorResponse('Too many requests', 429, ErrorCodes.RATE_LIMITED),
  internalError: () => errorResponse('An unexpected error occurred', 500, ErrorCodes.INTERNAL_ERROR),
}
