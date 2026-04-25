// app/api/branding/reply-to/verify/route.ts
//
// Public click-to-verify endpoint. Recipient clicks the link in the
// verification email → we flip `replyToEmailVerified` if the token is valid,
// then redirect to a friendly status page. No auth — the token IS the auth.
import { NextRequest, NextResponse } from 'next/server'
import { consumeReplyToVerificationToken } from '@/lib/email/reply-to-verification'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const result = await consumeReplyToVerificationToken(token)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
  const status = result.success ? 'ok' : 'error'
  const message = result.success
    ? 'Svar-adressen är bekräftad. Utskick går nu med din adress som reply-to.'
    : result.error || 'Bekräftelsen misslyckades.'

  // Redirect to a static status page on the platform domain so we get
  // consistent branding regardless of which business sent the verify email.
  const target = new URL('/branding/reply-to/verified', appUrl)
  target.searchParams.set('status', status)
  target.searchParams.set('message', message)
  return NextResponse.redirect(target)
}
