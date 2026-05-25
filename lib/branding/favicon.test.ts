import { describe, expect, it } from 'vitest'
import {
  buildBusinessFaviconSvg,
  getBusinessFaviconUrl,
  getFaviconLabel,
  normalizeFaviconColor,
} from './favicon'

describe('business favicon helpers', () => {
  it('builds a slug-specific fallback URL', () => {
    expect(getBusinessFaviconUrl('star-by-thomson')).toBe('/api/branding/favicon/star-by-thomson')
  })

  it('uses the first business-name character as the generated label', () => {
    expect(getFaviconLabel('Star by Thomson')).toBe('S')
  })

  it('falls back to the platform color when the stored color is invalid', () => {
    expect(normalizeFaviconColor('not-a-color')).toBe('#3b82f6')
  })

  it('renders a generated svg favicon for businesses without a custom favicon', () => {
    const svg = buildBusinessFaviconSvg({
      name: 'Star by Thomson',
      primaryColor: '#3b82f6',
    })

    expect(svg).toContain('<svg')
    expect(svg).toContain('fill="#3b82f6"')
    expect(svg).toContain('>S</text>')
  })
})
