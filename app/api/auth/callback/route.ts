import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type SupportedEmailOtpType =
  | 'recovery'
  | 'invite'
  | 'magiclink'
  | 'signup'
  | 'email'
  | 'email_change'

function isSupportedEmailOtpType(value: string | null): value is SupportedEmailOtpType {
  return [
    'recovery',
    'invite',
    'magiclink',
    'signup',
    'email',
    'email_change',
  ].includes(value ?? '')
}

function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/')) {
    return '/login'
  }

  if (next.startsWith('//')) {
    return '/login'
  }

  return next
}

// GET /api/auth/callback
// Handles the PKCE code exchange after Supabase email verification redirects.
// Supabase appends ?code=... to the redirect URL; this route exchanges
// the code for a session (setting auth cookies) then redirects to the
// final destination specified in the `next` query parameter.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const rawType = searchParams.get('type')
  const next = getSafeNextPath(searchParams.get('next'))

  // Build absolute redirect URL (keep it on the same origin)
  const origin = request.nextUrl.origin
  const redirectUrl = `${origin}${next}`

  const otpType = isSupportedEmailOtpType(rawType) ? rawType : null

  if (code || (tokenHash && otpType)) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    let error: Error | null = null

    if (code) {
      const result = await supabase.auth.exchangeCodeForSession(code)
      error = result.error
    } else if (tokenHash && otpType) {
      const result = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      })
      error = result.error
    }

    if (!error) {
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If no code or exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
