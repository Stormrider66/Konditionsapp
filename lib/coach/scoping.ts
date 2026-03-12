import { prisma } from '@/lib/prisma'

/**
 * Returns coach user IDs scoped by the caller's role in the business.
 *
 * - OWNER / ADMIN → all coach IDs in the business (full visibility)
 * - COACH (regular member) → only the caller's own ID
 *
 * This replaces the repeated inline pattern of fetching all business coaches,
 * ensuring regular coaches only see their own athletes while owners/admins
 * retain the full business-wide view.
 */
export async function getCoachScopedIds(
  userId: string,
  businessId: string,
  memberRole: string
): Promise<string[]> {
  if (memberRole === 'OWNER' || memberRole === 'ADMIN') {
    const members = await prisma.businessMember.findMany({
      where: {
        businessId,
        isActive: true,
        user: { role: 'COACH' },
      },
      select: { userId: true },
    })
    const ids = members.map(m => m.userId)
    if (!ids.includes(userId)) {
      ids.push(userId)
    }
    return ids
  }

  // Regular COACH or MEMBER — only own athletes
  return [userId]
}
