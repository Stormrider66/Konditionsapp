import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import {
  ATHLETE_DATA_HEALTH_ISSUE_CODES,
  auditAthleteDataHealth,
  repairAthleteDataHealth,
} from '@/lib/data-health/athlete-integrity'
import { logAuditEvent, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit/log'
import { logger } from '@/lib/logger'

const repairRequestSchema = z.object({
  limit: z.number().int().positive().max(500).optional(),
  issueCodes: z.array(z.enum(ATHLETE_DATA_HEALTH_ISSUE_CODES)).optional(),
})

function parseLimit(request: NextRequest): number | undefined {
  const rawLimit = request.nextUrl.searchParams.get('limit')
  if (!rawLimit) return undefined

  const parsed = Number(rawLimit)
  if (!Number.isFinite(parsed)) return undefined

  return parsed
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const report = await auditAthleteDataHealth({
      limit: parseLimit(request),
    })

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    logger.error('Failed to audit athlete data health', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to audit athlete data health' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    const body = await request.json().catch(() => ({}))
    const validation = repairRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid repair request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const result = await repairAthleteDataHealth(validation.data)

    await logAuditEvent({
      action: 'BULK_OPERATION',
      userId: admin.id,
      targetType: 'AthleteDataHealth',
      metadata: {
        operation: 'repair',
        targetedIssueCount: result.targetedIssueCount,
        repairedCount: result.repairedCount,
        failedCount: result.failedCount,
        issueCodes: validation.data.issueCodes ?? 'ALL_FIXABLE',
        limit: validation.data.limit ?? null,
      },
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Failed to repair athlete data health', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to repair athlete data health' },
      { status: 500 }
    )
  }
}
