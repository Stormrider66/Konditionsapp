import { afterEach, describe, expect, it } from 'vitest'
import { sendGenericEmail } from './index'

describe('email pause kill switch', () => {
  const originalEmailsPaused = process.env.EMAILS_PAUSED
  const originalResendApiKey = process.env.RESEND_API_KEY

  afterEach(() => {
    if (originalEmailsPaused == null) delete process.env.EMAILS_PAUSED
    else process.env.EMAILS_PAUSED = originalEmailsPaused

    if (originalResendApiKey == null) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalResendApiKey
  })

  it('marks suppressed emails as paused instead of ordinary sent mail', async () => {
    process.env.EMAILS_PAUSED = 'true'
    delete process.env.RESEND_API_KEY

    const result = await sendGenericEmail({
      to: 'athlete@example.com',
      subject: 'Invite',
      html: '<p>Hello</p>',
    })

    expect(result).toEqual({
      success: true,
      messageId: 'paused',
      paused: true,
    })
  })
})
