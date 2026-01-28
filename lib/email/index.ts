// lib/email/index.ts
// Centralized email service for Star by Thomson

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

const FROM_EMAIL = 'Star by Thomson <konditionstest@thomsons.se>';

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se';
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se';
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se';
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se';
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
  locale: EmailLocale = 'sv'
): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se';
  const { subject, html } = getPaymentFailedEmailTemplate({
    recipientName,
    amount,
    retryDate,
    updatePaymentUrl: `${baseUrl}/coach/subscription`,
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se';
  const { subject, html } = getReferralInviteEmailTemplate({
    recipientName: recipientName || '',
    referrerName,
    signupUrl: `${baseUrl}/register?ref=${referralCode}`,
    benefit,
    locale,
  });
  return sendEmail(to, subject, html);
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
