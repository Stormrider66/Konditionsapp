// lib/email/templates.ts
// Email templates for Star by Thomson

import { escapeHtml, sanitizeAttribute, sanitizeUrl } from '@/lib/sanitize'

export type EmailLocale = 'sv' | 'en';

interface BaseTemplateData {
  recipientName: string;
  locale?: EmailLocale;
}

// ==================== WELCOME EMAIL ====================
interface WelcomeEmailData extends BaseTemplateData {
  loginUrl: string;
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData) {
  const { recipientName, loginUrl, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safeLoginUrl = sanitizeAttribute(sanitizeUrl(loginUrl))

  const content = locale === 'sv' ? {
    subject: 'Välkommen till Star by Thomson!',
    greeting: `Hej ${safeRecipientName},`,
    intro: 'Välkommen till Star by Thomson! Ditt konto har skapats och du kan nu börja använda plattformen.',
    features: [
      'Skapa och hantera konditionstester',
      'Generera professionella träningsprogram',
      'Övervaka idrottare med avancerad analys',
      'AI-assisterad programplanering'
    ],
    featuresTitle: 'Med Star by Thomson kan du:',
    ctaText: 'Logga in nu',
    helpText: 'Behöver du hjälp? Svara på detta mail så hjälper vi dig.',
    closing: 'Med vänliga hälsningar,',
    team: 'Star by Thomson-teamet'
  } : {
    subject: 'Welcome to Star by Thomson!',
    greeting: `Hi ${safeRecipientName},`,
    intro: 'Welcome to Star by Thomson! Your account has been created and you can now start using the platform.',
    features: [
      'Create and manage performance tests',
      'Generate professional training programs',
      'Monitor athletes with advanced analytics',
      'AI-assisted program planning'
    ],
    featuresTitle: 'With Star by Thomson you can:',
    ctaText: 'Log in now',
    helpText: 'Need help? Reply to this email and we\'ll assist you.',
    closing: 'Best regards,',
    team: 'The Star by Thomson Team'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Star by Thomson</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #667eea; margin-top: 0;">${content.featuresTitle}</h3>
          <ul style="color: #555; padding-left: 20px;">
            ${content.features.map(f => `<li style="margin: 8px 0;">${f}</li>`).join('')}
          </ul>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeLoginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #888; font-size: 14px;">${content.helpText}</p>

        <p style="color: #555; margin-top: 30px;">
          ${content.closing}<br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}

// ==================== REFERRAL REWARD EMAIL ====================
interface ReferralRewardEmailData extends BaseTemplateData {
  referredUserName: string;
  rewardType: 'FREE_MONTH' | 'DISCOUNT_PERCENT' | 'EXTENDED_TRIAL' | 'ATHLETE_SLOTS';
  rewardValue: number;
  dashboardUrl: string;
}

export function getReferralRewardEmailTemplate(data: ReferralRewardEmailData) {
  const { recipientName, referredUserName, rewardType, rewardValue, dashboardUrl, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safeReferredUserName = escapeHtml(referredUserName)
  const safeDashboardUrl = sanitizeAttribute(sanitizeUrl(dashboardUrl))

  const getRewardDescription = () => {
    if (locale === 'sv') {
      switch (rewardType) {
        case 'FREE_MONTH': return `${rewardValue} månad${rewardValue > 1 ? 'er' : ''} gratis prenumeration`;
        case 'DISCOUNT_PERCENT': return `${rewardValue}% rabatt på din nästa betalning`;
        case 'EXTENDED_TRIAL': return `${rewardValue} extra dagar provperiod`;
        case 'ATHLETE_SLOTS': return `${rewardValue} extra idrottarplatser`;
        default: return 'En belöning';
      }
    } else {
      switch (rewardType) {
        case 'FREE_MONTH': return `${rewardValue} month${rewardValue > 1 ? 's' : ''} free subscription`;
        case 'DISCOUNT_PERCENT': return `${rewardValue}% discount on your next payment`;
        case 'EXTENDED_TRIAL': return `${rewardValue} extra trial days`;
        case 'ATHLETE_SLOTS': return `${rewardValue} extra athlete slots`;
        default: return 'A reward';
      }
    }
  };

  const content = locale === 'sv' ? {
    subject: `Du har fått en värvningsbelöning!`,
    greeting: `Hej ${safeRecipientName}!`,
    intro: 'Fantastiska nyheter! Din värvning har slutförts och du har fått en belöning.',
    referredText: `${safeReferredUserName} har registrerat sig med din värvningskod.`,
    rewardTitle: 'Din belöning:',
    reward: getRewardDescription(),
    ctaText: 'Gå till dashboard',
    claimText: 'Logga in för att hämta din belöning.',
    closing: 'Tack för att du rekommenderar Star by Thomson!',
    team: 'Star by Thomson-teamet'
  } : {
    subject: `You've earned a referral reward!`,
    greeting: `Hi ${safeRecipientName}!`,
    intro: 'Great news! Your referral has been completed and you\'ve earned a reward.',
    referredText: `${safeReferredUserName} has signed up using your referral code.`,
    rewardTitle: 'Your reward:',
    reward: getRewardDescription(),
    ctaText: 'Go to dashboard',
    claimText: 'Log in to claim your reward.',
    closing: 'Thank you for recommending Star by Thomson!',
    team: 'The Star by Thomson Team'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ${locale === 'sv' ? 'Belöning!' : 'Reward!'}</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <p style="color: #555; font-size: 16px;">${content.referredText}</p>

        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <p style="color: white; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${content.rewardTitle}</p>
          <p style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${content.reward}</p>
        </div>

        <p style="color: #555; font-size: 16px; text-align: center;">${content.claimText}</p>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeDashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #555; margin-top: 30px; text-align: center;">
          ${content.closing}<br/><br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}

// ==================== SUBSCRIPTION CONFIRMATION EMAIL ====================
interface SubscriptionEmailData extends BaseTemplateData {
  planName: string;
  amount: string;
  nextBillingDate: string;
  dashboardUrl: string;
}

export function getSubscriptionConfirmationEmailTemplate(data: SubscriptionEmailData) {
  const { recipientName, planName, amount, nextBillingDate, dashboardUrl, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safePlanName = escapeHtml(planName)
  const safeAmount = escapeHtml(amount)
  const safeNextBillingDate = escapeHtml(nextBillingDate)
  const safeDashboardUrl = sanitizeAttribute(sanitizeUrl(dashboardUrl))

  const content = locale === 'sv' ? {
    subject: `Bekräftelse på din ${safePlanName}-prenumeration`,
    greeting: `Hej ${safeRecipientName},`,
    intro: 'Tack för din prenumeration på Star by Thomson!',
    detailsTitle: 'Prenumerationsdetaljer:',
    plan: 'Plan',
    amountLabel: 'Belopp',
    nextBilling: 'Nästa fakturering',
    ctaText: 'Gå till dashboard',
    helpText: 'Har du frågor om din prenumeration? Kontakta oss när som helst.',
    closing: 'Med vänliga hälsningar,',
    team: 'Star by Thomson-teamet'
  } : {
    subject: `Confirmation of your ${safePlanName} subscription`,
    greeting: `Hi ${safeRecipientName},`,
    intro: 'Thank you for subscribing to Star by Thomson!',
    detailsTitle: 'Subscription details:',
    plan: 'Plan',
    amountLabel: 'Amount',
    nextBilling: 'Next billing date',
    ctaText: 'Go to dashboard',
    helpText: 'Have questions about your subscription? Contact us anytime.',
    closing: 'Best regards,',
    team: 'The Star by Thomson Team'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">✓ ${locale === 'sv' ? 'Prenumeration bekräftad' : 'Subscription Confirmed'}</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #667eea; margin-top: 0;">${content.detailsTitle}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #888; border-bottom: 1px solid #eee;">${content.plan}</td>
              <td style="padding: 10px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">${safePlanName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; border-bottom: 1px solid #eee;">${content.amountLabel}</td>
              <td style="padding: 10px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">${safeAmount}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888;">${content.nextBilling}</td>
              <td style="padding: 10px 0; color: #333; font-weight: bold; text-align: right;">${safeNextBillingDate}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeDashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #888; font-size: 14px;">${content.helpText}</p>

        <p style="color: #555; margin-top: 30px;">
          ${content.closing}<br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}

// ==================== SUBSCRIPTION CANCELLED EMAIL ====================
interface SubscriptionCancelledEmailData extends BaseTemplateData {
  planName: string;
  endDate: string;
  reactivateUrl: string;
}

export function getSubscriptionCancelledEmailTemplate(data: SubscriptionCancelledEmailData) {
  const { recipientName, planName, endDate, reactivateUrl, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safePlanName = escapeHtml(planName)
  const safeEndDate = escapeHtml(endDate)
  const safeReactivateUrl = sanitizeAttribute(sanitizeUrl(reactivateUrl))

  const content = locale === 'sv' ? {
    subject: 'Din prenumeration har avslutats',
    greeting: `Hej ${safeRecipientName},`,
    intro: 'Vi bekräftar att din prenumeration har avslutats.',
    details: `Din ${safePlanName}-plan kommer att vara aktiv till <strong>${safeEndDate}</strong>. Efter detta datum kommer du att ha begränsad tillgång.`,
    missYou: 'Vi hoppas att du kommer tillbaka! Du kan när som helst återaktivera din prenumeration.',
    ctaText: 'Återaktivera prenumeration',
    feedbackText: 'Har du feedback? Vi skulle uppskatta att höra hur vi kan förbättra oss.',
    closing: 'Med vänliga hälsningar,',
    team: 'Star by Thomson-teamet'
  } : {
    subject: 'Your subscription has been cancelled',
    greeting: `Hi ${safeRecipientName},`,
    intro: 'We confirm that your subscription has been cancelled.',
    details: `Your ${safePlanName} plan will remain active until <strong>${safeEndDate}</strong>. After this date, you will have limited access.`,
    missYou: 'We hope you\'ll come back! You can reactivate your subscription at any time.',
    ctaText: 'Reactivate subscription',
    feedbackText: 'Have feedback? We\'d love to hear how we can improve.',
    closing: 'Best regards,',
    team: 'The Star by Thomson Team'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #6b7280; padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">${locale === 'sv' ? 'Prenumeration avslutad' : 'Subscription Cancelled'}</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 25px 0;">
          <p style="color: #92400e; margin: 0;">${content.details}</p>
        </div>

        <p style="color: #555; font-size: 16px;">${content.missYou}</p>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeReactivateUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #888; font-size: 14px;">${content.feedbackText}</p>

        <p style="color: #555; margin-top: 30px;">
          ${content.closing}<br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}

// ==================== PAYMENT FAILED EMAIL ====================
interface PaymentFailedEmailData extends BaseTemplateData {
  amount: string;
  retryDate: string;
  updatePaymentUrl: string;
}

export function getPaymentFailedEmailTemplate(data: PaymentFailedEmailData) {
  const { recipientName, amount, retryDate, updatePaymentUrl, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safeAmount = escapeHtml(amount)
  const safeRetryDate = escapeHtml(retryDate)
  const safeUpdatePaymentUrl = sanitizeAttribute(sanitizeUrl(updatePaymentUrl))

  const content = locale === 'sv' ? {
    subject: 'Betalning misslyckades - Åtgärd krävs',
    greeting: `Hej ${safeRecipientName},`,
    intro: 'Vi kunde tyvärr inte genomföra din senaste betalning.',
    details: `Betalningen på <strong>${safeAmount}</strong> kunde inte genomföras. Vi kommer att försöka igen <strong>${safeRetryDate}</strong>.`,
    action: 'För att undvika avbrott i din tjänst, uppdatera din betalningsmetod så snart som möjligt.',
    ctaText: 'Uppdatera betalningsmetod',
    helpText: 'Har du frågor? Kontakta oss så hjälper vi dig.',
    closing: 'Med vänliga hälsningar,',
    team: 'Star by Thomson-teamet'
  } : {
    subject: 'Payment failed - Action required',
    greeting: `Hi ${safeRecipientName},`,
    intro: 'Unfortunately, we were unable to process your recent payment.',
    details: `The payment of <strong>${safeAmount}</strong> could not be completed. We will retry on <strong>${safeRetryDate}</strong>.`,
    action: 'To avoid any interruption to your service, please update your payment method as soon as possible.',
    ctaText: 'Update payment method',
    helpText: 'Have questions? Contact us and we\'ll help you.',
    closing: 'Best regards,',
    team: 'The Star by Thomson Team'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #dc2626; padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ ${locale === 'sv' ? 'Betalning misslyckades' : 'Payment Failed'}</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 25px 0;">
          <p style="color: #991b1b; margin: 0;">${content.details}</p>
        </div>

        <p style="color: #555; font-size: 16px;">${content.action}</p>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeUpdatePaymentUrl}" style="background-color: #dc2626; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #888; font-size: 14px;">${content.helpText}</p>

        <p style="color: #555; margin-top: 30px;">
          ${content.closing}<br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}

// ==================== REFERRAL INVITE EMAIL ====================
interface ReferralInviteEmailData extends BaseTemplateData {
  referrerName: string;
  signupUrl: string;
  benefit: string;
}

// ==================== TRIAL WARNING EMAIL ====================
interface TrialWarningEmailData extends BaseTemplateData {
  daysRemaining: number;
  upgradeUrl: string;
}

export function getTrialWarningEmailTemplate(data: TrialWarningEmailData) {
  const { recipientName, daysRemaining, upgradeUrl, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safeUpgradeUrl = sanitizeAttribute(sanitizeUrl(upgradeUrl))

  const content = locale === 'sv' ? {
    subject: `Din provperiod går ut om ${daysRemaining} dag${daysRemaining > 1 ? 'ar' : ''}`,
    greeting: `Hej ${safeRecipientName},`,
    intro: `Din gratis provperiod av Star by Thomson går ut om <strong>${daysRemaining} dag${daysRemaining > 1 ? 'ar' : ''}</strong>.`,
    benefits: [
      'Obegränsad tillgång till AI-assistent för träningsplanering',
      'Videoanalys av löpteknik och styrketräning',
      'Synkronisering med Strava och Garmin',
      'Avancerad prestandaanalys och rapporter'
    ],
    benefitsTitle: 'Uppgradera nu för att behålla tillgång till:',
    urgency: daysRemaining <= 3
      ? 'Agera nu för att undvika avbrott i din tjänst!'
      : 'Uppgradera idag och fortsätt optimera din träning.',
    ctaText: 'Uppgradera nu',
    helpText: 'Har du frågor? Svara på detta mail så hjälper vi dig.',
    closing: 'Med vänliga hälsningar,',
    team: 'Star by Thomson-teamet'
  } : {
    subject: `Your trial expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
    greeting: `Hi ${safeRecipientName},`,
    intro: `Your free trial of Star by Thomson expires in <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>.`,
    benefits: [
      'Unlimited access to AI training assistant',
      'Video analysis for running form and strength training',
      'Strava and Garmin synchronization',
      'Advanced performance analytics and reports'
    ],
    benefitsTitle: 'Upgrade now to keep access to:',
    urgency: daysRemaining <= 3
      ? 'Act now to avoid service interruption!'
      : 'Upgrade today and continue optimizing your training.',
    ctaText: 'Upgrade now',
    helpText: 'Have questions? Reply to this email and we\'ll help you.',
    closing: 'Best regards,',
    team: 'The Star by Thomson Team'
  };

  const urgentStyles = daysRemaining <= 3
    ? 'background-color: #fef2f2; border-left: 4px solid #dc2626;'
    : 'background-color: #fef3c7; border-left: 4px solid #f59e0b;';

  const urgentTextColor = daysRemaining <= 3 ? '#991b1b' : '#92400e';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">⏰ ${locale === 'sv' ? 'Provperiod snart slut' : 'Trial Ending Soon'}</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <div style="${urgentStyles} padding: 15px 20px; margin: 25px 0;">
          <p style="color: ${urgentTextColor}; margin: 0; font-weight: bold;">${content.urgency}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #667eea; margin-top: 0;">${content.benefitsTitle}</h3>
          <ul style="color: #555; padding-left: 20px;">
            ${content.benefits.map(b => `<li style="margin: 8px 0;">${b}</li>`).join('')}
          </ul>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeUpgradeUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 18px;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #888; font-size: 14px;">${content.helpText}</p>

        <p style="color: #555; margin-top: 30px;">
          ${content.closing}<br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}

// ==================== TRIAL EXPIRED EMAIL ====================
interface TrialExpiredEmailData extends BaseTemplateData {
  upgradeUrl: string;
}

export function getTrialExpiredEmailTemplate(data: TrialExpiredEmailData) {
  const { recipientName, upgradeUrl, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safeUpgradeUrl = sanitizeAttribute(sanitizeUrl(upgradeUrl))

  const content = locale === 'sv' ? {
    subject: 'Din provperiod har gått ut',
    greeting: `Hej ${safeRecipientName},`,
    intro: 'Din gratis provperiod av Star by Thomson har nu gått ut.',
    explanation: 'Du har fortfarande tillgång till ditt konto, men premiumfunktioner som AI-assistenten, videoanalys och integrationsynkronisering är nu begränsade.',
    benefits: [
      'AI-assistent för träningsplanering',
      'Videoanalys av löpteknik',
      'Strava och Garmin-synkronisering',
      'Avancerad prestandaanalys'
    ],
    benefitsTitle: 'Uppgradera för att låsa upp:',
    ctaText: 'Uppgradera nu',
    missYou: 'Vi hoppas att du har haft en bra upplevelse! Uppgradera idag för att fortsätta använda alla funktioner.',
    helpText: 'Har du frågor? Svara på detta mail så hjälper vi dig.',
    closing: 'Med vänliga hälsningar,',
    team: 'Star by Thomson-teamet'
  } : {
    subject: 'Your trial has expired',
    greeting: `Hi ${safeRecipientName},`,
    intro: 'Your free trial of Star by Thomson has now expired.',
    explanation: 'You still have access to your account, but premium features like the AI assistant, video analysis, and integration sync are now limited.',
    benefits: [
      'AI training assistant',
      'Running form video analysis',
      'Strava and Garmin sync',
      'Advanced performance analytics'
    ],
    benefitsTitle: 'Upgrade to unlock:',
    ctaText: 'Upgrade now',
    missYou: 'We hope you\'ve had a great experience! Upgrade today to continue using all features.',
    helpText: 'Have questions? Reply to this email and we\'ll help you.',
    closing: 'Best regards,',
    team: 'The Star by Thomson Team'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #6b7280; padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">${locale === 'sv' ? 'Provperiod avslutad' : 'Trial Expired'}</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.explanation}</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #667eea; margin-top: 0;">${content.benefitsTitle}</h3>
          <ul style="color: #555; padding-left: 20px;">
            ${content.benefits.map(b => `<li style="margin: 8px 0;">${b}</li>`).join('')}
          </ul>
        </div>

        <p style="color: #555; font-size: 16px;">${content.missYou}</p>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeUpgradeUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 18px;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #888; font-size: 14px;">${content.helpText}</p>

        <p style="color: #555; margin-top: 30px;">
          ${content.closing}<br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}

// ==================== REFERRAL INVITE EMAIL ====================
export function getReferralInviteEmailTemplate(data: ReferralInviteEmailData) {
  const { recipientName, referrerName, signupUrl, benefit, locale = 'sv' } = data;
  const safeRecipientName = escapeHtml(recipientName)
  const safeReferrerName = escapeHtml(referrerName)
  const safeBenefit = escapeHtml(benefit)
  const safeSignupUrl = sanitizeAttribute(sanitizeUrl(signupUrl))

  const content = locale === 'sv' ? {
    subject: `${safeReferrerName} har bjudit in dig till Star by Thomson`,
    greeting: safeRecipientName ? `Hej ${safeRecipientName},` : 'Hej!',
    intro: `${safeReferrerName} tycker att du skulle älska Star by Thomson och har bjudit in dig att prova plattformen.`,
    benefitTitle: 'Du får:',
    aboutTitle: 'Om Star by Thomson',
    about: 'Star by Thomson är en komplett plattform för prestationstest och träningsplanering. Skapa konditionstester, generera professionella träningsprogram och övervaka idrottare med avancerad analys.',
    ctaText: 'Registrera dig gratis',
    closing: 'Vi ser fram emot att välkomna dig!',
    team: 'Star by Thomson-teamet'
  } : {
    subject: `${safeReferrerName} has invited you to Star by Thomson`,
    greeting: safeRecipientName ? `Hi ${safeRecipientName},` : 'Hi!',
    intro: `${safeReferrerName} thinks you would love Star by Thomson and has invited you to try the platform.`,
    benefitTitle: 'You get:',
    aboutTitle: 'About Star by Thomson',
    about: 'Star by Thomson is a complete platform for performance testing and training planning. Create performance tests, generate professional training programs, and monitor athletes with advanced analytics.',
    ctaText: 'Sign up for free',
    closing: 'We look forward to welcoming you!',
    team: 'The Star by Thomson Team'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎁 ${locale === 'sv' ? 'Du är inbjuden!' : 'You\'re Invited!'}</h1>
      </div>

      <div style="padding: 40px 30px;">
        <h2 style="color: #333; margin-top: 0;">${content.greeting}</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">${content.intro}</p>

        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <p style="color: white; margin: 0 0 5px 0; font-size: 14px;">${content.benefitTitle}</p>
          <p style="color: white; margin: 0; font-size: 20px; font-weight: bold;">${safeBenefit}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #667eea; margin-top: 0;">${content.aboutTitle}</h3>
          <p style="color: #555; margin-bottom: 0;">${content.about}</p>
        </div>

        <div style="text-align: center; margin: 35px 0;">
          <a href="${safeSignupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 18px;">
            ${content.ctaText}
          </a>
        </div>

        <p style="color: #555; margin-top: 30px; text-align: center;">
          ${content.closing}<br/><br/>
          <strong>${content.team}</strong>
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Star by Thomson. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject: content.subject, html };
}
