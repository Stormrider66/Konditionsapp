// app/athlete/dashboard/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { AthleteDashboardView } from './dashboard-view'

interface AthleteDashboardPageProps {
  searchParams?: Promise<{ details?: string }>
}

export default async function AthleteDashboardPage({ searchParams }: AthleteDashboardPageProps) {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const resolvedSearchParams = await searchParams

  // Ensure widgets that build URLs can route correctly in business-scoped setups
  const businessSlug = await getUserPrimaryBusinessSlug(user.id)

  return (
    <AthleteDashboardView
      userId={user.id}
      clientId={clientId}
      showTrainingDetails={resolvedSearchParams?.details === 'training'}
      basePath={businessSlug ? `/${businessSlug}` : ''}
    />
  )
}
