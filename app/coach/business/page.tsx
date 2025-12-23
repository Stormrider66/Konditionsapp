/**
 * Business Management Page
 *
 * Allows coaches to manage their business, testers, and locations.
 */

import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { BusinessManagementClient } from './BusinessManagementClient'

export const metadata = {
  title: 'Verksamhet | Coach',
  description: 'Hantera din verksamhet, testare och platser',
}

export default async function BusinessManagementPage() {
  const user = await requireCoach()

  // Get business if exists
  const businessMember = await prisma.businessMember.findFirst({
    where: { userId: user.id },
    include: {
      business: {
        include: {
          testers: {
            orderBy: { name: 'asc' },
          },
          locations: {
            orderBy: { name: 'asc' },
          },
          _count: {
            select: {
              testers: true,
              locations: true,
            },
          },
        },
      },
    },
  })

  // Get testers for this user (even if no business)
  const testers = await prisma.tester.findMany({
    where: {
      OR: [
        { userId: user.id },
        { businessId: businessMember?.business.id },
      ],
    },
    orderBy: { name: 'asc' },
  })

  // Get locations for this user (even if no business)
  const locations = await prisma.location.findMany({
    where: { businessId: businessMember?.business.id },
    orderBy: { name: 'asc' },
  })

  return (
    <BusinessManagementClient
      userId={user.id}
      business={businessMember?.business || null}
      userRole={businessMember?.role || null}
      testers={testers}
      locations={locations}
    />
  )
}
