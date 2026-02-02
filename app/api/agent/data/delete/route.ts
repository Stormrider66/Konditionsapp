/**
 * DELETE /api/agent/data/delete
 *
 * Delete all agent data for GDPR compliance
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { deleteAgentData, getDataSummary } from '@/lib/agent/gdpr/data-deletion'

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

    const searchParams = request.nextUrl.searchParams
    let clientId = searchParams.get('clientId')

    if (!clientId) {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })

      if (!athleteAccount) {
        return NextResponse.json(
          { error: 'No athlete profile found' },
          { status: 404 }
        )
      }

      clientId = athleteAccount.clientId
    }

    const summary = await getDataSummary(clientId)

    return NextResponse.json({
      clientId,
      summary,
      message:
        'This is a preview of the data that will be deleted. Audit logs are retained for legal compliance.',
    })
  } catch (error) {
    console.error('Error getting data summary:', error)
    return NextResponse.json(
      { error: 'Failed to get data summary' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete all agent data
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
    const { clientId: bodyClientId, confirm } = body

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

    // Get client ID
    let clientId = bodyClientId

    if (!clientId) {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })

      if (!athleteAccount) {
        return NextResponse.json(
          { error: 'No athlete profile found' },
          { status: 404 }
        )
      }

      clientId = athleteAccount.clientId
    }

    // Get IP for audit
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined

    // Delete data
    const result = await deleteAgentData(clientId, user.id, ipAddress)

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
    console.error('Error deleting data:', error)
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    )
  }
}
