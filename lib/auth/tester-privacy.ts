import { prisma } from '@/lib/prisma'

/** Tester record for a user, if any. */
export async function getTesterForUser(userId: string) {
  return prisma.tester.findUnique({ where: { userId } })
}

/** Private testers only see tests they conducted. */
export async function isPrivateTester(userId: string): Promise<boolean> {
  const tester = await prisma.tester.findUnique({ where: { userId } })
  return tester?.isPrivate === true
}

/**
 * Where-clause filter for tester privacy:
 *   { testerId: X } for private testers, `null` otherwise (no extra filter).
 */
export async function getTestPrivacyFilter(
  userId: string
): Promise<{ testerId?: string } | null> {
  const tester = await prisma.tester.findUnique({ where: { userId } })
  if (!tester) return null
  if (tester.isPrivate) return { testerId: tester.id }
  return null
}

/** Apply the tester-privacy filter to an existing Prisma where clause. */
export async function applyTesterPrivacy<T extends { testerId?: string | null }>(
  userId: string,
  whereClause: T
): Promise<T> {
  const privacyFilter = await getTestPrivacyFilter(userId)
  if (privacyFilter) return { ...whereClause, ...privacyFilter }
  return whereClause
}

/** Can this user see the given test, given tester-privacy rules? */
export async function canAccessTestAsTester(
  userId: string,
  testId: string
): Promise<boolean> {
  const tester = await prisma.tester.findUnique({ where: { userId } })
  if (!tester) return true
  if (!tester.isPrivate) return true

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { testerId: true },
  })

  return test?.testerId === tester.id
}
