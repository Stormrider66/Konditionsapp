export type TestQualityReviewStatus = 'CLEAR' | 'REVIEW_REQUIRED' | 'APPROVED'

export interface TestQualityWarning {
  type: string
  severity: string
  message: string
  details?: unknown
}

export function requiresTestQualityReview(warnings: TestQualityWarning[]): boolean {
  return warnings.some((warning) =>
    warning.type === 'LACTATE_DROP' ||
    warning.severity === 'error' ||
    warning.severity === 'critical'
  )
}

export function testQualityReviewBlocksProgram(test: { qualityReviewStatus?: string | null }): boolean {
  return test.qualityReviewStatus === 'REVIEW_REQUIRED'
}
