// app/(business)/[businessSlug]/coach/invitations/page.tsx
/**
 * Business-scoped Coach Invitations Management Page
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { InvitationsClient } from '@/app/coach/invitations/InvitationsClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessInvitationsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

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
