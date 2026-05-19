// app/api/branding/reply-to/verify/route.ts
//
// Public click-to-verify endpoint. Recipient clicks the link in the
// verification email → we flip `replyToEmailVerified` if the token is valid,
// then redirect to a friendly status page. No auth — the token IS the auth.
import { NextRequest, NextResponse } from 'next/server'
import { consumeReplyToVerificationToken } from '@/lib/email/reply-to-verification'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const locale = request.nextUrl.searchParams.get('locale') === 'sv' ? 'sv' : 'en'
  const result = await consumeReplyToVerificationToken(token, locale)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
  const status = result.success ? 'ok' : 'error'
  const message = result.success
    ? locale === 'sv'
      ? 'Svar-adressen är bekräftad. Utskick går nu med din adress som reply-to.'
      : 'The reply-to address is confirmed. Emails now use your address as the reply-to.'
    : result.error || (locale === 'sv' ? 'Bekräftelsen misslyckades.' : 'Verification failed.')

  // Redirect to a static status page on the platform domain so we get
  // consistent branding regardless of which business sent the verify email.
  const target = new URL('/branding/reply-to/verified', appUrl)
  target.searchParams.set('status', status)
  target.searchParams.set('message', message)
  return NextResponse.redirect(target)
}
