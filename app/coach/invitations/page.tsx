/**
 * Coach Invitations Management Page
 *
 * Allows coaches to create and manage invitation codes for athletes.
 */

import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { InvitationsClient } from './InvitationsClient'

export const metadata = {
  title: 'Inbjudningar | Coach',
  description: 'Hantera inbjudningar för atleter',
}

export default async function InvitationsPage() {
  const user = await requireCoach()

  // Get existing invitations
  const invitations = await prisma.invitation.findMany({
    where: { senderId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  // Get client names for used invitations
  const usedClientIds = invitations
    .map((inv) => inv.usedByClientId)
    .filter((id): id is string => id !== null)

  const usedClients = usedClientIds.length > 0
    ? await prisma.client.findMany({
        where: { id: { in: usedClientIds } },
        select: { id: true, name: true },
      })
    : []

  const clientNameMap = new Map(usedClients.map((c) => [c.id, c.name]))

  // Add client names to invitations
  const invitationsWithClients = invitations.map((inv) => ({
    ...inv,
    usedByClient: inv.usedByClientId
      ? { name: clientNameMap.get(inv.usedByClientId) || 'Unknown' }
      : null,
  }))

  return <InvitationsClient invitations={invitationsWithClients} userId={user.id} />
}
