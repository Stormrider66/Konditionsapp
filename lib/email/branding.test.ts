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

  it('uses person + business display name and routes Reply-To to the user, even when the sender is on a different email domain (path A)', async () => {
    // The custom email domain is verified for thomsons.se, but Henrik's
    // personal Trainomics account uses gmail.com. We can't put gmail in
    // the From: header (DMARC), but we can still personalise the display
    // name and route replies to him.
    mockUserFindUnique.mockResolvedValue({
      email: 'henrik@gmail.com',
      name: 'Henrik Lundholm',
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-henrik' })

    expect(branding.fromAddress).toBe('Henrik Lundholm – Star by Thomson <noreply@thomsons.se>')
    expect(branding.replyTo).toBe('henrik@gmail.com')
  })

  it('still routes Reply-To to the user when the custom domain is not verified yet (path A in pure form)', async () => {
    // No verified sending domain → mail goes from noreply@trainomics.app,
    // but the display name and Reply-To still personalise to the staff
    // member so recipients know it's from Henrik at Star by Thomson.
    mockResolveBranding.mockResolvedValue({
      ...mockBusiness,
      customEmailVerified: false,
    })
    mockUserFindUnique.mockResolvedValue({
      email: 'starhenrik@thomsons.se',
      name: 'Henrik Lundholm',
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-henrik' })

    // Falls back to platform sending domain — Resend hasn't verified theirs yet.
    expect(branding.fromAddress).toBe('Henrik Lundholm – Star by Thomson <noreply@trainomics.app>')
    // Reply-To still goes to the staff member — Reply-To doesn't need DKIM.
    expect(branding.replyTo).toBe('starhenrik@thomsons.se')
  })

  it('omits the personal name when sender has no name (and falls back to business sender)', async () => {
    mockResolveBranding.mockResolvedValue({
      ...mockBusiness,
      customEmailVerified: false,
    })
    mockUserFindUnique.mockResolvedValue({
      email: 'noname@thomsons.se',
      name: null,
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'user-noname' })

    expect(branding.fromAddress).toBe('Star by Thomson <noreply@trainomics.app>')
    expect(branding.replyTo).toBe('noname@thomsons.se')
  })

  it('strips RFC 5322 header-breaking specials from a malformed user name', async () => {
    mockResolveBranding.mockResolvedValue({
      ...mockBusiness,
      customEmailVerified: false,
    })
    mockUserFindUnique.mockResolvedValue({
      email: 'sneaky@thomsons.se',
      name: 'Henrik <evil@attacker.com>\r\nBcc: leak@example.com',
    })

    const branding = await resolveEmailBranding('biz-1', { senderUserId: 'sneaky' })

    // The four characters that would let an attacker break out of the
    // display-name slot and inject a forged From: or Bcc: header MUST be
    // stripped: < > \r \n. We also strip @ to avoid the recipient seeing
    // a confusing fake email-looking string inside the display name.
    const headerInjectionChars = ['<', '>', '@', '\r', '\n']
    for (const ch of headerInjectionChars) {
      // The display-name portion of the header (everything before the final
      // `<...>` containing the actual sender) must not contain these.
      const displayPart = branding.fromAddress.replace(/<[^>]*>$/, '')
      expect(displayPart).not.toContain(ch)
    }
    // The actual sender mailbox is still the platform default.
    expect(branding.fromAddress).toContain('<noreply@trainomics.app>')
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
    // Reply-To still goes to the verified mailbox.
    expect(branding.replyTo).toBe('henrik@thomsons.se')
  })
})
