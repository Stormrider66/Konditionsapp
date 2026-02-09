/**
 * GET /api/agent/data/export
 *
 * Export all agent data for GDPR compliance
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { exportAgentData } from '@/lib/agent/gdpr/data-export'

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

    // Get IP for audit
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined

    // Export data
    const exportData = await exportAgentData(clientId, user.id, ipAddress)

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="agent-data-export-${clientId}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
