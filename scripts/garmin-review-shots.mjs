/**
 * Capture Garmin brand-compliance screenshots against production.
 *
 * Usage: EMAIL=... PASSWORD=... node scripts/garmin-review-shots.mjs
 * Output: ./garmin-review-screenshots/*.png
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'https://trainomics.app'
const OUT = 'garmin-review-screenshots'
const email = process.env.EMAIL
const password = process.env.PASSWORD
if (!email || !password) {
  console.error('Set EMAIL and PASSWORD env vars')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'sv-SE',
})

const settle = async (ms = 6000) => {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(ms)
}

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`captured ${name} (${page.url()})`)
}

// Screenshot the page viewport-by-viewport so no section is missed.
const paginate = async (name, maxParts = 12) => {
  const height = await page.evaluate(() => document.body.scrollHeight)
  const step = 820 // 900px viewport with overlap
  const parts = Math.min(Math.max(Math.ceil((height - 900) / step) + 1, 1), maxParts)
  for (let i = 0; i < parts; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * step)
    await page.waitForTimeout(1200)
    await shot(parts > 1 ? `${name}-${String(i + 1).padStart(2, '0')}` : name)
  }
}

console.log('logging in…')
await page.goto(`${BASE}/login`)
await page.fill('#email', email)
await page.fill('#password', password)
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 45000 })
await settle()

// Coach accounts view the athlete UI via "athlete mode" (athleteMode cookie
// + selfAthleteClientId). Set the cookie before visiting athlete routes.
await page.context().addCookies([
  { name: 'athleteMode', value: 'true', domain: 'trainomics.app', path: '/', secure: true, sameSite: 'Lax' },
])

const slugMatch = new URL(page.url()).pathname.match(/^\/([^/]+)\//)
const slug = process.env.SLUG || (slugMatch ? slugMatch[1] : null)
const prefix = slug ? `/${slug}` : ''
console.log(`business slug: ${slug ?? '(none — legacy routes)'}`)

await page.goto(`${BASE}${prefix}/athlete/dashboard`)
await settle(9000)
await paginate('01-dashboard')

await page.goto(`${BASE}/athlete/log-workout/import/garmin`)
await settle()
await paginate('02-garmin-import-list', 4)

await page.goto(`${BASE}${prefix}/athlete/check-in`)
await settle()
await paginate('03-daily-check-in', 4)

await page.goto(`${BASE}${prefix}/athlete/calendar`)
await settle(9000)
await paginate('04-calendar', 4)

await page.goto(`${BASE}${prefix}/athlete/history`)
await settle(9000)
await paginate('05-history', 6)

await browser.close()
console.log('done')
