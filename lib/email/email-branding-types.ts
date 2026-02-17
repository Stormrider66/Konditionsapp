// lib/email/email-branding-types.ts
// Email branding types and utility functions (shared between server and templates).

import { PLATFORM_NAME } from '@/lib/branding/types'

export interface EmailBranding {
  /** Display name in footer/closing (e.g. "Trainomics" or "MyGym") */
  platformName: string
  /** Custom "from" display name for emails (e.g. "MyGym") */
  senderName: string
  /** Logo URL for email header */
  logoUrl: string | null
  /** Primary color for buttons/gradients */
  primaryColor: string
  /** Gradient start color */
  gradientStart: string
  /** Gradient end color */
  gradientEnd: string
  /** Footer text (e.g. "© 2026 Trainomics. All rights reserved.") */
  footerText: string
  /** Whether to show "Powered by Trainomics" footer */
  showPoweredBy: boolean
}

/** Default platform branding */
export const DEFAULT_EMAIL_BRANDING: EmailBranding = {
  platformName: PLATFORM_NAME,
  senderName: PLATFORM_NAME,
  logoUrl: null,
  primaryColor: '#667eea',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  footerText: `© ${new Date().getFullYear()} ${PLATFORM_NAME}. All rights reserved.`,
  showPoweredBy: false,
}

/**
 * Wrap email content with a branded layout (header + footer).
 */
export function emailLayout(
  branding: EmailBranding,
  headerTitle: string,
  bodyContent: string,
  options?: { headerBgColor?: string }
): string {
  const headerBg = options?.headerBgColor
    ? `background-color: ${options.headerBgColor};`
    : `background: linear-gradient(135deg, ${branding.gradientStart} 0%, ${branding.gradientEnd} 100%);`

  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${branding.platformName}" style="max-height: 40px; margin-bottom: 12px;" /><br/>`
    : ''

  const poweredByHtml = branding.showPoweredBy
    ? `<p style="color: #aaa; font-size: 11px; margin-top: 8px;">Powered by ${PLATFORM_NAME}</p>`
    : ''

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="${headerBg} padding: 40px 20px; text-align: center;">
        ${logoHtml}
        <h1 style="color: white; margin: 0; font-size: 28px;">${headerTitle}</h1>
      </div>

      <div style="padding: 40px 30px;">
        ${bodyContent}
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          ${branding.footerText}
        </p>
        ${poweredByHtml}
      </div>
    </div>
  `
}

/**
 * Generate a standard CTA button HTML
 */
export function emailButton(
  branding: EmailBranding,
  url: string,
  text: string,
  options?: { bgColor?: string }
): string {
  const bg = options?.bgColor
    ? `background-color: ${options.bgColor};`
    : `background: linear-gradient(135deg, ${branding.gradientStart} 0%, ${branding.gradientEnd} 100%);`

  return `
    <div style="text-align: center; margin: 35px 0;">
      <a href="${url}" style="${bg} color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        ${text}
      </a>
    </div>
  `
}
