import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireBusinessAdminRole = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockHandleApiError = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  business: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireBusinessAdminRole: mockRequireBusinessAdminRole,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/api-error', () => ({
  handleApiError: mockHandleApiError,
}))

import { GET, PUT } from './route'

describe('/api/coach/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRequestedBusinessScope.mockReturnValue({ businessId: 'business_1' })
    mockRequireBusinessAdminRole.mockResolvedValue({ businessId: 'business_1' })
    mockHandleApiError.mockImplementation((error) => {
      throw error
    })
  })

  it('GET returns Elite pricing and AI allowance in SEK', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      id: 'business_1',
      name: 'Star Training',
      slug: 'star',
      description: null,
      email: null,
      phone: null,
      website: null,
      address: null,
      city: null,
      postalCode: null,
      country: 'SE',
      logoUrl: null,
      primaryColor: '#3b82f6',
      elitePriceMonthly: 79900,
      elitePriceYearly: 799000,
      eliteDescription: 'Elite coaching',
      eliteAiAllowanceSek: 240,
      isActive: true,
      defaultRevenueShare: 20,
      createdAt: new Date('2026-05-01T00:00:00Z'),
      updatedAt: new Date('2026-05-01T00:00:00Z'),
      locations: [],
      enterpriseContract: null,
    })

    const response = await GET(new NextRequest('http://localhost/api/coach/admin/settings'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      elitePriceMonthly: 799,
      elitePriceYearly: 7990,
      eliteDescription: 'Elite coaching',
      eliteAiAllowanceSek: 240,
    })
  })

  it('PUT stores Elite prices in ore and allowance in SEK', async () => {
    mockPrisma.business.update.mockResolvedValue({
      id: 'business_1',
      name: 'Star Training',
      slug: 'star',
      elitePriceMonthly: 89900,
      elitePriceYearly: 899000,
      eliteDescription: 'Premium coaching',
      eliteAiAllowanceSek: 275,
    })

    const request = new NextRequest('http://localhost/api/coach/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Star Training',
        elitePriceMonthly: 899,
        elitePriceYearly: 8990,
        eliteDescription: 'Premium coaching',
        eliteAiAllowanceSek: 275,
      }),
    })

    const response = await PUT(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.business.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'business_1' },
      data: expect.objectContaining({
        elitePriceMonthly: 89900,
        elitePriceYearly: 899000,
        eliteDescription: 'Premium coaching',
        eliteAiAllowanceSek: 275,
      }),
    }))
  })
})
