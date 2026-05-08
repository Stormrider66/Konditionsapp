import { prisma } from '@/lib/prisma'

const COACH_BUSINESS_ROLES = ['OWNER', 'ADMIN', 'COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH'] as const
const PHYSIO_BUSINESS_ROLES = ['PHYSIO'] as const
const CAPABILITY_CACHE_TTL_MS = 2 * 60 * 1000
const coachAccessCache = new Map<string, { expiresAt: number; value: boolean }>()
const physioAccessCache = new Map<string, { expiresAt: number; value: boolean }>()

function cached(cache: Map<string, { expiresAt: number; value: boolean }>, userId: string) {
  const hit = cache.get(userId)
  return hit && hit.expiresAt > Date.now() ? hit.value : null
}

function setCached(cache: Map<string, { expiresAt: number; value: boolean }>, userId: string, value: boolean) {
  cache.set(userId, { expiresAt: Date.now() + CAPABILITY_CACHE_TTL_MS, value })
  return value
}

export async function canAccessCoachPlatform(userId: string): Promise<boolean> {
  const cachedValue = cached(coachAccessCache, userId)
  if (cachedValue != null) return cachedValue

  const user = prisma.user?.findUnique
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
    : null

  if (!user) return setCached(coachAccessCache, userId, false)
  if (user.role === 'ADMIN' || user.role === 'COACH') return setCached(coachAccessCache, userId, true)

  const membership = prisma.businessMember?.findFirst
    ? await prisma.businessMember.findFirst({
        where: {
          userId,
          isActive: true,
          role: { in: [...COACH_BUSINESS_ROLES] },
        },
        select: { id: true },
      })
    : null

  return setCached(coachAccessCache, userId, membership !== null)
}

export async function canAccessPhysioPlatform(userId: string): Promise<boolean> {
  const cachedValue = cached(physioAccessCache, userId)
  if (cachedValue != null) return cachedValue

  const user = prisma.user?.findUnique
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
    : null

  if (!user) return setCached(physioAccessCache, userId, false)
  if (user.role === 'ADMIN' || user.role === 'PHYSIO') return setCached(physioAccessCache, userId, true)

  const [membership, assignment] = await Promise.all([
    prisma.businessMember?.findFirst
      ? prisma.businessMember.findFirst({
          where: {
            userId,
            isActive: true,
            role: { in: [...PHYSIO_BUSINESS_ROLES] },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.physioAssignment?.findFirst
      ? prisma.physioAssignment.findFirst({
          where: {
            physioUserId: userId,
            isActive: true,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  return setCached(physioAccessCache, userId, membership !== null || assignment !== null)
}

export async function getPreferredProfessionalPortal(userId: string): Promise<'coach' | 'physio' | null> {
  const user = prisma.user?.findUnique
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
    : null

  if (!user) return null
  if (user.role === 'ADMIN' || user.role === 'COACH') return 'coach'
  if (user.role === 'PHYSIO') return 'physio'

  const [coachAccess, physioAccess] = await Promise.all([
    canAccessCoachPlatform(userId),
    canAccessPhysioPlatform(userId),
  ])

  if (coachAccess) return 'coach'
  if (physioAccess) return 'physio'
  return null
}
