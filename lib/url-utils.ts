/**
 * Replace localhost host/protocol/port in a URL with the production app URL.
 * Supabase generates links based on its Site URL setting — if that's still
 * pointing at localhost the generated action_links will be broken.
 * This is a defensive safeguard; the root fix is updating the Supabase
 * Dashboard Site URL to the production domain.
 */
export function fixLocalhostUrl(url: string, appUrl: string): string {
  if (!url.includes('localhost')) return url

  try {
    const parsed = new URL(url)
    const prod = new URL(appUrl)
    parsed.protocol = prod.protocol
    parsed.host = prod.host
    parsed.port = ''
    return parsed.toString()
  } catch {
    return url
  }
}

type RecoveryLinkData = {
  properties?: {
    action_link?: string | null
    hashed_token?: string | null
  } | null
} | null

/**
 * Build a recovery callback URL that always lands in this app.
 *
 * Supabase `admin.generateLink()` can ignore `redirectTo` and send users back
 * to the project's Site URL instead. When we get a hashed recovery token, we
 * bypass that redirect entirely and send users straight to our callback route.
 */
export function buildRecoveryCallbackUrl(
  linkData: RecoveryLinkData,
  appUrl: string,
  nextPath = '/reset-password'
): string | null {
  const tokenHash = linkData?.properties?.hashed_token
  if (tokenHash) {
    const callbackUrl = new URL('/api/auth/callback', appUrl)
    callbackUrl.searchParams.set('token_hash', tokenHash)
    callbackUrl.searchParams.set('type', 'recovery')
    callbackUrl.searchParams.set('next', nextPath)
    return callbackUrl.toString()
  }

  const actionLink = linkData?.properties?.action_link
  if (actionLink) {
    return fixLocalhostUrl(actionLink, appUrl)
  }

  return null
}
