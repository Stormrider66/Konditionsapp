// lib/email/send-test-result-invite.ts
//
// Sends an email inviting an athlete to view a finished test result.
// Two paths:
//
//  1. Athlete already has a User/AthleteAccount → magic link to log in,
//     deep-linked to /<slug>/athlete/tests/<testId>.
//
//  2. Athlete has no account yet → create one (FREE tier) via
//     createAthleteAccountForClient, then send a Supabase recovery link
//     so the athlete picks their own password. Same redirect to the test
//     page once they're authenticated.
//
// The email itself never contains the actual result data (VO2max, lactate
// values, training zones) — those live behind the login. The mail only
// surfaces the test type, date, the test leader's name, and an optional
// custom message from the coach.

import 'server-only'

import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { sendGenericEmail } from '@/lib/email'
import { resolveEmailBranding } from '@/lib/email/branding'
import { emailButton, emailLayout } from '@/lib/email/email-branding-types'
import { createAthleteAccountForClient } from '@/lib/athlete-account-utils'
import { buildRecoveryCallbackUrl } from '@/lib/url-utils'

export interface SendTestResultInviteResult {
  success: boolean
  error?: string
  athleteAccountCreated?: boolean
  emailSent?: boolean
}

interface SendOptions {
  testId: string
  /** Coach issuing the send. Used for senderUserId branding override and audit. */
  coachUserId: string
  /** Optional free-text message from the test leader to the athlete. */
  message?: string
}

const TEST_TYPE_LABELS: Record<string, string> = {
  RUNNING: 'löptest',
  CYCLING: 'cykeltest',
  SKIING: 'skidåkningstest',
}

function formatTestDate(date: Date): string {
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendTestResultInvite(
  opts: SendOptions,
): Promise<SendTestResultInviteResult> {
  // 1. Load the test + client + business + tester + coach
  const test = await prisma.test.findUnique({
    where: { id: opts.testId },
    select: {
      id: true,
      testDate: true,
      testType: true,
      testLeader: true,
      userId: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          businessId: true,
          business: { select: { slug: true } },
          athleteAccount: {
            select: { id: true, userId: true, user: { select: { email: true } } },
          },
        },
      },
      tester: { select: { name: true } },
      user: { select: { name: true } },
    },
  })

  if (!test) return { success: false, error: 'Testet hittades inte' }
  if (!test.client.email) {
    return { success: false, error: 'Klienten har ingen e-postadress' }
  }
  if (!test.client.business?.slug) {
    return {
      success: false,
      error: 'Klienten är inte kopplad till en verksamhet — kan inte bygga djuplänk',
    }
  }

  const businessSlug = test.client.business.slug
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
  const testPath = `/${businessSlug}/athlete/tests/${test.id}`
  const testFullUrl = `${appUrl}${testPath}`

  // 2. Ensure the athlete has an AthleteAccount. Create on-demand if not.
  let athleteAccountCreated = false
  if (!test.client.athleteAccount) {
    const created = await createAthleteAccountForClient(test.client.id, opts.coachUserId, {
      tier: 'FREE',
    })
    if (!created.success) {
      return {
        success: false,
        error: created.error || 'Kunde inte skapa atletkonto',
      }
    }
    athleteAccountCreated = true
  }

  // 3. Generate the right Supabase auth link. Recovery for brand-new accounts
  //    (lets them set a password); magic-link for existing accounts (single-use
  //    log in without resetting their existing password).
  const supabaseAdmin = createAdminSupabaseClient()
  const callbackUrl = `${appUrl}/api/auth/callback?next=${encodeURIComponent(testPath)}`
  const linkType: 'recovery' | 'magiclink' = athleteAccountCreated
    ? 'recovery'
    : 'magiclink'

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: linkType,
    email: test.client.email,
    options: { redirectTo: callbackUrl },
  })

  if (linkError) {
    logger.error('Test invite: link generation failed', {
      testId: opts.testId,
      type: linkType,
    }, linkError)
  }

  // For recovery links, prefer our own callback URL (carries the hashed token
  // from Supabase's redirect). For magic links, use Supabase's `action_link`
  // directly — that already routes through their auth handler.
  const ctaUrl =
    linkType === 'recovery'
      ? buildRecoveryCallbackUrl(linkData, appUrl) || callbackUrl
      : linkData?.properties?.action_link || callbackUrl

  // 4. Resolve branding (with sender override so the From: address becomes
  //    the test leader's email when on a verified custom domain).
  const branding = await resolveEmailBranding(test.client.businessId ?? null, {
    senderUserId: opts.coachUserId,
  })

  // 5. Build the email content. No result data — only context that helps
  //    the athlete recognise this email is legitimately about their test.
  const testTypeLabel = TEST_TYPE_LABELS[test.testType] ?? 'test'
  const testDate = formatTestDate(test.testDate)
  const leaderName = test.tester?.name ?? test.testLeader ?? test.user?.name ?? null
  const safeAthleteFirstName = escapeHtml(test.client.name.split(' ')[0] || test.client.name)
  const safeLeaderName = leaderName ? escapeHtml(leaderName) : null
  const safeMessage = opts.message?.trim() ? escapeHtml(opts.message.trim()) : null

  const intro = athleteAccountCreated
    ? `Vi har skapat ett konto åt dig så att du kan se ditt ${testTypeLabel} från ${testDate}. Klicka nedan för att välja ett lösenord — du landar direkt på din rapport.`
    : `Ditt ${testTypeLabel} från ${testDate} är klart. Klicka nedan för att logga in och se rapporten — du går direkt till resultatet.`

  const ctaLabel = athleteAccountCreated ? 'Välj lösenord & se resultatet' : 'Se mitt resultat'

  const messageBlock = safeMessage
    ? `
        <div style="margin: 20px 0; padding: 16px 20px; background: #f8f9fa; border-left: 4px solid ${branding.primaryColor}; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">
            Meddelande från ${safeLeaderName ?? 'din testledare'}
          </p>
          <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-line;">${safeMessage}</p>
        </div>
      `
    : ''

  const leaderSignature = safeLeaderName
    ? `<p style="color: #555; margin-top: 30px;">Med vänliga hälsningar,<br/><strong>${safeLeaderName}</strong></p>`
    : `<p style="color: #555; margin-top: 30px;">Med vänliga hälsningar,<br/><strong>${escapeHtml(branding.senderName)}</strong></p>`

  const body = `
    <h2 style="color: #333; margin-top: 0;">Hej ${safeAthleteFirstName},</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">${intro}</p>
    ${messageBlock}
    ${emailButton(branding, ctaUrl, ctaLabel)}
    <p style="color: #999; font-size: 13px; margin-top: 24px;">
      Säkerhetspåminnelse: dela inte den här länken — den loggar in dig direkt.
      Om du inte väntade dig det här mejlet kan du ignorera det.
    </p>
    ${leaderSignature}
  `

  const html = emailLayout(branding, 'Ditt testresultat är klart', body)
  const subject = `Ditt ${testTypeLabel} från ${testDate} är klart`

  const sent = await sendGenericEmail({
    to: test.client.email,
    subject,
    html,
    branding,
    metadata: {
      category: 'invite',
      emailType: 'test_result_invite',
      businessId: test.client.businessId,
      targetId: opts.testId,
    },
  }).catch((err) => {
    logger.error('Test invite: send failed', { testId: opts.testId }, err)
    return { success: false }
  })

  return {
    success: true,
    athleteAccountCreated,
    emailSent: sent.success,
  }
}
