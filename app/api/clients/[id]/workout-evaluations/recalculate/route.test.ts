import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())
const mockRecalculate = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
}))

vi.mock('@/lib/api/utils', () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock('@/lib/auth-utils', () => ({
  canAccessClient: mockCanAccessClient,
}))

vi.mock('@/lib/workout-evaluation', () => ({
  recalculateWorkoutEvaluationsForClient: mockRecalculate,
}))

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}))

import { POST } from './route'

function request(body: unknown) {
  return new NextRequest('http://localhost/api/clients/client-1/workout-evaluations/recalculate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('/api/clients/[id]/workout-evaluations/recalculate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'coach-1', role: 'COACH', language: 'en' })
    mockCanAccessClient.mockResolvedValue(true)
    mockRecalculate.mockResolvedValue({ rebuilt: 2, deleted: 1, evaluationIds: ['eval-1', 'eval-2'] })
  })

  it('blocks athletes from staff-only recalculation', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'athlete-1', role: 'ATHLETE', language: 'en' })

    const response = await POST(request({ days: 30 }), {
      params: Promise.resolve({ id: 'client-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.success).toBe(false)
    expect(mockRecalculate).not.toHaveBeenCalled()
  })

  it('blocks staff without client access', async () => {
    mockCanAccessClient.mockResolvedValue(false)

    const response = await POST(request({ days: 30 }), {
      params: Promise.resolve({ id: 'client-1' }),
    })

    expect(response.status).toBe(404)
    expect(mockRecalculate).not.toHaveBeenCalled()
  })

  it('recalculates the requested date range for authorized staff', async () => {
    const response = await POST(request({
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-20T00:00:00.000Z',
    }), {
      params: Promise.resolve({ id: 'client-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual({ rebuilt: 2, deleted: 1, evaluationIds: ['eval-1', 'eval-2'] })
    expect(mockRecalculate).toHaveBeenCalledWith({
      clientId: 'client-1',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-20T00:00:00.000Z'),
      deleteMissing: true,
    })
  })
})
