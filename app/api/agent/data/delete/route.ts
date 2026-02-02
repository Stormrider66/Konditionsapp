/**
 * DELETE /api/agent/data/delete
 *
 * Delete all agent data for GDPR compliance
 *
 * SECURITY: Only allows users to delete their OWN data.
 * ClientId parameter is ignored - we always use the authenticated user's clientId.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { deleteAgentData, getDataSummary } from '@/lib/agent/gdpr/data-deletion'
import { logger } from '@/lib/logger'
import { getAuthenticatedAthleteClientId } from '@/lib/auth/athlete-access'

/**
 * GET - Get summary of data that would be deleted
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Always use the authenticated user's clientId, never from request params
    const clientId = await getAuthenticatedAthleteClientId(user.id)

    if (!clientId) {
      return NextResponse.json(
        { error: 'No athlete profile found' },
        { status: 404 }
      )
    }

    const summary = await getDataSummary(clientId)

    return NextResponse.json({
      clientId,
      summary,
      message:
        'This is a preview of the data that will be deleted. Audit logs are retained for legal compliance.',
    })
  } catch (error) {
    logger.error('Error getting data summary', {}, error)
    return NextResponse.json(
      { error: 'Failed to get data summary' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete all agent data
 *
 * SECURITY: Only allows users to delete their OWN data.
 * ClientId from request body is IGNORED to prevent authorization bypass.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { confirm } = body

    // Require explicit confirmation
    if (confirm !== 'DELETE_ALL_AGENT_DATA') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          message: 'Please send confirm: "DELETE_ALL_AGENT_DATA" to proceed',
        },
        { status: 400 }
      )
    }

    // SECURITY: Always use the authenticated user's clientId
    // Never trust clientId from request body - this prevents authorization bypass
    const clientId = await getAuthenticatedAthleteClientId(user.id)

    if (!clientId) {
      return NextResponse.json(
        { error: 'No athlete profile found' },
        { status: 404 }
      )
    }

    // Get IP for audit
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined

    // Log the deletion attempt for audit
    logger.info('Agent data deletion requested', {
      userId: user.id,
      clientId,
      ipAddress: ipAddress || 'unknown',
    })

    // Delete data
    const result = await deleteAgentData(clientId, user.id, ipAddress)

    logger.info('Agent data deletion completed', {
      userId: user.id,
      clientId,
      success: result.success,
      counts: result.counts,
    })

    return NextResponse.json({
      success: result.success,
      deletedResources: result.deletedResources,
      counts: result.counts,
      auditLogsRetained: result.auditLogsRetained,
      deletedAt: result.deletedAt,
      message:
        'All agent data has been deleted. Audit logs are retained for legal compliance (7 years).',
    })
  } catch (error) {
    logger.error('Error deleting data', {}, error)
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    )
  }
}
