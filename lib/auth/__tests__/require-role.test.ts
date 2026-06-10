import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('../current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: vi.fn(),
  canAccessPhysioPlatform: vi.fn(),
}))

import { requireAdminRole, resolveEffectiveAdminRole } from '../require-role'

describe('resolveEffectiveAdminRole', () => {
  it('keeps explicit admin roles unchanged', () => {
    expect(resolveEffectiveAdminRole('COACH', 'SUPPORT')).toBe('SUPPORT')
    expect(resolveEffectiveAdminRole('ADMIN', 'ADMIN')).toBe('ADMIN')
  })

  it('treats legacy role=ADMIN without adminRole as SUPER_ADMIN during migration rollout', () => {
    expect(resolveEffectiveAdminRole('ADMIN', null)).toBe('SUPER_ADMIN')
  })

  it('does not grant admin access to non-admin roles without adminRole', () => {
    expect(resolveEffectiveAdminRole('COACH', null)).toBeNull()
    expect(resolveEffectiveAdminRole('ATHLETE', undefined)).toBeNull()
  })
})

describe('requireAdminRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      adminRole: null,
      language: 'en',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
  })

  it('allows a legacy role=ADMIN user while the backfill migration is still pending', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      adminRole: null,
      language: 'en',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    await expect(requireAdminRole(['SUPER_ADMIN'])).resolves.toMatchObject({
      id: 'user-1',
      adminRole: 'SUPER_ADMIN',
    })
  })

  it('denies a non-admin user without an explicit adminRole', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-2',
      email: 'coach@example.com',
      name: 'Coach User',
      role: 'COACH',
      adminRole: null,
      language: 'en',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    mocks.userFindUnique.mockResolvedValue({
      id: 'user-2',
      email: 'coach@example.com',
      name: 'Coach User',
      role: 'COACH',
      adminRole: null,
      language: 'en',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    await expect(requireAdminRole(['SUPER_ADMIN'])).rejects.toThrow(
      'Forbidden: requires one of these roles: SUPER_ADMIN'
    )
  })
})
