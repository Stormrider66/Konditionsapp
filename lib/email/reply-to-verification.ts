// lib/email/reply-to-verification.ts
import 'server-only'

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendGenericEmail } from '@/lib/email'
import { resolveEmailBranding } from '@/lib/email/branding'
import { emailButton, emailLayout } from '@/lib/email/email-branding-types'
import { logger } from '@/lib/logger'

const VERIFY_TOKEN_TTL_HOURS = 24

interface SendOptions {
  businessId: string
  newReplyToEmail: string
  /** Display name to greet the recipient (`name` field on Business) — falls back to "där" */
  businessName: string
}

/**
 * Persist a fresh verification token for the given replyToEmail and email it
 * to the recipient. The next save of `replyToEmail` invalidates this token by
 * generating a new one. Token TTL is 24h.
 */
export async function sendReplyToVerificationEmail(opts: SendOptions): Promise<{
  success: boolean
  error?: string
}> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000)

  await prisma.business.update({
    where: { id: opts.businessId },
    data: {
      replyToEmail: opts.newReplyToEmail,
      replyToEmailVerified: false,
      replyToEmailVerifyToken: token,
      replyToEmailVerifyExpires: expiresAt,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
  const verifyUrl = `${appUrl}/api/branding/reply-to/verify?token=${token}`

  // Branded email — uses the business's logo/colors so the recipient
  // recognises it as legitimate even though it lands in their personal inbox.
  const branding = await resolveEmailBranding(opts.businessId)
  const body = `
    <h2 style="margin-top: 0; color: #333;">Bekräfta din svar-adress</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      ${opts.businessName ? `<strong>${opts.businessName}</strong>` : 'En verksamhet på Trainomics'}
      vill skicka mail som svaras till <strong>${opts.newReplyToEmail}</strong>.
      Klicka nedan för att bekräfta att du läser den här inkorgen.
    </p>
    ${emailButton(branding, verifyUrl, 'Bekräfta svar-adress')}
    <p style="color: #888; font-size: 13px;">
      Länken är giltig i ${VERIFY_TOKEN_TTL_HOURS} timmar. Om du inte bett om detta kan du ignorera mejlet
      — adressen aktiveras inte förrän du klickar.
    </p>
  `
  const html = emailLayout(branding, 'Bekräfta din svar-adress', body)

  const result = await sendGenericEmail({
    to: opts.newReplyToEmail,
    subject: `Bekräfta svar-adress för ${opts.businessName || 'din verksamhet'}`,
    html,
    branding,
  }).catch((err) => {
    logger.error('Reply-to verify email failed', { businessId: opts.businessId }, err)
    return { success: false, error: 'Email send failed' }
  })

  return result.success
    ? { success: true }
    : { success: false, error: result.error || 'Email send failed' }
}

/**
 * Mark the business's reply-to as verified if the supplied token matches and
 * hasn't expired. Returns the businessId on success so the caller can show a
 * branded confirmation page.
 */
export async function consumeReplyToVerificationToken(token: string): Promise<{
  success: boolean
  businessId?: string
  error?: string
}> {
  if (!token || token.length < 8) {
    return { success: false, error: 'Ogiltig länk' }
  }

  const business = await prisma.business.findUnique({
    where: { replyToEmailVerifyToken: token },
    select: {
      id: true,
      replyToEmailVerifyExpires: true,
    },
  })

  if (!business) {
    return { success: false, error: 'Länken är ogiltig eller redan använd' }
  }

  if (
    business.replyToEmailVerifyExpires &&
    business.replyToEmailVerifyExpires.getTime() < Date.now()
  ) {
    return { success: false, error: 'Länken har gått ut. Spara adressen igen för att skicka en ny.' }
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      replyToEmailVerified: true,
      replyToEmailVerifyToken: null,
      replyToEmailVerifyExpires: null,
    },
  })

  return { success: true, businessId: business.id }
}
