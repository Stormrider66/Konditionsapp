import { Prisma } from '@prisma/client'

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

export function buildTestQualityReviewUpdate(
  warnings: TestQualityWarning[]
): Pick<
  Prisma.TestUpdateInput,
  'qualityReviewStatus' | 'qualityWarnings' | 'qualityReviewedBy' | 'qualityReviewedAt' | 'qualityReviewNote'
> {
  const reviewRequired = requiresTestQualityReview(warnings)

  return {
    qualityReviewStatus: reviewRequired ? 'REVIEW_REQUIRED' : 'CLEAR',
    qualityWarnings: warnings.length > 0 ? warnings as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
    qualityReviewedBy: null,
    qualityReviewedAt: null,
    qualityReviewNote: null,
  }
}

export function buildTestQualityReviewCreateData(
  warnings: TestQualityWarning[]
): Pick<
  Prisma.TestUncheckedCreateInput,
  'qualityReviewStatus' | 'qualityWarnings' | 'qualityReviewedBy' | 'qualityReviewedAt' | 'qualityReviewNote'
> {
  return buildTestQualityReviewUpdate(warnings) as Pick<
    Prisma.TestUncheckedCreateInput,
    'qualityReviewStatus' | 'qualityWarnings' | 'qualityReviewedBy' | 'qualityReviewedAt' | 'qualityReviewNote'
  >
}
