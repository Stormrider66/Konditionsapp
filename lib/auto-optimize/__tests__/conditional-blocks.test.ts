import { describe, it, expect } from 'vitest'
import { stripConditionalBlocks } from '../iteration-engine'
import { getSportCategory, isGymSport } from '../types'
import { ENRICHED_BASELINE_TEMPLATE } from '../enriched-baseline-template'

// ── Sport Category Mapping ──────────────────────────────────────────

describe('getSportCategory', () => {
  it('maps endurance sports correctly', () => {
    expect(getSportCategory('RUNNING')).toBe('ENDURANCE')
    expect(getSportCategory('CYCLING')).toBe('ENDURANCE')
    expect(getSportCategory('SKIING')).toBe('ENDURANCE')
    expect(getSportCategory('SWIMMING')).toBe('ENDURANCE')
    expect(getSportCategory('TRIATHLON')).toBe('ENDURANCE')
  })

  it('maps gym sports correctly', () => {
    expect(getSportCategory('STRENGTH')).toBe('STRENGTH_GYM')
    expect(getSportCategory('GENERAL_FITNESS')).toBe('STRENGTH_GYM')
    expect(getSportCategory('FUNCTIONAL_FITNESS')).toBe('STRENGTH_GYM')
  })

  it('maps HYROX as HYBRID', () => {
    expect(getSportCategory('HYROX')).toBe('HYBRID')
  })

  it('maps team/racket sports correctly', () => {
    expect(getSportCategory('TEAM_FOOTBALL')).toBe('TEAM_SPORT')
    expect(getSportCategory('TENNIS')).toBe('TEAM_SPORT')
    expect(getSportCategory('PADEL')).toBe('TEAM_SPORT')
  })

  it('defaults to ENDURANCE for unknown sport', () => {
    expect(getSportCategory('UNKNOWN_SPORT')).toBe('ENDURANCE')
  })
})

describe('isGymSport', () => {
  it('returns true for STRENGTH_GYM and HYBRID', () => {
    expect(isGymSport('STRENGTH')).toBe(true)
    expect(isGymSport('GENERAL_FITNESS')).toBe(true)
    expect(isGymSport('HYROX')).toBe(true)
  })

  it('returns false for endurance and team sports', () => {
    expect(isGymSport('RUNNING')).toBe(false)
    expect(isGymSport('TEAM_FOOTBALL')).toBe(false)
  })
})

// ── Conditional Block Stripping ─────────────────────────────────────

describe('stripConditionalBlocks', () => {
  const TEMPLATE = [
    'Universal content here.',
    '{{#if_category ENDURANCE}}Endurance block content.{{/endif}}',
    '{{#if_category STRENGTH_GYM}}Gym block content.{{/endif}}',
    '{{#if_category HYBRID}}Hybrid block content.{{/endif}}',
    '{{#if_category TEAM_SPORT}}Team sport block content.{{/endif}}',
    '{{#if_methodology POLARIZED}}Polarized methodology.{{/endif}}',
    '{{#if_methodology NORWEGIAN}}Norwegian methodology.{{/endif}}',
    'End of template.',
  ].join('\n')

  it('keeps ENDURANCE blocks for RUNNING', () => {
    const result = stripConditionalBlocks(TEMPLATE, 'RUNNING', 'POLARIZED')
    expect(result).toContain('Universal content here.')
    expect(result).toContain('Endurance block content.')
    expect(result).toContain('Polarized methodology.')
    expect(result).not.toContain('Gym block content.')
    expect(result).not.toContain('Hybrid block content.')
    expect(result).not.toContain('Team sport block content.')
    expect(result).not.toContain('Norwegian methodology.')
    expect(result).toContain('End of template.')
  })

  it('keeps STRENGTH_GYM blocks for STRENGTH', () => {
    const result = stripConditionalBlocks(TEMPLATE, 'STRENGTH')
    expect(result).toContain('Universal content here.')
    expect(result).toContain('Gym block content.')
    expect(result).not.toContain('Endurance block content.')
    expect(result).not.toContain('Hybrid block content.')
  })

  it('keeps STRENGTH_GYM and ENDURANCE blocks for HYROX (HYBRID)', () => {
    const result = stripConditionalBlocks(TEMPLATE, 'HYROX', 'POLARIZED')
    expect(result).toContain('Universal content here.')
    expect(result).toContain('Endurance block content.')
    expect(result).toContain('Gym block content.')
    expect(result).toContain('Hybrid block content.')
    expect(result).toContain('Polarized methodology.')
    expect(result).not.toContain('Team sport block content.')
  })

  it('keeps TEAM_SPORT blocks for TEAM_FOOTBALL', () => {
    const result = stripConditionalBlocks(TEMPLATE, 'TEAM_FOOTBALL')
    expect(result).toContain('Team sport block content.')
    expect(result).not.toContain('Endurance block content.')
    expect(result).not.toContain('Gym block content.')
  })

  it('strips methodology blocks when methodology does not match', () => {
    const result = stripConditionalBlocks(TEMPLATE, 'RUNNING', 'CANOVA')
    expect(result).toContain('Endurance block content.')
    expect(result).not.toContain('Polarized methodology.')
    expect(result).not.toContain('Norwegian methodology.')
  })

  it('keeps correct methodology block', () => {
    const result = stripConditionalBlocks(TEMPLATE, 'RUNNING', 'NORWEGIAN')
    expect(result).toContain('Norwegian methodology.')
    expect(result).not.toContain('Polarized methodology.')
  })

  it('removes block markers but keeps content for matching blocks', () => {
    const result = stripConditionalBlocks(TEMPLATE, 'STRENGTH')
    expect(result).not.toContain('{{#if_category')
    expect(result).not.toContain('{{/endif}}')
    expect(result).not.toContain('{{#if_methodology')
  })

  it('preserves {{variable}} placeholders after stripping', () => {
    const templateWithVars = [
      'Sport: {{sport}}',
      '{{#if_category ENDURANCE}}Zone: {{methodology}}{{/endif}}',
      '{{#if_category STRENGTH_GYM}}Weeks: {{totalWeeks}}{{/endif}}',
    ].join('\n')

    const result = stripConditionalBlocks(templateWithVars, 'RUNNING')
    expect(result).toContain('{{sport}}')
    expect(result).toContain('{{methodology}}')
    expect(result).not.toContain('{{totalWeeks}}')
  })

  it('handles multiline blocks correctly', () => {
    const multiline = [
      'Before.',
      '{{#if_category STRENGTH_GYM}}',
      'Line 1 of gym content.',
      'Line 2 of gym content.',
      '{{/endif}}',
      'After.',
    ].join('\n')

    const gymResult = stripConditionalBlocks(multiline, 'STRENGTH')
    expect(gymResult).toContain('Line 1 of gym content.')
    expect(gymResult).toContain('Line 2 of gym content.')

    const enduranceResult = stripConditionalBlocks(multiline, 'RUNNING')
    expect(enduranceResult).not.toContain('Line 1 of gym content.')
    expect(enduranceResult).toContain('Before.')
    expect(enduranceResult).toContain('After.')
  })

  it('cleans up multiple blank lines from stripped blocks', () => {
    const template = 'A\n\n{{#if_category STRENGTH_GYM}}removed{{/endif}}\n\n\n\nB'
    const result = stripConditionalBlocks(template, 'RUNNING')
    // Should not have more than 2 consecutive newlines
    expect(result).not.toMatch(/\n{3,}/)
  })
})

