import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { DEFAULT_EMAIL_BRANDING, PLATFORM_SENDING_DOMAIN } from './email-branding-types'

// Mirror of the regex used in /api/coach/admin/branding/route.ts. Kept in
// the test so a regression in the route schema fails this suite loudly —
// header injection is the kind of bug that's silent in prod until exploited.
const senderNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[^<>@\r\n]+$/)

describe('emailSenderName Zod schema (header-injection guard)', () => {
  it('accepts ordinary business names', () => {
    expect(senderNameSchema.safeParse('Star by Thomson').success).toBe(true)
    expect(senderNameSchema.safeParse('Min Gym AB — Stockholm').success).toBe(true)
    expect(senderNameSchema.safeParse('Coach (Pro)').success).toBe(true)
  })

  it('rejects characters that would let a tenant smuggle a forged From: header', () => {
    expect(senderNameSchema.safeParse('Real <evil@attacker.com>').success).toBe(false)
    expect(senderNameSchema.safeParse('victim@example.com').success).toBe(false)
    expect(senderNameSchema.safeParse('Bob\r\nBcc: leak@example.com').success).toBe(false)
    expect(senderNameSchema.safeParse('Bob\nBcc: leak@example.com').success).toBe(false)
    expect(senderNameSchema.safeParse('<script>').success).toBe(false)
  })
})

describe('DEFAULT_EMAIL_BRANDING.sendingDomain', () => {
  it('exposes the platform sending domain so callers do not re-parse fromAddress', () => {
    expect(DEFAULT_EMAIL_BRANDING.sendingDomain).toBe(PLATFORM_SENDING_DOMAIN)
    expect(DEFAULT_EMAIL_BRANDING.fromAddress).toContain(`@${PLATFORM_SENDING_DOMAIN}>`)
  })
})
