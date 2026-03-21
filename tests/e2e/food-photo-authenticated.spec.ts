import { test, expect, devices, type Route } from '@playwright/test'
import { AUTH_STATE_PATHS, waitForPageReady } from './helpers'

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sXl16sAAAAASUVORK5CYII=',
  'base64'
)

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

test.use({
  ...devices['Pixel 7'],
  storageState: AUTH_STATE_PATHS.athlete,
})

test.describe.configure({ mode: 'serial' })

test.describe('Authenticated Athlete Food Photo Flow', () => {
  test.setTimeout(240_000)

  test('dashboard food photo flow stays on scan page through analysis and returns after save', async ({ page }) => {
    let savedMealPayload: Record<string, unknown> | null = null

    await page.route('**/api/ai/food-scan', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback()
        return
      }

      await fulfillJson(route, {
        result: {
          success: true,
          items: [
            {
              name: 'Kycklinggryta',
              category: 'PROTEIN',
              estimatedGrams: 320,
              portionDescription: '1 portion',
              calories: 540,
              proteinGrams: 42,
              carbsGrams: 36,
              fatGrams: 22,
              fiberGrams: 5,
            },
          ],
          totals: {
            calories: 540,
            proteinGrams: 42,
            carbsGrams: 36,
            fatGrams: 22,
            fiberGrams: 5,
          },
          mealDescription: 'Kycklinggryta med ris',
          suggestedMealType: 'LUNCH',
          confidence: 0.88,
          notes: [],
        },
        enhancedMode: false,
      })
    })

    await page.route('**/api/meals', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback()
        return
      }

      savedMealPayload = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>

      await fulfillJson(route, {
        data: { id: 'meal_e2e_1' },
      })
    })

    await page.goto('/athlete/dashboard', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await waitForPageReady(page)

    const logFoodButton = page.getByRole('button', { name: /logga mat/i })
    await expect(logFoodButton).toBeVisible({ timeout: 120_000 })
    await logFoodButton.click()

    const photoMethodButton = page.getByRole('button', { name: /foto/i })
    await expect(photoMethodButton).toBeVisible({ timeout: 30_000 })
    await photoMethodButton.click()

    await expect(page).toHaveURL(/\/athlete\/nutrition\/scan\?returnTo=dashboard/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: /fota din mat/i })).toBeVisible({ timeout: 30_000 })
    await waitForPageReady(page)
    await expect(page.locator('input[type="file"]')).toHaveCount(2, { timeout: 30_000 })

    await page.locator('input[type="file"]').nth(1).setInputFiles({
      name: 'meal.png',
      mimeType: 'image/png',
      buffer: ONE_PIXEL_PNG,
    })

    const analyzeButton = page.getByRole('button', { name: /analysera måltid/i })
    await expect(analyzeButton).toBeVisible({ timeout: 30_000 })
    await analyzeButton.click()

    await expect(page.locator('input[value="Kycklinggryta"]').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /spara måltid/i })).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: /spara måltid/i }).click()

    await expect(page).toHaveURL(/\/athlete\/dashboard(?:\?.*)?$/, { timeout: 30_000 })
    await expect(page.getByRole('button', { name: /logga mat/i })).toBeVisible({ timeout: 30_000 })
    expect(savedMealPayload).toMatchObject({
      description: 'Kycklinggryta med ris',
      calories: 540,
      mealType: 'LUNCH',
    })
  })
})
