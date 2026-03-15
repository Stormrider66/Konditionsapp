import { prisma } from '@/lib/prisma'

const COACH_BUSINESS_ROLES = ['OWNER', 'ADMIN', 'COACH'] as const
const PHYSIO_BUSINESS_ROLES = ['PHYSIO'] as const

export async function canAccessCoachPlatform(userId: string): Promise<boolean> {
  const user = prisma.user?.findUnique
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
    : null

  if (!user) return false
  if (user.role === 'ADMIN' || user.role === 'COACH') return true

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

  return membership !== null
}

export async function canAccessPhysioPlatform(userId: string): Promise<boolean> {
  const user = prisma.user?.findUnique
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
    : null

  if (!user) return false
  if (user.role === 'ADMIN' || user.role === 'PHYSIO') return true

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

  return membership !== null || assignment !== null
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
