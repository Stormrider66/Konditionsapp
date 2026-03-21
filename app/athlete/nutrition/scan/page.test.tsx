// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import NutritionScanPage from './page'

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

describe('NutritionScanPage', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    })
  })

  it('defaults to the dashboard return path', () => {
    render(<NutritionScanPage />)

    const backLink = screen.getByRole('link', { name: /tillbaka till dashboard/i })
    const scanner = screen.getByTestId('food-photo-scanner')

    expect(backLink.getAttribute('href')).toBe('/acme/athlete/dashboard')
    expect(scanner.getAttribute('data-redirect')).toBe('/acme/athlete/dashboard')
  })

  it('returns to nutrition when requested', () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => key === 'returnTo' ? 'nutrition' : null,
    })

    render(<NutritionScanPage />)

    const backLink = screen.getByRole('link', { name: /tillbaka till kost/i })
    const scanner = screen.getByTestId('food-photo-scanner')

    expect(backLink.getAttribute('href')).toBe('/acme/athlete/nutrition')
    expect(scanner.getAttribute('data-redirect')).toBe('/acme/athlete/nutrition')
  })
})
