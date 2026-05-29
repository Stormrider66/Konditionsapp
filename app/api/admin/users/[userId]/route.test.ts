/**
 * Contract tests for DELETE /api/admin/users/[userId].
 *
 * This is the destructive admin path: it runs a big cleanup transaction, then
 * deletes the Supabase auth user and writes an audit entry. Pin the guards
 * (admin-only, no self-delete, 404 for unknown users) and the happy-path
 * orchestration (transaction → auth delete → audit). Track 4 will extend this
 * to assert that financial/referral history is RETAINED rather than wiped.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAdmin = vi.hoisted(() => vi.fn())
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockTransaction = vi.hoisted(() => vi.fn())
const mockDeleteAuthUser = vi.hoisted(() => vi.fn())
const mockLogAuditEvent = vi.hoisted(() => vi.fn())
const mockArchiveCreate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({
    auth: { admin: { deleteUser: mockDeleteAuthUser } },
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/audit/log', () => ({
  logAuditEvent: mockLogAuditEvent,
  getIpFromRequest: () => '127.0.0.1',
  getUserAgentFromRequest: () => 'vitest',
}))

import { DELETE } from '@/app/api/admin/users/[userId]/route'

// A transaction client where any model returns resolving read/write stubs, so
// the route's snapshot reads + long cleanup chain complete. The archive table's
// create is a shared spy so we can assert the snapshot was written.
function makeTxClient() {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'deletedUserDataArchive') {
          return { create: mockArchiveCreate }
        }
        return {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          update: vi.fn().mockResolvedValue({}),
          delete: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        }
      },
    },
  )
}

function deleteRequest() {
  return new NextRequest('http://localhost/api/admin/users/target-1', { method: 'DELETE' })
}

function ctx(userId: string) {
  return { params: Promise.resolve({ userId }) }
}

describe('DELETE /api/admin/users/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', language: 'en' })
    mockFindUnique.mockResolvedValue({ id: 'target-1', email: 't@example.com', name: 'Target', role: 'COACH' })
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(makeTxClient()))
    mockDeleteAuthUser.mockResolvedValue({ data: {}, error: null })
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockArchiveCreate.mockResolvedValue({})
  })

  it('rejects non-admins with 403 (not a generic 500), nothing touched', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Access denied. Platform admin access required.'))

    const res = await DELETE(deleteRequest(), ctx('target-1'))

    expect(res.status).toBe(403)
    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockDeleteAuthUser).not.toHaveBeenCalled()
  })

  it('refuses to let an admin delete their own account (400)', async () => {
    const res = await DELETE(deleteRequest(), ctx('admin-1'))

    expect(res.status).toBe(400)
    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns 404 when the target user does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await DELETE(deleteRequest(), ctx('target-1'))

    expect(res.status).toBe(404)
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockDeleteAuthUser).not.toHaveBeenCalled()
  })

  it('deletes the user: runs the cleanup transaction, deletes the auth user, and audits', async () => {
    const res = await DELETE(deleteRequest(), ctx('target-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockDeleteAuthUser).toHaveBeenCalledWith('target-1')
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_DELETE', targetId: 'target-1', targetType: 'User' }),
    )
  })

  it('archives the financial/referral snapshot before wiping the user (Track 4 retention)', async () => {
    await DELETE(deleteRequest(), ctx('target-1'))

    expect(mockArchiveCreate).toHaveBeenCalledTimes(1)
    expect(mockArchiveCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deletedUserId: 'target-1',
          email: 't@example.com',
          deletedByUserId: 'admin-1',
          snapshot: expect.any(Object),
        }),
      }),
    )
  })

  it('still succeeds (200) when the Supabase auth delete fails — DB cleanup already ran', async () => {
    mockDeleteAuthUser.mockRejectedValue(new Error('auth down'))

    const res = await DELETE(deleteRequest(), ctx('target-1'))

    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })
})
