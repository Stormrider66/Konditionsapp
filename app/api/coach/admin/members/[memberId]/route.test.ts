import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockRequireBusinessAdminRole = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockGetLastOwnerGuardError = vi.hoisted(() => vi.fn())
const mockHandleApiError = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  businessMember: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/auth-utils', () => ({
  requireBusinessAdminRole: mockRequireBusinessAdminRole,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/business-member-guards', () => ({
  getLastOwnerGuardError: mockGetLastOwnerGuardError,
}))

vi.mock('@/lib/api-error', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number

    constructor(message: string, statusCode = 400) {
      super(message)
      this.statusCode = statusCode
    }

    static badRequest(message: string) {
      return new this(message, 400)
    }
  },
  handleApiError: mockHandleApiError,
}))

import { DELETE, PUT } from '@/app/api/coach/admin/members/[memberId]/route'

describe('coach admin member route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRequestedBusinessScope.mockReturnValue({ businessId: 'biz-1' })
    mockHandleApiError.mockImplementation((error: { message: string; statusCode?: number }) =>
      NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 500 }
      )
    )
  })

  it('DELETE blocks removal of the last owner', async () => {
    mockRequireBusinessAdminRole.mockResolvedValue({
      id: 'owner-1',
      businessId: 'biz-1',
      businessRole: 'OWNER',
    })
    mockPrisma.businessMember.findFirst.mockResolvedValue({
      id: 'member-1',
      businessId: 'biz-1',
      userId: 'owner-2',
      role: 'OWNER',
      isActive: true,
    })
    mockGetLastOwnerGuardError.mockResolvedValue('Cannot remove the last owner')

    const tx = {
      businessMember: {
        delete: vi.fn(),
      },
    }
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx))

    const request = new NextRequest('http://localhost/api/coach/admin/members/member-1', {
      method: 'DELETE',
      headers: {
        'x-business-id': 'biz-1',
      },
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ memberId: 'member-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Cannot remove the last owner')
    expect(tx.businessMember.delete).not.toHaveBeenCalled()
  })

  it('PUT prevents admins from managing other privileged members', async () => {
    mockRequireBusinessAdminRole.mockResolvedValue({
      id: 'admin-1',
      businessId: 'biz-1',
      businessRole: 'ADMIN',
    })
    mockPrisma.businessMember.findFirst.mockResolvedValue({
      id: 'member-2',
      businessId: 'biz-1',
      userId: 'owner-2',
      role: 'ADMIN',
      isActive: true,
    })

    const request = new NextRequest('http://localhost/api/coach/admin/members/member-2', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-business-id': 'biz-1',
      },
      body: JSON.stringify({
        role: 'MEMBER',
      }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ memberId: 'member-2' }),
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Admins can only manage coaches and members')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})
