import { describe, expect, it } from 'vitest'
import {
  buildTestQualityReviewCreateData,
  buildTestQualityReviewUpdate,
  requiresTestQualityReview,
} from './test-quality-review'

describe('test quality review helpers', () => {
  it('requires review for lactate-drop warnings', () => {
    const warnings = [
      {
        type: 'LACTATE_DROP',
        severity: 'warning',
        message: 'Lactate dropped',
        details: { fromStage: 2, toStage: 3, drop: 0.5 },
      },
    ]

    expect(requiresTestQualityReview(warnings)).toBe(true)
    expect(buildTestQualityReviewCreateData(warnings)).toMatchObject({
      qualityReviewStatus: 'REVIEW_REQUIRED',
      qualityWarnings: warnings,
      qualityReviewedBy: null,
      qualityReviewedAt: null,
      qualityReviewNote: null,
    })
  })

  it('clears review state when there are no quality warnings', () => {
    expect(requiresTestQualityReview([])).toBe(false)
    expect(buildTestQualityReviewUpdate([])).toMatchObject({
      qualityReviewStatus: 'CLEAR',
      qualityReviewedBy: null,
      qualityReviewedAt: null,
      qualityReviewNote: null,
    })
  })
})
