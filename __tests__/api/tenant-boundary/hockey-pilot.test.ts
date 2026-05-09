import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import './setup'

const hockeyMocks = vi.hoisted(() => ({
  getStaffPermissions: vi.fn(),
  getStaffRolePreview: vi.fn(),
  canAccessClientInTeam: vi.fn(),
  getBusinessMembership: vi.fn(),
  getPrimaryBusinessMembership: vi.fn(),
  getAccessibleTeamWhere: vi.fn(),
  getWritableTeam: vi.fn(),
  getAccessibleTeam: vi.fn(),
  getCoachScopedIds: vi.fn(),
  getLinkedHockeyAerobicProfiles: vi.fn(),
  applyLinkedHockeyAerobicProfile: vi.fn(),
  syncHockeyStrengthPrsFromTest: vi.fn(),
}))

vi.mock('@/lib/permissions/assistant-coach', () => ({
  getStaffPermissions: hockeyMocks.getStaffPermissions,
}))

vi.mock('@/lib/permissions/role-preview-server', () => ({
  getStaffRolePreview: hockeyMocks.getStaffRolePreview,
}))

vi.mock('@/lib/coach/team-access', () => ({
  canAccessClientInTeam: hockeyMocks.canAccessClientInTeam,
  getBusinessMembership: hockeyMocks.getBusinessMembership,
  getPrimaryBusinessMembership: hockeyMocks.getPrimaryBusinessMembership,
  getAccessibleTeamWhere: hockeyMocks.getAccessibleTeamWhere,
  getWritableTeam: hockeyMocks.getWritableTeam,
  getAccessibleTeam: hockeyMocks.getAccessibleTeam,
}))

vi.mock('@/lib/coach/scoping', () => ({
  getCoachScopedIds: hockeyMocks.getCoachScopedIds,
}))

vi.mock('@/lib/hockey/aerobic-profile-link', () => ({
  getLinkedHockeyAerobicProfiles: hockeyMocks.getLinkedHockeyAerobicProfiles,
  applyLinkedHockeyAerobicProfile: hockeyMocks.applyLinkedHockeyAerobicProfile,
}))

vi.mock('@/lib/hockey/test-package-server', () => ({
  syncHockeyStrengthPrsFromTest: hockeyMocks.syncHockeyStrengthPrsFromTest,
}))

import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser, requireCoach } from '@/lib/auth-utils'
import { expectDeniedResponse, resetTenantBoundaryMocks } from './setup'
import { GET as getHockeyTests, POST as postHockeyTests } from '@/app/api/coach/hockey-tests/route'
import {
  GET as getHockeyTestPackage,
  PUT as putHockeyTestPackage,
} from '@/app/api/teams/[id]/hockey-test-package/route'
import { GET as getHockeyExport } from '@/app/api/teams/[id]/hockey-tests/export/route'
import { GET as getHockeySummary } from '@/app/api/clients/[id]/hockey-tests/summary/route'

const coach = { id: 'coach-a', role: 'COACH' } as any

function nextRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init) as any
}

