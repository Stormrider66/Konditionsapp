import { describe, expect, it } from 'vitest'

import {
  EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES,
  EXTERNAL_ATHLETE_ACCESS_TOKEN_PREFIX,
  buildExternalAthleteAccessUrl,
  createExternalAthleteAccessToken,
  getExternalAthleteAccessStatus,
  hashExternalAthleteAccessToken,
} from './external-athlete-access'

describe('external athlete access helpers', () => {
  it('creates opaque prefixed tokens and hashes them before storage', () => {
    const token = createExternalAthleteAccessToken()

    expect(token.startsWith(EXTERNAL_ATHLETE_ACCESS_TOKEN_PREFIX)).toBe(true)
    expect(hashExternalAthleteAccessToken(token)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashExternalAthleteAccessToken(token)).not.toContain(token)
  })

  it('includes tests in the default external player scope', () => {
    expect(EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES).toEqual(['calendar', 'workouts', 'tests'])
  })

  it('builds share urls without leaking trailing slashes', () => {
    expect(buildExternalAthleteAccessUrl('https://app.trainomics.app/', 'eax_demo')).toBe(
      'https://app.trainomics.app/external/athlete/eax_demo'
    )
  })

  it('resolves access status from revocation and expiry fields', () => {
    expect(getExternalAthleteAccessStatus({})).toBe('active')
    expect(getExternalAthleteAccessStatus({ revokedAt: new Date() })).toBe('revoked')
    expect(getExternalAthleteAccessStatus({ expiresAt: new Date(Date.now() - 1_000) })).toBe('expired')
  })
})
