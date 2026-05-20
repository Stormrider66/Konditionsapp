import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_EMAIL_BRANDING } from './email/email-branding-types'

const mockClientFindUnique = vi.hoisted(() => vi.fn())
const mockUserFindFirst = vi.hoisted(() => vi.fn())
const mockUserFindUnique = vi.hoisted(() => vi.fn())
const mockUserUpdate = vi.hoisted(() => vi.fn())
const mockGenerateLink = vi.hoisted(() => vi.fn())
const mockUpdateUserById = vi.hoisted(() => vi.fn())
const mockSendGenericEmail = vi.hoisted(() => vi.fn())
const mockResolveEmailBranding = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findUnique: mockClientFindUnique },
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
    },
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({
    auth: {
      admin: {
        generateLink: mockGenerateLink,
        updateUserById: mockUpdateUserById,
      },
    },
  }),
}))

vi.mock('@/lib/email', () => ({
  sendGenericEmail: mockSendGenericEmail,
}))

vi.mock('@/lib/email/branding', () => ({
  resolveEmailBranding: mockResolveEmailBranding,
}))

vi.mock('@/lib/url-utils', () => ({
  buildRecoveryCallbackUrl: () => 'https://trainomics.app/auth/callback?token=fake',
}))

import { sendAthletePlatformInvite } from './athlete-platform-invite'

describe('sendAthletePlatformInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClientFindUnique
      .mockResolvedValueOnce({
        id: 'client-1',
        name: 'Alex Athlete',
        email: 'alex@example.com',
        athleteAccount: {
          userId: 'athlete-user-1',
          user: {
            id: 'athlete-user-1',
            email: 'alex@example.com',
            name: 'Alex Athlete',
          },
        },
      })
      .mockResolvedValueOnce({
        id: 'client-1',
        name: 'Alex Athlete',
        email: 'alex@example.com',
        businessId: 'business-1',
        business: {
          name: 'Pilot Hockey Club',
          slug: 'pilot-hockey',
        },
        athleteAccount: {
          userId: 'athlete-user-1',
          user: { email: 'alex@example.com' },
        },
      })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: 'https://example.com/action' } },
      error: null,
    })
    mockResolveEmailBranding.mockResolvedValue(DEFAULT_EMAIL_BRANDING)
    mockUserFindUnique.mockResolvedValue({ name: 'Coach Carter' })
  })

  it('reports paused outbound email without claiming the invite was sent', async () => {
    mockSendGenericEmail.mockResolvedValue({
      success: true,
      messageId: 'paused',
      paused: true,
    })

    const result = await sendAthletePlatformInvite('client-1', 'coach-1')

    expect(result).toMatchObject({
      success: true,
      emailSent: false,
      emailPaused: true,
      email: 'alex@example.com',
      error: 'Outbound email is paused',
    })
  })
})
