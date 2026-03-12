import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound } from 'next/navigation'
import { BrowseAthletesClient } from './BrowseAthletesClient'

interface BrowseAthletesPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BrowseAthletesPage({ params }: BrowseAthletesPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <BrowseAthletesClient
      businessId={membership.businessId}
      businessSlug={businessSlug}
    />
  )
}
