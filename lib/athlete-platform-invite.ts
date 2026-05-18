import 'server-only'

import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { sendGenericEmail } from '@/lib/email'
import { resolveEmailBranding } from '@/lib/email/branding'
import { emailButton, emailLayout } from '@/lib/email/email-branding-types'
import { buildRecoveryCallbackUrl } from '@/lib/url-utils'
import type { EmailLocale } from '@/lib/email/templates'

export interface SendAthletePlatformInviteResult {
  success: boolean
  emailSent?: boolean
  emailPaused?: boolean
  email?: string
  inviteUrl?: string
  inviteText?: string
  businessName?: string
  syncedEmail?: boolean
  syncedName?: boolean
  error?: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Keep the athlete login identity aligned with the coach-managed client profile.
 * Client.email is the source of truth because coaches edit that profile before
 * inviting an athlete.
 */
export async function syncAthleteAccountIdentityFromProfile(
  clientId: string,
): Promise<SendAthletePlatformInviteResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      email: true,
      athleteAccount: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!client) return { success: false, error: 'Klienten hittades inte' }
  if (!client.athleteAccount) return { success: true }
  if (!client.email) {
    return { success: false, error: 'Klienten saknar e-postadress i profilen' }
  }

  const nextEmail = normalizeEmail(client.email)
  const currentEmail = client.athleteAccount.user.email
  const emailChanged = currentEmail.toLowerCase() !== nextEmail
  const nameChanged = client.athleteAccount.user.name !== client.name

  if (!emailChanged && !nameChanged) {
    return { success: true, email: nextEmail }
  }

  if (emailChanged) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: nextEmail, mode: 'insensitive' },
        id: { not: client.athleteAccount.userId },
      },
      select: { id: true },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'E-postadressen används redan av en annan användare',
      }
    }
  }

  const supabaseAdmin = createAdminSupabaseClient()
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    client.athleteAccount.userId,
    {
      ...(emailChanged ? { email: nextEmail, email_confirm: true } : {}),
      user_metadata: {
        name: client.name,
        role: 'ATHLETE',
      },
    },
  )

  if (authError) {
    logger.error('Failed to sync athlete email in Supabase Auth', {
      clientId,
      userId: client.athleteAccount.userId,
      email: nextEmail,
    }, authError)
    return { success: false, error: 'Kunde inte uppdatera atletens inloggningsadress' }
  }

  try {
    await prisma.user.update({
      where: { id: client.athleteAccount.userId },
      data: {
        email: nextEmail,
        name: client.name,
      },
    })
  } catch (dbError) {
    if (emailChanged) {
      await supabaseAdmin.auth.admin.updateUserById(client.athleteAccount.userId, {
        email: currentEmail,
        email_confirm: true,
      }).catch((rollbackError) => {
        logger.error('Failed to roll back athlete auth email after DB sync failure', {
          clientId,
          userId: client.athleteAccount?.userId,
          email: currentEmail,
        }, rollbackError)
      })
    }

    logger.error('Failed to sync athlete email in Prisma', {
      clientId,
      userId: client.athleteAccount.userId,
      email: nextEmail,
    }, dbError)
    return { success: false, error: 'Kunde inte spara atletens inloggningsadress' }
  }

  return {
    success: true,
    email: nextEmail,
    syncedEmail: emailChanged,
    syncedName: nameChanged,
  }
}

