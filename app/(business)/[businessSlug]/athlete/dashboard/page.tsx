// app/(business)/[businessSlug]/athlete/dashboard/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteDashboardView } from '@/app/athlete/dashboard/dashboard-view'

interface BusinessAthleteDashboardProps {
  params: Promise<{ businessSlug: string }>
  searchParams?: Promise<{ details?: string }>
}

export default async function BusinessAthleteDashboardPage({ params, searchParams }: BusinessAthleteDashboardProps) {
  const { businessSlug } = await params
  const resolvedSearchParams = await searchParams
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <AthleteDashboardView
      userId={user.id}
      clientId={clientId}
      showTrainingDetails={resolvedSearchParams?.details === 'training'}
      basePath={`/${businessSlug}`}
      businessId={membership.businessId}
      businessName={membership.business.name}
    />
  )
}