describe('Tenant boundary - hockey pilot routes', () => {
  beforeEach(() => {
    resetTenantBoundaryMocks()
    vi.mocked(requireCoach).mockResolvedValue(coach)
    vi.mocked(getCurrentUser).mockResolvedValue(coach)
    hockeyMocks.getStaffRolePreview.mockResolvedValue(null)
    hockeyMocks.getStaffPermissions.mockResolvedValue({
      isTeamScoped: true,
      assignedTeamIds: ['team-a'],
    })
    hockeyMocks.getBusinessMembership.mockResolvedValue({
      businessId: 'business-a',
      role: 'ASSISTANT_COACH',
    })
    hockeyMocks.getPrimaryBusinessMembership.mockResolvedValue(null)
    hockeyMocks.getAccessibleTeamWhere.mockResolvedValue({ id: { in: ['team-a'] } })
    hockeyMocks.getCoachScopedIds.mockResolvedValue(['coach-a'])
    hockeyMocks.getLinkedHockeyAerobicProfiles.mockResolvedValue(new Map())
    hockeyMocks.applyLinkedHockeyAerobicProfile.mockImplementation((test) => test)
  })

  it('GET /api/coach/hockey-tests returns an empty list for an inaccessible team without querying tests', async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValue(null as any)

    const response = await getHockeyTests(
      nextRequest('http://localhost/api/coach/hockey-tests?teamId=team-b&businessSlug=club-a')
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ tests: [] })
    expect(prisma.hockeyPhysicalTest.findMany).not.toHaveBeenCalled()
    expect(hockeyMocks.getLinkedHockeyAerobicProfiles).not.toHaveBeenCalled()
  })

  it('POST /api/coach/hockey-tests blocks writes for a team/athlete outside scope', async () => {
    hockeyMocks.getWritableTeam.mockResolvedValue(null)

    const response = await postHockeyTests(
      nextRequest('http://localhost/api/coach/hockey-tests?businessSlug=club-a', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: '11111111-1111-4111-8111-111111111111',
          teamId: '22222222-2222-4222-8222-222222222222',
          testDate: '2026-05-09',
          sprint10m: 1.82,
        }),
      })
    )

    await expectDeniedResponse(response as any, 404)
    expect(hockeyMocks.canAccessClientInTeam).not.toHaveBeenCalled()
    expect(prisma.hockeyPhysicalTest.create).not.toHaveBeenCalled()
  })

  it('GET /api/teams/[id]/hockey-test-package denies inaccessible teams before exercise hydration', async () => {
    hockeyMocks.getAccessibleTeamWhere.mockResolvedValue({ id: { in: ['team-a'] } })
    vi.mocked(prisma.team.findFirst).mockResolvedValue(null as any)

    const response = await getHockeyTestPackage(
      nextRequest('http://localhost/api/teams/team-b/hockey-test-package?businessSlug=club-a'),
      { params: Promise.resolve({ id: 'team-b' }) }
    )

    await expectDeniedResponse(response as any, 404, ['package'])
    expect(prisma.exercise.findMany).not.toHaveBeenCalled()
  })

  it('PUT /api/teams/[id]/hockey-test-package blocks package writes for inaccessible teams', async () => {
    hockeyMocks.getWritableTeam.mockResolvedValue(null)

    const response = await putHockeyTestPackage(
      nextRequest('http://localhost/api/teams/team-b/hockey-test-package?businessSlug=club-a', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ package: { items: [] } }),
      }),
      { params: Promise.resolve({ id: 'team-b' }) }
    )

    await expectDeniedResponse(response as any, 404, ['package'])
    expect(prisma.team.update).not.toHaveBeenCalled()
  })

  it('GET /api/teams/[id]/hockey-tests/export denies inaccessible teams before export queries', async () => {
    hockeyMocks.getAccessibleTeam.mockResolvedValue(null)

    const response = await getHockeyExport(
      nextRequest('http://localhost/api/teams/team-b/hockey-tests/export?businessSlug=club-a'),
      { params: Promise.resolve({ id: 'team-b' }) }
    )

    await expectDeniedResponse(response as any, 404)
    expect(prisma.team.findFirst).not.toHaveBeenCalled()
    expect(prisma.hockeyPhysicalTest.findMany).not.toHaveBeenCalled()
    expect(prisma.hockeyNormReference.findMany).not.toHaveBeenCalled()
  })

  it('GET /api/clients/[id]/hockey-tests/summary denies foreign clients before loading hockey history', async () => {
    vi.mocked(canAccessClient).mockResolvedValue(false)

    const response = await getHockeySummary(
      new Request(
        'http://localhost/api/clients/11111111-1111-4111-8111-111111111111/hockey-tests/summary'
      ),
      { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) }
    )

    await expectDeniedResponse(response as any, 403, ['data'])
    expect(prisma.hockeyPhysicalTest.findMany).not.toHaveBeenCalled()
    expect(prisma.client.findUnique).not.toHaveBeenCalled()
  })
})