export async function sendAthletePlatformInvite(
  clientId: string,
  coachUserId: string,
  options?: { sendEmail?: boolean },
  locale: EmailLocale = 'sv',
): Promise<SendAthletePlatformInviteResult> {
  const syncResult = await syncAthleteAccountIdentityFromProfile(clientId)
  if (!syncResult.success) return syncResult

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      email: true,
      businessId: true,
      business: {
        select: {
          name: true,
          slug: true,
        },
      },
      athleteAccount: {
        select: {
          userId: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  })

  if (!client) return { success: false, error: 'Klienten hittades inte' }
  if (!client.email) return { success: false, error: 'Klienten saknar e-postadress' }
  if (!client.athleteAccount) return { success: false, error: 'Klienten saknar atletkonto' }

  const email = normalizeEmail(client.email)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
  const nextPath = client.business?.slug
    ? `/${client.business.slug}/athlete/dashboard`
    : '/athlete/dashboard'

  const supabaseAdmin = createAdminSupabaseClient()
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${appUrl}/api/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  })

  if (linkError) {
    logger.error('Athlete platform invite: recovery link generation failed', {
      clientId,
      userId: client.athleteAccount.userId,
      email,
    }, linkError)
    return { success: false, error: 'Kunde inte skapa inbjudningslänk' }
  }

  const inviteUrl =
    buildRecoveryCallbackUrl(linkData, appUrl, nextPath) || `${appUrl}/forgot-password`

  const branding = await resolveEmailBranding(client.businessId ?? null, {
    senderUserId: coachUserId,
  })
  const copy = locale === 'sv'
    ? {
      subject: (name: string) => `Inbjudan till ${name} i Trainomics`,
      header: 'Välkommen till Trainomics',
      greeting: (name: string) => `Hej ${name}!`,
      body: (businessName: string) => `Din tränare på ${businessName} har bjudit in dig till Trainomics.
      Klicka på knappen nedan för att välja lösenord och komma in i atletportalen.`,
      button: 'Välj lösenord och logga in',
      footer: 'Länken är personlig. Om du inte väntade dig den här inbjudan kan du ignorera mejlet.',
      signature: 'Med vänliga hälsningar',
      inviteText: (businessName: string) => `Hej! Jag har bjudit in dig till ${businessName} i Trainomics.

Klicka här för att skapa lösenord och komma igång:
${inviteUrl}${coachFirstName ? `\\n\\n/${coachFirstName}` : ''}`,
    }
    : {
      subject: (name: string) => `Invite to ${name} on Trainomics`,
      header: 'Welcome to Trainomics',
      greeting: (name: string) => `Hi ${name}!`,
      body: (businessName: string) => `Your coach from ${businessName} has invited you to Trainomics.
      Click the button below to set a password and access the athlete portal.`,
      button: 'Set password and sign in',
      footer: 'The link is personal. If you did not expect this invite, you can ignore the email.',
      signature: 'Best regards',
      inviteText: (businessName: string) => `Hi! Your coach has invited you to ${businessName} on Trainomics.

Click here to set a password and get started:
${inviteUrl}${coachFirstName ? `\\n\\n/${coachFirstName}` : ''}`,
    }
  const coach = await prisma.user.findUnique({
    where: { id: coachUserId },
    select: { name: true },
  })

  const safeFirstName = escapeHtml(client.name.split(' ')[0] || client.name)
  const businessName = client.business?.name || branding.senderName
  const coachFirstName = coach?.name?.trim().split(/\s+/)[0]
  const inviteText = copy.inviteText(businessName)
  const safeBusinessName = escapeHtml(businessName)
  const body = `
    <h2 style="color: #333; margin-top: 0;">${copy.greeting(safeFirstName)},</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      ${copy.body(safeBusinessName)}
    </p>
    ${emailButton(branding, inviteUrl, copy.button)}
    <p style="color: #999; font-size: 13px; margin-top: 24px;">
      ${copy.footer}
    </p>
    <p style="color: #555; margin-top: 30px;">
      ${copy.signature},<br/><strong>${escapeHtml(branding.senderName)}</strong>
    </p>
  `

  if (options?.sendEmail === false) {
    return {
      success: true,
      emailSent: false,
      email,
      inviteUrl,
      inviteText,
      businessName,
      syncedEmail: syncResult.syncedEmail,
      syncedName: syncResult.syncedName,
    }
  }

  const sent = await sendGenericEmail({
    to: email,
    subject: copy.subject(businessName),
    html: emailLayout(branding, copy.header, body),
    branding,
    metadata: {
      category: 'invite',
      emailType: 'athlete_platform_invite',
      businessId: client.businessId,
      targetId: clientId,
    },
  }).catch((error) => {
    logger.error('Athlete platform invite: email send failed', { clientId, email }, error)
    return { success: false, error: 'Email send failed', paused: false }
  })

  if (!sent.success) {
    return {
      success: false,
      email,
      inviteUrl,
      inviteText,
      businessName,
      error: 'Kunde inte skicka inbjudan via e-post',
    }
  }

  if (sent.paused) {
    return {
      success: true,
      emailSent: false,
      emailPaused: true,
      email,
      inviteUrl,
      inviteText,
      businessName,
      syncedEmail: syncResult.syncedEmail,
      syncedName: syncResult.syncedName,
      error: 'Utgående e-post är pausad',
    }
  }

  return {
    success: true,
    emailSent: true,
    email,
    inviteUrl,
    inviteText,
    businessName,
    syncedEmail: syncResult.syncedEmail,
    syncedName: syncResult.syncedName,
  }
}
