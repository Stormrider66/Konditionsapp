import { describe, expect, it } from 'vitest'

import { invitableRolesFor, isRoleInvitableFor, roleLabelFor } from './assistant-coach'

describe('invitableRolesFor', () => {
  it('CLUB sees the full team-staff lineup including sport director and assistant coach', () => {
    const roles = invitableRolesFor('CLUB').map((r) => r.value)
    expect(roles).toEqual([
      'COACH',
      'PHYSICAL_TRAINER',
      'ASSISTANT_COACH',
      'PHYSIO',
      'ADMIN',
    ])
  })

  it('GYM drops sport director (ADMIN) and assistant coach', () => {
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
  it('rejects sport director (ADMIN) on a GYM', () => {
    expect(isRoleInvitableFor('ADMIN', 'GYM')).toBe(false)
  })

  it('accepts head coach (COACH) on every business type', () => {
    expect(isRoleInvitableFor('COACH', 'CLUB')).toBe(true)
    expect(isRoleInvitableFor('COACH', 'GYM')).toBe(true)
    expect(isRoleInvitableFor('COACH', 'INDEPENDENT_COACH')).toBe(true)
  })

  it('rejects ASSISTANT_COACH on INDEPENDENT_COACH', () => {
    expect(isRoleInvitableFor('ASSISTANT_COACH', 'INDEPENDENT_COACH')).toBe(false)
  })
})

describe('roleLabelFor', () => {
  it('labels ADMIN as "Sport director" only on CLUB businesses by default', () => {
    expect(roleLabelFor('ADMIN', 'CLUB')).toBe('Sport director')
    expect(roleLabelFor('ADMIN', 'GYM')).toBe('Administrator')
    expect(roleLabelFor('ADMIN', 'INDEPENDENT_COACH')).toBe('Administrator')
  })

  it('uses English labels for non-ADMIN roles by default', () => {
    expect(roleLabelFor('COACH', 'CLUB')).toBe('Head coach')
    expect(roleLabelFor('COACH', 'GYM')).toBe('Head coach')
    expect(roleLabelFor('PHYSIO', 'INDEPENDENT_COACH')).toBe('Physiotherapist')
  })

  it('keeps Swedish labels when requested', () => {
    expect(roleLabelFor('ADMIN', 'CLUB', 'sv')).toBe('Sportchef')
    expect(roleLabelFor('ADMIN', 'GYM', 'sv')).toBe('Administratör')
    expect(roleLabelFor('COACH', 'CLUB', 'sv')).toBe('Huvudtränare')
    expect(roleLabelFor('PHYSIO', 'INDEPENDENT_COACH', 'sv')).toBe('Fysioterapeut')
  })

  it('returns localized invitable labels', () => {
    expect(invitableRolesFor('CLUB')[0]?.label).toBe('Head coach')
    expect(invitableRolesFor('CLUB', 'sv')[0]?.label).toBe('Huvudtränare')
  })

  it('falls back to the raw role when unknown', () => {
    expect(roleLabelFor('CUSTOM_ROLE' as never, 'CLUB')).toBe('CUSTOM_ROLE')
  })
})
