import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdminRole: vi.fn(),
  prisma: {
    business: {
      findUnique: vi.fn(),
    },
    businessFeature: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAdminRole: mocks.requireAdminRole,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { PATCH } from '@/app/api/admin/businesses/[id]/ai-operations/route'

function request(body: unknown) {
  return new NextRequest('http://localhost/api/admin/businesses/business-1/ai-operations', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function ctx(id = 'business-1') {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/admin/businesses/[id]/ai-operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminRole.mockResolvedValue({ id: 'admin-1' })
    mocks.prisma.business.findUnique.mockResolvedValue({
      id: 'business-1',
      name: 'Konditionslabbet',
      slug: 'konditionslabbet',
    })
    mocks.prisma.businessFeature.upsert.mockResolvedValue({
      id: 'feature-1',
      feature: 'AI_ASSISTANT_OPERATIONS',
      isEnabled: true,
      enabledAt: new Date('2026-06-06T08:00:00Z'),
      expiresAt: null,
      updatedAt: new Date('2026-06-06T08:00:00Z'),
    })
  })

  it('enables the AI operations beta for a business', async () => {
    const response = await PATCH(request({ enabled: true }), ctx())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.enabled).toBe(true)
    expect(mocks.requireAdminRole).toHaveBeenCalledWith(['SUPER_ADMIN', 'ADMIN'])
    expect(mocks.prisma.businessFeature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId_feature: {
            businessId: 'business-1',
            feature: 'AI_ASSISTANT_OPERATIONS',
          },
        },
        update: expect.objectContaining({
          isEnabled: true,
          expiresAt: null,
        }),
        create: expect.objectContaining({
          businessId: 'business-1',
          feature: 'AI_ASSISTANT_OPERATIONS',
          isEnabled: true,
        }),
      })
    )
  })

  it('disables the beta by storing a disabled feature row', async () => {
    mocks.prisma.businessFeature.upsert.mockResolvedValue({
      id: 'feature-1',
      feature: 'AI_ASSISTANT_OPERATIONS',
      isEnabled: false,
      enabledAt: null,
      expiresAt: null,
      updatedAt: new Date('2026-06-06T08:00:00Z'),
    })

    const response = await PATCH(request({ enabled: false }), ctx())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.enabled).toBe(false)
    expect(mocks.prisma.businessFeature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          isEnabled: false,
          enabledAt: null,
          expiresAt: null,
        }),
      })
    )
  })

  it('returns 404 when the business does not exist', async () => {
    mocks.prisma.business.findUnique.mockResolvedValue(null)

    const response = await PATCH(request({ enabled: true }), ctx())

    expect(response.status).toBe(404)
    expect(mocks.prisma.businessFeature.upsert).not.toHaveBeenCalled()
  })

  it('denies non-admin operators before touching business data', async () => {
    mocks.requireAdminRole.mockRejectedValue(new Error('Access denied'))

    const response = await PATCH(request({ enabled: true }), ctx())

    expect(response.status).toBe(403)
    expect(mocks.prisma.business.findUnique).not.toHaveBeenCalled()
    expect(mocks.prisma.businessFeature.upsert).not.toHaveBeenCalled()
  })
})
