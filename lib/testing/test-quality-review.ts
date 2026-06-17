import { Prisma } from '@prisma/client'
import {
  requiresTestQualityReview,
  type TestQualityWarning,
} from '@/lib/testing/test-quality-review-core'

export type {
  TestQualityReviewStatus,
  TestQualityWarning,
} from '@/lib/testing/test-quality-review-core'
export {
  requiresTestQualityReview,
  testQualityReviewBlocksProgram,
} from '@/lib/testing/test-quality-review-core'

export interface TestQualityReviewApprovalUpdate {
  qualityReviewStatus: 'APPROVED'
  qualityReviewedBy: string
  qualityReviewedAt: Date
  qualityReviewNote: string | null
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
