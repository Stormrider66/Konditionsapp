/**
 * Tests for the pure decideAdjustment() decision engine.
 *
 * The engine is a cascading rule table where the most severe match
 * wins, so the most important thing to verify is that higher-severity
 * rules pre-empt lower ones when both would fire.
 */

import { describe, it, expect } from 'vitest'
import { decideAdjustment } from '@/lib/training-engine/plan-adjustment/decide-adjustment'

describe('decideAdjustment', () => {
  describe('missing signals', () => {
    it('returns PROCEED with hadSufficientSignal=false when no data is provided', () => {
      const result = decideAdjustment({})
      expect(result.action).toBe('PROCEED')
      expect(result.hadSufficientSignal).toBe(false)
      expect(result.triggers).toEqual([])
    })

    it('returns PROCEED with hadSufficientSignal=true when signals exist but none trigger', () => {
      const result = decideAdjustment({
        acwrZone: 'OPTIMAL',
        readinessScore: 82,
        readinessDecision: 'PROCEED',
        recentPainLevel: 0,
      })
      expect(result.action).toBe('PROCEED')
      expect(result.hadSufficientSignal).toBe(true)
      expect(result.triggers).toEqual([])
    })
  })

  describe('critical rules', () => {
    it('SKIP when acute pain level >= 7', () => {
      const result = decideAdjustment({ recentPainLevel: 8 })
      expect(result.action).toBe('SKIP')
      expect(result.severity).toBe('CRITICAL')
      expect(result.triggers).toContain('PAIN_CRITICAL')
      expect(result.reason).toContain('8/10')
      expect(result.reason).toContain('Acute pain')
    })

    it('keeps Swedish copy when locale is sv', () => {
      const result = decideAdjustment({ recentPainLevel: 8 }, 'sv')
      expect(result.action).toBe('SKIP')
      expect(result.reason).toContain('Akut smärta')
    })

    it('SKIP when ACWR is CRITICAL', () => {
      const result = decideAdjustment({ acwrZone: 'CRITICAL', acwrValue: 2.3 })
      expect(result.action).toBe('SKIP')
      expect(result.severity).toBe('CRITICAL')
      expect(result.triggers).toEqual(['ACWR_CRITICAL'])
    })

    it('acute pain >= 7 overrides an otherwise fine ACWR', () => {
      const result = decideAdjustment({
        recentPainLevel: 9,
        acwrZone: 'OPTIMAL',
        readinessScore: 85,
      })
      expect(result.action).toBe('SKIP')
      expect(result.triggers).toEqual(['PAIN_CRITICAL'])
    })
  })

  describe('warning rules', () => {
    it('DEFER_ONE_DAY when pain is moderate (4–6)', () => {
      const result = decideAdjustment({ recentPainLevel: 5 })
      expect(result.action).toBe('DEFER_ONE_DAY')
      expect(result.severity).toBe('WARNING')
      expect(result.triggers).toEqual(['PAIN_MODERATE'])
    })

    it('DEFER_ONE_DAY when ACWR is DANGER', () => {
      const result = decideAdjustment({ acwrZone: 'DANGER' })
      expect(result.action).toBe('DEFER_ONE_DAY')
      expect(result.triggers).toEqual(['ACWR_DANGER'])
    })

    it('DEFER_ONE_DAY when readinessDecision is REST', () => {
      const result = decideAdjustment({ readinessDecision: 'REST' })
      expect(result.action).toBe('DEFER_ONE_DAY')
      expect(result.triggers).toEqual(['READINESS_REST'])
    })

    it('ACWR DANGER pre-empts a low readiness score that would only trigger CAUTION', () => {
      const result = decideAdjustment({
        acwrZone: 'DANGER',
        readinessScore: 40,
      })
      expect(result.action).toBe('DEFER_ONE_DAY')
      expect(result.triggers).toEqual(['ACWR_DANGER'])
    })
  })

  describe('caution rules', () => {
    it('SWAP_TO_EASY when ACWR CAUTION combines with a low readiness score', () => {
      const result = decideAdjustment({
        acwrZone: 'CAUTION',
        readinessScore: 42,
      })
      expect(result.action).toBe('SWAP_TO_EASY')
      expect(result.severity).toBe('CAUTION')
      expect(result.triggers).toEqual(['ACWR_CAUTION', 'READINESS_LOW'])
    })

    it('REDUCE_INTENSITY when only ACWR CAUTION is present', () => {
      const result = decideAdjustment({ acwrZone: 'CAUTION', readinessScore: 75 })
      expect(result.action).toBe('REDUCE_INTENSITY')
      expect(result.triggers).toEqual(['ACWR_CAUTION'])
    })

    it('REDUCE_INTENSITY when readinessDecision is EASY', () => {
      const result = decideAdjustment({ readinessDecision: 'EASY' })
      expect(result.action).toBe('REDUCE_INTENSITY')
      expect(result.triggers).toEqual(['READINESS_EASY'])
    })

    it('REDUCE_INTENSITY when readinessScore is 55', () => {
      const result = decideAdjustment({ readinessScore: 55 })
      expect(result.action).toBe('REDUCE_INTENSITY')
      expect(result.triggers).toEqual(['READINESS_LOW'])
    })
  })

  describe('info rules', () => {
    it('REDUCE_VOLUME when readinessDecision is REDUCE', () => {
      const result = decideAdjustment({ readinessDecision: 'REDUCE' })
      expect(result.action).toBe('REDUCE_VOLUME')
      expect(result.severity).toBe('INFO')
      expect(result.triggers).toEqual(['READINESS_REDUCE'])
    })

    it('REDUCE_VOLUME when readinessScore is 65', () => {
      const result = decideAdjustment({ readinessScore: 65 })
      expect(result.action).toBe('REDUCE_VOLUME')
      expect(result.triggers).toEqual(['READINESS_MODERATE'])
    })

    it('PROCEED at the boundary readinessScore 70', () => {
      const result = decideAdjustment({ readinessScore: 70 })
      expect(result.action).toBe('PROCEED')
    })

    it('PROCEED at the boundary readinessScore 60', () => {
      // 60 is NOT < 60, so the REDUCE_INTENSITY rule (< 60) should not fire.
      // The next rule (< 70) should match and return REDUCE_VOLUME.
      const result = decideAdjustment({ readinessScore: 60 })
      expect(result.action).toBe('REDUCE_VOLUME')
    })
  })

  describe('rule cascade', () => {
    it('picks the most severe action when many rules would fire', () => {
      const result = decideAdjustment({
        recentPainLevel: 8,     // PAIN_CRITICAL → SKIP
        acwrZone: 'DANGER',     // would also DEFER
        readinessScore: 30,     // would also DEFER via REST? no, via low
        readinessDecision: 'REST',
      })
      expect(result.action).toBe('SKIP')
      expect(result.severity).toBe('CRITICAL')
    })

    it('DETRAINING zone is not treated as a risk signal', () => {
      const result = decideAdjustment({ acwrZone: 'DETRAINING', readinessScore: 85 })
      expect(result.action).toBe('PROCEED')
    })
  })
})
