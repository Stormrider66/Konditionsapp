// lib/email/index.ts
// Centralized email service for Trainomics

import 'server-only';

import { Resend } from 'resend';
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

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Trainomics <noreply@trainomics.se>';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ==================== CORE SEND FUNCTION ====================
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, email not sent', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
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
  locale: EmailLocale = 'sv'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const { subject, html } = getWelcomeEmailTemplate({
    recipientName,
    loginUrl: `${baseUrl}/login`,
    locale,
  });
  return sendEmail(to, subject, html);
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
  locale: EmailLocale = 'sv'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const { subject, html } = getReferralRewardEmailTemplate({
    recipientName,
    referredUserName,
    rewardType,
    rewardValue,
    dashboardUrl: `${baseUrl}/coach/referrals`,
    locale,
  });
  return sendEmail(to, subject, html);
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
  locale: EmailLocale = 'sv'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const { subject, html } = getSubscriptionConfirmationEmailTemplate({
    recipientName,
    planName,
    amount,
    nextBillingDate,
    dashboardUrl: `${baseUrl}/coach`,
    locale,
  });
  return sendEmail(to, subject, html);
}

/**
 * Send subscription cancelled email
 */
export async function sendSubscriptionCancelledEmail(
  to: string,
  recipientName: string,
  planName: string,
  endDate: string,
  locale: EmailLocale = 'sv'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const { subject, html } = getSubscriptionCancelledEmailTemplate({
    recipientName,
    planName,
    endDate,
    reactivateUrl: `${baseUrl}/coach/subscription`,
    locale,
  });
  return sendEmail(to, subject, html);
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  to: string,
  recipientName: string,
  amount: string,
  retryDate: string,
  locale: EmailLocale = 'sv',
  options?: {
    /**
     * Full URL for where the recipient updates their payment method.
     * If omitted, `updatePaymentPath` (or the coach default) is used.
     */
    updatePaymentUrl?: string
    /**
     * Path relative to NEXT_PUBLIC_APP_URL, e.g. "/athlete/subscription".
     * Defaults to "/coach/subscription" for backward compatibility.
     */
    updatePaymentPath?: string
  }
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const updatePaymentUrl =
    options?.updatePaymentUrl ||
    new URL(options?.updatePaymentPath || '/coach/subscription', baseUrl).toString()
  const { subject, html } = getPaymentFailedEmailTemplate({
    recipientName,
    amount,
    retryDate,
    updatePaymentUrl,
    locale,
  });
  return sendEmail(to, subject, html);
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
  locale: EmailLocale = 'sv'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const { subject, html } = getReferralInviteEmailTemplate({
    recipientName: recipientName || '',
    referrerName,
    signupUrl: `${baseUrl}/register?ref=${referralCode}`,
    benefit,
    locale,
  });
  return sendEmail(to, subject, html);
}

// ==================== BUSINESS APPLICATION EMAILS ====================

/**
 * Send confirmation to applicant when their interest form is received
 */
export async function sendApplicationReceivedEmail(
  to: string,
  contactName: string,
  organizationName: string
): Promise<SendEmailResult> {
  const subject = `Vi har mottagit din ansökan – ${organizationName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Tack för din ansökan, ${contactName}!</h2>
      <p>Vi har mottagit din intresseanmälan för <strong>${organizationName}</strong>.</p>
      <p>Vårt team kommer att granska din ansökan och återkomma inom kort. Du kommer att få ett e-postmeddelande när din ansökan har godkänts.</p>
      <p>Med vänliga hälsningar,<br/>Trainomics</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

/**
 * Send approval email with claim link to applicant
 */
export async function sendApplicationApprovedEmail(
  to: string,
  contactName: string,
  organizationName: string,
  claimUrl: string
): Promise<SendEmailResult> {
  const subject = `Din ansökan har godkänts – ${organizationName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Grattis, ${contactName}!</h2>
      <p>Din ansökan för <strong>${organizationName}</strong> har godkänts.</p>
      <p>Klicka på knappen nedan för att skapa ditt konto och ta över din verksamhet:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${claimUrl}" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Aktivera ditt konto
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Länken är giltig i 30 dagar.</p>
      <p>Med vänliga hälsningar,<br/>Trainomics</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

/**
 * Notify business owner about a new join request
 */
export async function sendJoinRequestNotification(
  ownerEmail: string,
  requesterName: string,
  businessName: string
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const subject = `Ny förfrågan att gå med i ${businessName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Ny anslutningsförfrågan</h2>
      <p><strong>${requesterName}</strong> vill gå med i <strong>${businessName}</strong> som tränare.</p>
      <p>Logga in för att granska och godkänna eller avslå förfrågan:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}/coach/settings" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Granska förfrågan
        </a>
      </div>
      <p>Med vänliga hälsningar,<br/>Trainomics</p>
    </div>
  `;
  return sendEmail(ownerEmail, subject, html);
}

/**
 * Notify platform admin about a new business application
 */
export async function sendNewApplicationNotification(
  adminEmail: string,
  organizationName: string,
  type: string
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.trainomics.se';
  const typeLabel = type === 'GYM' ? 'Gym/Studio' : 'Team/Klubb';
  const subject = `Ny verksamhetsansökan: ${organizationName} (${typeLabel})`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Ny ansökan att granska</h2>
      <p><strong>${organizationName}</strong> har ansökt som <strong>${typeLabel}</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}/admin" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Granska i admin
        </a>
      </div>
    </div>
  `;
  return sendEmail(adminEmail, subject, html);
}

// ==================== GENERIC SEND EMAIL ====================

/**
 * Generic send email function for custom emails
 */
export async function sendGenericEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  return sendEmail(to, subject, html);
}

// Alias for backward compatibility
export { sendGenericEmail as sendEmail };

// Export templates for testing
export * from './templates';
