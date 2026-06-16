import { Prisma } from '@prisma/client'

export type TestQualityReviewStatus = 'CLEAR' | 'REVIEW_REQUIRED' | 'APPROVED'

export interface TestQualityReviewApprovalUpdate {
  qualityReviewStatus: 'APPROVED'
  qualityReviewedBy: string
  qualityReviewedAt: Date
  qualityReviewNote: string | null
}

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

export const usableTestQualityReviewWhere = {
  qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
} satisfies Pick<Prisma.TestWhereInput, 'qualityReviewStatus'>

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

export function buildTestQualityReviewApprovalUpdate(
  reviewerId: string,
  note?: string | null,
  reviewedAt: Date = new Date()
): TestQualityReviewApprovalUpdate {
  return {
    qualityReviewStatus: 'APPROVED',
    qualityReviewedBy: reviewerId,
    qualityReviewedAt: reviewedAt,
    qualityReviewNote: note?.trim() || null,
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
