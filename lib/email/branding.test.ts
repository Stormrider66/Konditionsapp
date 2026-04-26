import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBusiness = vi.hoisted(() => ({
  businessName: 'Star by Thomson',
  businessSlug: 'star-by-thomson',
  logoUrl: null,
  primaryColor: '#3b82f6',
  faviconUrl: null,
  secondaryColor: null,
  backgroundColor: null,
  fontFamily: null,
  replyToEmail: null,
  replyToEmailVerified: false,
  customDomain: null,
  domainVerified: false,
  customEmailDomain: 'thomsons.se',
  customEmailVerified: true,
  emailSenderName: 'Star by Thomson',
  pageTitle: null,
  hidePlatformBranding: false,
  hasCustomBranding: true,
  hasWhiteLabel: true,
}))

const mockResolveBranding = vi.hoisted(() => vi.fn())
const mockUserFindUnique = vi.hoisted(() => vi.fn())

vi.mock('@/lib/branding/resolve-branding', () => ({
  resolveBusinessBrandingById: mockResolveBranding,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
  },
}))

import { resolveEmailBranding } from './branding'

describe('resolveEmailBranding — per-user sender override', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveBranding.mockResolvedValue(mockBusiness)
  })

  it('falls back to noreply@<sending-domain> when no senderUserId is given', async () => {
    const branding = await resolveEmailBranding('biz-1')
    expect(branding.fromAddress).toBe('Star by Thomson <noreply@thomsons.se>')
    expect(branding.replyTo).toBe('support@trainomics.app')
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('uses the sender as From: + Reply-To when their email is on the verified custom domain', async () => {
    mockUserFindUnique.mockResolvedValue({
      email: 'henrik@thomsons.se',
      name: 'Henrik Lundholm',
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-henrik' })

    expect(branding.fromAddress).toBe('Henrik Lundholm <henrik@thomsons.se>')
    expect(branding.replyTo).toBe('henrik@thomsons.se')
    expect(branding.senderName).toBe('Henrik Lundholm')
  })

  it('keeps the noreply fallback when the sender uses a different email domain', async () => {
    mockUserFindUnique.mockResolvedValue({
      email: 'henrik@gmail.com',
      name: 'Henrik Lundholm',
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-henrik' })

    expect(branding.fromAddress).toBe('Star by Thomson <noreply@thomsons.se>')
    expect(branding.replyTo).toBe('support@trainomics.app')
  })

  it('skips the override entirely when the custom domain is not yet verified', async () => {
    mockResolveBranding.mockResolvedValue({
      ...mockBusiness,
      customEmailVerified: false,
    })
    mockUserFindUnique.mockResolvedValue({
      email: 'henrik@thomsons.se',
      name: 'Henrik Lundholm',
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-henrik' })

    // Falls back to platform sending domain — Resend hasn't verified theirs yet.
    expect(branding.fromAddress).toBe('Star by Thomson <noreply@trainomics.app>')
    // And user lookup should never run because the override is gated on verified.
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('matches the email domain case-insensitively', async () => {
    mockUserFindUnique.mockResolvedValue({
      email: 'Henrik@Thomsons.SE',
      name: 'Henrik Lundholm',
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-henrik' })

    expect(branding.fromAddress).toBe('Henrik Lundholm <Henrik@Thomsons.SE>')
    expect(branding.replyTo).toBe('Henrik@Thomsons.SE')
  })

  it("falls back to the business sender name if the sender User has no name set", async () => {
    mockUserFindUnique.mockResolvedValue({
      email: 'henrik@thomsons.se',
      name: null,
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-henrik' })

    // No personal name available — display name reverts to the business label.
    expect(branding.fromAddress).toBe('Star by Thomson <henrik@thomsons.se>')
  })
})
