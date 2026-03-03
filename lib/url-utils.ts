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
