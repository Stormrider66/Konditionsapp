import 'server-only'

import { prisma } from '@/lib/prisma'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'

interface ResolveAthleteGoogleKeyParams {
  clientId: string
  userId: string
  isCoachInAthleteMode: boolean
}

export interface ResolvedAthleteGoogleKeyContext {
  businessId: string | null
  clientUserId: string
  googleKey: string | null
  keyOwnerId: string
}

export async function resolveAthleteGoogleKeyContext(
  params: ResolveAthleteGoogleKeyParams
): Promise<ResolvedAthleteGoogleKeyContext | null> {
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    select: {
      businessId: true,
      userId: true,
    },
  })

  if (!client) {
    return null
  }

  const businessId = client.businessId ?? null
  const keyOwnerId = params.isCoachInAthleteMode ? params.userId : client.userId
  const googleKey = await getResolvedGoogleKey(keyOwnerId, { businessId })

  return {
    businessId,
    clientUserId: client.userId,
    googleKey,
    keyOwnerId,
  }
}
