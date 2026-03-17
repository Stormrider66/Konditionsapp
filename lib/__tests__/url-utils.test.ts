import { describe, expect, it } from 'vitest'
import { buildRecoveryCallbackUrl, fixLocalhostUrl } from '../url-utils'

describe('url utils', () => {
  it('builds a first-party recovery callback URL from a hashed token', () => {
    const url = buildRecoveryCallbackUrl(
      {
        properties: {
          hashed_token: 'recovery-hash',
          action_link: 'https://ignored.example.com',
        },
      },
      'https://trainomics.app'
    )

    expect(url).toBe(
      'https://trainomics.app/api/auth/callback?token_hash=recovery-hash&type=recovery&next=%2Freset-password'
    )
  })

  it('falls back to the generated action link when no hashed token is available', () => {
    const url = buildRecoveryCallbackUrl(
      {
        properties: {
          action_link: 'http://localhost:3000/auth/v1/verify?token=abc&type=recovery',
        },
      },
      'https://trainomics.app'
    )

    expect(url).toBe('https://trainomics.app/auth/v1/verify?token=abc&type=recovery')
  })

  it('returns null when no recovery link data exists', () => {
    expect(buildRecoveryCallbackUrl(null, 'https://trainomics.app')).toBeNull()
  })

  it('replaces localhost hosts in generated URLs', () => {
    expect(
      fixLocalhostUrl('http://localhost:3000/reset-password?token=abc', 'https://trainomics.app')
    ).toBe('https://trainomics.app/reset-password?token=abc')
  })
})