// ── Enriched Template Integration ───────────────────────────────────

describe('ENRICHED_BASELINE_TEMPLATE with conditional blocks', () => {
  it('produces content with STRENGTH_GYM blocks for STRENGTH sport', () => {
    const result = stripConditionalBlocks(ENRICHED_BASELINE_TEMPLATE, 'STRENGTH')
    expect(result).toContain('STYRKETRÄNING')
    expect(result).toContain('Volymlandmärken')
    expect(result).toContain('RPE/RIR-skala')
    expect(result).toContain('Splitrekommendationer')
    expect(result).not.toContain('KONDITIONSTRÄNING & ZONER')
    expect(result).not.toContain('POLARISERAD METODIK')
  })

  it('produces content with ENDURANCE blocks for RUNNING sport', () => {
    const result = stripConditionalBlocks(ENRICHED_BASELINE_TEMPLATE, 'RUNNING', 'POLARIZED')
    expect(result).toContain('KONDITIONSTRÄNING & ZONER')
    expect(result).toContain('POLARISERAD METODIK')
    expect(result).not.toContain('STYRKETRÄNING & GYMPROGRAM')
    expect(result).not.toContain('Volymlandmärken')
    expect(result).not.toContain('CONCURRENT TRAINING')
  })

  it('produces content with both GYM and ENDURANCE blocks for HYROX', () => {
    const result = stripConditionalBlocks(ENRICHED_BASELINE_TEMPLATE, 'HYROX', 'POLARIZED')
    expect(result).toContain('STYRKETRÄNING')
    expect(result).toContain('KONDITIONSTRÄNING')
    expect(result).toContain('CONCURRENT TRAINING')
    expect(result).toContain('HYROX-specifikt')
    expect(result).toContain('compromised running')
  })

  it('produces content with TEAM_SPORT blocks for TEAM_FOOTBALL', () => {
    const result = stripConditionalBlocks(ENRICHED_BASELINE_TEMPLATE, 'TEAM_FOOTBALL')
    expect(result).toContain('LAGSPORT-PERIODISERING')
    expect(result).toContain('Match-day periodisering')
    expect(result).not.toContain('STYRKETRÄNING & GYMPROGRAM')
    expect(result).not.toContain('KONDITIONSTRÄNING & ZONER')
  })

  it('always includes universal sections', () => {
    const sports = ['RUNNING', 'STRENGTH', 'HYROX', 'TEAM_FOOTBALL']
    for (const sport of sports) {
      const result = stripConditionalBlocks(ENRICHED_BASELINE_TEMPLATE, sport)
      expect(result).toContain('PERIODISERINGSPRINCIPER')
      expect(result).toContain('SKADEPREVENTION')
      expect(result).toContain('RAMP UPPVÄRMNING')
      expect(result).toContain('OUTPUT FORMAT')
      expect(result).toContain('{{sport}}')
    }
  })

  it('strips all conditional markers from output', () => {
    const sports = ['RUNNING', 'STRENGTH', 'HYROX', 'TEAM_FOOTBALL']
    for (const sport of sports) {
      const result = stripConditionalBlocks(ENRICHED_BASELINE_TEMPLATE, sport)
      expect(result).not.toContain('{{#if_category')
      expect(result).not.toContain('{{#if_methodology')
      expect(result).not.toContain('{{/endif}}')
    }
  })
})
