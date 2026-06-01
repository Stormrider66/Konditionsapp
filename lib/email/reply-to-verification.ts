// lib/email/reply-to-verification.ts
import 'server-only'

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendGenericEmail } from '@/lib/email'
import { resolveEmailBranding } from '@/lib/email/branding'
import { emailButton, emailLayout } from '@/lib/email/email-branding-types'
import { logger } from '@/lib/logger'
import type { EmailLocale } from './templates'

const VERIFY_TOKEN_TTL_HOURS = 24
type AppLocale = 'en' | 'sv'

interface SendOptions {
  businessId: string
  newReplyToEmail: string
  /** Display name to greet the recipient (`name` field on Business). */
  businessName: string
  locale?: EmailLocale
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
  const locale = opts.locale ?? 'en'
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
  const verifyUrl = `${appUrl}/api/branding/reply-to/verify?token=${token}&locale=${locale}`

  // Branded email — uses the business's logo/colors so the recipient
  // recognises it as legitimate even though it lands in their personal inbox.
  const branding = await resolveEmailBranding(opts.businessId)
  const copy = locale === 'sv'
    ? {
        title: 'Bekräfta din svar-adress',
        organization: 'En verksamhet på Trainomics',
        message: `${opts.businessName ? `<strong>${opts.businessName}</strong>` : 'En verksamhet på Trainomics'} vill skicka mail som svaras till <strong>${opts.newReplyToEmail}</strong>. Klicka nedan för att bekräfta att du läser den här inkorgen.`,
        cta: 'Bekräfta svar-adress',
        footer: `Länken är giltig i ${VERIFY_TOKEN_TTL_HOURS} timmar. Om du inte bett om detta kan du ignorera mejlet
      — adressen aktiveras inte förrän du klickar.`,
      }
    : {
        title: 'Confirm your reply-to address',
        organization: 'An organization on Trainomics',
        message: `${opts.businessName ? `<strong>${opts.businessName}</strong>` : 'An organization on Trainomics'} will send mail to replies at <strong>${opts.newReplyToEmail}</strong>. Click below to confirm this inbox.`,
        cta: 'Confirm reply address',
        footer: `This link is valid for ${VERIFY_TOKEN_TTL_HOURS} hours. If you did not request this, you can ignore the email — the address will not be activated until you click.`,
      }
  const body = `
    <h2 style="margin-top: 0; color: #333;">${copy.title}</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      ${copy.message}
    </p>
    ${emailButton(branding, verifyUrl, copy.cta)}
    <p style="color: #888; font-size: 13px;">
      ${copy.footer}
    </p>
  `
  const html = emailLayout(branding, copy.title, body)

  const result = await sendGenericEmail({
    to: opts.newReplyToEmail,
    subject:
      locale === 'sv'
        ? `Bekräfta svar-adress för ${opts.businessName || 'din verksamhet'}`
        : `Confirm reply-to address for ${opts.businessName || copy.organization}`,
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
function resolveLocale(locale: string | null | undefined): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function consumeReplyToVerificationToken(token: string, localeInput?: string | null): Promise<{
  success: boolean
  businessId?: string
  error?: string
}> {
  const locale = resolveLocale(localeInput)
  if (!token || token.length < 8) {
    return { success: false, error: t(locale, 'Invalid link', 'Ogiltig länk') }
  }

  const business = await prisma.business.findUnique({
    where: { replyToEmailVerifyToken: token },
    select: {
      id: true,
      replyToEmailVerifyExpires: true,
    },
  })

  if (!business) {
    return { success: false, error: t(locale, 'The link is invalid or has already been used', 'Länken är ogiltig eller redan använd') }
  }

  if (
    business.replyToEmailVerifyExpires &&
    business.replyToEmailVerifyExpires.getTime() < Date.now()
  ) {
    return {
      success: false,
      error: t(
        locale,
        'The link has expired. Save the address again to send a new one.',
        'Länken har gått ut. Spara adressen igen för att skicka en ny.',
      ),
    }
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
