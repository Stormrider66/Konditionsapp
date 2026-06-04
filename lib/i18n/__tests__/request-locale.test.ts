import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { resolveRequestLocale } from '../request-locale'

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://example.test/api', { headers })
}

describe('resolveRequestLocale', () => {
  it('uses the NEXT_LOCALE cookie first', () => {
    expect(resolveRequestLocale(request({ cookie: 'NEXT_LOCALE=sv', 'accept-language': 'en-US,en;q=0.9' }), 'en')).toBe('sv')
    expect(resolveRequestLocale(request({ cookie: 'NEXT_LOCALE=en', 'accept-language': 'sv-SE,sv;q=0.9' }), 'sv')).toBe('en')
  })

  it('falls back to Accept-Language when no locale cookie is set', () => {
    expect(resolveRequestLocale(request({ 'accept-language': 'sv-SE,sv;q=0.9,en;q=0.8' }), 'en')).toBe('sv')
    expect(resolveRequestLocale(request({ 'accept-language': 'en-US,en;q=0.9,sv;q=0.8' }), 'sv')).toBe('en')
  })

  it('falls back to stored user language and then English', () => {
    expect(resolveRequestLocale(request(), 'sv')).toBe('sv')
    expect(resolveRequestLocale(request(), null)).toBe('en')
  })
})
