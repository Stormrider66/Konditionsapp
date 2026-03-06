import type { Prisma } from '@prisma/client'

type TransactionClient = Prisma.TransactionClient

interface GuardedMember {
  businessId: string
  role: string
  isActive: boolean
}

interface LastOwnerGuardOptions {
  nextRole?: string
  nextIsActive?: boolean
  remove?: boolean
}

function removesOwnerAccess(member: GuardedMember, options: LastOwnerGuardOptions): boolean {
  if (member.role !== 'OWNER') {
    return false
  }

  const nextRole = options.nextRole ?? member.role
  const nextIsActive = options.remove ? false : (options.nextIsActive ?? member.isActive)

  return nextRole !== 'OWNER' || !nextIsActive
}

export async function getLastOwnerGuardError(
  tx: TransactionClient,
  member: GuardedMember,
  options: LastOwnerGuardOptions = {}
): Promise<string | null> {
  if (!removesOwnerAccess(member, options)) {
    return null
  }

  const activeOwnerCount = await tx.businessMember.count({
    where: {
      businessId: member.businessId,
      role: 'OWNER',
      isActive: true,
    },
  })

  if (activeOwnerCount <= 1) {
    return 'Cannot remove the last owner from a business'
  }

  return null
}
