/**
 * Mint a Supabase access token for bearer-auth smoke tests — the same token a
 * mobile app gets from supabase-js sign-in (docs/MOBILE_APP_PLAN.md §3).
 *
 * Usage:
 *   npx tsx scripts/dev/get-bearer-token.ts <email> <password>
 *
 * Then:
 *   TOKEN=$(npx tsx scripts/dev/get-bearer-token.ts athlete@example.com pw | tail -1)
 *   curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/athlete/me
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from the
 * environment, falling back to .env.local (Prisma-style scripts expect the
 * caller to export them; this one is forgiving).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocalFallback(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length === 0) return
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!match) continue
      const [, key, value] = match
      if (missing.includes(key) && !process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    /* no .env.local — rely on the environment */
  }
}

async function main() {
  const [email, password] = process.argv.slice(2)
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/dev/get-bearer-token.ts <email> <password>')
    process.exit(1)
  }

  loadEnvLocalFallback(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    console.error(`Sign-in failed: ${error?.message ?? 'no session returned'}`)
    process.exit(1)
  }

  console.error(`Signed in as ${data.user?.email} (expires in ${data.session.expires_in}s)`)
  // Token on stdout (everything else on stderr) so `| tail -1` / $() capture works.
  console.log(data.session.access_token)
}

void main()
