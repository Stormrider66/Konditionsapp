import { describe, expect, it } from 'vitest'
import { checkLaunchConfig, isHttpsProductionUrl } from './qa-launch-config'

describe('qa-launch-config', () => {
  it('requires a valid invite mode', () => {
    expect(checkLaunchConfig({}).errors).toContain('Set HOCKEY_PILOT_INVITE_MODE to "live" or "manual" before pilot onboarding.')
  })

  it('requires paused email and a named owner for manual invite mode', () => {
    expect(checkLaunchConfig({
      HOCKEY_PILOT_INVITE_MODE: 'manual',
      EMAILS_PAUSED: 'false',
      USE_JWT_CLAIMS: 'true',
    }).errors).toEqual([
      'EMAILS_PAUSED must be true when HOCKEY_PILOT_INVITE_MODE=manual.',
      'HOCKEY_PILOT_MANUAL_INVITE_OWNER is required for manual invite follow-up.',
    ])
  })

  it('passes manual invite mode when ownership and email pause are explicit', () => {
    const result = checkLaunchConfig({
      HOCKEY_PILOT_INVITE_MODE: 'manual',
      EMAILS_PAUSED: 'true',
      HOCKEY_PILOT_MANUAL_INVITE_OWNER: 'Henrik',
      USE_JWT_CLAIMS: 'true',
    })

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('requires production email and auth config for live invite mode', () => {
    expect(checkLaunchConfig({
      HOCKEY_PILOT_INVITE_MODE: 'live',
      EMAILS_PAUSED: 'true',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      USE_JWT_CLAIMS: 'true',
    }).errors).toEqual([
      'EMAILS_PAUSED must not be true when HOCKEY_PILOT_INVITE_MODE=live.',
      'RESEND_API_KEY is required for live invite email.',
      'NEXT_PUBLIC_SUPABASE_URL is required for invite auth links.',
      'SUPABASE_SERVICE_ROLE_KEY is required to generate invite auth links.',
      'NEXT_PUBLIC_APP_URL must be a production https URL for live invite links.',
    ])
  })

  it('warns when JWT claims are not enabled', () => {
    expect(checkLaunchConfig({
      HOCKEY_PILOT_INVITE_MODE: 'manual',
      EMAILS_PAUSED: 'true',
      HOCKEY_PILOT_MANUAL_INVITE_OWNER: 'Henrik',
    }).warnings).toEqual([
      'USE_JWT_CLAIMS is not true; middleware may use slower DB lookup fallback during pilot traffic.',
    ])
  })

  it('accepts only https production app URLs for live links', () => {
    expect(isHttpsProductionUrl('https://app.example.com')).toBe(true)
    expect(isHttpsProductionUrl('http://app.example.com')).toBe(false)
    expect(isHttpsProductionUrl('https://localhost:3000')).toBe(false)
    expect(isHttpsProductionUrl('not-a-url')).toBe(false)
  })
})
