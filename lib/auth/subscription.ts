import { prisma } from '@/lib/prisma'

/** Does this coach have any athlete slots left on their subscription? */
export async function hasReachedAthleteLimit(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (!subscription) return true // no subscription ≈ FREE with 0 slots
  if (subscription.maxAthletes === -1) return false // -1 = unlimited
  return subscription.currentAthletes >= subscription.maxAthletes
}

export async function getSubscriptionTier(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  return subscription?.tier || 'FREE'
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (!subscription) return false
  return subscription.status === 'ACTIVE' || subscription.status === 'TRIAL'
}
