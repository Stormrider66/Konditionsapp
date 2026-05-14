#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('@playwright/test')
const { createClient } = require('@supabase/supabase-js')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(line => line && !line.trim().startsWith('#') && line.includes('='))
      .map(line => {
        const idx = line.indexOf('=')
        const key = line.slice(0, idx)
        const value = line.slice(idx + 1).replace(/^['"]|['"]$/g, '')
        return [key, value]
      })
  )
}

async function main() {
  const root = process.cwd()
  const env = { ...process.env, ...loadEnvFile(path.join(root, '.env.local')) }
  const email = env.TRAINOMICS_QA_EMAIL
  const baseUrl = env.TEAM_DASHBOARD_QA_URL || 'http://localhost:3000'
  const dashboardPath = env.TEAM_DASHBOARD_QA_PATH || '/star-by-thomson/coach/dashboard'

  if (!email) {
    throw new Error('TRAINOMICS_QA_EMAIL is required in .env.local')
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local')
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
  const page = await context.newPage()
  const outputDir = path.join(root, 'load-tests', 'evidence', 'team-dashboard')
  fs.mkdirSync(outputDir, { recursive: true })

  try {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError) throw linkError

    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: linkData.properties.hashed_token,
    })
    if (verifyError) throw verifyError

    const session = sessionData.session
    const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0]
    const cookieName = `sb-${projectRef}-auth-token`
    const cookieValue = encodeURIComponent(JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: 'bearer',
      type: 'access',
      user: session.user,
    }))
    await context.addCookies([{
      name: cookieName,
      value: cookieValue,
      domain: new URL(baseUrl).hostname,
      path: '/',
      expires: session.expires_at,
      httpOnly: false,
      secure: baseUrl.startsWith('https://'),
      sameSite: 'Lax',
    }])

    await page.goto(`${baseUrl}${dashboardPath}`, { waitUntil: 'networkidle' })

    await page.getByText('Mina lag', { exact: true }).waitFor({ timeout: 15000 })
    await page.getByText('Snabba åtgärder', { exact: true }).waitFor({ timeout: 15000 })
    await page.getByText('Lagpuls', { exact: true }).waitFor({ timeout: 15000 })

    const screenshotPath = path.join(outputDir, `team-dashboard-${Date.now()}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    console.log(JSON.stringify({
      ok: true,
      url: page.url(),
      screenshotPath,
      checks: ['Mina lag', 'Snabba åtgärder', 'Lagpuls'],
    }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
