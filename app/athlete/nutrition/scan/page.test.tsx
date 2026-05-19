// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import NutritionScanPage from './page'
import messages from '@/messages/sv.json'

const useSearchParamsMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('@/lib/contexts/BasePathContext', () => ({
  useBasePath: () => '/acme',
}))

vi.mock('@/components/nutrition/FoodPhotoScanner', () => ({
  FoodPhotoScanner: ({ redirectPathOnSave }: { redirectPathOnSave: string }) => (
    <div data-testid="food-photo-scanner" data-redirect={redirectPathOnSave} />
  ),
}))

function renderNutritionScanPage() {
  return render(
    <NextIntlClientProvider locale="sv" messages={messages}>
      <NutritionScanPage />
    </NextIntlClientProvider>
  )
}

describe('NutritionScanPage', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    })
  })

  it('defaults to the dashboard return path', () => {
    renderNutritionScanPage()

    const backLink = screen.getByRole('link', { name: /tillbaka till dashboard/i })
    const scanner = screen.getByTestId('food-photo-scanner')

    expect(backLink.getAttribute('href')).toBe('/acme/athlete/dashboard')
    expect(scanner.getAttribute('data-redirect')).toBe('/acme/athlete/dashboard')
  })

  it('returns to nutrition when requested', () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => key === 'returnTo' ? 'nutrition' : null,
    })

    renderNutritionScanPage()

    const backLink = screen.getByRole('link', { name: /tillbaka till kost/i })
    const scanner = screen.getByTestId('food-photo-scanner')

    expect(backLink.getAttribute('href')).toBe('/acme/athlete/nutrition')
    expect(scanner.getAttribute('data-redirect')).toBe('/acme/athlete/nutrition')
  })
})
