import { describe, it, expect } from 'vitest'
import { readJwtClaims } from '../jwt-claims'

describe('readJwtClaims', () => {
  it('returns null when appMetadata is null or undefined', () => {
    expect(readJwtClaims(null)).toBeNull()
    expect(readJwtClaims(undefined)).toBeNull()
  })

  it('returns null when dbUserId is missing (hook not registered)', () => {
    expect(readJwtClaims({ role: 'COACH' })).toBeNull()
  })

  it('parses a minimal coach claim', () => {
    const claims = readJwtClaims({ dbUserId: 'u1', role: 'COACH' })
    expect(claims).toEqual({
      dbUserId: 'u1',
      role: 'COACH',
      adminRole: null,
      primarySlug: null,
      memberBusinessSlugs: [],
      selfAthleteClientId: null,
    })
  })

  it('preserves an athlete with primary slug + membership array', () => {
    const claims = readJwtClaims({
      dbUserId: 'u2',
      role: 'ATHLETE',
      primarySlug: 'star-by-thomson',
      memberBusinessSlugs: ['star-by-thomson', 'elite-training'],
    })
    expect(claims?.primarySlug).toBe('star-by-thomson')
    expect(claims?.memberBusinessSlugs).toEqual(['star-by-thomson', 'elite-training'])
  })

  it('strips non-string entries from memberBusinessSlugs', () => {
    const claims = readJwtClaims({
      dbUserId: 'u3',
      memberBusinessSlugs: ['a', 123, null, 'b'] as unknown[],
    })
    expect(claims?.memberBusinessSlugs).toEqual(['a', 'b'])
  })

  it('treats non-string role / adminRole / selfAthleteClientId as null', () => {
    const claims = readJwtClaims({
      dbUserId: 'u4',
      role: 123,
      adminRole: true,
      selfAthleteClientId: {},
    })
    expect(claims?.role).toBeNull()
    expect(claims?.adminRole).toBeNull()
    expect(claims?.selfAthleteClientId).toBeNull()
  })

  it('reads adminRole and selfAthleteClientId when populated', () => {
    const claims = readJwtClaims({
      dbUserId: 'u5',
      role: 'ADMIN',
      adminRole: 'PLATFORM',
      selfAthleteClientId: 'client-99',
    })
    expect(claims?.adminRole).toBe('PLATFORM')
    expect(claims?.selfAthleteClientId).toBe('client-99')
  })
})
