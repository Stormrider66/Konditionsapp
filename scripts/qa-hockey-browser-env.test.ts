import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const {
  browserQaConfig,
  normalizeEnvValue,
  validateBrowserQaConfig,
} = require(path.join(testDir, 'qa-hockey-browser-env.cjs'))

describe('qa-hockey-browser-env', () => {
  it('builds config from TRAINOMICS_QA env first', () => {
    expect(browserQaConfig({
      TRAINOMICS_QA_BASE_URL: 'https://pilot.example.com',
      TRAINOMICS_QA_BUSINESS_SLUG: 'pilot-club',
      TRAINOMICS_QA_EMAIL: 'coach@example.com',
      TRAINOMICS_QA_PASSWORD: 'secret',
      E2E_BASE_URL: 'https://fallback.example.com',
    })).toEqual({
      baseUrl: 'https://pilot.example.com',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
      strictTarget: false,
    })
  })

  it('uses E2E fallbacks and local defaults', () => {
    expect(browserQaConfig({
      E2E_COACH_EMAIL: 'coach@example.com',
      E2E_COACH_PASSWORD: 'secret',
    })).toEqual({
      baseUrl: 'http://localhost:3000',
      businessSlug: 'skelleftea-aik',
      email: 'coach@example.com',
      password: 'secret',
      strictTarget: false,
    })
  })

  it('enables strict target validation for browser gate mode', () => {
    expect(browserQaConfig({
      TRAINOMICS_QA_BASE_URL: 'https://pilot.example.com',
      TRAINOMICS_QA_BUSINESS_SLUG: 'pilot-club',
      TRAINOMICS_QA_EMAIL: 'coach@example.com',
      TRAINOMICS_QA_PASSWORD: 'secret',
      HOCKEY_PILOT_GATE_MODES: 'deterministic,browser',
    }).strictTarget).toBe(true)
  })

  it('passes a complete https target config', () => {
    const result = validateBrowserQaConfig({
      baseUrl: 'https://pilot.example.com',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
    })

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.targetProductionLike).toBe(true)
    expect(result.targetReason).toBe('https-production-like')
  })

  it('fails missing credentials clearly', () => {
    const result = validateBrowserQaConfig({
      baseUrl: 'https://pilot.example.com',
      businessSlug: '',
      email: '',
      password: '',
    })

    expect(result.errors).toEqual([
      'TRAINOMICS_QA_BUSINESS_SLUG or E2E_BUSINESS_SLUG is required for browser QA.',
      'TRAINOMICS_QA_EMAIL or E2E_COACH_EMAIL is required for browser QA.',
      'TRAINOMICS_QA_PASSWORD or E2E_COACH_PASSWORD is required for browser QA.',
    ])
  })

  it('warns for local and non-https browser targets', () => {
    expect(validateBrowserQaConfig({
      baseUrl: 'http://localhost:3000',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
    }).warnings).toEqual([
      'Browser QA target is local; use a production-like URL before inviting external teams.',
    ])
    expect(validateBrowserQaConfig({
      baseUrl: 'http://localhost:3000',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
    }).targetReason).toBe('local-target')

    expect(validateBrowserQaConfig({
      baseUrl: 'http://pilot.example.com',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
    }).warnings).toEqual([
      'Browser QA target is not https; production-like pilot checks should use https.',
    ])
    expect(validateBrowserQaConfig({
      baseUrl: 'http://pilot.example.com',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
    }).targetReason).toBe('non-https-target')
  })

  it('fails local and non-https targets when running the browser pilot gate', () => {
    expect(validateBrowserQaConfig({
      baseUrl: 'http://localhost:3000',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
      strictTarget: true,
    }).errors).toEqual([
      'Browser QA target is local; use a production-like URL before inviting external teams.',
    ])

    expect(validateBrowserQaConfig({
      baseUrl: 'http://pilot.example.com',
      businessSlug: 'pilot-club',
      email: 'coach@example.com',
      password: 'secret',
      strictTarget: true,
    }).errors).toEqual([
      'Browser QA target is not https; production-like pilot checks should use https.',
    ])
  })

  it('normalizes quoted env values and inline comments', () => {
    expect(normalizeEnvValue('"https://pilot.example.com"')).toBe('https://pilot.example.com')
    expect(normalizeEnvValue('pilot-club # target business')).toBe('pilot-club')
  })
})
