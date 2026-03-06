import fs from 'fs'
import { test as setup } from '@playwright/test'
import { AUTH_STATE_DIR, AUTH_STATE_PATHS } from './auth-state'
import { login, waitForSupabaseAuthCookie } from './helpers'
import { ensureAthleteAuthAccount, ensurePlatformAdminAuthAccount } from './auth-provisioning'

setup.describe.configure({ mode: 'serial' })
setup.setTimeout(240_000)

setup.beforeAll(() => {
  fs.mkdirSync(AUTH_STATE_DIR, { recursive: true })
})

setup('authenticate athlete session', async ({ page }) => {
  const athlete = await ensureAthleteAuthAccount()
  await login(page, athlete.email, athlete.password)
  await waitForSupabaseAuthCookie(page)
  await page.context().storageState({ path: AUTH_STATE_PATHS.athlete })
})

setup('authenticate platform admin session', async ({ page }) => {
  const admin = await ensurePlatformAdminAuthAccount()
  await login(page, admin.email, admin.password)
  await waitForSupabaseAuthCookie(page)
  await page.context().storageState({ path: AUTH_STATE_PATHS.admin })
})
