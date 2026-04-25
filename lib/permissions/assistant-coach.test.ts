import { describe, expect, it } from 'vitest'

import { invitableRolesFor, isRoleInvitableFor, roleLabelFor } from './assistant-coach'

describe('invitableRolesFor', () => {
  it('CLUB sees the full team-staff lineup including Sportchef and assistant coach', () => {
    const roles = invitableRolesFor('CLUB').map((r) => r.value)
    expect(roles).toEqual([
      'COACH',
      'PHYSICAL_TRAINER',
      'ASSISTANT_COACH',
      'PHYSIO',
      'ADMIN',
    ])
  })

  it('GYM drops Sportchef (ADMIN) and assistant coach', () => {
    const roles = invitableRolesFor('GYM').map((r) => r.value)
    expect(roles).toEqual(['COACH', 'PHYSICAL_TRAINER', 'PHYSIO'])
    expect(roles).not.toContain('ADMIN')
    expect(roles).not.toContain('ASSISTANT_COACH')
  })

  it('INDEPENDENT_COACH only offers head coach + physio', () => {
    const roles = invitableRolesFor('INDEPENDENT_COACH').map((r) => r.value)
    expect(roles).toEqual(['COACH', 'PHYSIO'])
  })

  it('falls back to CLUB lineup for unknown / null business types', () => {
    expect(invitableRolesFor(null).map((r) => r.value)).toContain('ADMIN')
    expect(invitableRolesFor(undefined).map((r) => r.value)).toContain('ADMIN')
    expect(invitableRolesFor('SOMETHING_ELSE' as never).map((r) => r.value)).toContain('ADMIN')
  })
})

describe('isRoleInvitableFor', () => {
  it('rejects Sportchef (ADMIN) on a GYM', () => {
    expect(isRoleInvitableFor('ADMIN', 'GYM')).toBe(false)
  })

  it('accepts Huvudtränare (COACH) on every business type', () => {
    expect(isRoleInvitableFor('COACH', 'CLUB')).toBe(true)
    expect(isRoleInvitableFor('COACH', 'GYM')).toBe(true)
    expect(isRoleInvitableFor('COACH', 'INDEPENDENT_COACH')).toBe(true)
  })

  it('rejects ASSISTANT_COACH on INDEPENDENT_COACH', () => {
    expect(isRoleInvitableFor('ASSISTANT_COACH', 'INDEPENDENT_COACH')).toBe(false)
  })
})

describe('roleLabelFor', () => {
  it('labels ADMIN as "Sportchef" only on CLUB businesses', () => {
    expect(roleLabelFor('ADMIN', 'CLUB')).toBe('Sportchef')
    expect(roleLabelFor('ADMIN', 'GYM')).toBe('Administratör')
    expect(roleLabelFor('ADMIN', 'INDEPENDENT_COACH')).toBe('Administratör')
  })

  it('uses standard labels for non-ADMIN roles regardless of type', () => {
    expect(roleLabelFor('COACH', 'CLUB')).toBe('Huvudtränare')
    expect(roleLabelFor('COACH', 'GYM')).toBe('Huvudtränare')
    expect(roleLabelFor('PHYSIO', 'INDEPENDENT_COACH')).toBe('Fysioterapeut')
  })

  it('falls back to the raw role when unknown', () => {
    expect(roleLabelFor('CUSTOM_ROLE' as never, 'CLUB')).toBe('CUSTOM_ROLE')
  })
})
