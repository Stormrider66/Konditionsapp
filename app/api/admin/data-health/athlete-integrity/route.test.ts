import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAdmin = vi.hoisted(() => vi.fn())
const mockAuditAthleteDataHealth = vi.hoisted(() => vi.fn())
const mockRepairAthleteDataHealth = vi.hoisted(() => vi.fn())
const mockLogAuditEvent = vi.hoisted(() => vi.fn())
const mockGetIpFromRequest = vi.hoisted(() => vi.fn())
const mockGetUserAgentFromRequest = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock('@/lib/data-health/athlete-integrity', () => ({
  ATHLETE_DATA_HEALTH_ISSUE_CODES: [
    'ATHLETE_MISSING_ACCOUNT',
    'ATHLETE_MISSING_SUBSCRIPTION',
    'ATHLETE_MISSING_AGENT_PREFERENCES',
    'ATHLETE_MISSING_SPORT_PROFILE',
    'ATHLETE_REDUNDANT_COACH_SUBSCRIPTION',
    'ATHLETE_CONFLICTING_COACH_SUBSCRIPTION',
    'SELF_ATHLETE_MISSING_CLIENT',
    'SELF_ATHLETE_MISSING_SUBSCRIPTION',
    'SELF_ATHLETE_MISSING_AGENT_PREFERENCES',
    'SELF_ATHLETE_MISSING_SPORT_PROFILE',
  ],
  auditAthleteDataHealth: mockAuditAthleteDataHealth,
  repairAthleteDataHealth: mockRepairAthleteDataHealth,
}))

vi.mock('@/lib/audit/log', () => ({
  logAuditEvent: mockLogAuditEvent,
  getIpFromRequest: mockGetIpFromRequest,
  getUserAgentFromRequest: mockGetUserAgentFromRequest,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/admin/data-health/athlete-integrity/route'

describe('admin athlete data health route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' })
    mockGetIpFromRequest.mockReturnValue('127.0.0.1')
    mockGetUserAgentFromRequest.mockReturnValue('vitest')
  })

  it('GET returns the athlete integrity report', async () => {
    mockAuditAthleteDataHealth.mockResolvedValue({
      generatedAt: '2026-03-06T00:00:00.000Z',
      summary: {
        scannedUsers: 12,
        athleteUsers: 10,
        selfAthleteUsers: 2,
        totalIssues: 3,
        fixableIssues: 2,
        byCode: {},
      },
      issues: [],
    })

    const response = await GET(new NextRequest('http://localhost/api/admin/data-health/athlete-integrity?limit=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockAuditAthleteDataHealth).toHaveBeenCalledWith({ limit: 50 })
    expect(body.data.summary.totalIssues).toBe(3)
  })

  it('POST repairs fixable issues and writes an audit event', async () => {
    mockRepairAthleteDataHealth.mockResolvedValue({
      generatedAt: '2026-03-06T00:00:00.000Z',
      scannedUsers: 12,
      targetedIssueCount: 2,
      repairedCount: 2,
      failedCount: 0,
      repairs: [],
      reportAfter: {
        generatedAt: '2026-03-06T00:05:00.000Z',
        summary: {
          scannedUsers: 12,
          athleteUsers: 10,
          selfAthleteUsers: 2,
          totalIssues: 1,
          fixableIssues: 0,
          byCode: {},
        },
        issues: [],
      },
    })

    const request = new NextRequest('http://localhost/api/admin/data-health/athlete-integrity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 25,
        issueCodes: ['ATHLETE_MISSING_SUBSCRIPTION'],
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRepairAthleteDataHealth).toHaveBeenCalledWith({
      limit: 25,
      issueCodes: ['ATHLETE_MISSING_SUBSCRIPTION'],
    })
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      action: 'BULK_OPERATION',
      userId: 'admin-1',
      targetType: 'AthleteDataHealth',
      metadata: {
        operation: 'repair',
        targetedIssueCount: 2,
        repairedCount: 2,
        failedCount: 0,
        issueCodes: ['ATHLETE_MISSING_SUBSCRIPTION'],
        limit: 25,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })
    expect(body.data.repairedCount).toBe(2)
  })
})
