import type { Prisma, TestType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { TestQualityWarning } from '@/lib/testing/test-quality-review'

export interface TestReviewQueueItem {
  id: string
  clientId: string
  clientName: string
  testDate: Date
  testType: TestType
  warnings: TestQualityWarning[]
  warningCount: number
  hasSevereWarning: boolean
  previousTest: {
    id: string
    testDate: Date
    testType: TestType
    vo2max: number | null
    maxHR: number | null
  } | null
}

interface GetTestReviewQueueParams {
  businessId: string
  coachIds: string[]
  limit?: number
}

export function parseTestQualityWarnings(value: Prisma.JsonValue | null): TestQualityWarning[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, Prisma.JsonValue>
    const type = typeof record.type === 'string' ? record.type : 'QUALITY_WARNING'
    const severity = typeof record.severity === 'string' ? record.severity : 'warning'
    const message = typeof record.message === 'string' ? record.message : type

    return [{ type, severity, message, details: record.details }]
  })
}

export function hasSevereTestQualityWarning(warnings: TestQualityWarning[]): boolean {
  return warnings.some(warning => ['critical', 'error'].includes(warning.severity.toLowerCase()))
}

export async function getTestReviewQueue({
  businessId,
  coachIds,
  limit = 50,
}: GetTestReviewQueueParams): Promise<TestReviewQueueItem[]> {
  const pendingTests = await prisma.test.findMany({
    where: {
      status: 'COMPLETED',
      qualityReviewStatus: 'REVIEW_REQUIRED',
      client: {
        businessId,
        userId: { in: coachIds },
      },
    },
    select: {
      id: true,
      clientId: true,
      testDate: true,
      testType: true,
      qualityWarnings: true,
      client: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { testDate: 'desc' },
    take: limit,
  })

  if (pendingTests.length === 0) return []

  const clientIds = [...new Set(pendingTests.map(test => test.clientId))]
  const pendingIds = pendingTests.map(test => test.id)
  const previousCandidates = await prisma.test.findMany({
    where: {
      status: 'COMPLETED',
      clientId: { in: clientIds },
      id: { notIn: pendingIds },
      qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
    },
    select: {
      id: true,
      clientId: true,
      testDate: true,
      testType: true,
      vo2max: true,
      maxHR: true,
    },
    orderBy: { testDate: 'desc' },
    take: Math.max(200, limit * 5),
  })

  return pendingTests.map((test) => {
    const warnings = parseTestQualityWarnings(test.qualityWarnings)
    const previousTest = previousCandidates.find(candidate =>
      candidate.clientId === test.clientId &&
      candidate.testDate < test.testDate
    ) ?? null

    return {
      id: test.id,
      clientId: test.clientId,
      clientName: test.client.name,
      testDate: test.testDate,
      testType: test.testType,
      warnings,
      warningCount: warnings.length,
      hasSevereWarning: hasSevereTestQualityWarning(warnings),
      previousTest: previousTest
        ? {
            id: previousTest.id,
            testDate: previousTest.testDate,
            testType: previousTest.testType,
            vo2max: previousTest.vo2max,
            maxHR: previousTest.maxHR,
          }
        : null,
    }
  })
}
