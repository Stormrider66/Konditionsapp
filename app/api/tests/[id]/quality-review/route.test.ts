import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  test: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
  canAccessClient: mockCanAccessClient,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { PATCH } from './route'

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tests/test-1/quality-review', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('test quality review route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockCanAccessClient.mockResolvedValue(true)
    mockPrisma.test.findUnique.mockResolvedValue({
      id: 'test-1',
      clientId: 'client-1',
    })
    mockPrisma.test.update.mockResolvedValue({
      id: 'test-1',
      qualityReviewStatus: 'APPROVED',
      qualityReviewedBy: 'coach-1',
      qualityReviewedAt: new Date('2026-06-16T10:00:00.000Z'),
      qualityReviewNote: 'Checked source sheet.',
    })
  })

  it('approves a flagged test for an authorized coach', async () => {
    const response = await PATCH(
      request({ action: 'approve', note: 'Checked source sheet.' }),
      { params: Promise.resolve({ id: 'test-1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockPrisma.test.update).toHaveBeenCalledWith({
      where: { id: 'test-1' },
      data: {
        qualityReviewStatus: 'APPROVED',
        qualityReviewedBy: 'coach-1',
        qualityReviewedAt: expect.any(Date),
        qualityReviewNote: 'Checked source sheet.',
      },
      select: {
        id: true,
        qualityReviewStatus: true,
        qualityReviewedBy: true,
        qualityReviewedAt: true,
        qualityReviewNote: true,
      },
    })
  })

  it('returns 404 when the coach cannot access the athlete', async () => {
    mockCanAccessClient.mockResolvedValue(false)

    const response = await PATCH(
      request({ action: 'approve' }),
      { params: Promise.resolve({ id: 'test-1' }) }
    )

    expect(response.status).toBe(404)
    expect(mockPrisma.test.update).not.toHaveBeenCalled()
  })
})
