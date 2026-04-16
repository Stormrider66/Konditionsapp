/**
 * Server-side helper for reading the per-request CSP nonce set by
 * middleware (`x-nonce` request header).
 *
 * In production we don't allow `'unsafe-inline'` in script-src. Any
 * inline <script> emitted by a Server Component must carry the nonce:
 *
 *   import { getCspNonce } from '@/lib/csp'
 *
 *   export default async function MyPage() {
 *     const nonce = await getCspNonce()
 *     return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `…` }} />
 *   }
 *
 * Next.js itself also picks up `x-nonce` and stamps it on the inline
 * scripts it generates for hydration, so most code paths don't need
 * this helper — only hand-written inline scripts do.
 */

import { headers } from 'next/headers'

export async function getCspNonce(): Promise<string | undefined> {
  const h = await headers()
  return h.get('x-nonce') ?? undefined
}
