// lib/email/index.ts
// Centralized email service with branding support

import 'server-only';

import { Resend } from 'resend';
import type { CreateEmailOptions } from 'resend';
import { logger } from '@/lib/logger';
import {
  EmailLocale,
  getWelcomeEmailTemplate,
  getReferralRewardEmailTemplate,
  getSubscriptionConfirmationEmailTemplate,
  getSubscriptionCancelledEmailTemplate,
  getPaymentFailedEmailTemplate,
  getReferralInviteEmailTemplate,
} from './templates';
import type { EmailBranding } from './email-branding-types';
import { PLATFORM_REPLY_TO, DEFAULT_EMAIL_BRANDING } from './email-branding-types';
import { PLATFORM_NAME } from '@/lib/branding/types';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type EmailTag = NonNullable<CreateEmailOptions['tags']>[number];

export interface SendEmailMetadata {
  category?: string;
  emailType?: string;
  businessId?: string | null;
  invitationId?: string | null;
  targetId?: string | null;
}

/** Strip HTML tags and decode common entities to produce a plain-text fallback */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '  - ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  paused?: boolean;
}

function sanitizeTagValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256);
  return cleaned.length > 0 ? cleaned : null;
}

function buildEmailTags(metadata?: SendEmailMetadata): EmailTag[] | undefined {
  if (!metadata) return undefined;

  const pairs: Array<[string, string | null | undefined]> = [
    ['category', metadata.category],
    ['email_type', metadata.emailType],
    ['business_id', metadata.businessId],
    ['invitation_id', metadata.invitationId],
    ['target_id', metadata.targetId],
  ];

  const tags = pairs.flatMap(([name, value]) => {
    const sanitized = sanitizeTagValue(value);
    return sanitized ? [{ name, value: sanitized }] : [];
  });

  return tags.length > 0 ? tags : undefined;
}

