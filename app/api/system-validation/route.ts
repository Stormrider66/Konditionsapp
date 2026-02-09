/**
 * GET /api/system-validation?clientId=xxx
 *
 * Runs the multi-system validation cascade (Phase 12) for a specific athlete.
 * Returns injury/readiness/lactate/Norwegian/program blockers + recommendations.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  errorResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { validateSystemState } from '@/lib/training-engine/integration/multi-system-validation'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return errorResponse('Missing required parameter: clientId', 400)
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return errorResponse('Client not found', 404)
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return errorResponse('Access denied', 403)
    }

    const validation = await validateSystemState(clientId, prisma)

    return successResponse(
      {
        validation,
      },
      'System validation completed'
    )
  } catch (error) {
    return handleApiError(error)
  }
}

