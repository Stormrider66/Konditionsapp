/**
 * API Utilities
 *
 * Shared utilities for API routes including validation, auth, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { getCurrentUser, requireCoach, requireAthlete } from '@/lib/auth-utils';

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  code?: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: getErrorType(status),
      message,
      details
    },
    { status }
  );
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

/**
 * Get error type from status code
 */
function getErrorType(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMIT_EXCEEDED';
    case 500: return 'INTERNAL_SERVER_ERROR';
    default: return 'ERROR';
  }
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse<ApiError> }> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { success: true, data: validated };
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return {
        success: false,
        response: errorResponse(
          'Validation failed',
          422,
          error
        )
      };
    }
    return {
      success: false,
      response: errorResponse('Invalid request body', 400)
    };
  }
}

/**
 * Require authentication (any role)
 */
export async function requireAuth() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    return user;
  } catch (error) {
    throw errorResponse('Authentication required', 401);
  }
}

/**
 * Require coach role
 */
export async function requireCoachAuth() {
  try {
    const user = await requireCoach();
    return user;
  } catch (error) {
    throw errorResponse('Coach access required', 403);
  }
}

/**
 * Require athlete role
 */
export async function requireAthleteAuth() {
  try {
    const user = await requireAthlete();
    return user;
  } catch (error) {
    throw errorResponse('Athlete access required', 403);
  }
}

/**
 * Handle API errors
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('API Error:', error);

  if (error instanceof NextResponse) {
    return error;
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse('An unexpected error occurred', 500);
}

/**
 * Extract query parameters
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Parse pagination params
 */
export function getPaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  skip: number;
} {
  const params = getQueryParams(request);

  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
