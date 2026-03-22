import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
  },
}))

const mockGetResolvedGoogleKey = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/user-api-keys', () => ({
  getResolvedGoogleKey: mockGetResolvedGoogleKey,
}))

import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'

describe('resolveAthleteGoogleKeyContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the athlete client business when resolving a regular athlete key', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      businessId: 'business-1',
      userId: 'coach-owner-1',
    })
    mockGetResolvedGoogleKey.mockResolvedValue('google-key-1')

    const result = await resolveAthleteGoogleKeyContext({
      clientId: 'client-1',
      isCoachInAthleteMode: false,
      userId: 'athlete-user-1',
    })

    expect(mockGetResolvedGoogleKey).toHaveBeenCalledWith('coach-owner-1', {
      businessId: 'business-1',
    })
    expect(result).toEqual({
      businessId: 'business-1',
      clientUserId: 'coach-owner-1',
      googleKey: 'google-key-1',
      keyOwnerId: 'coach-owner-1',
    })
  })

  it('uses the coach user id in athlete mode while keeping the athlete business scope', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      businessId: 'business-2',
      userId: 'coach-owner-2',
    })
    mockGetResolvedGoogleKey.mockResolvedValue('google-key-2')

    const result = await resolveAthleteGoogleKeyContext({
      clientId: 'client-2',
      isCoachInAthleteMode: true,
      userId: 'coach-user-2',
    })

    expect(mockGetResolvedGoogleKey).toHaveBeenCalledWith('coach-user-2', {
      businessId: 'business-2',
    })
    expect(result).toEqual({
      businessId: 'business-2',
      clientUserId: 'coach-owner-2',
      googleKey: 'google-key-2',
      keyOwnerId: 'coach-user-2',
    })
  })

  it('returns null when the athlete client cannot be found', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null)

    const result = await resolveAthleteGoogleKeyContext({
      clientId: 'missing-client',
      isCoachInAthleteMode: false,
      userId: 'athlete-user-3',
    })

    expect(result).toBeNull()
    expect(mockGetResolvedGoogleKey).not.toHaveBeenCalled()
  })
})