function buildEmailHeaders(baseUrl: string, metadata?: SendEmailMetadata): Record<string, string> | undefined {
  // One-to-one invites are transactional account-access emails, not mailing-list
  // traffic. Adding unsubscribe headers here gives mailbox providers extra list
  // heuristics to apply without giving the recipient a meaningful preference.
  if (metadata?.category === 'invite') return undefined;

  return {
    'List-Unsubscribe': `<mailto:unsubscribe@trainomics.app?subject=unsubscribe>, <${baseUrl}/unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ==================== CORE SEND FUNCTION ====================
async function sendEmailInternal(
  to: string,
  subject: string,
  html: string,
  branding?: EmailBranding,
  metadata?: SendEmailMetadata
): Promise<SendEmailResult> {
  try {
    // Kill switch: set EMAILS_PAUSED=true to suppress all outbound email
    if (process.env.EMAILS_PAUSED === 'true') {
      logger.info('Email paused (EMAILS_PAUSED=true), skipping', { to, subject });
      return { success: true, messageId: 'paused', paused: true };
    }

    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, email not sent', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    // From: header is fully resolved by `resolveEmailBranding` — when a business
    // has a verified Resend domain it's `<senderName> <noreply@<their domain>>`,
    // otherwise it's the shared trainomics.app sender.
    const fromEmail = branding?.fromAddress || DEFAULT_EMAIL_BRANDING.fromAddress;

    if (!resend) {
      logger.warn('Resend client unavailable, email not sent', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      replyTo: branding?.replyTo || PLATFORM_REPLY_TO,
      to: [to],
      subject,
      html,
      text: htmlToPlainText(html),
      headers: buildEmailHeaders(baseUrl, metadata),
      tags: buildEmailTags(metadata),
    });

    if (error) {
      logger.error('Resend error', { to, subject }, error);
      return { success: false, error: error.message };
    }

    logger.info('Email sent successfully', { to, subject, messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (error) {
    logger.error('Error sending email', { to, subject }, error);
    return { success: false, error: 'Failed to send email' };
  }
}

// ==================== EMAIL FUNCTIONS ====================

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  to: string,
  recipientName: string,
  locale: EmailLocale = 'en',
  branding?: EmailBranding
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const { subject, html } = getWelcomeEmailTemplate({
    recipientName,
    loginUrl: `${baseUrl}/login`,
    locale,
    branding,
  });
  return sendEmailInternal(to, subject, html, branding);
}

/**
 * Send referral reward notification to referrer
 */
export async function sendReferralRewardEmail(
  to: string,
  recipientName: string,
  referredUserName: string,
  rewardType: 'FREE_MONTH' | 'DISCOUNT_PERCENT' | 'EXTENDED_TRIAL' | 'ATHLETE_SLOTS',
  rewardValue: number,
  locale: EmailLocale = 'en',
  branding?: EmailBranding
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const { subject, html } = getReferralRewardEmailTemplate({
    recipientName,
    referredUserName,
    rewardType,
    rewardValue,
    dashboardUrl: `${baseUrl}/coach/referrals`,
    locale,
    branding,
  });
  return sendEmailInternal(to, subject, html, branding);
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmationEmail(
  to: string,
  recipientName: string,
  planName: string,
  amount: string,
  nextBillingDate: string,
  locale: EmailLocale = 'en',
  branding?: EmailBranding
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const { subject, html } = getSubscriptionConfirmationEmailTemplate({
    recipientName,
    planName,
    amount,
    nextBillingDate,
    dashboardUrl: `${baseUrl}/coach`,
    locale,
    branding,
  });
  return sendEmailInternal(to, subject, html, branding);
}

/**
 * Send subscription cancelled email
 */
export async function sendSubscriptionCancelledEmail(
  to: string,
  recipientName: string,
  planName: string,
  endDate: string,
  locale: EmailLocale = 'en',
  options?: {
    reactivateUrl?: string
    reactivatePath?: string
  },
  branding?: EmailBranding
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const reactivateUrl =
    options?.reactivateUrl ||
    new URL(options?.reactivatePath || '/pricing', baseUrl).toString()
  const { subject, html } = getSubscriptionCancelledEmailTemplate({
    recipientName,
    planName,
    endDate,
    reactivateUrl,
    locale,
    branding,
  });
  return sendEmailInternal(to, subject, html, branding);
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  to: string,
  recipientName: string,
  amount: string,
  retryDate: string,
  locale: EmailLocale = 'en',
  options?: {
    updatePaymentUrl?: string
    updatePaymentPath?: string
  },
  branding?: EmailBranding
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const updatePaymentUrl =
    options?.updatePaymentUrl ||
    new URL(options?.updatePaymentPath || '/pricing', baseUrl).toString()
  const { subject, html } = getPaymentFailedEmailTemplate({
    recipientName,
    amount,
    retryDate,
    updatePaymentUrl,
    locale,
    branding,
  });
  return sendEmailInternal(to, subject, html, branding);
}

/**
 * Send referral invite email
 */
export async function sendReferralInviteEmail(
  to: string,
  referrerName: string,
  referralCode: string,
  benefit: string,
  recipientName?: string,
  locale: EmailLocale = 'en',
  branding?: EmailBranding
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const { subject, html } = getReferralInviteEmailTemplate({
    recipientName: recipientName || '',
    referrerName,
    signupUrl: `${baseUrl}/register?ref=${referralCode}`,
    benefit,
    locale,
    branding,
  });
  return sendEmailInternal(to, subject, html, branding);
}

// ==================== BUSINESS APPLICATION EMAILS ====================

/**
 * Send confirmation to applicant when their interest form is received
 */
export async function sendApplicationReceivedEmail(
  to: string,
  contactName: string,
  organizationName: string,
  branding?: EmailBranding,
  locale: EmailLocale = 'en'
): Promise<SendEmailResult> {
  const br = branding;
  const platformName = br?.platformName || PLATFORM_NAME;
  const content = locale === 'sv'
    ? {
      subject: `Vi har mottagit din ansökan – ${organizationName}`,
      heading: `Tack för din ansökan, ${contactName}!`,
      line1: `Vi har mottagit din intresseanmälan för <strong>${organizationName}</strong>.`,
      line2: 'Vårt team kommer att granska din ansökan och återkomma inom kort. Du kommer att få ett e-postmeddelande när din ansökan har godkänts.',
      greeting: 'Med vänliga hälsningar',
    }
    : {
      subject: `We have received your application – ${organizationName}`,
      heading: `Thanks for your application, ${contactName}!`,
      line1: `We have received your inquiry for <strong>${organizationName}</strong>.`,
      line2: 'Our team will review your application and get back to you shortly. You will receive an email when your application is approved.',
      greeting: 'Best regards',
    };
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${content.heading}</h2>
      <p>${content.line1}</p>
      <p>${content.line2}</p>
      <p>${content.greeting},<br/>${platformName}</p>
    </div>
  `;
  return sendEmailInternal(to, content.subject, html, branding);
}

/**
 * Send approval email with claim link to applicant
 */
export async function sendApplicationApprovedEmail(
  to: string,
  contactName: string,
  organizationName: string,
  claimUrl: string,
  branding?: EmailBranding,
  locale: EmailLocale = 'en'
): Promise<SendEmailResult> {
  const br = branding;
  const platformName = br?.platformName || PLATFORM_NAME;
  const buttonColor = br?.primaryColor || '#3b82f6';
  const content = locale === 'sv'
    ? {
      subject: `Din ansökan har godkänts – ${organizationName}`,
      heading: `Grattis, ${contactName}!`,
      approvedLine: `Din ansökan för <strong>${organizationName}</strong> har godkänts.`,
      cta: 'Aktivera ditt konto',
      help: 'Länken är giltig i 30 dagar.',
      greeting: 'Med vänliga hälsningar',
    }
    : {
      subject: `Your application has been approved – ${organizationName}`,
      heading: `Great, ${contactName}!`,
      approvedLine: `Your application for <strong>${organizationName}</strong> has been approved.`,
      cta: 'Activate your account',
      help: 'The link is valid for 30 days.',
      greeting: 'Best regards',
    };
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${content.heading}</h2>
      <p>${content.approvedLine}</p>
      <p>${locale === 'sv' ? 'Klicka på knappen nedan för att skapa ditt konto och ta över din verksamhet:' : 'Click the button below to create your account and claim your organization:'}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${claimUrl}" style="background: ${buttonColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          ${content.cta}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">${content.help}</p>
      <p>${content.greeting},<br/>${platformName}</p>
    </div>
  `;
  return sendEmailInternal(to, content.subject, html, branding);
}

/**
 * Notify business owner about a new join request
 */
export async function sendJoinRequestNotification(
  ownerEmail: string,
  requesterName: string,
  businessName: string,
  branding?: EmailBranding,
  locale: EmailLocale = 'en'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const br = branding;
  const platformName = br?.platformName || PLATFORM_NAME;
  const buttonColor = br?.primaryColor || '#3b82f6';
  const content = locale === 'sv'
    ? {
      subject: `Ny förfrågan att gå med i ${businessName}`,
      heading: 'Ny anslutningsförfrågan',
      text: `<strong>${requesterName}</strong> vill gå med i <strong>${businessName}</strong> som tränare.`,
      action: 'Logga in för att granska och godkänna eller avslå förfrågan:',
      cta: 'Granska förfrågan',
      greeting: 'Med vänliga hälsningar',
    }
    : {
      subject: `New request to join ${businessName}`,
      heading: 'New join request',
      text: `<strong>${requesterName}</strong> wants to join <strong>${businessName}</strong> as a coach.`,
      action: 'Log in to review and approve or decline the request:',
      cta: 'Review request',
      greeting: 'Best regards',
    };
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${content.heading}</h2>
      <p>${content.text}</p>
      <p>${content.action}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}/coach/settings" style="background: ${buttonColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          ${content.cta}
        </a>
      </div>
      <p>${content.greeting},<br/>${platformName}</p>
    </div>
  `;
  return sendEmailInternal(ownerEmail, content.subject, html, branding);
}

/**
 * Notify platform admin about a new business application
 */
export async function sendNewApplicationNotification(
  adminEmail: string,
  organizationName: string,
  type: string,
  locale: EmailLocale = 'en'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app';
  const typeLabel = type === 'GYM'
    ? locale === 'sv'
      ? 'Gym/Studio'
      : 'Gym/Studio'
    : locale === 'sv'
      ? 'Team/Klubb'
      : 'Team/Club';
  const content = locale === 'sv'
    ? {
      subject: `Ny verksamhetsansökan: ${organizationName} (${typeLabel})`,
      heading: 'Ny ansökan att granska',
      description: `<strong>${organizationName}</strong> har ansökt som <strong>${typeLabel}</strong>.`,
      cta: 'Granska i admin',
    }
    : {
      subject: `New business application: ${organizationName} (${typeLabel})`,
      heading: 'Application to review',
      description: `<strong>${organizationName}</strong> has applied as a <strong>${typeLabel}</strong>.`,
      cta: 'Review in admin',
    };
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${content.heading}</h2>
      <p>${content.description}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}/admin" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          ${content.cta}
        </a>
      </div>
    </div>
  `;
  return sendEmailInternal(adminEmail, content.subject, html);
}

// ==================== COACH INVITE EMAIL ====================

/**
 * Send invite email to a new coach/team member being added to a business.
 * Contains a localized password setup button.
 */
export async function sendCoachInviteEmail(
  to: string,
  recipientName: string,
  businessName: string,
  setPasswordUrl: string,
  branding?: EmailBranding,
  metadata?: SendEmailMetadata,
  locale: EmailLocale = 'en'
): Promise<SendEmailResult> {
  const br = branding;
  const platformName = br?.platformName || PLATFORM_NAME;
  const buttonColor = br?.primaryColor || '#3b82f6';
  const content = locale === 'sv'
    ? {
      subject: `Du har bjudits in till ${businessName}`,
      heading: `Välkommen, ${recipientName}!`,
      line: `Du har bjudits in att gå med i <strong>${businessName}</strong> på ${platformName}.`,
      action: 'Klicka på knappen nedan för att skapa ditt lösenord och komma igång:',
      cta: 'Skapa lösenord',
      help: 'Om du inte förväntar dig detta e-postmeddelande kan du ignorera det.',
      greeting: 'Med vänliga hälsningar',
    }
    : {
      subject: `You've been invited to join ${businessName}`,
      heading: `Welcome, ${recipientName}!`,
      line: `You have been invited to join <strong>${businessName}</strong> on ${platformName}.`,
      action: 'Click the button below to set your password and get started:',
      cta: 'Set password',
      help: 'If you did not expect this email, you can ignore it.',
      greeting: 'Best regards',
    };
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${content.heading}</h2>
      <p>${content.line}</p>
      <p>${content.action}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${setPasswordUrl}" style="background: ${buttonColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          ${content.cta}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">${content.help}</p>
      <p>${content.greeting},<br/>${platformName}</p>
    </div>
  `;
  return sendEmailInternal(
    to,
    content.subject,
    html,
    branding,
    {
      category: 'invite',
      emailType: 'coach_invite',
      ...metadata,
    },
  );
}

// ==================== PASSWORD RESET EMAIL ====================

/**
 * Send password reset email via Resend (replaces Supabase built-in email).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  recipientName?: string,
  branding?: EmailBranding,
  locale: EmailLocale = 'en'
): Promise<SendEmailResult> {
  const br = branding;
  const platformName = br?.platformName || PLATFORM_NAME;
  const buttonColor = br?.primaryColor || '#3b82f6';
  const name = recipientName || to;
  const content = locale === 'sv'
    ? {
      subject: `${platformName} – Välj ett nytt lösenord`,
      heading: `Hej ${name}!`,
      line1: `Vi fick en förfrågan om att återställa lösenordet för ditt konto på <strong>${platformName}</strong>.`,
      line2: 'Klicka på knappen nedan för att välja ett nytt lösenord och komma igång igen:',
      cta: 'Välj nytt lösenord',
      help: 'Om du inte förväntar dig detta e-postmeddelande kan du ignorera det.',
      closing: 'Med vänliga hälsningar',
    }
    : {
      subject: `${platformName} – Set a new password`,
      heading: `Hi ${name}!`,
      line1: `We received a request to reset the password for your ${platformName} account.`,
      line2: 'Click the button below to choose a new password and get started again:',
      cta: 'Choose new password',
      help: 'If you did not expect this email, you can ignore it.',
      closing: 'Best regards',
    };
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${content.heading}</h2>
      <p>${content.line1}</p>
      <p>${content.line2}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: ${buttonColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          ${content.cta}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">${content.help}</p>
      <p>${content.closing},<br/>${platformName}</p>
    </div>
  `;
  return sendEmailInternal(to, content.subject, html, branding);
}

// ==================== GENERIC SEND EMAIL ====================

/**
 * Generic send email function for custom emails
 */
export async function sendGenericEmail({
  to,
  subject,
  html,
  branding,
  metadata,
}: {
  to: string;
  subject: string;
  html: string;
  branding?: EmailBranding;
  metadata?: SendEmailMetadata;
}): Promise<SendEmailResult> {
  return sendEmailInternal(to, subject, html, branding, metadata);
}

// Alias for backward compatibility
export { sendGenericEmail as sendEmail };

// Export templates for testing
export * from './templates';
