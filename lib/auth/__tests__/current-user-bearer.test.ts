import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * getCurrentUser() bearer-branch behavior. The load-bearing rule under test:
 * a present-but-invalid bearer token FAILS CLOSED (null) and never falls back
 * to the cookie session — proxy.ts's CSRF exemption for bearer requests
 * depends on it.
 */

const mocks = vi.hoisted(() => ({
  headerGet: vi.fn<(name: string) => string | null>(),
  getSupabaseUserFromBearer: vi.fn(),
  cookieAuthGetUser: vi.fn(),
  createServerClient: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: async () => ({ get: mocks.headerGet }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/lib/auth/bearer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../bearer')>()
  return {
    parseBearerJwt: actual.parseBearerJwt, // real parser — shape rules matter here
    getSupabaseUserFromBearer: mocks.getSupabaseUserFromBearer,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createServerClient,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
    },
  },
}))

vi.mock('@/lib/athlete-mode', () => ({
  isAthleteModeActive: vi.fn(),
  getAthleteModeAccess: vi.fn(),
}))
vi.mock('@/lib/business-context', () => ({
  getUserPrimaryBusinessSlug: vi.fn(),
}))
vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: vi.fn(),
  canAccessPhysioPlatform: vi.fn(),
  getPreferredProfessionalPortal: vi.fn(),
}))
vi.mock('@/lib/user-provisioning', () => ({
  buildSelfAthleteSubscriptionSeedForUser: vi.fn(),
  ensureAthleteClientDefaultsTx: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJl'

const dbUser = {
  id: 'supabase-user-1',
  email: 'athlete@example.com',
  name: 'Athlete',
  role: 'ATHLETE',
  adminRole: null,
  language: 'en',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

// getCurrentUser is wrapped in React.cache — import a fresh module per test
// so memoization can't leak results across tests.
async function importGetCurrentUser() {
  vi.resetModules()
  const mod = await import('../current-user')
  return mod.getCurrentUser
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.ENABLE_LOAD_TEST_BYPASS
  mocks.createServerClient.mockResolvedValue({
    auth: { getUser: mocks.cookieAuthGetUser },
  })
  mocks.cookieAuthGetUser.mockResolvedValue({ data: { user: null } })
})

describe('getCurrentUser bearer branch', () => {
  it('resolves the DB user from a valid bearer token without touching cookies', async () => {
    mocks.headerGet.mockImplementation((name) =>
      name === 'authorization' ? `Bearer ${JWT}` : null
    )
    mocks.getSupabaseUserFromBearer.mockResolvedValue({
      id: 'supabase-user-1',
      email: 'athlete@example.com',
      user_metadata: {},
    })
    mocks.userFindUnique.mockResolvedValue(dbUser)

    const getCurrentUser = await importGetCurrentUser()
    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'supabase-user-1' })

    expect(mocks.getSupabaseUserFromBearer).toHaveBeenCalledWith(JWT)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('FAILS CLOSED: an invalid bearer token returns null and never consults cookies', async () => {
    mocks.headerGet.mockImplementation((name) =>
      name === 'authorization' ? `Bearer ${JWT}` : null
    )
    mocks.getSupabaseUserFromBearer.mockResolvedValue(null)

    const getCurrentUser = await importGetCurrentUser()
    await expect(getCurrentUser()).resolves.toBeNull()

    expect(mocks.createServerClient).not.toHaveBeenCalled()
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
  })

  it('uses the cookie session when no Authorization header is present', async () => {
    mocks.headerGet.mockReturnValue(null)
    mocks.cookieAuthGetUser.mockResolvedValue({
      data: { user: { id: 'supabase-user-1', email: 'athlete@example.com', user_metadata: {} } },
    })
    mocks.userFindUnique.mockResolvedValue(dbUser)

    const getCurrentUser = await importGetCurrentUser()
    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'supabase-user-1' })

    expect(mocks.getSupabaseUserFromBearer).not.toHaveBeenCalled()
  })

  it('ignores bak_ API keys (existing scheme) and uses the cookie session', async () => {
    mocks.headerGet.mockImplementation((name) =>
      name === 'authorization' ? 'Bearer bak_1234567890' : null
    )

    const getCurrentUser = await importGetCurrentUser()
    await expect(getCurrentUser()).resolves.toBeNull()

    expect(mocks.getSupabaseUserFromBearer).not.toHaveBeenCalled()
    expect(mocks.createServerClient).toHaveBeenCalled()
  })

  it('auto-creates a missing user on first bearer sign-in (same as cookie path)', async () => {
    mocks.headerGet.mockImplementation((name) =>
      name === 'authorization' ? `Bearer ${JWT}` : null
    )
    mocks.getSupabaseUserFromBearer.mockResolvedValue({
      id: 'supabase-user-2',
      email: 'new@example.com',
      user_metadata: { name: 'New Athlete' },
    })
    mocks.userFindUnique.mockResolvedValue(null)
    mocks.userCreate.mockResolvedValue({ ...dbUser, id: 'supabase-user-2', email: 'new@example.com' })

    const getCurrentUser = await importGetCurrentUser()
    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'supabase-user-2' })

    expect(mocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'supabase-user-2',
          email: 'new@example.com',
          name: 'New Athlete',
          role: 'ATHLETE',
        }),
      })
    )
  })
})
